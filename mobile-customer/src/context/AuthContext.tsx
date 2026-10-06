import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { api, setApiToken } from '@/lib/api';
import type { Customer } from '@/types';
const tokenStorage = {
 get: () => Platform.OS === 'web' ? AsyncStorage.getItem('customer_token') : SecureStore.getItemAsync('customer_token'),
 set: (token:string) => Platform.OS === 'web' ? AsyncStorage.setItem('customer_token',token) : SecureStore.setItemAsync('customer_token',token),
 remove: () => Platform.OS === 'web' ? AsyncStorage.removeItem('customer_token') : SecureStore.deleteItemAsync('customer_token'),
};
type AuthValue = { customer:Customer|null; token:string|null; ready:boolean; login:(email:string,password:string)=>Promise<void>; register:(data:any)=>Promise<void>; logout:()=>Promise<void>; refresh:()=>Promise<void> };
const AuthContext=createContext<AuthValue>({} as AuthValue);
export function AuthProvider({children}:PropsWithChildren) {
 const [customer,setCustomer]=useState<Customer|null>(null); const [token,setToken]=useState<string|null>(null); const [ready,setReady]=useState(false);
 useEffect(()=>{(async()=>{try {const saved=await tokenStorage.get(); if(saved){setApiToken(saved);try{const r=await api.me();setCustomer(r.customer);setToken(saved)}catch(error:any){if(error.status===401||error.status===403)await tokenStorage.remove();setApiToken(null);}}}finally{setReady(true)}})().catch(()=>setReady(true));},[]);
 const accept=async(r:any)=>{await tokenStorage.set(r.token);setApiToken(r.token);setToken(r.token);setCustomer(r.customer)};
 const login=async(email:string,password:string)=>accept(await api.login({email,password}));
 const register=async(data:any)=>accept(await api.register(data));
 const logout=async()=>{await tokenStorage.remove();setApiToken(null);setToken(null);setCustomer(null)};
 const refresh=async()=>setCustomer((await api.me()).customer);
 return <AuthContext.Provider value={{customer,token,ready,login,register,logout,refresh}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
