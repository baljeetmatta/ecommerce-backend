import { useState } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Screen } from '@/components/Screen';
import { Banner, HomeSection } from '@/components/HomeContent';
import { Button, Field } from '@/components/Ui';
import { useShop } from '@/context/ShopContext';
import { api, mediaUrl } from '@/lib/api';
import { openStoreLink } from '@/lib/navigation';
import { plainText } from '@/components/HomeContent';
import { colors } from '@/theme';
const defaults=['shipping_info','browse_collections','seasonal_banner','new_arrivals','promo_banner','blog'].map((type,sortOrder)=>({type,sortOrder,isActive:true}));
export default function Home(){
 const {store,loading,error,reload}=useShop();const {width}=useWindowDimensions();const focused=useIsFocused();const [slide,setSlide]=useState(0);const [email,setEmail]=useState('');const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
 const slides=store.heroItems.length?store.heroItems:store.banner?[store.banner]:[];
 const sections=[...(store.settings.homeSections?.length?store.settings.homeSections:defaults)].filter(s=>s.isActive!==false).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
 const subscribe=async()=>{setBusy(true);try{setStatus((await api.newsletter(email.trim())).message);setEmail('')}catch(e:any){setStatus(e.message)}finally{setBusy(false)}};
 return <Screen><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={reload}/>} contentContainerStyle={s.content}>
 <Pressable onPress={()=>router.push('/search')} style={s.search}><Text style={{color:colors.muted}}>⌕  Search products, brands and categories</Text></Pressable>
 {!!error&&<View style={s.error}><Text style={{color:colors.danger}}>{error}</Text><Button title="Retry" onPress={reload}/></View>}
 {loading&&!store.categories.length?<ActivityIndicator color={colors.primary}/>:null}
 {slides.length>0&&<View style={{gap:10}}><Banner key={slides[slide%slides.length]?._id||slide} item={slides[slide%slides.length]} active={focused}/>{slides.length>1&&<View style={s.dots}>{slides.map((_,i)=><Pressable key={i} accessibilityLabel={`Banner ${i+1}`} onPress={()=>setSlide(i)} style={[s.dot,i===slide&&{backgroundColor:colors.primary,width:24}]}/>)}</View>}</View>}
 <View style={s.banners}>{(store.productBanners||[]).filter(b=>store.products.some(p=>p._id===String(b.product?._id||b.product)&&p.displayType!=='Reel')).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(b=><Pressable key={b._id} onPress={()=>router.push({pathname:'/product/[id]',params:{id:String(b.product?._id||b.product)}})} style={{width:width>=768&&store.productBannerColumns!==1?'48%':'100%'}}><Image source={{uri:mediaUrl(b.imageUrl)}} style={{width:'100%',aspectRatio:2,borderRadius:16}} resizeMode="cover"/>{b.title&&<Text style={s.bannerTitle}>{b.title}</Text>}</Pressable>)}</View>
 {sections.map((section,index)=><HomeSection key={section._id||`${section.type}-${index}`} section={section}/>)}
 <View style={s.news}><Text style={s.title}>Stay in the loop</Text><Text style={s.muted}>Subscribe for new arrivals and offers.</Text><Field value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email address"/><Button title="Subscribe" loading={busy} onPress={subscribe}/>{status&&<Text style={s.muted}>{status}</Text>}</View>
 <View style={{gap:12}}>{(store.settings.footerColumns||[]).map((column:any,index:number)=><View key={column._id||index} style={{gap:10}}><Text style={s.title}>{column.title}</Text>{column.type==='text'&&<Text style={s.muted}>{plainText(column.text)}</Text>}{column.type==='links'&&(column.links||[]).map((link:any,i:number)=><Pressable key={i} onPress={()=>openStoreLink(link.url)}><Text style={s.link}>{link.label} ›</Text></Pressable>)}</View>)}{(store.settings.pages||[]).filter((p:any)=>p.isActive&&['footer','both'].includes(p.menu)).map((p:any)=><Pressable key={p.slug} onPress={()=>router.push({pathname:'/page/[slug]',params:{slug:p.slug}})}><Text style={s.link}>{p.title} ›</Text></Pressable>)}<Pressable onPress={()=>router.push('/contact')}><Text style={s.link}>Contact us ›</Text></Pressable><Text style={s.muted}>{store.settings.copyrightText}</Text></View>
 </ScrollView></Screen>;
}
const s=StyleSheet.create({content:{padding:16,gap:24,paddingBottom:35},search:{padding:16,backgroundColor:'white',borderRadius:14,borderWidth:1,borderColor:colors.line},error:{backgroundColor:'#fff0f0',padding:14,gap:10,borderRadius:14},dots:{flexDirection:'row',gap:8,justifyContent:'center'},dot:{width:10,height:10,borderRadius:5,backgroundColor:colors.line},banners:{flexDirection:'row',flexWrap:'wrap',gap:12},bannerTitle:{fontWeight:'800',marginTop:6},news:{padding:22,borderRadius:20,backgroundColor:colors.primarySoft,gap:12},title:{fontSize:23,fontWeight:'900',color:colors.primaryDark},muted:{color:colors.muted,lineHeight:22},link:{color:colors.primary,fontWeight:'700'}});
