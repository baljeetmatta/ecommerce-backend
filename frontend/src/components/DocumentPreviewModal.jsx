import { ExternalLink, X } from "lucide-react";

export default function DocumentPreviewModal({ document, onClose }) {
  if (!document?.url) return null;
  const isPdf = document.url.startsWith("data:application/pdf") || /\.pdf(?:$|[?#])/i.test(document.url);
  const openOriginal = () => {
    if (!document.url.startsWith("data:")) return window.open(document.url, "_blank", "noopener,noreferrer");
    const [metadata, encoded = ""] = document.url.split(",", 2);
    const mimeType = metadata.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
    const binary = metadata.includes(";base64") ? window.atob(encoded) : decodeURIComponent(encoded);
    const blobUrl = URL.createObjectURL(new Blob([Uint8Array.from(binary, (character) => character.charCodeAt(0))], { type: mimeType }));
    const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(blobUrl);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };
  return <div className="documentPreviewOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="documentPreviewModal" role="dialog" aria-modal="true" aria-label={document.title || "Document preview"}><header><div><span>Document preview</span><h2>{document.title || "Submitted document"}</h2></div><button type="button" aria-label="Close preview" onClick={onClose}><X size={21} /></button></header><div className="documentPreviewBody">{isPdf ? <iframe src={document.url} title={document.title || "PDF document"} /> : <img src={document.url} alt={document.title || "Submitted document"} />}</div><button className="documentOpenOriginal" type="button" onClick={openOriginal}><ExternalLink size={16} /> Open original</button></section></div>;
}
