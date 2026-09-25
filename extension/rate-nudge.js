// Shared by popup.js and its test.
const RATE_NUDGE_THRESHOLD = 1000; // ponytail: blockedCount as engagement proxy, not install-date tracking

function shouldShowRateNudge(blockedCount, rateDismissed) {
  return !rateDismissed && blockedCount >= RATE_NUDGE_THRESHOLD;
}

if (typeof module !== "undefined") module.exports = { shouldShowRateNudge, RATE_NUDGE_THRESHOLD };
