import { useState } from "react";
import { api } from "../../services/api.js";
import DocumentPreviewModal from "../DocumentPreviewModal.jsx";
import ResellerBankProfile from "./ResellerBankProfile.jsx";

const baseDocs = [["pan", "PAN Card"], ["addressProof", "Address Proof"], ["aadharFront", "Aadhaar Card (Front)"], ["aadharBack", "Aadhaar Card (Back)"], ["cancelledCheque", "Cancelled Cheque"]];

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
      return <form className="panel partnerKycCard" key={type} onSubmit={event => submit(event, type)}><div className="panelHeader"><h3>{label}</h3><span className={`status ${doc.status || "not_submitted"}`}>{(doc.status || "not submitted").replaceAll("_", " ")}</span></div>{doc.rejectionReason && <p className="errorText">Rejected: {doc.rejectionReason}</p>}{doc.file && <button className="partnerKycExistingDocument" type="button" onClick={() => setPreview({ url: doc.file, title: label })}>View submitted document</button>}{!locked && <><label className="partnerKycUploadBox"><strong>{doc.status === "rejected" ? `Upload corrected ${label}` : `Upload ${label}`}</strong><span>Image or PDF</span><input type="file" accept="image/*,.pdf" required onChange={event => setFiles(current => ({ ...current, [type]: event.target.files?.[0] }))} /></label><button className="primaryButton" disabled={Boolean(busy)}>{busy === type ? "Uploading…" : "Submit for verification"}</button></>}{locked && <p className="mutedText">{doc.status === "approved" ? "Approved by admin." : "Awaiting admin review."}</p>}</form>;
    })}</div>
    <ResellerBankProfile account={account} onSaved={onSaved} setStatus={setStatus} />
    {preview && <DocumentPreviewModal document={preview} onClose={() => setPreview(null)} />}
  </section>;
}
