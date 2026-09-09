import { useState, lazy } from "react";
import { Plus, FileText, Trash2 } from "lucide-react";
import ConfirmDeleteModal from "../shared/ConfirmDeleteModal.jsx";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function TaxCategoryManager({ taxCategories, onAdd, onEdit, onDelete }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  return (
    <section className="contentStack">
      <div className="panel">
        <div className="panelHeader"><h2>Tax Categories</h2><button className="primaryButton" type="button" onClick={onAdd}><Plus size={18} /> Add Tax</button></div>
        <DataTable
          rows={taxCategories}
          columns={[
            { key: "name", label: "Name" },
            { key: "code", label: "Code" },
            { key: "rate", label: "Rate", render: (row) => `${row.rate}%` },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="tableActions">
                  <button type="button" title="Edit tax category" onClick={() => onEdit(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete tax category" onClick={() => setDeleteTarget(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>
      {deleteTarget && <ConfirmDeleteModal recordName={deleteTarget.name} recordType="tax category" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDelete(deleteTarget); setDeleteTarget(null); }} />}
    </section>
  );
}
