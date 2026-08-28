import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatGiB, safeAvailable, type StorageAccount } from '@photosync/core';

const photos = Array.from({ length: 18 }, (_, i) => ({
  id: String(i + 1),
  uri: `https://picsum.photos/seed/photosync-${i + 1}/600/600`,
}));

const accounts: StorageAccount[] = [
  { id: '1', email: 'khanh@gmail.com', appUsedBytes: 8.2 * 1024 ** 3, providerFreeBytes: 6.8 * 1024 ** 3 },
  { id: '2', email: 'khanh.work@gmail.com', appUsedBytes: 4.1 * 1024 ** 3, providerFreeBytes: 10.9 * 1024 ** 3 },
  { id: '3', email: 'backup.family@gmail.com', appUsedBytes: 2.7 * 1024 ** 3, providerFreeBytes: 12.3 * 1024 ** 3 },
];

export default function Home() {
  const [tab, setTab] = useState<'photos' | 'search' | 'library'>('photos');
  const [query, setQuery] = useState('');
  const available = useMemo(() => accounts.reduce((sum, a) => sum + safeAvailable(a), 0), []);

  return <SafeAreaView style={s.root}>
    <View style={s.header}><Text style={s.logo}>PhotoSync</Text><View style={s.avatar}><Text style={s.avatarText}>K</Text></View></View>
    {tab === 'photos' && <>
      <View style={s.titleRow}><View><Text style={s.h1}>Ảnh</Text><Text style={s.muted}>Đã sao lưu an toàn</Text></View><Pressable style={s.cloud}><Text>☁️ ✓</Text></Pressable></View>
      <Text style={s.section}>Hôm nay</Text>
      <FlatList data={photos} numColumns={3} keyExtractor={x => x.id} contentContainerStyle={s.grid} columnWrapperStyle={{ gap: 3 }} renderItem={({item}) => <Image source={{uri:item.uri}} style={s.photo} />} />
    </>}
    {tab === 'search' && <ScrollView contentContainerStyle={s.page}>
      <TextInput value={query} onChangeText={setQuery} placeholder="Tìm ảnh của bạn" placeholderTextColor="#76808f" style={s.search} />
      <Text style={s.section}>Mọi người & thú cưng</Text><View style={s.people}>{['An','Bố','Mẹ','Miu'].map((x,i)=><View key={x} style={s.person}><Image source={{uri:`https://picsum.photos/seed/p-${i}/160/160`}} style={s.face}/><Text style={s.personText}>{x}</Text></View>)}</View>
      <Text style={s.section}>Khám phá</Text><View style={s.cards}>{['Địa điểm','Video','Ảnh chụp màn hình','Tài liệu'].map(x=><View key={x} style={s.card}><Text style={s.cardTitle}>{x}</Text></View>)}</View>
    </ScrollView>}
    {tab === 'library' && <ScrollView contentContainerStyle={s.page}>
      <Text style={s.h1}>Thư viện</Text><View style={s.backupCard}><Text style={s.cardTitle}>Sao lưu & đồng bộ</Text><Text style={s.muted}>Còn {formatGiB(available)} có thể dùng an toàn</Text></View>
      <Text style={s.section}>Tài khoản lưu trữ</Text>{accounts.map(a=><View key={a.id} style={s.account}><View style={s.g}><Text style={s.gText}>G</Text></View><View style={{flex:1}}><Text style={s.accountEmail}>{a.email}</Text><Text style={s.muted}>Có thể dùng: {formatGiB(safeAvailable(a))}</Text><View style={s.track}><View style={[s.fill,{width:`${Math.min(100,(a.appUsedBytes/(10*1024**3))*100)}%`}]} /></View></View></View>)}
      <Pressable style={s.add}><Text style={s.addText}>＋ Thêm tài khoản Google</Text></Pressable>
      <View style={s.notice}><Text style={s.noticeText}>Mỗi tài khoản tối đa 10 GB cho PhotoSync và luôn chừa ít nhất 5 GB.</Text></View>
    </ScrollView>}
    <View style={s.nav}>{[['photos','Ảnh','▧'],['search','Tìm kiếm','⌕'],['library','Thư viện','▤']].map(([id,label,icon])=><Pressable key={id} onPress={()=>setTab(id as any)} style={s.navItem}><Text style={[s.navIcon,tab===id&&s.active]}>{icon}</Text><Text style={[s.navText,tab===id&&s.active]}>{label}</Text></Pressable>)}</View>
  </SafeAreaView>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#090d12'},header:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},logo:{color:'#f7f9fc',fontWeight:'800',fontSize:20},avatar:{width:32,height:32,borderRadius:16,backgroundColor:'#315f90',alignItems:'center',justifyContent:'center'},avatarText:{color:'white',fontWeight:'800'},titleRow:{paddingHorizontal:18,paddingTop:8,paddingBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},h1:{color:'#f7f9fc',fontSize:30,fontWeight:'800'},muted:{color:'#7f8a99',marginTop:3},cloud:{backgroundColor:'#111821',borderRadius:18,padding:10},section:{color:'#f2f5f8',fontSize:16,fontWeight:'750',marginHorizontal:18,marginTop:16,marginBottom:10},grid:{paddingHorizontal:3,paddingBottom:92,gap:3},photo:{flex:1,aspectRatio:1,borderRadius:4,backgroundColor:'#151c24'},page:{paddingBottom:100},search:{margin:18,marginBottom:4,backgroundColor:'#151b23',color:'white',padding:15,borderRadius:24,fontSize:15},people:{paddingHorizontal:18,flexDirection:'row',gap:18},person:{alignItems:'center'},face:{width:64,height:64,borderRadius:32},personText:{color:'#dfe5eb',marginTop:6},cards:{paddingHorizontal:18,flexDirection:'row',flexWrap:'wrap',gap:10},card:{width:'47%',height:90,borderRadius:16,backgroundColor:'#121923',padding:14,justifyContent:'flex-end'},cardTitle:{color:'#edf2f7',fontWeight:'700',fontSize:16},backupCard:{margin:18,padding:18,borderRadius:18,backgroundColor:'#101824'},account:{marginHorizontal:18,marginBottom:10,padding:14,borderRadius:16,backgroundColor:'#111820',flexDirection:'row',gap:12,alignItems:'center'},g:{width:38,height:38,borderRadius:19,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},gText:{fontWeight:'900',color:'#4285f4',fontSize:20},accountEmail:{color:'#eef3f7',fontWeight:'700'},track:{height:5,backgroundColor:'#222d39',borderRadius:10,overflow:'hidden',marginTop:8},fill:{height:5,backgroundColor:'#3b82f6'},add:{margin:18,padding:15,borderRadius:14,borderWidth:1,borderColor:'#26384d',alignItems:'center'},addText:{color:'#62a8ff',fontWeight:'700'},notice:{marginHorizontal:18,padding:14,borderRadius:14,backgroundColor:'#15130d'},noticeText:{color:'#cdbf8f',lineHeight:20},nav:{position:'absolute',left:0,right:0,bottom:0,height:78,backgroundColor:'#0b1016ee',borderTopWidth:1,borderTopColor:'#17212c',flexDirection:'row',alignItems:'center',justifyContent:'space-around'},navItem:{alignItems:'center',minWidth:90},navIcon:{fontSize:22,color:'#788493'},navText:{fontSize:12,color:'#788493',marginTop:4},active:{color:'#4ea1ff'}});
