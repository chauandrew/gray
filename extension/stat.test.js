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

console.log("stat.test.js: ok");
