import { useLocalSearchParams } from 'expo-router';
import { useEffect,useState } from 'react';
import { ScrollView,Text,ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { ProductGrid } from '@/components/HomeContent';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
export default function Seller(){const {id}=useLocalSearchParams<{id:string}>();const {store}=useShop();const [seller,setSeller]=useState<any>();const [error,setError]=useState('');useEffect(()=>{api.seller(id).then(setSeller).catch(e=>setError(e.message))},[id]);return <Screen title={seller?.companyName||'Seller store'} back><ScrollView contentContainerStyle={{padding:16,gap:16}}>{error?<Text>{error}</Text>:!seller?<ActivityIndicator/>:<><Text style={{fontSize:27,fontWeight:'900'}}>{seller.companyName}</Text><Text>{seller.city} {seller.state}</Text><ProductGrid products={store.products.filter(p=>p.displayType!=='Reel'&&(p.seller?._id===id||p.seller?.sellerNumber===id))}/></>}</ScrollView></Screen>}
