import { money } from "../../../utils/currency.js";
import { lazy } from "react";

const DataTable = lazy(() => import("../../DataTable.jsx"));
const TablePagination = lazy(() => import("../../TablePagination.jsx"));

export default function Customers({ customers, pagination, onPageChange, loading }) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>Customer Database</h2>
      </div>
      <DataTable
        rows={customers}
        loading={loading}
        loadingMessage="Loading customers…"
        paginated={false}
        columns={[
          { key: "name", label: "Name", render: (row) => <span className="adminCustomerIdentity">{row.profileImage ? <img src={row.profileImage} alt="" /> : <i>{row.name?.charAt(0)?.toUpperCase()}</i>}<strong>{row.name}</strong></span> },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> },
          { key: "storeCredit", label: "Credit", render: (row) => money(row.storeCredit) }
        ]}
      />
      {!loading && <TablePagination total={pagination.total} page={pagination.page} pageSize={pagination.limit} pageSizes={[10]} onPageChange={onPageChange} onPageSizeChange={() => {}} />}
    </section>
  );
}
