import { FlatList,useWindowDimensions } from 'react-native';
import { Screen } from '@/components/Screen';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/Ui';
import { useShop } from '@/context/ShopContext';
export default function Wishlist(){const {wishlist,store}=useShop();const {width}=useWindowDimensions();const columns=width>=1000?4:width>=768?3:2;const cardWidth=(Math.min(width,1200)-28-12*(columns-1))/columns;return <Screen title="Wishlist" back><FlatList key={columns} data={wishlist} numColumns={columns} columnWrapperStyle={{gap:12}} contentContainerStyle={{padding:14,gap:12}} keyExtractor={p=>p._id} renderItem={({item})=><ProductCard product={store.products.find(p=>p._id===item._id)||item} width={cardWidth}/>} ListEmptyComponent={<EmptyState icon="heart-outline" title="Nothing saved yet" message="Tap the heart on a product to keep it here."/>}/></Screen>}
