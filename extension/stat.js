// Shared by popup.js and options.js.
function renderStat(el, blockedCount) {
  const n = blockedCount || 0;
  el.textContent = `You've blocked ${n.toLocaleString()} image${n === 1 ? "" : "s"} so far.`;
}
