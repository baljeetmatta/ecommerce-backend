import { useEffect, useState } from "react";
import { showToast } from "../utils/toast.js";

const empty = { pendingCount: 0, recentOrders: [], pendingOrders: [] };
export default function useOrderActivity(accountKey, fetchActivity) {
  const [activity, setActivity] = useState(empty);
  useEffect(() => {
    setActivity(empty);
    if (!accountKey) return;
    let stopped = false;
    let running = false;
    let previousIds = null;
    const poll = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        const next = await fetchActivity();
        if (stopped) return;
        if (previousIds) {
          const incoming = next.recentOrders.filter(order => !previousIds.has(String(order._id)));
          if (incoming.length) showToast(`New order${incoming.length > 1 ? "s" : ""} received: ${incoming.map(order => order.orderNumber).join(", ")}`);
        }
        previousIds = new Set(next.recentOrders.map(order => String(order._id)));
        setActivity(next);
      } catch { /* Keep the last successful count; retry on the next poll. */ }
      finally { running = false; }
    };
    poll();
    const timer = setInterval(poll, 20000);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener("focus", poll); document.removeEventListener("visibilitychange", poll); };
  }, [accountKey, fetchActivity]);
  return activity;
}
