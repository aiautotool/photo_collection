import 'dotenv/config';
import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { OAuth2Client } from 'google-auth-library';
import { chooseAccount, safeAvailable, type StorageAccount } from '@photosync/core';
import { DRIVE_SCOPE, createResumableUploadSession, ensurePhotoSyncFolder, getStorageQuota, listPhotoSyncFiles } from '@photosync/google-drive';

protocol.registerSchemesAsPrivileged([{ scheme: 'photosync', privileges: { secure: true, standard: true, supportFetchAPI: true } }]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECEIVER_PORT = 43117;
const OAUTH_PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/oauth2callback`;
let mainWindow: BrowserWindow | null = null;
let receiver: http.Server | null = null;
let lastStatus: DesktopStatus = { state: 'idle', received: 0, duplicates: 0, cloudUploaded: 0, cloudBlocked: 0 };

type DesktopStatus = {
  state: 'idle'|'receiving'|'uploading'|'error';
  received: number;
  duplicates: number;
  cloudUploaded: number;
  cloudBlocked: number;
  message?: string;
  receiverUrl?: string;
  pairCode?: string;
  libraryPath?: string;
  driveAccounts?: number;
  lastRunAt?: string;
};

type LocalMedia = { name:string; path:string; url:string; modifiedAt:string; sourceDevice?:string };
type MediaIndexRow = { key:string; assetId:string; deviceId:string; filename:string; path:string; size:number; createdAt:number; receivedAt:string; sha256:string; cloud?:{state:'QUEUED'|'UPLOADING'|'UPLOADED'|'BLOCKED'|'ERROR';accountId?:string;remoteFileId?:string;message?:string} };
type SavedDriveAccount = { id:string; tokens:any };
type RuntimeDriveAccount = { id:string; client:OAuth2Client; storage:StorageAccount; folderId:string };

function libraryDir(){ return path.join(app.getPath('pictures'),'PhotoSync'); }
function stateDir(){ return path.join(app.getPath('userData'),'photosync-state'); }
function incomingDir(){ return path.join(stateDir(),'incoming'); }
function indexFile(){ return path.join(stateDir(),'media-index.json'); }
function pairFile(){ return path.join(stateDir(),'pair-code.txt'); }
function driveAccountsDir(){ return path.join(stateDir(),'google-accounts'); }

async function ensurePairCode(){
  await fs.mkdir(stateDir(),{recursive:true});
  try { return (await fs.readFile(pairFile(),'utf8')).trim(); }
  catch { const code=String(crypto.randomInt(100000,1000000)); await fs.writeFile(pairFile(),code,'utf8'); return code; }
}

function lanAddress(){
  for(const entries of Object.values(os.networkInterfaces())) for(const item of entries||[]) if(item.family==='IPv4'&&!item.internal) return item.address;
  return '127.0.0.1';
}

async function readIndex():Promise<MediaIndexRow[]>{ try{return JSON.parse(await fs.readFile(indexFile(),'utf8'))}catch{return []} }
async function writeIndex(rows:MediaIndexRow[]){ await fs.mkdir(stateDir(),{recursive:true}); await fs.writeFile(indexFile(),JSON.stringify(rows,null,2),'utf8'); }
function safeFilename(value:string){ return value.replace(/[\\/:*?"<>|]/g,'_').replace(/^\.+/,'_').slice(0,220)||`media-${Date.now()}`; }

async function hashFile(filePath:string){
  return await new Promise<string>((resolve,reject)=>{ const hash=crypto.createHash('sha256'); const stream=createReadStream(filePath); stream.on('data',chunk=>hash.update(chunk)); stream.on('end',()=>resolve(hash.digest('hex'))); stream.on('error',reject); });
}

async function listLocalMedia():Promise<LocalMedia[]>{
  const rows=await readIndex();
  const existing:LocalMedia[]=[];
  for(const row of rows){ try{const stat=await fs.stat(row.path); existing.push({name:row.filename,path:row.path,url:`photosync://media/${encodeURIComponent(row.key)}`,modifiedAt:stat.mtime.toISOString(),sourceDevice:row.deviceId})}catch{} }
  return existing.sort((a,b)=>b.modifiedAt.localeCompare(a.modifiedAt));
}

function oauthClient(){
  const id=process.env.PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_ID, secret=process.env.PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_SECRET;
  if(!id||!secret) throw new Error('Thiếu Google Desktop OAuth client trong desktop/.env');
  return new OAuth2Client(id,secret,REDIRECT_URI);
}

async function savedDriveAccounts():Promise<SavedDriveAccount[]>{
  await fs.mkdir(driveAccountsDir(),{recursive:true});
  const files=(await fs.readdir(driveAccountsDir())).filter(x=>x.endsWith('.json'));
  const out:SavedDriveAccount[]=[];
  for(const file of files){try{out.push(JSON.parse(await fs.readFile(path.join(driveAccountsDir(),file),'utf8')))}catch{}}
  return out;
}

async function connectGoogle(){
  const client=oauthClient();
  const url=client.generateAuthUrl({access_type:'offline',prompt:'consent select_account',scope:[DRIVE_SCOPE,'openid','email','profile']});
  await shell.openExternal(url);
  return await new Promise<DesktopStatus>((resolve,reject)=>{
    const server=http.createServer(async(req,res)=>{try{
      const incoming=new URL(req.url||'/',REDIRECT_URI); if(incoming.pathname!=='/oauth2callback')return;
      const code=incoming.searchParams.get('code'); if(!code)throw new Error('Google không trả authorization code');
      const {tokens}=await client.getToken(code); const id=`drive-${Date.now()}`;
      await fs.mkdir(driveAccountsDir(),{recursive:true}); await fs.writeFile(path.join(driveAccountsDir(),`${id}.json`),JSON.stringify({id,tokens},null,2),'utf8');
      res.writeHead(200,{'content-type':'text/html;charset=utf-8'});res.end('<h2>Đã thêm Google Drive vào PhotoSync Laptop.</h2><p>Bạn có thể đóng tab này.</p>');server.close();
      lastStatus={...lastStatus,message:'Đã thêm tài khoản Google Drive',driveAccounts:(await savedDriveAccounts()).length}; resolve(await desktopStatus());
    }catch(e){server.close();reject(e)}}); server.listen(OAUTH_PORT,'127.0.0.1'); server.on('error',reject);
  });
}

async function runtimeDriveAccounts():Promise<RuntimeDriveAccount[]>{
  const saved=await savedDriveAccounts(); const result:RuntimeDriveAccount[]=[];
  for(const account of saved){try{
    const client=oauthClient(); client.setCredentials(account.tokens); const token=await client.getAccessToken(); if(!token.token)continue;
    if(JSON.stringify(client.credentials)!==JSON.stringify(account.tokens)) await fs.writeFile(path.join(driveAccountsDir(),`${account.id}.json`),JSON.stringify({id:account.id,tokens:client.credentials},null,2),'utf8');
    const folderId=await ensurePhotoSyncFolder(token.token); const [quota,files]=await Promise.all([getStorageQuota(token.token),listPhotoSyncFiles(token.token,folderId)]);
    const appUsedBytes=files.reduce((sum,f)=>sum+Number(f.size||0),0); const providerFreeBytes=Math.max(0,Number(quota.limit||0)-Number(quota.usage||0));
    result.push({id:account.id,client,folderId,storage:{id:account.id,email:account.id,appUsedBytes,providerFreeBytes}});
  }catch(e){console.error('Drive account unavailable',account.id,e)}}
  return result;
}

async function uploadLocalToDrive(row:MediaIndexRow){
  const accounts=await runtimeDriveAccounts(); if(!accounts.length)return;
  const chosenStorage=chooseAccount(accounts.map(x=>x.storage),row.size); if(!chosenStorage){
    row.cloud={state:'BLOCKED',message:'Không còn Drive nào đủ rule 10GB/5GB'}; lastStatus.cloudBlocked+=1; const all=await readIndex(); const i=all.findIndex(x=>x.key===row.key); if(i>=0){all[i]=row;await writeIndex(all)}; return;
  }
  const account=accounts.find(x=>x.id===chosenStorage.id)!; row.cloud={state:'UPLOADING',accountId:account.id};
  try{
    const token=await account.client.getAccessToken(); if(!token.token)throw new Error('Drive access token unavailable');
    const mime=/\.(mp4|mov|m4v)$/i.test(row.filename)?'video/mp4':/\.png$/i.test(row.filename)?'image/png':/\.heic$/i.test(row.filename)?'image/heic':'image/jpeg';
    const session=await createResumableUploadSession(token.token,{name:row.filename,mimeType:mime,sizeBytes:row.size,folderId:account.folderId,appProperties:{photosyncKey:row.key,photosyncSha256:row.sha256}});
    const response=await fetch(session,{method:'PUT',headers:{'content-type':mime,'content-length':String(row.size)},body:createReadStream(row.path) as any,duplex:'half'} as any);
    if(!response.ok)throw new Error(`Drive upload ${response.status}: ${await response.text()}`); const remote=await response.json().catch(()=>({}));
    row.cloud={state:'UPLOADED',accountId:account.id,remoteFileId:remote.id}; lastStatus.cloudUploaded+=1;
  }catch(e){row.cloud={state:'ERROR',accountId:account.id,message:e instanceof Error?e.message:String(e)}}
  const all=await readIndex(); const i=all.findIndex(x=>x.key===row.key); if(i>=0){all[i]=row;await writeIndex(all)}; mainWindow?.webContents.send('photosync:storage-updated',{key:row.key,cloud:row.cloud});
}

async function receiveMedia(req:IncomingMessage,res:ServerResponse){
  const pair=await ensurePairCode(); if(req.headers['x-photosync-pair-code']!==pair){res.writeHead(401);res.end('Invalid pair code');return;}
  const deviceId=String(req.headers['x-photosync-device-id']||'unknown'); const assetId=String(req.headers['x-photosync-asset-id']||''); const key=`${deviceId}:${assetId}`;
  const rows=await readIndex(); if(rows.some(x=>x.key===key)){lastStatus.duplicates+=1;res.writeHead(208,{'content-type':'application/json'});res.end(JSON.stringify({state:'ALREADY_RECEIVED'}));return;}
  const filename=safeFilename(decodeURIComponent(String(req.headers['x-photosync-filename']||`media-${Date.now()}`))); const createdAt=Number(req.headers['x-photosync-created-at']||Date.now());
  const date=new Date(Number.isFinite(createdAt)?createdAt:Date.now()); const folder=path.join(libraryDir(),String(date.getFullYear()),String(date.getMonth()+1).padStart(2,'0'));
  await fs.mkdir(incomingDir(),{recursive:true});await fs.mkdir(folder,{recursive:true}); const tmp=path.join(incomingDir(),`${crypto.randomUUID()}.part`); await pipeline(req,createWriteStream(tmp));
  const stat=await fs.stat(tmp); const hash=await hashFile(tmp); let target=path.join(folder,filename); try{await fs.access(target);target=path.join(folder,`${path.parse(filename).name}-${hash.slice(0,8)}${path.extname(filename)}`)}catch{}
  await fs.rename(tmp,target); const row:MediaIndexRow={key,assetId,deviceId,filename,path:target,size:stat.size,createdAt,receivedAt:new Date().toISOString(),sha256:hash,cloud:{state:'QUEUED'}}; rows.push(row); await writeIndex(rows);
  lastStatus={...lastStatus,state:'idle',received:lastStatus.received+1,message:`Đã nhận ${filename}`,lastRunAt:new Date().toISOString()}; mainWindow?.webContents.send('photosync:file-received',{name:filename,path:target});
  res.writeHead(201,{'content-type':'application/json'});res.end(JSON.stringify({state:'LOCAL_STORED',sha256:hash,path:target})); void uploadLocalToDrive(row);
}

async function desktopStatus():Promise<DesktopStatus>{
  return {...lastStatus,receiverUrl:`http://${lanAddress()}:${RECEIVER_PORT}`,pairCode:await ensurePairCode(),libraryPath:libraryDir(),driveAccounts:(await savedDriveAccounts()).length};
}

async function startReceiver(){
  if(receiver)return; receiver=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url||'/','http://localhost'); const pair=await ensurePairCode();
    if(req.headers['x-photosync-pair-code']!==pair){res.writeHead(401);res.end('Invalid pair code');return;}
    if(req.method==='GET'&&url.pathname==='/api/v1/status'){const index=await readIndex();res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({name:os.hostname(),version:'1',libraryPath:libraryDir(),received:index.length}));return;}
    if(req.method==='POST'&&url.pathname==='/api/v1/media'){await receiveMedia(req,res);return;} res.writeHead(404);res.end('Not found');
  }catch(e){console.error(e);res.writeHead(500);res.end(e instanceof Error?e.message:String(e))}}); receiver.listen(RECEIVER_PORT,'0.0.0.0');
}

function createWindow(){const win=new BrowserWindow({width:1500,height:940,minWidth:1040,minHeight:700,backgroundColor:'#070a0f',titleBarStyle:process.platform==='darwin'?'hiddenInset':'default',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});mainWindow=win;const devUrl=process.env.VITE_DEV_SERVER_URL||'http://localhost:5173';if(!app.isPackaged)win.loadURL(devUrl);else win.loadFile(path.join(__dirname,'../dist/index.html'));}

ipcMain.handle('photosync:status',()=>desktopStatus());
ipcMain.handle('photosync:list-local',()=>listLocalMedia());
ipcMain.handle('photosync:open-library',()=>shell.openPath(libraryDir()));
ipcMain.handle('photosync:add-google',()=>connectGoogle());
ipcMain.handle('photosync:retry-cloud',async()=>{const rows=await readIndex();for(const row of rows.filter(x=>x.cloud?.state!=='UPLOADED'))await uploadLocalToDrive(row);return desktopStatus()});

app.whenReady().then(async()=>{await fs.mkdir(libraryDir(),{recursive:true});await startReceiver();protocol.handle('photosync',async request=>{const url=new URL(request.url);if(url.hostname!=='media')return new Response('Not found',{status:404});const key=decodeURIComponent(url.pathname.replace(/^\//,''));const row=(await readIndex()).find(x=>x.key===key);if(!row)return new Response('Not found',{status:404});return net.fetch(pathToFileURL(row.path).href)});createWindow();app.on('activate',()=>BrowserWindow.getAllWindows().length===0&&createWindow())});
app.on('window-all-closed',()=>process.platform!=='darwin'&&app.quit());
