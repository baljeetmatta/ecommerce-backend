import { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchSuggestions } from "../utils/searchSuggestions.js";

export default function SearchAutocomplete({ products, query, onChange, onSubmit, onSelect, imageFor, formatPrice, onImageError, mobileOpen }) {
  const id = useId();
  const container = useRef(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const results = useMemo(() => searchSuggestions(products, query), [products, query]);
  const expanded = focused && !dismissed && query.trim().length >= 5;
  const choose = product => { setDismissed(true); setActive(-1); onSelect(product); };
  const keyDown = event => {
    if (event.key === "Escape") { setDismissed(true); setActive(-1); return; }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && query.trim().length >= 5 && results.length) {
      event.preventDefault(); setDismissed(false);
      setActive(current => event.key === "ArrowDown" ? (current + 1) % results.length : current <= 0 ? results.length - 1 : current - 1);
    }
    if (event.key === "Enter" && expanded && results[active]) { event.preventDefault(); choose(results[active]); }
  };
  return <div className="searchAutocomplete" ref={container} onBlur={event => { if (!container.current?.contains(event.relatedTarget)) { setFocused(false); setActive(-1); } }}>
    <form className={mobileOpen ? "storeSearch open" : "storeSearch"} role="search" onSubmit={event => { setDismissed(true); setActive(-1); onSubmit(event); }}>
      <input value={query} onChange={event => { onChange(event.target.value); setDismissed(false); setActive(-1); }} onFocus={() => { setFocused(true); setDismissed(false); }} onKeyDown={keyDown} type="search" placeholder="Search products, brands and more" aria-label="Search products, categories and brands" role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? `${id}-results` : undefined} aria-activedescendant={expanded && results[active] ? `${id}-option-${active}` : undefined} autoComplete="off" />
      <button type="submit"><Search size={16} /><span>Search</span></button>
    </form>
    {expanded && <div className="searchAutocompleteDropdown">
      <div className="searchAutocompleteHeading">Suggested products</div>
      <div role="listbox" id={`${id}-results`} aria-label="Search suggestions">
        {results.map((product, index) => <button key={product._id} id={`${id}-option-${index}`} role="option" aria-selected={active === index} className={active === index ? "active" : ""} type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(product)}>
          <img src={imageFor(product)} alt="" onError={event => onImageError(event, product)} />
          <span><strong>{product.name}</strong><small>{[product.manufacturerBrand || product.seller?.companyName, product.category?.name].filter(Boolean).join(" · ")}</small></span>
          <b>{formatPrice(product.offerPrice ?? product.price)}</b>
        </button>)}
      </div>
      {!results.length && <p className="searchAutocompleteEmpty">No matching products. Try another name or brand.</p>}
      <div className="searchAutocompleteHint">↑ ↓ to browse · Enter to select · Esc to close</div>
    </div>}
    <span className="searchAutocompleteStatus" role="status" aria-live="polite">{expanded ? `${results.length} search suggestions available.` : ""}</span>
  </div>;
}
