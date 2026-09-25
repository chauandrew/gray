const assert = require("node:assert");
const { nextSnoozeAction } = require("./snooze.js");

// Idle -> clicked: starts a pause and turns blocking off.
assert.deepStrictEqual(nextSnoozeAction(false), { enabled: false, action: "create" });

// Already paused -> clicked again: cancels the pause and turns blocking back
// on immediately, instead of restarting the 5 minutes.
assert.deepStrictEqual(nextSnoozeAction(true), { enabled: true, action: "clear" });

console.log("snooze.test.js: ok");
