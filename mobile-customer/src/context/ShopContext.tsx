import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { availableStock, productPrice, mergeCarts } from '@/lib/commerce';
import { useAuth } from './AuthContext';
import type { CartItem, Product, Storefront, Variant } from '@/types';
const empty:Storefront={products:[],featuredProducts:[],categories:[],heroItems:[],settings:{}};
type Value={store:Storefront;loading:boolean;error:string;cart:CartItem[];wishlist:Product[];reload:()=>Promise<void>;addToCart:(p:Product,v?:Variant)=>boolean;setQuantity:(key:string,q:number)=>void;removeFromCart:(key:string)=>void;clearCart:()=>void;toggleWishlist:(p:Product)=>void;cartCount:number;subtotal:number;syncError:string;retryCart:()=>void};
const ShopContext=createContext<Value>({} as Value);
export function ShopProvider({children}:PropsWithChildren){
 const {customer,ready}=useAuth(); const owner=String(customer?.id||customer?._id||'guest');
 const [store,setStore]=useState(empty); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [cart,setCart]=useState<CartItem[]>([]);const [wishlist,setWishlist]=useState<Product[]>([]); const [loadedOwner,setLoadedOwner]=useState('');const [cartRevision,setCartRevision]=useState(0);const [syncError,setSyncError]=useState('');
 const currentOwner=useRef(owner);currentOwner.current=owner; const version=useRef(0);const loadingStore=useRef(false);const syncQueue=useRef<Promise<void>>(Promise.resolve());
 const reload=async()=>{if(loadingStore.current)return;loadingStore.current=true;setLoading(true);setError('');try{const [boot,catalog]=await Promise.all([api.bootstrap(),api.catalog()]);const products=catalog.products||[];const ids=new Set(catalog.featuredProductIds||[]);setStore({...empty,...boot,...catalog,featuredProducts:products.filter((p:Product)=>p.displayType!=='Reel'&&ids.has(p._id))});}catch(e:any){setError(e.message)}finally{setLoading(false);loadingStore.current=false}};
 useEffect(()=>{void reload()},[]);
 useEffect(()=>{if(!ready)return;let cancelled=false;setLoadedOwner('');setCart([]);setWishlist([]);setSyncError('');(async()=>{
  const [savedCart,savedWishlist]=await Promise.all([AsyncStorage.getItem(`customer_cart_${owner}`),AsyncStorage.getItem(`customer_wishlist_${owner}`)]);
  let items:CartItem[]=[];let saved:Product[]=[];try{items=JSON.parse(savedCart||'[]');saved=JSON.parse(savedWishlist||'[]')}catch{}
  if(owner!=='guest'){try{const r=await api.cart();items=(r.items||[]).map((i:any)=>({key:`${i.product._id}:${i.variant?.sku||'base'}`,product:i.product,variant:i.variant||undefined,quantity:i.quantity}));
   const guest=JSON.parse(await AsyncStorage.getItem('customer_cart_guest')||'[]') as CartItem[];
   const guestSaved=JSON.parse(await AsyncStorage.getItem('customer_wishlist_guest')||'[]') as Product[];
   saved=[...saved,...guestSaved.filter(p=>!saved.some(s=>s._id===p._id))];
   if(guestSaved.length){await AsyncStorage.setItem(`customer_wishlist_${owner}`,JSON.stringify(saved));await AsyncStorage.removeItem('customer_wishlist_guest');}
   if(guest.length){items=mergeCarts(items,guest);await api.saveCart(items);await AsyncStorage.removeItem('customer_cart_guest');}
  }catch(e:any){if(!cancelled)setSyncError(`Cart sync unavailable: ${e.message}`);return;}}
  if(!cancelled){setCart(items);setWishlist(saved);setLoadedOwner(owner)}
 })().catch((e)=>{if(!cancelled)setSyncError(e.message)});return()=>{cancelled=true}},[owner,ready,cartRevision]);
 useEffect(()=>{if(loadedOwner!==owner)return;void AsyncStorage.setItem(`customer_cart_${owner}`,JSON.stringify(cart));const revision=++version.current;if(owner==='guest')return;
  const timer=setTimeout(()=>{syncQueue.current=syncQueue.current.catch(()=>{}).then(async()=>{
   if(currentOwner.current!==owner||version.current!==revision)return;
   try{await api.saveCart(cart);if(currentOwner.current===owner&&version.current===revision)setSyncError('')}
   catch(e:any){if(currentOwner.current===owner&&version.current===revision)setSyncError(`Cart sync unavailable: ${e.message}`)}
  })},600);return()=>clearTimeout(timer);
 },[cart,owner,loadedOwner]);
 useEffect(()=>{if(loadedOwner===owner)void AsyncStorage.setItem(`customer_wishlist_${owner}`,JSON.stringify(wishlist))},[wishlist,owner,loadedOwner]);
 useEffect(()=>{if(!store.products.length||loadedOwner!==owner)return;setCart(items=>items.map(i=>{const p=store.products.find(p=>p._id===i.product._id);return p?{...i,product:p,variant:i.variant?.sku?p.variants?.find(v=>v.sku===i.variant?.sku):undefined}:i}));},[store.products,loadedOwner]);
 const addToCart=(product:Product,variant?:Variant)=>{
  if(loadedOwner!==owner){Alert.alert('Cart loading','Please wait until your saved cart has loaded.');return false;}
  if(product.variationOptions?.length&&!variant){Alert.alert('Choose an option','Select an available product variation first.');return false;}
  const key=`${product._id}:${variant?.sku||'base'}`;const quantity=(cart.find(i=>i.key===key)?.quantity||0)+1;
  if(quantity>availableStock(product,variant)){Alert.alert('Stock limit','This quantity is unavailable.');return false;}
  setCart(items=>{const old=items.find(i=>i.key===key);return old?items.map(i=>i.key===key?{...i,quantity:i.quantity+1}:i):[...items,{key,product,variant,quantity:1}]});return true;
 };
 const setQuantity=(key:string,q:number)=>setCart(items=>q<1?items.filter(i=>i.key!==key):items.map(i=>i.key===key?{...i,quantity:Math.min(Math.max(1,Math.floor(q)),availableStock(i.product,i.variant))}:i).filter(i=>i.quantity>0));
 const removeFromCart=(key:string)=>setCart(items=>items.filter(i=>i.key!==key));const clearCart=()=>setCart([]);
 const toggleWishlist=(p:Product)=>setWishlist(items=>items.some(i=>i._id===p._id)?items.filter(i=>i._id!==p._id):[...items,p]);
 const subtotal=cart.reduce((n,i)=>n+productPrice(i.product,i.variant)*i.quantity,0);const cartCount=cart.reduce((n,i)=>n+i.quantity,0);
 return <ShopContext.Provider value={{store,loading,error,cart,wishlist,reload,addToCart,setQuantity,removeFromCart,clearCart,toggleWishlist,cartCount,subtotal,syncError,retryCart:()=>{if(loadedOwner===owner&&owner!=="guest")void api.saveCart(cart).then(()=>setSyncError("")).catch(e=>setSyncError(e.message));else setCartRevision(v=>v+1)}}}>{children}</ShopContext.Provider>;
}
export const useShop=()=>useContext(ShopContext);
