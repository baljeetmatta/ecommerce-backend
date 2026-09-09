import { useState } from "react";
import { Save } from "lucide-react";

export default function TaxCategoryEditor({ initialTax, onBack, onSave }) {
  const [form, setForm] = useState(() => initialTax ? { ...initialTax } : { name: "", code: "", rate: "", description: "", isActive: true });
  return <form className="panel formPanel" onSubmit={async (event) => { event.preventDefault(); await onSave({ ...form, rate: Number(form.rate) }); }}>
    <div className="panelHeader"><h2>{initialTax ? "Edit Tax" : "Add Tax"}</h2><button className="inlineButton" type="button" onClick={onBack}>← Back to taxes</button></div>
    <label><span>Name</span><input value={form.name || ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label><span>Code</span><input value={form.code || ""} onChange={(event) => setForm({ ...form, code: event.target.value })} required /></label>
    <label><span>Rate %</span><input type="number" min="0" step="0.01" value={form.rate ?? ""} onChange={(event) => setForm({ ...form, rate: event.target.value })} required /></label>
    <label><span>Description</span><textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    <label className="toggleRow"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span>Active</span></label>
    <button className="primaryButton" type="submit"><Save size={18} /> {initialTax ? "Update Tax" : "Save Tax"}</button>
  </form>;
}
