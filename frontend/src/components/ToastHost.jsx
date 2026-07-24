import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function ToastHost() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timeout;
    const display = (event) => {
      window.clearTimeout(timeout);
      setToast({ type: event.detail?.type || "success", message: event.detail?.message || "" });
      timeout = window.setTimeout(() => setToast(null), 4000);
    };
    window.addEventListener("hrsbasket:toast", display);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("hrsbasket:toast", display);
    };
  }, []);

  if (!toast) return null;
  const Icon = toast.type === "error" ? XCircle : CheckCircle2;
  return (
    <aside className={`appToast ${toast.type}`} role={toast.type === "error" ? "alert" : "status"} aria-live="polite">
      <Icon size={22} />
      <div><strong>{toast.type === "error" ? "Action failed" : "Saved successfully"}</strong><span>{toast.message}</span></div>
      <button type="button" onClick={() => setToast(null)} aria-label="Close notification"><X size={18} /></button>
    </aside>
  );
}
