const assert = require("node:assert");
const { formatCount } = require("./stat.js");

assert.strictEqual(formatCount(0), "0");
assert.strictEqual(formatCount(314), "314");
assert.strictEqual(formatCount(999_999), "999,999");

// A million and up: two decimals, trailing zeros dropped.
assert.strictEqual(formatCount(1_000_000), "1 million");
assert.strictEqual(formatCount(1_570_324), "1.57 million");
assert.strictEqual(formatCount(2_500_000), "2.5 million");
assert.strictEqual(formatCount(12_345_678), "12.35 million");

// A billion and up switches word.
assert.strictEqual(formatCount(1_000_000_000), "1 billion");
assert.strictEqual(formatCount(1_234_567_890), "1.23 billion");
assert.strictEqual(formatCount(25_000_000_000), "25 billion");

console.log("stat.test.js: ok");
