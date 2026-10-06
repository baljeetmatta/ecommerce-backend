import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { plainText } from './HomeContent';
import { openStoreLink } from '@/lib/navigation';
import { STOREFRONT_URL } from '@/lib/api';
export function RichContent({html}:{html:string}) {
 const [height,setHeight]=useState(200);
 if(Platform.OS==='web')return <Text style={{lineHeight:24}}>{plainText(html)}</Text>;
 const safe=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript:/gi,'');
 return <View style={{height}}><WebView originWhitelist={['*']} scrollEnabled={false} source={{html:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;color:#23352b;margin:0;line-height:1.6}img,video,iframe{max-width:100%;height:auto}a{color:#176b43}</style></head><body>${safe}<script>new ResizeObserver(()=>window.ReactNativeWebView.postMessage(String(document.body.scrollHeight))).observe(document.body);</script></body></html>`,baseUrl:STOREFRONT_URL}} onMessage={e=>setHeight(Math.max(100,Math.min(50000,Number(e.nativeEvent.data)||200)))} onShouldStartLoadWithRequest={r=>{if(r.url==='about:blank'||r.url===STOREFRONT_URL||r.navigationType!=='click')return true;openStoreLink(r.url);return false}}/></View>;
}
