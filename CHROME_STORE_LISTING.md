# Chrome Web Store listing draft

Copy-paste source for the Developer Dashboard fields. Not part of the extension itself.

## Checklist to publish

1. Create a developer account at https://chrome.google.com/webstore/devconsole (one-time $5 registration fee).
2. Zip the contents of `extension/` (the files inside it, not the folder itself or the repo root) and upload as a new item.
3. Fill in the **Store listing** tab using the copy below.
4. Take at least one screenshot (1280x800 or 640x400 PNG/JPEG), e.g. a page with blocked images, and the popup open. `test-pages/index.html` has fixtures you can use for this.
5. Fill in the **Privacy practices** tab:
   - Single purpose: see below
   - Permission justifications: see below
   - Data usage: see below
   - Privacy policy URL: a public URL to [PRIVACY.md](PRIVACY.md) (e.g. its GitHub blob URL once this repo is pushed/public, or a GitHub Pages URL)
6. Submit for review. New items typically take a few days to review.

## Store listing copy

**Short description** (132 char max):
```
Lightweight, faster, distraction-free browsing: blocks images and mutes video by default, everywhere. Nothing leaves your browser.
```

**Detailed description:**
```
Gray blocks images and mutes video by default on every site you visit, for lighter, faster pages with fewer network calls.

FEATURES
- Blocks images before they download, at the network level, not just hidden with CSS, so the bytes never hit your connection.
- Mutes video automatically.
- Allow images on specific sites, or specific sections of a site (e.g. example.com/maps).
- Choose your own box color from five presets.
- See a running count of images you've blocked.
- One switch to turn blocking off everywhere, instantly.
- Simple and lightweight: no bloat, no dependencies, no accounts.

PRIVACY
Gray has no server, no analytics, and no account. All settings are stored locally in your browser and never leave your device. See the full privacy policy: [link]

Open source: [repo link]
```

**Category:** Productivity (Accessibility is a reasonable alternative)

**Language:** English

## Privacy practices tab

**Single purpose description:**
```
Gray blocks images and mutes video by default on web pages, for faster, lighter pages, with per-site exceptions.
```

**Permission justifications:**

- `storage`: "Stores the user's settings (on/off state, exempt sites, box color, blocked-image counter) locally in the browser. No data is synced or transmitted."
- `activeTab`: "Reads the active tab's URL so the popup can display and toggle whether the current site is exempt from image blocking."
- `declarativeNetRequest`: "Blocks image network requests before they load, and adds per-site allow rules for sites the user has exempted."
- Host permission / content script on all URLs: "Blocking and mute are default-on across every site, so the content script needs to run everywhere to paint placeholders and mute video."

**Data usage disclosure:**
Answer **"This item does not collect user data"**: nothing is transmitted off the device. If the questionnaire forces a category selection because the content script reads page URLs/content, disclose "Website content" and "Web history" as accessed-but-not-collected, both scoped to "used only locally, not transmitted or stored off-device."

Certifications to check: does not sell user data; does not use/transfer user data for purposes unrelated to the extension's core functionality; does not use/transfer user data to determine creditworthiness or for lending.
