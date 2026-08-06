import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { api, setApiToken } from "@/lib/api";
import type { Customer } from "@/types";

type AuthValue = { customer:Customer|null; token:string|null; ready:boolean; login:(email:string,password:string)=>Promise<void>; register:(data:any)=>Promise<void>; logout:()=>Promise<void>; refresh:()=>Promise<void> };
const AuthContext = createContext<AuthValue>({} as AuthValue);
export function AuthProvider({ children }:PropsWithChildren) {
  const [customer,setCustomer] = useState<Customer|null>(null); const [token,setToken] = useState<string|null>(null); const [ready,setReady] = useState(false);
  useEffect(() => { (async () => { const saved=await AsyncStorage.getItem("customer_token"); if(saved){ setApiToken(saved); setToken(saved); try { const r=await api.me(); setCustomer(r.customer); } catch { await AsyncStorage.removeItem("customer_token"); setApiToken(null); }} setReady(true); })(); },[]);
  const accept=async(r:any)=>{ const next=r.token; await AsyncStorage.setItem("customer_token",next); setApiToken(next); setToken(next); setCustomer(r.customer); };
  const login=async(email:string,password:string)=>accept(await api.login({email,password}));
  const register=async(data:any)=>accept(await api.register(data));
  const logout=async()=>{ await AsyncStorage.removeItem("customer_token"); setApiToken(null); setToken(null); setCustomer(null); };
  const refresh=async()=>{ const r=await api.me(); setCustomer(r.customer); };
  return <AuthContext.Provider value={{customer,token,ready,login,register,logout,refresh}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);

