import { money } from "../../../utils/currency.js";
import { Plus } from "lucide-react";
import { lazy } from "react";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function Marketing({ promotions, promotionForm, setPromotionForm, createPromotion, updatePromotion }) {
  return (
    <section className="twoColumn">
      <div className="panel widePanel">
        <div className="panelHeader">
          <h2>Discount Codes</h2>
        </div>
        <DataTable
          rows={promotions}
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Campaign" },
            { key: "type", label: "Type" },
            { key: "audience", label: "Audience", render: (row) => (row.audience === "first_order" ? "First order" : "All customers") },
            { key: "value", label: "Value" },
            { key: "maxDiscountAmount", label: "Max", render: (row) => (row.maxDiscountAmount ? money(row.maxDiscountAmount) : "No cap") },
            { key: "minimumOrderValue", label: "Threshold", render: (row) => money(row.minimumOrderValue) },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <button className="inlineButton miniButton" type="button" onClick={() => updatePromotion(row, { ...row, isActive: !row.isActive })}>
                  {row.isActive ? "Turn off" : "Turn on"}
                </button>
              )
            }
          ]}
        />
      </div>
      <form className="panel formPanel" onSubmit={createPromotion}>
        <div className="panelHeader">
          <h2>New Promotion</h2>
          <Plus size={18} />
        </div>
        {["code", "name", "value", "maxDiscountAmount", "minimumOrderValue"].map((field) => (
          <label key={field}>
            <span>{field}</span>
            <input type={["value", "maxDiscountAmount", "minimumOrderValue"].includes(field) ? "number" : "text"} value={promotionForm[field]} onChange={(event) => setPromotionForm({ ...promotionForm, [field]: event.target.value })} required={field !== "maxDiscountAmount"} />
          </label>
        ))}
        <select value={promotionForm.type} onChange={(event) => setPromotionForm({ ...promotionForm, type: event.target.value })}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed Amount</option>
          <option value="free_shipping">Free Shipping</option>
        </select>
        <select value={promotionForm.audience} onChange={(event) => setPromotionForm({ ...promotionForm, audience: event.target.value })}>
          <option value="all">All customers</option>
          <option value="first_order">First order only</option>
        </select>
        <label><span>Starts at</span><input type="date" value={promotionForm.startsAt || ""} onChange={(event) => setPromotionForm({ ...promotionForm, startsAt: event.target.value })} /></label>
        <label><span>Ends at</span><input type="date" value={promotionForm.endsAt || ""} onChange={(event) => setPromotionForm({ ...promotionForm, endsAt: event.target.value })} /></label>
        <label className="toggleRow"><input type="checkbox" checked={Boolean(promotionForm.isActive)} onChange={(event) => setPromotionForm({ ...promotionForm, isActive: event.target.checked })} /><span>Active</span></label>
        <button className="primaryButton" type="submit">
          <Plus size={18} /> Create Code
        </button>
      </form>
    </section>
  );
}
