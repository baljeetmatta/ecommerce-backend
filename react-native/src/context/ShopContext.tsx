import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import type { CartItem, Product, Storefront, Variant } from "@/types";

const empty:Storefront={products:[],featuredProducts:[],categories:[],heroItems:[],settings:{}};
type Value={store:Storefront; loading:boolean; error:string; cart:CartItem[]; wishlist:Product[]; reload:()=>Promise<void>; addToCart:(p:Product,v?:Variant)=>void; setQuantity:(key:string,q:number)=>void; removeFromCart:(key:string)=>void; toggleWishlist:(p:Product)=>void; cartCount:number; subtotal:number};
const ShopContext=createContext<Value>({} as Value);
export function ShopProvider({children}:PropsWithChildren){
 const {customer}=useAuth(); const [store,setStore]=useState(empty); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [cart,setCart]=useState<CartItem[]>([]); const [wishlist,setWishlist]=useState<Product[]>([]); const [hydrated,setHydrated]=useState(false);
 const reload=async()=>{setLoading(true);setError("");try{const boot=await api.bootstrap();setStore(s=>({...s,...boot}));const catalog=await api.catalog();setStore(s=>({...s,...catalog}));}catch(e:any){setError(e.message||"Unable to load shop");}finally{setLoading(false)}};
 useEffect(()=>{reload();Promise.all([AsyncStorage.getItem("mobile_cart"),AsyncStorage.getItem("mobile_wishlist")]).then(([c,w])=>{try{if(c)setCart(JSON.parse(c));if(w)setWishlist(JSON.parse(w));}catch{}setHydrated(true)});},[]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem("mobile_cart",JSON.stringify(cart));},[cart,hydrated]); useEffect(()=>{if(hydrated)AsyncStorage.setItem("mobile_wishlist",JSON.stringify(wishlist));},[wishlist,hydrated]);
 useEffect(()=>{if(!customer)return;api.cart().then(r=>{if(r.items?.length)setCart(r.items.map((i:any)=>({key:`${i.product._id}:${i.variant?.sku||"base"}`,product:i.product,variant:i.variant||{},quantity:i.quantity})));}).catch(()=>{});},[customer?.id,customer?._id]);
 useEffect(()=>{if(!customer||!hydrated)return;const t=setTimeout(()=>api.saveCart(cart).catch(()=>{}),500);return()=>clearTimeout(t);},[cart,customer?.id,customer?._id,hydrated]);
 const addToCart=(product:Product,variant?:Variant)=>setCart(items=>{const key=`${product._id}:${variant?.sku||"base"}`;const old=items.find(i=>i.key===key);return old?items.map(i=>i.key===key?{...i,quantity:i.quantity+1}:i):[...items,{key,product,variant,quantity:1}]});
 const setQuantity=(key:string,q:number)=>setCart(items=>q<1?items.filter(i=>i.key!==key):items.map(i=>i.key===key?{...i,quantity:q}:i));
 const removeFromCart=(key:string)=>setCart(items=>items.filter(i=>i.key!==key));
 const toggleWishlist=(p:Product)=>setWishlist(items=>items.some(i=>i._id===p._id)?items.filter(i=>i._id!==p._id):[...items,p]);
 const cartCount=cart.reduce((n,i)=>n+i.quantity,0); const subtotal=cart.reduce((n,i)=>n+Number(i.variant?.price??i.product.offerPrice??i.product.price)*i.quantity,0);
 const value=useMemo(()=>({store,loading,error,cart,wishlist,reload,addToCart,setQuantity,removeFromCart,toggleWishlist,cartCount,subtotal}),[store,loading,error,cart,wishlist,cartCount,subtotal]);
 return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
export const useShop=()=>useContext(ShopContext);

