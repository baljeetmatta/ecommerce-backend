import { useState } from "react";
import { Download, Printer, RefreshCcw } from "lucide-react";
import { api } from "../services/api.js";
import "../styles/shiprocket-shipment.css";

const dateTime = value => value ? new Date(value).toLocaleString("en-IN") : "Not synced yet";
export default function ShiprocketShipmentPanel({ order, sellerView, onUpdate }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const shipping = order.shipping || {};
  const sync = async () => {
    setBusy("sync"); setError("");
    try { onUpdate(await api.shiprocketStatus(order._id, sellerView)); }
    catch (error) { setError(error.message); }
    finally { setBusy(""); }
  };
  const document = async (kind, print = false) => {
    // Open synchronously so browsers do not block the PDF after the request.
    const preview = print ? window.open("about:blank", "_blank") : null;
    if (preview) { preview.opener = null; preview.document.title = "Loading shipping document…"; }
    setBusy(kind); setError("");
    try {
      const result = await api.shiprocketDocument(order._id, kind, sellerView);
      const bytes = Uint8Array.from(atob(result.data), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: result.contentType }));
      if (preview && !preview.closed) {
        preview.location.href = url;
      } else {
        const link = window.document.createElement("a");
        link.href = url; link.download = result.filename;
        window.document.body.appendChild(link); link.click(); link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    } catch (error) { preview?.close(); setError(error.message); }
    finally { setBusy(""); }
  };
  return <section className="shiprocketShipmentPanel" aria-label="ShipRocket shipment">
    <header><div><h2>ShipRocket shipment</h2><p>{shipping.carrierStatus || "Shipment created"} · AWB: {shipping.awbCode || "Awaiting assignment"}</p></div><button type="button" disabled={Boolean(busy)} onClick={sync}><RefreshCcw size={16} />{busy === "sync" ? "Syncing…" : "Sync status"}</button></header>
    <p className="shiprocketSyncTime">Last synced: {dateTime(shipping.trackingSyncedAt)}. Status is checked automatically every 15 minutes.</p>
    {shipping.pickupAddress && <p><strong>Seller pickup:</strong> {[shipping.pickupAddress.address, shipping.pickupAddress.city, shipping.pickupAddress.state, shipping.pickupAddress.pinCode].filter(Boolean).join(", ")}</p>}
    <p><strong>Destination:</strong> {[order.address?.shippingAddress || order.address?.billingAddress, order.address?.city || order.address?.billingCity, order.address?.state || order.address?.billingState, order.address?.postalCode || order.address?.billingPostalCode].filter(Boolean).join(", ")}</p>
    <div className="shiprocketDocuments">{[["label", "Shipping label (barcode / QR)"], ["invoice", "ShipRocket invoice"], ["manifest", "Pickup manifest"]].map(([kind, title]) => <article key={kind}><strong>{title}</strong><div><button type="button" disabled={Boolean(busy)} onClick={() => document(kind)}><Download size={16} />{busy === kind ? "Preparing…" : "Download PDF"}</button><button type="button" disabled={Boolean(busy)} onClick={() => document(kind, true)}><Printer size={16} />Open / print</button></div></article>)}</div>
    <small>Attach the ShipRocket shipping label to the parcel. It includes the courier’s barcode or QR code. Use the PDF viewer’s print button to print.</small>
    {(error || shipping.trackingSyncError) && <p className="errorText" role="alert">{error || shipping.trackingSyncError}</p>}
    {shipping.trackingEvents?.length > 0 && <details><summary>Courier tracking history</summary><ol>{shipping.trackingEvents.map((event, index) => <li key={`${event.date}-${index}`}><strong>{event.activity || event.status}</strong><span>{event.date} {event.location && ` · ${event.location}`}</span></li>)}</ol></details>}
  </section>;
}
