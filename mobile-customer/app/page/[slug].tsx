import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { RichContent } from '@/components/RichContent';
import { useShop } from '@/context/ShopContext';
export default function Page(){const {slug}=useLocalSearchParams<{slug:string}>();const {store,loading}=useShop();const page=store.settings.pages?.find((p:any)=>p.slug===slug&&p.isActive);return <Screen title={page?.title||'Page'} back><ScrollView contentContainerStyle={{padding:20,gap:18}}>{loading&&!page?<ActivityIndicator/>:page?<><Text style={{fontSize:27,fontWeight:'900'}}>{page.title}</Text><RichContent html={page.content||''}/></>:<Text>This page is unavailable.</Text>}</ScrollView></Screen>}
