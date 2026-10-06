import { useLocalSearchParams } from 'expo-router';
import { useMemo,useState } from 'react';
import { FlatList,View,useWindowDimensions } from 'react-native';
import { ProductCard } from '@/components/ProductCard';
import { Screen } from '@/components/Screen';
import { EmptyState,Field } from '@/components/Ui';
import { useShop } from '@/context/ShopContext';
export default function Search(){const params=useLocalSearchParams<{q?:string}>();const {store}=useShop();const [q,setQ]=useState(params.q||'');const {width}=useWindowDimensions();const columns=width>=1000?4:width>=768?3:2;const cardWidth=(Math.min(width,1200)-28-12*(columns-1))/columns;const results=useMemo(()=>q.trim()?store.products.filter(p=>p.displayType!=='Reel'&&`${p.name} ${p.shortDescription||''} ${p.manufacturerBrand||''} ${typeof p.category==='object'?p.category.name:''}`.toLowerCase().includes(q.toLowerCase())):[],[q,store.products]);return <Screen title="Search" back><View style={{padding:16}}><Field autoFocus value={q} onChangeText={setQ} placeholder="Search products, category or brand"/></View><FlatList key={columns} data={results} numColumns={columns} columnWrapperStyle={{gap:12}} contentContainerStyle={{padding:14,gap:12}} renderItem={({item})=><ProductCard product={item} width={cardWidth}/>} keyExtractor={p=>p._id} ListEmptyComponent={<EmptyState icon="search-outline" title={q?'No matches':'Find your favourites'} message={q?'Check the spelling or try a broader term.':'Search by product, category or brand.'}/>}/></Screen>}
