// Shared by popup.js. Pure decision for what a click on the snooze button
// should do, given whether a pause is already running — kept dependency-free
// so the two branches (start vs. cancel) can be unit tested without a real
// DOM or chrome.* APIs.
function nextSnoozeAction(isPaused) {
  return isPaused ? { enabled: true, action: "clear" } : { enabled: false, action: "create" };
}

if (typeof module !== "undefined") module.exports = { nextSnoozeAction };
