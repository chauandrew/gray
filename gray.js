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

  // Click-to-reveal. One capture-phase listener on document so dynamically
  // added images need no per-element bookkeeping.
  document.addEventListener(
    "click",
    (e) => {
      const img = e.target.closest("img");
      if (!img) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // let modified clicks through (open in new tab, etc.)

      e.preventDefault();
      e.stopPropagation();

      if (img.hasAttribute("data-gray-show")) {
        // Re-hide: put the block back in place.
        img.removeAttribute("data-gray-show");
        if (img.dataset.graySrc) {
          img.src = img.dataset.graySrc;
          delete img.dataset.graySrc;
        }
        if (img.dataset.graySrcset !== undefined) {
          img.srcset = img.dataset.graySrcset;
          delete img.dataset.graySrcset;
        }
        return;
      }

      const url = img.currentSrc || img.src;
      if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
        // No network request involved (data:/blob:), or nothing to reveal.
        // contrast(0) filter handles these purely via the data-gray-show toggle.
        img.setAttribute("data-gray-show", "");
        return;
      }

      // Stash and drop srcset first, or the browser may pick a candidate URL
      // the session allow-rule doesn't match.
      if (img.srcset) {
        img.dataset.graySrcset = img.srcset;
        img.removeAttribute("srcset");
      }
      img.dataset.graySrc = img.src;

      chrome.runtime
        .sendMessage({ type: "reveal", url })
        .then(() => {
          img.setAttribute("data-gray-show", "");
          // Re-assigning the same src string doesn't retrigger a load.
          img.removeAttribute("src");
          img.src = url;
        })
        .catch(() => {}); // stale tab after an extension reload; refreshing the page fixes it
    },
    true,
  );

  // Stylesheet-declared background-images can't be targeted by any CSS
  // selector, so this scans computed style and tags matches for gray.css to
  // paint. The DNR rule already blocks the underlying request no matter when
  // this runs, so scan lag only risks a briefly blank box, never the real
  // image. Debounced and re-run on DOM changes since SPAs add elements after
  // the initial scan.
  function scanBackgroundImages() {
    if (root.getAttribute("data-gray") === "off") return;
    for (const el of document.querySelectorAll("*:not([data-gray-bg])")) {
      if (getComputedStyle(el).backgroundImage !== "none") el.setAttribute("data-gray-bg", "");
    }
  }

  let scanQueued = false;
  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => {
      scanQueued = false;
      scanBackgroundImages();
    }, 200);
  }

  queueScan();
  new MutationObserver(queueScan).observe(root, { childList: true, subtree: true });

  // Mute video. Media events don't bubble, but capture-phase listeners still
  // see them, so two document-level listeners cover every video, including
  // ones inside same-origin-matched iframes (all_frames in the manifest).
  const mute = (e) => {
    if (!e.target.hasAttribute("data-gray-show")) e.target.muted = true;
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
      if (img.hasAttribute("data-gray-show")) return; // user revealed it; a later failure isn't ours
      chrome.runtime.sendMessage({ type: "incrementBlocked", count: 1 }).catch(() => {});
    },
    true,
  );
})();
