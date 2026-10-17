import { useEffect, useRef } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const widgetHtml = (siteKey) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent}</style><script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script></head><body><div id="widget"></div><script>function render(){if(window.turnstile){window.turnstile.render('#widget',{sitekey:${JSON.stringify(siteKey)},action:'signup',callback:token=>window.parent.postMessage({source:'turnstile-signup',token},'*'),'expired-callback':()=>window.parent.postMessage({source:'turnstile-signup',token:''},'*'),'error-callback':()=>window.parent.postMessage({source:'turnstile-signup',token:''},'*')})}else setTimeout(render,100)}render();</script></body></html>`;

export default function TurnstileCaptcha({ onToken }) {
  const frame = useRef(null);
  useEffect(() => {
    const receive = (event) => {
      if (event.source === frame.current?.contentWindow && event.data?.source === "turnstile-signup") onToken(String(event.data.token || ""));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onToken]);

  if (!SITE_KEY) return <p className="authStatus" role="alert">CAPTCHA is not configured. Please contact the store administrator.</p>;
  return <iframe ref={frame} title="CAPTCHA verification" srcDoc={widgetHtml(SITE_KEY)} style={{ width: "100%", height: 70, border: 0 }} />;
}
