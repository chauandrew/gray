const enabledToggle = document.getElementById("enabled");
const blockHereToggle = document.getElementById("blockHere");
const hostEl = document.getElementById("host");
const statEl = document.getElementById("stat");
const dashboardBtn = document.getElementById("dashboard");

let currentHost = null;
let currentPathname = null;
let globalEnabled = true;

// parseRule/ruleMatches come from match.js; renderStat from stat.js (both
// loaded before this file in popup.html). Sharing them is what fixed the bug
// where this file did a naive exact-string exempt check while gray.js did
// subdomain matching, and the two silently disagreed.

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    const url = new URL(tab.url);
    return { host: url.hostname, pathname: url.pathname };
  } catch {
    return null; // chrome:// pages, etc. have no meaningful hostname
  }
}

function renderHost(exemptRules) {
  if (!currentHost) {
    hostEl.textContent = "not applicable on this page";
    blockHereToggle.disabled = true;
    return;
  }

  hostEl.textContent = currentHost;
  blockHereToggle.disabled = false;

  const matchingRules = exemptRules.filter((r) => ruleMatches(currentHost, currentPathname, r));
  // Reflects what's actually happening, not just this site's own rules: if
  // blocking is paused globally (its own switch, right above this one), this
  // site isn't actually blocked regardless of the exempt list, and showing
  // "on" anyway was the bug that prompted this fix in the first place.
  blockHereToggle.checked = globalEnabled && matchingRules.length === 0;
}

async function init() {
  const [
    { exemptRules = [], blockedCount = 0, enabled = true, grayColor = DEFAULT_GRAY_COLOR },
    tab,
  ] = await Promise.all([
    chrome.storage.local.get(["exemptRules", "blockedCount", "enabled", "grayColor"]),
    getActiveTab(),
  ]);
  currentHost = tab?.host ?? null;
  currentPathname = tab?.pathname ?? null;
  globalEnabled = enabled;
  enabledToggle.checked = enabled;
  enabledToggle.disabled = false;
  renderHost(exemptRules);
  renderStat(statEl, blockedCount);
  renderColorSwatches(grayColor);
}

enabledToggle.addEventListener("change", async () => {
  globalEnabled = enabledToggle.checked;
  await chrome.storage.local.set({ enabled: globalEnabled });
  // Keeps "Block images here" truthful without needing to reopen the popup —
  // it depends on globalEnabled too, per the bug this same fix already covers.
  const { exemptRules = [] } = await chrome.storage.local.get("exemptRules");
  renderHost(exemptRules);
});

dashboardBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

blockHereToggle.addEventListener("change", async () => {
  if (!currentHost) return;
  const { exemptRules = [] } = await chrome.storage.local.get("exemptRules");
  const next = blockHereToggle.checked
    ? // Turning blocking back on: remove every rule actually causing this
      // exact page to be exempt (there can be more than one, e.g. a bare
      // domain rule and a path rule both matching), not just an exact string.
      exemptRules.filter((r) => !ruleMatches(currentHost, currentPathname, r))
    : // Turning it off: the popup only ever adds a plain whole-domain rule;
      // path-scoped rules are dashboard-only, since a one-click toggle needs
      // an unambiguous target.
      [...exemptRules, currentHost];
  await chrome.storage.local.set({ exemptRules: next });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.blockedCount) renderStat(statEl, changes.blockedCount.newValue);
  if (changes.grayColor) renderColorSwatches(changes.grayColor.newValue || DEFAULT_GRAY_COLOR);
});

init();
