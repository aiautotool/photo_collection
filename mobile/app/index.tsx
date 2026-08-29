import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import type * as MediaLibrary from 'expo-media-library';
import { loadDevicePhotos, pingLaptop, syncAssetsToLaptop, type SyncProgress } from '../src/sync/mobileSync';
import { forgetPairedDesktop, loadPairedDesktop, savePairedDesktop, type PairedDesktop } from '../src/sync/pairing';

export default function Home() {
  const [tab, setTab] = useState<'photos'|'search'|'devices'>('photos');
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<PairedDesktop|null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('Đang đọc thư viện ảnh...');
  const [progress, setProgress] = useState<SyncProgress|null>(null);
  const [scanner, setScanner] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const syncingRef = useRef(false);

  useEffect(() => { void (async()=>{
    try {
      const [assets, saved] = await Promise.all([loadDevicePhotos(300), loadPairedDesktop()]);
      setPhotos(assets); setTarget(saved);
      setMessage(saved ? 'Đã ghép nối. Đang kiểm tra laptop...' : 'Quét QR trên laptop để ghép nối lần đầu.');
      if(saved) void autoSync(saved, assets);
    } catch(e){ setMessage(e instanceof Error ? e.message : String(e)); }
  })(); }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if(state === 'active' && target && photos.length) void autoSync(target, photos);
    });
    return () => sub.remove();
  }, [target, photos]);

  const filtered = useMemo(()=>photos.filter(x=>x.filename.toLowerCase().includes(query.toLowerCase())),[photos,query]);
  const syncing = progress ? progress.completed + progress.skipped + progress.failed < progress.total : false;

  async function autoSync(currentTarget: PairedDesktop, assets: MediaLibrary.Asset[]) {
    if(syncingRef.current) return;
    syncingRef.current = true;
    try {
      await pingLaptop(currentTarget);
      setConnected(true);
      setProgress({total:assets.length,completed:0,skipped:0,failed:0});
      setMessage('Laptop online • đang tự đồng bộ...');
      const result = await syncAssetsToLaptop(currentTarget, assets, setProgress);
      setMessage(`Đã đồng bộ: ${result.completed} mới • ${result.skipped} đã có • ${result.failed} lỗi`);
    } catch(e) {
      setConnected(false);
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      syncingRef.current = false;
    }
  }

  async function syncNow(){ if(target) await autoSync(target, photos); else setTab('devices'); }

  async function startScanner(){
    if(!cameraPermission?.granted){ const result=await requestCameraPermission(); if(!result.granted){setMessage('Cần quyền camera để quét QR.');return;} }
    setScanner(true);
  }

  async function onQr(data:string){
    if(!scanner) return;
    setScanner(false);
    try {
      const saved=await savePairedDesktop(data);
      setTarget(saved); setMessage('Ghép nối thành công. Từ lần sau không cần quét QR nữa.');
      await autoSync(saved, photos);
    } catch(e){setMessage(e instanceof Error?e.message:String(e));}
  }

  async function forget(){ await forgetPairedDesktop(); setTarget(null); setConnected(false); setProgress(null); setMessage('Đã xoá ghép nối. Quét QR để kết nối lại.'); }

  return <SafeAreaView style={s.root}>
    <View style={s.header}><View style={s.brand}><View style={s.mark}><Text style={s.markText}>P</Text></View><Text style={s.logo}>PhotoSync</Text></View><View style={[s.onlineDot,{backgroundColor:connected?'#40d99c':'#586574'}]}/></View>

    {tab==='photos'&&<View style={s.flex}>
      <View style={s.titleRow}><View><Text style={s.h1}>Ảnh</Text><Text style={s.muted}>{photos.length} mục trên điện thoại</Text></View><Pressable style={[s.syncPill,syncing&&s.disabled]} onPress={()=>void syncNow()} disabled={syncing}><Text style={s.syncPillText}>{syncing?'Đang gửi':'Đồng bộ'}</Text></Pressable></View>
      <View style={s.deviceStrip}><View><Text style={s.deviceLabel}>MÁY TÍNH ĐÃ GHÉP</Text><Text style={s.deviceName}>{target?target.desktopId:'Chưa ghép nối'}</Text></View><View style={[s.stateBadge,connected&&s.stateBadgeOn]}><Text style={s.stateText}>{connected?'ONLINE':'OFFLINE'}</Text></View></View>
      <View style={s.status}><Text style={s.statusText}>{message}</Text></View>
      <ScrollView contentContainerStyle={s.galleryScroll}><View style={s.monthRow}><View><Text style={s.month}>Gần đây</Text><Text style={s.monthCount}>{filtered.length} ảnh & video</Text></View></View><View style={s.grid}>{filtered.map(asset=><View key={asset.id} style={s.photoCell}><Image source={{uri:asset.uri}} style={s.photo} contentFit="cover"/>{asset.mediaType==='video'&&<View style={s.video}><Text style={s.videoText}>▶</Text></View>}</View>)}</View></ScrollView>
    </View>}

    {tab==='search'&&<ScrollView contentContainerStyle={s.page}><Text style={s.h1Pad}>Tìm kiếm</Text><TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="Tìm theo tên file" placeholderTextColor="#718096"/><View style={s.grid}>{filtered.map(asset=><Image key={asset.id} source={{uri:asset.uri}} style={s.searchPhoto} contentFit="cover"/>)}</View></ScrollView>}

    {tab==='devices'&&<ScrollView contentContainerStyle={s.page}><Text style={s.h1Pad}>Máy tính</Text>
      <View style={s.hero}><Text style={s.heroEyebrow}>PAIR ONCE • SYNC FOREVER</Text><Text style={s.heroTitle}>{target?'Đã ghép nối':'Quét QR trên laptop'}</Text><Text style={s.heroSub}>{target?'Thông tin ghép nối đã lưu an toàn trên điện thoại. Khi laptop online, PhotoSync tự gửi phần ảnh còn thiếu qua Internet.':'Mở PhotoSync trên laptop. Desktop chỉ cần hiện QR, bạn quét đúng một lần.'}</Text></View>
      {!target&&<Pressable style={s.primary} onPress={()=>void startScanner()}><Text style={s.primaryText}>Quét QR từ laptop</Text></Pressable>}
      {target&&<><View style={s.card}><Text style={s.cardTitle}>Kết nối đã lưu</Text><Text style={s.cardLine}>Desktop: {target.desktopId}</Text><Text style={s.cardLine}>Relay: {target.relayUrl}</Text><Text style={s.cardLine}>Trạng thái: {connected?'Laptop online':'Laptop offline'}</Text></View><Pressable style={s.primary} onPress={()=>void syncNow()}><Text style={s.primaryText}>Đồng bộ ngay</Text></Pressable><Pressable style={s.secondary} onPress={()=>void forget()}><Text style={s.secondaryText}>Quên máy tính này</Text></Pressable></>}
      {progress&&<View style={s.card}><Text style={s.cardTitle}>Tiến trình</Text><View style={s.track}><View style={[s.fill,{width:`${progress.total?((progress.completed+progress.skipped+progress.failed)/progress.total)*100:0}%`}]} /></View><Text style={s.cardLine}>{progress.current||`${progress.completed} mới • ${progress.skipped} đã có • ${progress.failed} lỗi`}</Text></View>}
    </ScrollView>}

    {scanner&&<View style={s.scannerOverlay}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>void onQr(data)}/><View style={s.scanFrame}/><View style={s.scanBottom}><Text style={s.scanTitle}>Quét QR PhotoSync trên laptop</Text><Pressable style={s.cancel} onPress={()=>setScanner(false)}><Text style={s.cancelText}>Huỷ</Text></Pressable></View></View>}

    <View style={s.nav}>{[['photos','Ảnh','▧'],['search','Tìm kiếm','⌕'],['devices','Máy tính','▰']].map(([id,label,icon])=><Pressable key={id} style={s.navItem} onPress={()=>setTab(id as any)}><Text style={[s.navIcon,tab===id&&s.active]}>{icon}</Text><Text style={[s.navText,tab===id&&s.active]}>{label}</Text></Pressable>)}</View>
  </SafeAreaView>
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#070a0f'},flex:{flex:1},header:{height:58,paddingHorizontal:18,borderBottomWidth:1,borderBottomColor:'#111821',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{flexDirection:'row',alignItems:'center',gap:9},mark:{width:28,height:28,borderRadius:8,backgroundColor:'#2f80ed',alignItems:'center',justifyContent:'center'},markText:{color:'#fff',fontWeight:'900'},logo:{color:'#f7f9fc',fontWeight:'800',fontSize:19},onlineDot:{width:10,height:10,borderRadius:5},titleRow:{padding:18,paddingBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},h1:{color:'#fff',fontSize:31,fontWeight:'900'},muted:{color:'#7f8a99',marginTop:4},syncPill:{paddingHorizontal:16,height:38,borderRadius:19,backgroundColor:'#12345a',alignItems:'center',justifyContent:'center'},syncPillText:{color:'#79b6ff',fontWeight:'800'},disabled:{opacity:.5},deviceStrip:{marginHorizontal:18,padding:14,borderRadius:16,backgroundColor:'#0e151e',borderWidth:1,borderColor:'#182432',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},deviceLabel:{color:'#607083',fontSize:10,fontWeight:'900',letterSpacing:1},deviceName:{color:'#eef3f8',fontSize:13,fontWeight:'800',marginTop:3,maxWidth:240},stateBadge:{paddingHorizontal:8,paddingVertical:5,borderRadius:8,backgroundColor:'#222b35'},stateBadgeOn:{backgroundColor:'#12392e'},stateText:{color:'#8c9aaa',fontSize:10,fontWeight:'900'},status:{marginHorizontal:18,marginTop:8,paddingHorizontal:12,height:34,borderRadius:10,backgroundColor:'#0d131b',justifyContent:'center'},statusText:{color:'#8d9aaa',fontSize:12},galleryScroll:{paddingBottom:100},monthRow:{paddingHorizontal:18,paddingVertical:12,flexDirection:'row',justifyContent:'space-between'},month:{color:'#eef2f7',fontWeight:'800',fontSize:16},monthCount:{color:'#687585',fontSize:12,marginTop:2},grid:{flexDirection:'row',flexWrap:'wrap',gap:2,paddingHorizontal:2},photoCell:{width:'33.05%',aspectRatio:1,backgroundColor:'#111820'},photo:{width:'100%',height:'100%'},video:{position:'absolute',right:7,bottom:7,width:24,height:24,borderRadius:12,backgroundColor:'#0009',alignItems:'center',justifyContent:'center'},videoText:{color:'#fff',fontSize:10},page:{paddingBottom:110},h1Pad:{color:'#fff',fontSize:31,fontWeight:'900',margin:18},search:{marginHorizontal:18,marginBottom:18,backgroundColor:'#131a23',color:'#fff',padding:15,borderRadius:22},searchPhoto:{width:'33.05%',aspectRatio:1},hero:{marginHorizontal:18,padding:20,borderRadius:22,backgroundColor:'#0c2038',borderWidth:1,borderColor:'#153b63'},heroEyebrow:{color:'#62a8ff',fontWeight:'900',fontSize:10,letterSpacing:1},heroTitle:{color:'#fff',fontSize:24,fontWeight:'900',marginTop:6},heroSub:{color:'#9bb2cb',lineHeight:20,marginTop:7},primary:{margin:18,padding:15,borderRadius:14,backgroundColor:'#2f80ed',alignItems:'center'},primaryText:{color:'#fff',fontWeight:'800'},secondary:{marginHorizontal:18,marginBottom:18,padding:14,borderRadius:14,borderWidth:1,borderColor:'#29384a',alignItems:'center'},secondaryText:{color:'#9db0c4',fontWeight:'700'},card:{marginHorizontal:18,marginBottom:12,padding:16,borderRadius:16,backgroundColor:'#101720'},cardTitle:{color:'#eef3f8',fontWeight:'800',fontSize:16,marginBottom:8},cardLine:{color:'#8f9baa',lineHeight:21},track:{height:6,backgroundColor:'#222d39',borderRadius:8,overflow:'hidden',marginVertical:10},fill:{height:6,backgroundColor:'#3b82f6'},scannerOverlay:{...StyleSheet.absoluteFillObject,zIndex:50,backgroundColor:'#000'},scanFrame:{position:'absolute',top:'27%',left:'13%',right:'13%',aspectRatio:1,borderWidth:3,borderColor:'#4ea1ff',borderRadius:24},scanBottom:{position:'absolute',left:20,right:20,bottom:70,alignItems:'center'},scanTitle:{color:'#fff',fontSize:18,fontWeight:'800',marginBottom:16},cancel:{paddingHorizontal:24,paddingVertical:12,borderRadius:20,backgroundColor:'#101720dd'},cancelText:{color:'#fff',fontWeight:'700'},nav:{position:'absolute',left:0,right:0,bottom:0,height:78,backgroundColor:'#090e14f5',borderTopWidth:1,borderTopColor:'#17212c',flexDirection:'row',alignItems:'center',justifyContent:'space-around'},navItem:{alignItems:'center',minWidth:90},navIcon:{fontSize:22,color:'#788493'},navText:{fontSize:12,color:'#788493',marginTop:4},active:{color:'#4ea1ff'}});
