export const portalLocation = () => /^#\/(seller|reseller)(?:[/?]|$)/.test(window.location.hash)
  ? window.location.hash.slice(1)
  : `${window.location.pathname}${window.location.search}`;

export const navigatePortalPath = (path, { replace = false, state = null } = {}) => {
  const target = path.replace(/^#/, "");
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) return;
  window.history[replace ? "replaceState" : "pushState"](state, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export const normalizePortalLocation = () => {
  if (/^#\/(seller|reseller)(?:[/?]|$)/.test(window.location.hash)) {
    window.history.replaceState(window.history.state, "", window.location.hash.slice(1));
  }
};
