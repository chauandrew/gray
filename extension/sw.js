// Two kinds of dynamic/session rules, kept in separate id ranges so they
// never collide when rebuilding one kind without touching the others:
//   - dynamic, persistent: one "allow images" rule per domain-level exempt rule
//   - session, per-tab:    one "allow images" rule for the tab currently on a
//                          path-level exempt rule (deterministic id = tab id,
//                          so add/replace is idempotent with no lookup needed)
const DYNAMIC_ID_BASE = 1000;
const PATH_SESSION_ID_BASE = 500000;

// A rule with a "/" is host+path (e.g. "google.com/maps"); domain-only rules
// have no "/". Only domain-only rules can become DNR dynamic rules, since
// topDomains has no concept of path, see syncPathExemption for how
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
    // topDomains (not initiatorDomains) so cross-origin iframes inside an
    // exempt page are exempt too. Needs Chrome 141+ (manifest minimum).
    condition: { topDomains: [host], resourceTypes: ["image"] },
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

// Accumulates counts from every tab in memory and writes them out at most
// once every couple of seconds, instead of a storage read+write per message.
// Counts still pending if the worker is killed are lost, which is fine for a
// rough stat. The queue serializes the read-modify-write itself so two
// flushes can never overlap and lose updates to each other.
let pendingBlocked = 0;
let flushTimer = null;
let counterQueue = Promise.resolve();
function incrementBlockedCount(by) {
  pendingBlocked += by;
  flushTimer ??= setTimeout(() => {
    flushTimer = null;
    const batch = pendingBlocked;
    pendingBlocked = 0;
    counterQueue = counterQueue.then(async () => {
      const { blockedCount = 0 } = await chrome.storage.local.get("blockedCount");
      await chrome.storage.local.set({ blockedCount: blockedCount + batch });
    });
  }, 2000);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "snooze") chrome.storage.local.set({ enabled: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
