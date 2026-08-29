import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type LocalMedia = { name:string; path:string; url:string; modifiedAt:string; sourceDevice?:string };
type DesktopStatus = { state:'idle'|'receiving'|'uploading'|'error'; received:number; duplicates:number; cloudUploaded:number; cloudBlocked:number; message?:string; receiverUrl?:string; pairCode?:string; libraryPath?:string; driveAccounts?:number; lastRunAt?:string };
type TunnelState = { connected:boolean; relayUrl:string; desktopId:string; pairingPayload:string; lastError?:string };
type DesktopBridge = {
  getStatus():Promise<DesktopStatus>;
  getTunnelStatus():Promise<TunnelState>;
  listLocalMedia():Promise<LocalMedia[]>;
  openLibrary():Promise<void>;
  addGoogleAccount():Promise<DesktopStatus>;
  retryCloud():Promise<DesktopStatus>;
  onFileReceived(cb:(event:{name:string;path:string})=>void):()=>void;
  onStorageUpdated(cb:(event:unknown)=>void):()=>void;
  onTunnelState(cb:(event:TunnelState)=>void):()=>void;
};
declare global { interface Window { photoSyncDesktop?:DesktopBridge } }

const nav=[['⌂','Tổng quan'],['▣','Ảnh'],['▤','Album'],['◫','Thiết bị'],['◈','Tài khoản lưu trữ'],['⚙','Cài đặt']];

export function App(){
  const [active,setActive]=useState('Ảnh');
  const [query,setQuery]=useState('');
  const [media,setMedia]=useState<LocalMedia[]>([]);
  const [selected,setSelected]=useState<LocalMedia|null>(null);
  const [status,setStatus]=useState<DesktopStatus>({state:'idle',received:0,duplicates:0,cloudUploaded:0,cloudBlocked:0});
  const [tunnel,setTunnel]=useState<TunnelState>({connected:false,relayUrl:'',desktopId:'',pairingPayload:''});

  async function refresh(){const b=window.photoSyncDesktop;if(!b)return;const [s,m,t]=await Promise.all([b.getStatus(),b.listLocalMedia(),b.getTunnelStatus()]);setStatus(s);setMedia(m);setTunnel(t)}
  useEffect(()=>{void refresh();const b=window.photoSyncDesktop;if(!b)return;const off1=b.onFileReceived(()=>void refresh());const off2=b.onStorageUpdated(()=>void refresh());const off3=b.onTunnelState(t=>setTunnel(t));const timer=setInterval(()=>void refresh(),8000);return()=>{off1();off2();off3();clearInterval(timer)}},[]);
  const filtered=useMemo(()=>media.filter(x=>x.name.toLowerCase().includes(query.toLowerCase())),[media,query]);

  async function addGoogle(){const b=window.photoSyncDesktop;if(!b)return;try{setStatus(await b.addGoogleAccount());await refresh()}catch(e){setStatus(s=>({...s,state:'error',message:e instanceof Error?e.message:String(e)}))}}
  async function retryCloud(){const b=window.photoSyncDesktop;if(!b)return;setStatus(await b.retryCloud());await refresh()}

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><b>PhotoSync</b><small>Laptop Photo Hub</small></div></div>
      <nav>{nav.map(([icon,label])=><button key={label} className={active===label?'nav-item active':'nav-item'} onClick={()=>setActive(label)}><span>{icon}</span>{label}</button>)}</nav>
      <div className="sidebar-status"><span className={tunnel.connected?'live-dot':'status-dot'}/><div><b>{tunnel.connected?'Internet Tunnel online':'Đang nối tunnel...'}</b><small>{tunnel.relayUrl||'PhotoSync Relay'}</small></div></div>
    </aside>

    <main className="workspace">
      <header className="topbar"><div><h1>{active}</h1><p>Mobile → Internet Tunnel → Laptop → Local / Google Drive</p></div><div className="top-actions"><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm ảnh, video..."/><kbd>⌘ K</kbd></div><button className="avatar">PS</button></div></header>
      <section className="toolbar"><div className="tabs"><button className="selected">Tất cả</button><button>Năm</button><button>Tháng</button><button>Ngày</button><button onClick={()=>window.photoSyncDesktop?.openLibrary()}>Mở thư mục</button></div><div className="view-actions"><button onClick={()=>void refresh()}>↻</button><button>▦</button></div></section>

      <section className="content-area">
        <div className="gallery-pane">
          <div className="date-heading"><div><h3>Thư viện PhotoSync</h3><span>{filtered.length} mục đã nhận từ mobile</span></div><button>Chọn</button></div>
          {filtered.length===0?<div className="empty-state"><div className="empty-cloud">▣</div><h2>Quét QR để bắt đầu</h2><p>Điện thoại chỉ cần quét QR bên phải một lần. Sau đó có thể đồng bộ qua Internet mà không cần cùng Wi‑Fi.</p></div>:<div className="photo-grid">{filtered.map(item=><button className="photo-card" key={item.path} onClick={()=>setSelected(item)}><img src={item.url} alt={item.name}/><span className="photo-name">{item.name}</span></button>)}</div>}
        </div>

        <aside className="right-rail">
          <div className="panel storage-panel">
            <div className="panel-head"><div><h3>Ghép điện thoại</h3><p>Quét đúng một lần</p></div><span className={tunnel.connected?'live-dot':'status-dot'}/></div>
            <div style={{display:'grid',placeItems:'center',padding:'18px 0'}}>
              {tunnel.pairingPayload?<div style={{background:'#fff',padding:12,borderRadius:18}}><QRCodeSVG value={tunnel.pairingPayload} size={188} level="M" includeMargin={false}/></div>:<div className="empty-cloud">⌛</div>}
            </div>
            <div className="storage-summary"><div><span>Internet Tunnel</span><b>{tunnel.connected?'ONLINE':'CONNECTING'}</b></div><small>{tunnel.connected?'Quét QR bằng PhotoSync Mobile. Token ghép nối sẽ được lưu an toàn trên điện thoại; lần sau không cần quét lại.':tunnel.lastError||'Desktop đang kết nối outbound tới relay...'}</small></div>
          </div>

          <div className="panel backup-panel">
            <div className="panel-head"><div><h3>Local Storage</h3><p>Bản gốc trên laptop</p></div><span className="live-dot"/></div>
            <div className="sync-stat"><span>Thư viện</span><b>{media.length} file</b></div>
            <div className="sync-stat"><span>Đã nhận phiên này</span><b>{status.received}</b></div>
            <div className="sync-stat"><span>Trùng đã bỏ qua</span><b>{status.duplicates}</b></div>
            <button className="sync-now" onClick={()=>window.photoSyncDesktop?.openLibrary()}>Mở Pictures/PhotoSync</button>
          </div>

          <div className="panel storage-panel">
            <div className="panel-head"><div><h3>Google Drive Pool</h3><p>Storage Manager phía laptop</p></div><span className={status.driveAccounts?'live-dot':'status-dot'}/></div>
            <div className="storage-summary"><div><span>Tài khoản đã thêm</span><b>{status.driveAccounts||0}</b></div><div><span>Đã upload cloud</span><b>{status.cloudUploaded}</b></div><div><span>Bị chặn bởi quota</span><b>{status.cloudBlocked}</b></div><small>Mỗi Drive tối đa 10 GB cho PhotoSync và luôn chừa ít nhất 5 GB.</small></div>
            <button className="add-account" onClick={()=>void addGoogle()}>＋ Thêm tài khoản Google</button>
            <button className="sync-now" onClick={()=>void retryCloud()}>Phân phối file đang chờ</button>
          </div>
        </aside>
      </section>
    </main>

    {selected&&<div className="viewer" onClick={()=>setSelected(null)}><div className="viewer-top"><button>‹</button><div><b>{selected.name}</b><small>{selected.sourceDevice||'mobile'} • {new Date(selected.modifiedAt).toLocaleString()}</small></div><span/><button>⋯</button></div><img src={selected.url} alt={selected.name}/><div className="viewer-actions"><button onClick={e=>{e.stopPropagation();window.photoSyncDesktop?.openLibrary()}}>□<small>Mở thư mục</small></button></div></div>}
  </div>
}
