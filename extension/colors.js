// Shared by popup.js and options.js. Both host a #colorSwatches container and
// both want a pick to write straight to storage, so neither is a parameter.
const GRAY_COLORS = ["#808080", "#9c9086", "#756b60", "#7c868f", "#869383"];
const GRAY_COLOR_NAMES = {
  "#808080": "Neutral gray",
  "#9c9086": "Warm gray",
  "#756b60": "Dark warm gray",
  "#7c868f": "Cool gray",
  "#869383": "Sage gray",
};
const DEFAULT_GRAY_COLOR = "#9c9086"; // matches the fallback baked into gray.css

function renderColorSwatches(selected) {
  const container = document.getElementById("colorSwatches");
  // Built once and then updated in place: rebuilding on every pick would
  // destroy the focused button and drop keyboard focus.
  if (!container.children.length) {
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Box color");
    for (const color of GRAY_COLORS) {
      const btn = document.createElement("button");
      btn.className = "swatch";
      btn.style.background = color;
      btn.setAttribute("aria-label", GRAY_COLOR_NAMES[color]);
      btn.addEventListener("click", () => chrome.storage.local.set({ grayColor: color }));
      container.appendChild(btn);
    }
  }
  GRAY_COLORS.forEach((color, i) => {
    const btn = container.children[i];
    btn.classList.toggle("selected", color === selected);
    btn.setAttribute("aria-pressed", color === selected);
  });
}
