import { PropsWithChildren, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, ViewStyle } from "react-native";
import { Header } from "./Header"; import { AppDrawer } from "./AppDrawer"; import { colors } from "@/theme";
export function Screen({children,title,back=false,style}:{children:React.ReactNode;title?:string;back?:boolean;style?:ViewStyle}){const[menu,setMenu]=useState(false);return <SafeAreaView edges={["top"]} style={[s.safe,style]}><Header title={title} back={back} onMenu={()=>setMenu(true)}/>{children}<AppDrawer visible={menu} onClose={()=>setMenu(false)}/></SafeAreaView>};
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas}});

