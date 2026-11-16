// Shared by popup.js and options.js.
// Below a million, the exact comma-separated count; from a million up, "1.57
// million" (two decimals, trailing zeros dropped) since the full digits get
// hard to read at a glance and nobody needs that precision.
function formatCount(n) {
  if (n < 1_000_000) return n.toLocaleString();
  const millions = Number((n / 1_000_000).toFixed(2));
  return `${millions.toLocaleString()} million`;
}

function renderStat(el, blockedCount) {
  const n = blockedCount || 0;
  el.textContent = `You've blocked ${formatCount(n)} image${n === 1 ? "" : "s"} so far.`;
}

if (typeof module !== "undefined") module.exports = { formatCount };
