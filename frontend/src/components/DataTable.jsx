import { useEffect, useMemo, useState } from "react";
import TablePagination from "./TablePagination.jsx";

const normalize = (value) => {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value;
  const timestamp = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? Date.parse(value) : NaN;
  return Number.isNaN(timestamp) ? String(value).toLowerCase() : timestamp;
};

export default function DataTable({ columns, rows, empty = "No records found", loading = false, loadingMessage = "Loading records…", sortable = false, paginated = false, className = "", onRowClick }) {
  const [sort, setSort] = useState({ key: "", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const column = columns.find((item) => item.key === sort.key);
    return [...rows].sort((left, right) => {
      const a = normalize(column?.sortValue ? column.sortValue(left) : left[sort.key]);
      const b = normalize(column?.sortValue ? column.sortValue(right) : right[sort.key]);
      const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true });
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, rows, sort]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => { setPage(1); }, [pageSize]);
  const displayedRows = paginated ? sortedRows.slice((page - 1) * pageSize, page * pageSize) : sortedRows;
  const changeSort = (key) => { setPage(1); setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }); };
  return (
    <div className={`tableWrap ${className}`.trim()}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{sortable && column.sortable !== false ? <button className="tableSortButton" type="button" onClick={() => changeSort(column.key)}>{column.label}<span aria-hidden="true">{sort.key === column.key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button> : column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="emptyCell">
                <div className="tableLoadingState"><span className="storefrontLoadingSpinner" aria-hidden="true" />{loadingMessage}</div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="emptyCell">
                {empty}
              </td>
            </tr>
          ) : (
            displayedRows.map((row) => (
              <tr className={onRowClick ? "clickableTableRow" : ""} key={row._id || row.id || row.sku} onClick={(event) => { if (onRowClick && !event.target.closest("button,a,input,select,textarea")) onRowClick(row); }}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {paginated && <TablePagination total={sortedRows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    </div>
  );
}
