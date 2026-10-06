import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Header } from './Header';
import { AppDrawer } from './AppDrawer';
import { colors } from '@/theme';
export function Screen({children,title,back=false,style}:{children:React.ReactNode;title?:string;back?:boolean;style?:ViewStyle}) {
 const [menu,setMenu]=useState(false);
 return <SafeAreaView edges={['top','left','right']} style={[s.safe,style]}><View style={s.frame}><Header title={title} back={back} onMenu={()=>setMenu(true)}/>{children}</View><AppDrawer visible={menu} onClose={()=>setMenu(false)}/></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},frame:{flex:1,width:'100%',maxWidth:1200,alignSelf:'center'}});
