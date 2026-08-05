const enabledToggle = document.getElementById("enabled");
const statEl = document.getElementById("stat");
const addForm = document.getElementById("addForm");
const ruleInput = document.getElementById("ruleInput");
const rulesEl = document.getElementById("rules");
const emptyEl = document.getElementById("empty");
const colorSwatchesEl = document.getElementById("colorSwatches");

// renderStat comes from stat.js (loaded before this file in options.html).

const GRAY_COLORS = ["#808080", "#9c9086", "#756b60", "#7c868f", "#869383"];
const DEFAULT_GRAY_COLOR = "#9c9086"; // matches the fallback baked into gray.css

function renderColorSwatches(selected) {
  colorSwatchesEl.innerHTML = "";
  for (const color of GRAY_COLORS) {
    const btn = document.createElement("button");
    btn.className = "swatch" + (color === selected ? " selected" : "");
    btn.style.background = color;
    btn.setAttribute("aria-label", color);
    btn.addEventListener("click", () => {
      chrome.storage.local.set({ grayColor: color });
    });
    colorSwatchesEl.appendChild(btn);
  }
}

function renderRules(exemptRules) {
  rulesEl.innerHTML = "";
  emptyEl.hidden = exemptRules.length > 0;

  for (const rule of exemptRules) {
    const row = document.createElement("div");
    row.className = "rule-row";

    const label = document.createElement("span");
    label.textContent = rule;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      const { exemptRules = [] } = await chrome.storage.local.get("exemptRules");
      await chrome.storage.local.set({ exemptRules: exemptRules.filter((r) => r !== rule) });
    });

    row.append(label, removeBtn);
    rulesEl.appendChild(row);
  }
}

// Accepts a bare "example.com" / "example.com/path", or a pasted full URL
// ("https://example.com/maps/dir") for convenience, and normalizes both to
// the same "host[/path]" rule format the content script matches against.
function normalizeRule(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes("://")) {
    try {
      const url = new URL(trimmed);
      return url.pathname === "/" ? url.hostname : url.hostname + url.pathname;
    } catch {
      return null;
    }
  }

  const slash = trimmed.indexOf("/");
  if (slash === -1) return trimmed.toLowerCase();
  const host = trimmed.slice(0, slash).toLowerCase();
  const path = trimmed.slice(slash).replace(/\/+$/, "") || "/";
  return host + path;
}

async function init() {
  const {
    enabled = true,
    exemptRules = [],
    blockedCount = 0,
    grayColor = DEFAULT_GRAY_COLOR,
  } = await chrome.storage.local.get(["enabled", "exemptRules", "blockedCount", "grayColor"]);
  enabledToggle.checked = enabled;
  renderRules(exemptRules);
  renderStat(statEl, blockedCount);
  renderColorSwatches(grayColor);
}

enabledToggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledToggle.checked });
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rule = normalizeRule(ruleInput.value);
  if (!rule) return;

  const { exemptRules = [] } = await chrome.storage.local.get("exemptRules");
  if (!exemptRules.includes(rule)) {
    await chrome.storage.local.set({ exemptRules: [...exemptRules, rule] });
  }
  ruleInput.value = "";
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.exemptRules) renderRules(changes.exemptRules.newValue || []);
  if (changes.blockedCount) renderStat(statEl, changes.blockedCount.newValue);
  if (changes.enabled) enabledToggle.checked = changes.enabled.newValue !== false;
  if (changes.grayColor) renderColorSwatches(changes.grayColor.newValue || DEFAULT_GRAY_COLOR);
});

init();
