import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import DocumentPreviewModal from "../DocumentPreviewModal.jsx";
import ResellerBankProfile from "./ResellerBankProfile.jsx";

const baseDocs = [["pan", "PAN Card"], ["addressProof", "Address Proof"], ["aadharFront", "Aadhaar Card (Front)"], ["aadharBack", "Aadhaar Card (Back)"], ["cancelledCheque", "Cancelled Cheque"]];

function DocumentThumbnail({ file, url, title, onPreview }) {
  const [localUrl, setLocalUrl] = useState("");
  useEffect(() => {
    if (!file) { setLocalUrl(""); return; }
    const next = URL.createObjectURL(file);
    setLocalUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const source = file ? localUrl : url;
  if (!source) return null;
  const pdf = file ? file.type === "application/pdf" : /\.pdf(?:$|\?)/i.test(source) || source.startsWith("data:application/pdf");
  return <button className="selectedKycPreview" type="button" onClick={() => onPreview({ url: source, title, mimeType: pdf ? "application/pdf" : file?.type })}>{pdf ? <span>PDF document</span> : <img src={source} alt={title} style={{ maxWidth: "100%", height: 120, objectFit: "contain" }} />}<small>{file ? "Preview before upload" : "View submitted document"}</small></button>;
}

export default function ResellerKyc({ account, onSaved, setStatus }) {
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState(null);
  const docs = account.gstStatus === "gst" ? [...baseDocs, ["gstCertificate", "GST Certificate"]] : baseDocs;
  const submit = async (event, type) => {
    event.preventDefault();
    const file = files[type];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setFeedback("Only images and PDF documents are supported."); return; }
    setBusy(type); setFeedback("");
    try {
      const uploaded = await api.uploadDocument(file, "reseller-kyc");
      const updated = await api.resellerUploadKyc(type, { file: uploaded.url });
      onSaved(updated);
      setFiles(current => ({ ...current, [type]: null }));
      setFeedback("Document submitted for review.");
    } catch (error) { setFeedback(error.message); }
    finally { setBusy(""); }
  };
  return <section className="resellerKycPage">
    <header><h2>KYC Verification</h2><p>Submit the same identity, address, and bank documents required of sellers. An administrator reviews each document.</p></header>
    {feedback && <p className="resellerWorkspaceNotice" role="status">{feedback}</p>}
    <div className="cardGrid partnerKycGrid sellerPartnerKycGrid">{docs.map(([type, label]) => {
      const doc = account.kyc?.[type] || {};
      const locked = ["pending", "approved"].includes(doc.status);
      return <form className="panel partnerKycCard" key={type} onSubmit={event => submit(event, type)}><div className="panelHeader"><h3>{label}</h3><span className={`status ${doc.status || "not_submitted"}`}>{(doc.status || "not submitted").replaceAll("_", " ")}</span></div>{doc.rejectionReason && <p className="errorText">Rejected: {doc.rejectionReason}</p>}{doc.file && <DocumentThumbnail url={doc.file} title={label} onPreview={setPreview} />}{!locked && <><label className="partnerKycUploadBox"><strong>{doc.status === "rejected" ? `Upload corrected ${label}` : `Upload ${label}`}</strong><span>Image or PDF</span><input type="file" accept="image/*,.pdf" required onChange={event => setFiles(current => ({ ...current, [type]: event.target.files?.[0] }))} /></label>{files[type] && <DocumentThumbnail file={files[type]} title={label} onPreview={setPreview} />}<button className="primaryButton" disabled={Boolean(busy)}>{busy === type ? "Uploading…" : "Submit for verification"}</button></>}{locked && <p className="mutedText">{doc.status === "approved" ? "Approved by admin." : "Awaiting admin review."}</p>}</form>;
    })}</div>
    <ResellerBankProfile account={account} onSaved={onSaved} setStatus={setStatus} />
    {preview && <DocumentPreviewModal document={preview} onClose={() => setPreview(null)} />}
  </section>;
}
