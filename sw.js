// Three kinds of dynamic/session rules, kept in separate id ranges so they
// never collide when rebuilding one kind without touching the others:
//   - dynamic, persistent: one "allow images" rule per domain-level exempt rule
//   - session, per-tab:    one "allow images" rule for the tab currently on a
//                          path-level exempt rule (deterministic id = tab id,
//                          so add/replace is idempotent with no lookup needed)
//   - session, per-URL:    one-off "allow this exact image" rule from a
//                          click-to-reveal
const DYNAMIC_ID_BASE = 1000;
const PATH_SESSION_ID_BASE = 500000;
const REVEAL_SESSION_ID_BASE = 900000;
let nextRevealId = REVEAL_SESSION_ID_BASE;

// A rule with a "/" is host+path (e.g. "google.com/maps"); domain-only rules
// have no "/". Only domain-only rules can become DNR dynamic rules, since
// initiatorDomains has no concept of path — see syncPathExemption for how
// path rules are enforced instead.
function isDomainOnly(rule) {
  return !rule.includes("/");
}

async function syncState() {
  const { exemptRules = [], enabled = true } = await chrome.storage.local.get([
    "exemptRules",
    "enabled",
  ]);

  // Global off: disable the whole block ruleset rather than layering an
  // allow-all rule on top, so there's exactly one source of truth for "is
  // blocking active at all."
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    enabled
      ? { enableRulesetIds: ["block_images"] }
      : { disableRulesetIds: ["block_images"] },
  );

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const addRules = exemptRules.filter(isDomainOnly).map((host, i) => ({
    id: DYNAMIC_ID_BASE + i,
    priority: 2,
    action: { type: "allow" },
    condition: { initiatorDomains: [host], resourceTypes: ["image"] },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

chrome.runtime.onInstalled.addListener(syncState);
chrome.runtime.onStartup.addListener(syncState);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.exemptRules || changes.enabled)) syncState();
});

// Path-level exemption: a tab-scoped allow rule, added or removed by the
// content script on every full page load depending on whether the current
// path matches a stored path rule. The id is deterministic (tab id), so this
// is just "set the rule for this tab to match/not-match" with no need to
// track or look up prior state.
async function syncPathExemption(tabId, matches) {
  const id = PATH_SESSION_ID_BASE + tabId;
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [id],
    addRules: matches
      ? [
          {
            id,
            priority: 2,
            action: { type: "allow" },
            condition: { tabIds: [tabId], resourceTypes: ["image"] },
          },
        ]
      : [],
  });
}

// Otherwise a tab's path-exemption rule outlives the tab and sits unused
// forever in the session rule list.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.declarativeNetRequest
    .updateSessionRules({ removeRuleIds: [PATH_SESSION_ID_BASE + tabId] })
    .catch(() => {});
});

// Serializes the counter's read-modify-write so concurrent increments from
// many tabs (a page can fire dozens of blocked-image events at once) don't
// lose updates to each other. Only protects within one service worker
// "awake" period, which is the only window where the race actually happens.
let counterQueue = Promise.resolve();
function incrementBlockedCount(by) {
  counterQueue = counterQueue.then(async () => {
    const { blockedCount = 0 } = await chrome.storage.local.get("blockedCount");
    await chrome.storage.local.set({ blockedCount: blockedCount + by });
  });
  return counterQueue;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "reveal") {
    const id = nextRevealId++;
    chrome.declarativeNetRequest
      .updateSessionRules({
        addRules: [
          {
            id,
            priority: 3,
            action: { type: "allow" },
            condition: { urlFilter: message.url, resourceTypes: ["image"] },
          },
        ],
      })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true; // keep the message channel open for the async sendResponse
  }

  if (message.type === "syncPathExemption") {
    if (sender.tab?.id != null) syncPathExemption(sender.tab.id, message.matches);
    return false;
  }

  if (message.type === "incrementBlocked") {
    incrementBlockedCount(message.count);
    return false;
  }

  return false;
});
