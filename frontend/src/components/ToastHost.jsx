import { CheckCircle2, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function Toast({ toast, dismiss }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(toast.type === "error" ? 8000 : 5000);
  useEffect(() => {
    if (hovered || focused) return;
    const started = Date.now();
    const timeout = window.setTimeout(() => dismiss(toast.id), remaining.current);
    return () => { window.clearTimeout(timeout); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [toast.id, dismiss, hovered, focused]);
  const failed = toast.type === "error";
  const Icon = failed ? XCircle : CheckCircle2;
  return <aside className={`appToast ${toast.type}`} role={failed ? "alert" : "status"} aria-atomic="true"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <Icon size={24} aria-hidden="true"/>
    <div><strong>{failed ? "Action failed" : "Success"}</strong><span>{toast.message}</span></div>
    <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={18}/></button>
  </aside>;
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const dismiss = useCallback(id => setToasts(current => current.filter(toast => toast.id !== id)), []);
  useEffect(() => {
    const display = event => {
      if (!event.detail?.message) return;
      const toast = { id: ++nextId.current, type: event.detail.type === "error" ? "error" : "success", message: event.detail.message };
      setToasts(current => [...current, toast].slice(-5));
    };
    window.addEventListener("hrsbasket:toast", display);
    return () => window.removeEventListener("hrsbasket:toast", display);
  }, []);
  return <section className="appToastStack" aria-label="Notifications">{toasts.map(toast => <Toast key={toast.id} toast={toast} dismiss={dismiss}/>)}</section>;
}
