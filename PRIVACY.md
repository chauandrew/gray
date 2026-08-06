# Privacy Policy for Gray

Last updated: 2026-08-06

Gray does not collect, store, transmit, or sell any personal data. There is no backend server, analytics, or third-party service of any kind.

## What Gray stores

Gray uses Chrome's local `storage` API (`chrome.storage.local`) to save your settings on your own device:

- whether blocking is turned on
- your list of exempt sites/pages
- your chosen box color
- a running count of images blocked

This data never leaves your browser. It is not synced to any account, sent to any server, or shared with any third party. Uninstalling the extension deletes it.

## What Gray accesses on pages you visit

To block images and mute video, Gray's content script runs on every page you visit and reads:

- the page's URL (hostname and path), to decide whether the page is exempt from blocking
- image and video elements on the page, to block and mute them

This information is used only in your browser, in real time, to render the page. None of it is recorded, logged, or transmitted anywhere.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save your settings locally, as described above. |
| `activeTab` | Read the active tab's URL so the popup can show/toggle that site's exemption. |
| `declarativeNetRequest` | Block image requests before they load, and allow them again for exempted sites. |
| Content script on all sites | Paint blocked-image placeholders and mute video. |

## Changes

If this policy ever changes, the update will be reflected in this file and in the version history of this repository.

## Contact

Questions about this policy: andrewchau333@gmail.com
