(() => {
  const root = document.documentElement;

  // parseRule/ruleMatches come from match.js (loaded before this file in the
  // manifest's content_scripts). Deliberately matched against the frame's OWN
  // host, not the top-level page's, so this always agrees with the service
  // worker's initiatorDomains rule (also per-frame-origin) — checking the
  // top-level host would desync CSS painting from actual blocking inside
  // third-party iframes.

  let enabled = true;
  let exemptRules = [];

  function applyState() {
    const host = location.hostname;
    const pathname = location.pathname;
    const exempt = !enabled || exemptRules.some((r) => ruleMatches(host, pathname, r));

    if (exempt) root.setAttribute("data-gray", "off");
    else root.removeAttribute("data-gray");

    // Domain-level rules are already enforced by a persistent dynamic DNR
    // rule regardless of this script. Path-level rules have no such native
    // support (initiatorDomains can't express a path), so they're enforced by
    // a tab-scoped session rule that only this script can ask for. Evaluated
    // once per top-level navigation; a client-side route change (pushState)
    // inside a single-page app won't re-trigger this until the next full load.
    if (window === window.top) {
      const pathRuleMatches =
        enabled &&
        exemptRules.some((r) => parseRule(r).path !== null && ruleMatches(host, pathname, r));
      chrome.runtime.sendMessage({ type: "syncPathExemption", matches: pathRuleMatches }).catch(() => {});
    }
  }

  // Wrapped because a tab left open across an extension reload runs this old
  // content script instance with a severed connection to the extension —
  // every chrome.* call in that stale instance throws "Extension context
  // invalidated" until the tab itself is refreshed. Harmless and expected
  // during dev iteration; guarding it just keeps that noise out of the error
  // log instead of surfacing as an uncaught error.
  try {
    chrome.storage.local
      .get(["enabled", "exemptRules", "grayColor"])
      .then((stored) => {
        enabled = stored.enabled !== false;
        exemptRules = stored.exemptRules || [];
        if (stored.grayColor) root.style.setProperty("--gray-color", stored.grayColor);
        applyState();
      })
      .catch(() => {});

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.enabled) enabled = changes.enabled.newValue !== false;
      if (changes.exemptRules) exemptRules = changes.exemptRules.newValue || [];
      if (changes.grayColor) root.style.setProperty("--gray-color", changes.grayColor.newValue);
      if (changes.enabled || changes.exemptRules) applyState();
    });
  } catch {
    // Stale tab, extension context already gone. Nothing to recover into.
  }

  // Shared by the two scans below: a solid box reads as an intentional
  // stand-in for a photo, but on a favicon/logo-sized element it just looks
  // broken.
  const isIconSized = ({ width, height }) => width < 40 && height < 40;

  // Coalesces bursty DOM churn (SPAs mutate constantly) into at most one
  // scan per `ms`.
  function debounce(fn, ms) {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        fn();
      }, ms);
    };
  }

  // Background-images can't be reliably targeted by CSS selectors alone, so
  // this scans computed style and tags real matches for gray.css to paint.
  // Checks for an actual url(...) rather than "!== 'none'": a CSS gradient
  // also computes non-"none" despite having no image to hide — was painting
  // a solid box over gradient-highlighted plain text (Google's AI Overview
  // citations use one). DNR blocks the bytes regardless of scan timing, so
  // lag only risks a briefly blank box, never the real image.
  function scanBackgroundImages() {
    for (const el of document.querySelectorAll("*:not([data-gray-bg]):not([data-gray-skip])")) {
      const bg = getComputedStyle(el).backgroundImage;
      // data: URIs make no network request — nothing was blocked, nothing to
      // hide — and are almost always a small decorative icon (a search bar's
      // magnifying glass, say) rendered inside a much larger container, so
      // the container's size says nothing about the icon's actual size.
      // Skipping them entirely avoids painting a solid box over functional
      // UI chrome.
      if (!/url\(/.test(bg) || /url\(["']?data:/.test(bg)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // not rendered yet; re-check next scan
      el.setAttribute(isIconSized(rect) ? "data-gray-skip" : "data-gray-bg", "");
    }
  }

  // Plain blocked <img>s have no size info at block time (DNR blocks before
  // any bytes exist), so this checks size after layout instead and skips the
  // solid box on icon-sized results — still blocked either way, just falls
  // back to the browser's small broken-image glyph. Excludes data:/blob:,
  // which go through the wrap-for-color overlay path below instead.
  function scanIconSizes() {
    for (const img of document.querySelectorAll(
      'img:not([src^="data:"]):not([src^="blob:"]):not([data-gray-skip])',
    )) {
      const rect = img.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // not laid out yet; re-check next scan
      if (isIconSized(rect)) img.setAttribute("data-gray-skip", "");
    }
  }

  // data:/blob: images and video can't be network-blocked, so gray.css's
  // filter:contrast(0) is a zero-latency safety net that always applies
  // instantly — but a filter can only flatten toward neutral, never a custom
  // hue. This wraps matching elements and layers an opaque --gray-color
  // overlay on top to show the real color; pointer-events:none lets clicks
  // and video's native controls pass straight through to the real element.
  function wrapForColor(el) {
    if (el.dataset.grayWrapped !== undefined) return;
    el.dataset.grayWrapped = "";

    const cs = getComputedStyle(el);
    const wrapper = document.createElement("span");
    wrapper.style.cssText =
      `position: relative; display: ${cs.display === "inline" ? "inline-block" : cs.display}; ` +
      `width: ${cs.width}; height: ${cs.height}; vertical-align: ${cs.verticalAlign};`;
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    const overlay = document.createElement("span");
    overlay.setAttribute("data-gray-overlay", "");
    wrapper.appendChild(overlay);
  }

  function scanColorTargets() {
    for (const el of document.querySelectorAll(
      'img[src^="data:"]:not([data-gray-wrapped]), img[src^="blob:"]:not([data-gray-wrapped]), video:not([data-gray-wrapped])',
    )) {
      wrapForColor(el);
    }
  }

  // One observer drives all three scans. Background/icon scans are
  // debounced (no timing pressure either way); scanColorTargets runs
  // undebounced since data:/blob:/video content is already loaded locally, so
  // minimizing the neutral-gray preview window before the real color lands
  // actually matters there. attributeFilter covers class/style (background-
  // image toggled on after initial render) and src (a blob: URL assigned to
  // an existing placeholder <img> after a fetch resolves) — childList/subtree
  // alone would miss both.
  const queueBackgroundScan = debounce(scanBackgroundImages, 200);
  const queueIconScan = debounce(scanIconSizes, 200);
  function onMutate() {
    if (root.getAttribute("data-gray") === "off") return;
    queueBackgroundScan();
    queueIconScan();
    scanColorTargets();
  }
  onMutate();
  new MutationObserver(onMutate).observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "src"],
  });

  // Mute video. Media events don't bubble, but capture-phase listeners still
  // see them, so two document-level listeners cover every video, including
  // ones inside same-origin-matched iframes (all_frames in the manifest).
  const mute = (e) => {
    if (root.getAttribute("data-gray") === "off") return; // exempt page, not our doing
    e.target.muted = true;
  };
  document.addEventListener("play", mute, true);
  document.addEventListener("volumechange", mute, true); // players restore saved volume after load

  // Blocked-image counter, for the popup/dashboard stat. A blocked network
  // request surfaces to the page as an ordinary failed <img> load, so this
  // needs no extra permission or debug-only API.
  // ponytail: counts any failed image load on a non-exempt page, not only
  // ones we blocked (a real 404 would also count). Fine for a fun stat, not
  // precise enough for anything that needs to be exact.
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (img.tagName !== "IMG") return;
      if (root.getAttribute("data-gray") === "off") return; // exempt page, not our doing
      chrome.runtime.sendMessage({ type: "incrementBlocked", count: 1 }).catch(() => {});
    },
    true,
  );
})();
