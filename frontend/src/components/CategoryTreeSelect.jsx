import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

const categoryId = (value) => String(value?._id || value || "");

const flattenTree = (categories) => {
  const children = new Map();
  categories.forEach((category) => {
    const parentId = categoryId(category.parent);
    children.set(parentId, [...(children.get(parentId) || []), category]);
  });
  const result = [];
  const visit = (category, depth, trail) => {
    const path = [...trail, category.name];
    result.push({ category, depth, path: path.join(" / ") });
    (children.get(categoryId(category)) || []).sort((a, b) => a.name.localeCompare(b.name)).forEach((child) => visit(child, depth + 1, path));
  };
  const knownIds = new Set(categories.map(categoryId));
  categories.filter((category) => !categoryId(category.parent) || !knownIds.has(categoryId(category.parent))).sort((a, b) => a.name.localeCompare(b.name)).forEach((root) => visit(root, 0, []));
  return result;
};

export default function CategoryTreeSelect({ categories = [], value, onChange, required = false, placeholder = "Select category or subcategory", clearLabel = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const tree = useMemo(() => flattenTree(categories), [categories]);
  const selected = tree.find((item) => categoryId(item.category) === String(value || ""));
  const visible = query.trim() ? tree.filter((item) => item.path.toLowerCase().includes(query.trim().toLowerCase())) : tree;
  return <div className="categoryTreeSelect">
    <button className="categoryTreeTrigger" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}><span>{selected?.path || placeholder}</span><ChevronDown size={16} /></button>
    {required && <input className="categoryTreeRequired" tabIndex="-1" required value={value || ""} onChange={() => {}} aria-hidden="true" />}
    {open && <div className="categoryTreeMenu"><label className="categoryTreeSearch"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category or subcategory" /></label><div className="categoryTreeOptions">{clearLabel && !query.trim() && <button type="button" className={!value ? "selected" : ""} style={{ "--category-depth": 0 }} onClick={() => { onChange(""); setOpen(false); setQuery(""); }}><span>{clearLabel}</span></button>}{visible.map(({ category, depth, path }) => <button key={category._id} type="button" className={String(value) === String(category._id) ? "selected" : ""} style={{ "--category-depth": depth }} onClick={() => { onChange(category._id); setOpen(false); setQuery(""); }}><span>{category.name}</span>{depth > 0 && <small>{path}</small>}</button>)}{!visible.length && <p>No matching category found.</p>}</div></div>}
  </div>;
}
