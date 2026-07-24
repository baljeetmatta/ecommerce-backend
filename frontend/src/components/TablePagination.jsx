export default function TablePagination({ total, page, pageSize, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50] }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, total);

  return <div className="tablePagination">
    <span>Showing {start}–{end} of {total} records</span>
    {pageSizes.length > 1 && <label>Records per page<select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>}
    <div className="tablePageControls">
      <button type="button" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>Previous</button>
      <span>Page {safePage} of {pageCount}</span>
      <button type="button" disabled={safePage >= pageCount} onClick={() => onPageChange(safePage + 1)}>Next</button>
    </div>
  </div>;
}
