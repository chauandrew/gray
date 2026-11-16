// Shared by popup.js and options.js.
// Below a million, the exact comma-separated count; from a million up, "1.57
// million" / "1.2 billion" (two decimals, trailing zeros dropped) since the
// full digits get hard to read at a glance and nobody needs that precision.
function formatCount(n) {
  if (n < 1_000_000) return n.toLocaleString();
  const [divisor, word] = n < 1_000_000_000 ? [1_000_000, "million"] : [1_000_000_000, "billion"];
  return `${Number((n / divisor).toFixed(2)).toLocaleString()} ${word}`;
}

function renderStat(el, blockedCount) {
  const n = blockedCount || 0;
  el.textContent = `You've blocked ${formatCount(n)} image${n === 1 ? "" : "s"} so far.`;
}

if (typeof module !== "undefined") module.exports = { formatCount };
