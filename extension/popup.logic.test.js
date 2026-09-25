const test = require("node:test");
const assert = require("node:assert/strict");

const { shouldShowRateNudge, RATE_NUDGE_THRESHOLD } = require("./rate-nudge.js");

test("hidden below the threshold", () => {
  assert.equal(shouldShowRateNudge(RATE_NUDGE_THRESHOLD - 1, false), false);
});

test("shown at the threshold", () => {
  assert.equal(shouldShowRateNudge(RATE_NUDGE_THRESHOLD, false), true);
});

test("shown above the threshold", () => {
  assert.equal(shouldShowRateNudge(RATE_NUDGE_THRESHOLD + 1000, false), true);
});

test("hidden once dismissed, regardless of count", () => {
  assert.equal(shouldShowRateNudge(RATE_NUDGE_THRESHOLD + 1000, true), false);
});
