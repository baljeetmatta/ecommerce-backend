import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDeleteModal({ recordName, recordType, onCancel, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    setDeleting(true);
    setError("");
    try { await onConfirm(); } catch (deleteError) { setError(deleteError.message || "Unable to delete this record."); setDeleting(false); }
  };
  return <div className="modalOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onCancel(); }}>
    <section className="confirmDeleteModal" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title">
      <div className="confirmDeleteIcon"><AlertTriangle size={24} /></div>
      <h2 id="delete-confirm-title">Delete {recordType}?</h2>
      <p>You are about to permanently delete <strong>{recordName}</strong>. This action cannot be undone.</p>
      {error && <p className="errorText">{error}</p>}
      <div className="confirmDeleteActions">
        <button className="inlineButton" type="button" disabled={deleting} onClick={onCancel}>Cancel</button>
        <button className="dangerButton" type="button" disabled={deleting} onClick={confirm}>{deleting ? "Deleting…" : "Delete"}</button>
      </div>
    </section>
  </div>;
}
