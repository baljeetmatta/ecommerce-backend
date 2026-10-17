import { createElement, useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '@/theme';

const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '';
const html = (siteKey: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;font-family:system-ui}#widget{min-height:65px}</style><script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script></head><body><div id="widget"></div><script>function send(value){const data=JSON.stringify({source:'turnstile-signup',token:value});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(data);else window.parent.postMessage(JSON.parse(data),'*')}function render(){if(window.turnstile){window.turnstile.render('#widget',{sitekey:${JSON.stringify(siteKey)},action:'signup',callback:token=>send(token),'expired-callback':()=>send(''),'error-callback':()=>send('')})}else setTimeout(render,100)}render();</script></body></html>`;

export function TurnstileCaptcha({ onToken }: { onToken: (token: string) => void }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !SITE_KEY) return;
    const receive = (event: MessageEvent) => {
      if (event.data?.source === 'turnstile-signup') onToken(String(event.data.token || ''));
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onToken]);

  if (!SITE_KEY) return <Text style={{ color: colors.danger }}>CAPTCHA is not configured. Please contact the store administrator.</Text>;
  if (Platform.OS === 'web') return <View style={{ height: 70, overflow: 'hidden' }}>{createElement('iframe' as any, { title: 'CAPTCHA verification', srcDoc: html(SITE_KEY), style: { width: '100%', height: 70, border: 0 } })}</View>;
  return <WebView source={{ html: html(SITE_KEY), baseUrl: 'https://hrsbasket.com' }} originWhitelist={['https://*', 'http://*', 'about:*']} javaScriptEnabled domStorageEnabled scrollEnabled={false} style={{ height: 75, backgroundColor: 'transparent' }} onMessage={event => { try { const value = JSON.parse(event.nativeEvent.data); if (value.source === 'turnstile-signup') onToken(String(value.token || '')); } catch { onToken(''); } }} />;
}
