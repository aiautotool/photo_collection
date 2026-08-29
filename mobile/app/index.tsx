import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import type * as MediaLibrary from 'expo-media-library';
import { formatGiB, safeAvailable, type StorageAccount } from '@photosync/core';
import {
  backupAssetsToDrive,
  currentGoogleAccessToken,
  loadDevicePhotos,
  signInGoogle,
  type BackupProgress,
} from '../src/sync/mobileSync';

const demoAccounts: StorageAccount[] = [
  { id: '1', email: 'Google Drive đang dùng', appUsedBytes: 0, providerFreeBytes: 15 * 1024 ** 3 },
];

export default function Home() {
  const [tab, setTab] = useState<'photos' | 'search' | 'library'>('photos');
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [message, setMessage] = useState('Đang đọc thư viện ảnh...');

  useEffect(() => {
    void (async () => {
      try {
        const [assets, token] = await Promise.all([loadDevicePhotos(180), currentGoogleAccessToken()]);
        setPhotos(assets);
        setAccessToken(token);
        setMessage(token ? 'Sẵn sàng sao lưu lên Google Drive' : 'Kết nối Google để bật sao lưu');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return photos;
    const q = query.toLowerCase();
    return photos.filter(x => x.filename.toLowerCase().includes(q));
  }, [photos, query]);

  const available = useMemo(() => demoAccounts.reduce((sum, a) => sum + safeAvailable(a), 0), []);
  const syncing = progress ? progress.completed + progress.skipped + progress.failed < progress.total : false;

  async function connectGoogle() {
    try {
      setMessage('Đang đăng nhập Google...');
      const result = await signInGoogle();
      setAccessToken(result.accessToken);
      setGoogleEmail(result.user?.email ?? null);
      setMessage('Đã kết nối Google Drive');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function backupNow() {
    let token = accessToken;
    if (!token) {
      const result = await signInGoogle();
      token = result.accessToken;
      setAccessToken(token);
      setGoogleEmail(result.user?.email ?? null);
    }
    setProgress({ total: photos.length, completed: 0, skipped: 0, failed: 0 });
    setMessage('Đang sao lưu ảnh & video...');
    const result = await backupAssetsToDrive(token, photos, setProgress);
    setMessage(`Xong: ${result.completed} mới • ${result.skipped} đã có • ${result.failed} lỗi`);
  }

  return <SafeAreaView style={s.root}>
    <View style={s.header}>
      <View style={s.brand}><View style={s.brandMark}><Text style={s.brandP}>P</Text></View><Text style={s.logo}>PhotoSync</Text></View>
      <Pressable onPress={()=>setTab('library')} style={s.avatar}><Text style={s.avatarText}>{googleEmail?.[0]?.toUpperCase() || 'P'}</Text></Pressable>
    </View>

    {tab === 'photos' && <View style={s.flex}>
      <View style={s.titleRow}>
        <View><Text style={s.h1}>Ảnh</Text><Text style={s.muted}>{loading ? 'Đang tải...' : `${photos.length} mục trên thiết bị`}</Text></View>
        <Pressable onPress={()=>void backupNow()} style={[s.backupPill, syncing&&s.disabled]} disabled={syncing}><Text style={s.backupPillIcon}>☁</Text><Text style={s.backupPillText}>{syncing?'Đang sao lưu':'Sao lưu'}</Text></Pressable>
      </View>
      <View style={s.statusBar}><View style={[s.statusDot,{backgroundColor:accessToken?'#3ddc97':'#f0b55a'}]}/><Text style={s.statusText} numberOfLines={1}>{message}</Text></View>
      <ScrollView contentContainerStyle={s.galleryScroll}>
        <View style={s.monthRow}><View><Text style={s.month}>Tháng này</Text><Text style={s.monthCount}>{filtered.length} ảnh & video</Text></View><Text style={s.selectText}>Chọn</Text></View>
        <View style={s.grid}>{filtered.map(asset=><Pressable key={asset.id} style={s.photoCell}><Image source={{uri:asset.uri}} style={s.photo} contentFit="cover" transition={120}/>{asset.mediaType==='video'&&<View style={s.videoBadge}><Text style={s.videoBadgeText}>▶</Text></View>}</Pressable>)}</View>
        {photos.length===0&&!loading&&<View style={s.empty}><Text style={s.emptyIcon}>▧</Text><Text style={s.emptyTitle}>Chưa có ảnh được cấp quyền</Text><Text style={s.muted}>Vào Cài đặt hệ thống và cho PhotoSync quyền truy cập ảnh.</Text></View>}
      </ScrollView>
    </View>}

    {tab === 'search' && <ScrollView contentContainerStyle={s.page}>
      <Text style={s.h1Pad}>Tìm kiếm</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên ảnh hoặc video" placeholderTextColor="#76808f" style={s.search}/>
      <Text style={s.section}>Kết quả</Text>
      <View style={s.gridSearch}>{filtered.slice(0,30).map(asset=><Image key={asset.id} source={{uri:asset.uri}} style={s.searchPhoto} contentFit="cover"/>)}</View>
    </ScrollView>}

    {tab === 'library' && <ScrollView contentContainerStyle={s.page}>
      <Text style={s.h1Pad}>Thư viện</Text>
      <View style={s.heroCard}><View><Text style={s.heroEyebrow}>SAO LƯU GOOGLE DRIVE</Text><Text style={s.heroTitle}>{accessToken?'Đã bật':'Chưa kết nối'}</Text><Text style={s.heroSub}>{googleEmail || 'Ảnh sẽ tự xuất hiện trên laptop sau khi upload.'}</Text></View><Text style={s.heroCloud}>☁</Text></View>
      {progress&&<View style={s.progressCard}><View style={s.progressHead}><Text style={s.cardTitle}>Tiến trình sao lưu</Text><Text style={s.progressPct}>{progress.total?Math.round(((progress.completed+progress.skipped+progress.failed)/progress.total)*100):0}%</Text></View><View style={s.track}><View style={[s.fill,{width:`${progress.total?((progress.completed+progress.skipped+progress.failed)/progress.total)*100:0}%`}]} /></View><Text style={s.muted}>{progress.current || `${progress.completed} mới • ${progress.skipped} đã có • ${progress.failed} lỗi`}</Text></View>}
      <View style={s.backupCard}><Text style={s.cardTitle}>Thiết bị này</Text><Text style={s.bigStat}>{photos.length}</Text><Text style={s.muted}>ảnh & video gần nhất đang được quản lý</Text><Pressable style={s.primary} onPress={()=>void backupNow()} disabled={syncing}><Text style={s.primaryText}>{syncing?'Đang sao lưu...':'Sao lưu ngay'}</Text></Pressable></View>
      <Text style={s.section}>Tài khoản lưu trữ</Text>
      <View style={s.account}><View style={s.g}><Text style={s.gText}>G</Text></View><View style={s.flex}><Text style={s.accountEmail}>{googleEmail||'Google Drive'}</Text><Text style={s.muted}>{accessToken?'Đã cấp quyền drive.file':'Chưa đăng nhập'}</Text><View style={s.track}><View style={[s.fill,{width:'0%'}]} /></View></View></View>
      <Pressable style={s.add} onPress={()=>void connectGoogle()}><Text style={s.addText}>＋ {accessToken?'Đổi tài khoản Google':'Kết nối Google Drive'}</Text></Pressable>
      <View style={s.notice}><Text style={s.noticeTitle}>Giới hạn an toàn</Text><Text style={s.noticeText}>PhotoSync tối đa 10 GB trên mỗi Gmail và luôn giữ lại ít nhất 5 GB. Dung lượng an toàn hiện tính theo quota Drive: {formatGiB(available)}.</Text></View>
    </ScrollView>}

    <View style={s.nav}>{[['photos','Ảnh','▧'],['search','Tìm kiếm','⌕'],['library','Thư viện','▤']].map(([id,label,icon])=><Pressable key={id} onPress={()=>setTab(id as any)} style={s.navItem}><Text style={[s.navIcon,tab===id&&s.active]}>{icon}</Text><Text style={[s.navText,tab===id&&s.active]}>{label}</Text></Pressable>)}</View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#070a0f'},flex:{flex:1},header:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#111821'},brand:{flexDirection:'row',alignItems:'center',gap:9},brandMark:{width:28,height:28,borderRadius:8,backgroundColor:'#2f80ed',alignItems:'center',justifyContent:'center'},brandP:{color:'white',fontWeight:'900'},logo:{color:'#f7f9fc',fontWeight:'800',fontSize:19},avatar:{width:34,height:34,borderRadius:17,backgroundColor:'#243449',alignItems:'center',justifyContent:'center'},avatarText:{color:'white',fontWeight:'800'},titleRow:{paddingHorizontal:18,paddingTop:14,paddingBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},h1:{color:'#f7f9fc',fontSize:30,fontWeight:'800'},h1Pad:{color:'#f7f9fc',fontSize:30,fontWeight:'800',marginHorizontal:18,marginTop:16},muted:{color:'#7f8a99',marginTop:4,lineHeight:19},backupPill:{height:38,paddingHorizontal:14,borderRadius:19,backgroundColor:'#12345a',flexDirection:'row',alignItems:'center',gap:7},backupPillIcon:{color:'#62a8ff'},backupPillText:{color:'#83bbff',fontWeight:'700'},disabled:{opacity:.55},statusBar:{marginHorizontal:18,marginBottom:8,height:34,borderRadius:10,backgroundColor:'#0e141d',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:8},statusDot:{width:7,height:7,borderRadius:4},statusText:{color:'#9aa7b6',fontSize:12,flex:1},galleryScroll:{paddingBottom:100},monthRow:{paddingHorizontal:18,paddingVertical:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},month:{color:'#eef2f7',fontWeight:'800',fontSize:16},monthCount:{color:'#687585',fontSize:12,marginTop:2},selectText:{color:'#55a0ff',fontWeight:'700'},grid:{flexDirection:'row',flexWrap:'wrap',gap:2,paddingHorizontal:2},photoCell:{width:'33.05%',aspectRatio:1,backgroundColor:'#111820',position:'relative'},photo:{width:'100%',height:'100%'},videoBadge:{position:'absolute',right:7,bottom:7,width:24,height:24,borderRadius:12,backgroundColor:'#0009',alignItems:'center',justifyContent:'center'},videoBadgeText:{color:'white',fontSize:10},empty:{padding:45,alignItems:'center'},emptyIcon:{fontSize:42,color:'#3a4655'},emptyTitle:{color:'#e9eef4',fontWeight:'800',fontSize:18,marginTop:12},page:{paddingBottom:110},search:{margin:18,marginBottom:4,backgroundColor:'#131a23',color:'white',padding:15,borderRadius:22,fontSize:15},section:{color:'#f2f5f8',fontSize:16,fontWeight:'800',marginHorizontal:18,marginTop:18,marginBottom:10},gridSearch:{paddingHorizontal:4,flexDirection:'row',flexWrap:'wrap',gap:3},searchPhoto:{width:'32.8%',aspectRatio:1,borderRadius:5,backgroundColor:'#151c24'},heroCard:{margin:18,padding:20,borderRadius:22,backgroundColor:'#0d2541',borderWidth:1,borderColor:'#163d68',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heroEyebrow:{color:'#6caeff',fontSize:11,fontWeight:'900',letterSpacing:1},heroTitle:{color:'white',fontSize:25,fontWeight:'900',marginTop:5},heroSub:{color:'#a8bfd9',marginTop:5,maxWidth:260},heroCloud:{fontSize:42},progressCard:{marginHorizontal:18,marginBottom:12,padding:16,borderRadius:18,backgroundColor:'#101720'},progressHead:{flexDirection:'row',justifyContent:'space-between'},progressPct:{color:'#62a8ff',fontWeight:'900'},backupCard:{marginHorizontal:18,marginBottom:12,padding:18,borderRadius:18,backgroundColor:'#101720'},cardTitle:{color:'#edf2f7',fontWeight:'800',fontSize:16},bigStat:{color:'#fff',fontSize:34,fontWeight:'900',marginTop:7},primary:{marginTop:15,backgroundColor:'#2f80ed',padding:14,borderRadius:13,alignItems:'center'},primaryText:{color:'white',fontWeight:'800'},account:{marginHorizontal:18,marginBottom:10,padding:15,borderRadius:17,backgroundColor:'#101720',flexDirection:'row',gap:12,alignItems:'center'},g:{width:40,height:40,borderRadius:20,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},gText:{fontWeight:'900',color:'#4285f4',fontSize:20},accountEmail:{color:'#eef3f7',fontWeight:'700'},track:{height:5,backgroundColor:'#222d39',borderRadius:10,overflow:'hidden',marginTop:10},fill:{height:5,backgroundColor:'#3b82f6'},add:{marginHorizontal:18,padding:15,borderRadius:14,borderWidth:1,borderColor:'#26384d',alignItems:'center'},addText:{color:'#62a8ff',fontWeight:'700'},notice:{margin:18,padding:15,borderRadius:15,backgroundColor:'#17140c',borderWidth:1,borderColor:'#2f2915'},noticeTitle:{color:'#e2cd82',fontWeight:'800',marginBottom:5},noticeText:{color:'#aa9c6b',lineHeight:20},nav:{position:'absolute',left:0,right:0,bottom:0,height:78,backgroundColor:'#090e14f5',borderTopWidth:1,borderTopColor:'#17212c',flexDirection:'row',alignItems:'center',justifyContent:'space-around'},navItem:{alignItems:'center',minWidth:90},navIcon:{fontSize:22,color:'#788493'},navText:{fontSize:12,color:'#788493',marginTop:4},active:{color:'#4ea1ff'}
});
