import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { View } from 'react-native';
import { mediaUrl } from '@/lib/api';
export function Video({url, active=false, height=260,fullScreen=false,muted=true}:{url:string;active?:boolean;height?:number;fullScreen?:boolean;muted?:boolean}) {
 const player = useVideoPlayer(mediaUrl(url), player => { player.loop=true; player.muted=muted; });
 // Keep offscreen reels paused, including when a screen loses focus.
 useEffect(() => { player.muted=muted;if(active) player.play(); else player.pause(); }, [active,muted,player]);
 return <View style={{height:fullScreen?'100%':height,width:fullScreen?'100%':undefined,backgroundColor:'#13251b',borderRadius:fullScreen?0:18,overflow:'hidden'}}><VideoView player={player} style={{width:'100%',height:'100%'}} nativeControls={!fullScreen} contentFit={fullScreen?'cover':'contain'} /></View>;
}
