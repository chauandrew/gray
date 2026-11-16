// Shared by popup.js and options.js.
// Below a million, the exact comma-separated count; from a million up, "1.57
// million" / "1.2 billion" since the full digits get hard to read at a glance
// and nobody needs that precision. Locale is pinned to "en" because the
// sentence around it is English.
const compactCount = new Intl.NumberFormat("en", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 2,
});

function formatCount(n) {
  return n < 1_000_000 ? n.toLocaleString("en") : compactCount.format(n);
}

function renderStat(el, blockedCount) {
  const n = blockedCount || 0;
  el.textContent = `You've blocked ${formatCount(n)} image${n === 1 ? "" : "s"} so far.`;
}

if (typeof module !== "undefined") module.exports = { formatCount };
