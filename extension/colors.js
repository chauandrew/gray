// Shared by popup.js and options.js. Both host a #colorSwatches container and
// both want a pick to write straight to storage, so neither is a parameter.
const GRAY_COLORS = ["#808080", "#9c9086", "#756b60", "#7c868f", "#869383"];
const DEFAULT_GRAY_COLOR = "#9c9086"; // matches the fallback baked into gray.css

function renderColorSwatches(selected) {
  const container = document.getElementById("colorSwatches");
  container.innerHTML = "";
  for (const color of GRAY_COLORS) {
    const btn = document.createElement("button");
    btn.className = "swatch" + (color === selected ? " selected" : "");
    btn.style.background = color;
    btn.setAttribute("aria-label", color);
    btn.addEventListener("click", () => chrome.storage.local.set({ grayColor: color }));
    container.appendChild(btn);
  }
}
