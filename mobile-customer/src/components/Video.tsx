import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { View } from 'react-native';
import { mediaUrl } from '@/lib/api';
export function Video({url, active=false, height=260}:{url:string;active?:boolean;height?:number}) {
 const player = useVideoPlayer(mediaUrl(url), player => { player.loop=true; player.muted=true; });
 // Keep offscreen reels paused, including when a screen loses focus.
 useEffect(() => { if(active) player.play(); else player.pause(); }, [active,player]);
 return <View style={{height,backgroundColor:'#13251b',borderRadius:18,overflow:'hidden'}}><VideoView player={player} style={{width:'100%',height:'100%'}} nativeControls contentFit="contain" /></View>;
}
