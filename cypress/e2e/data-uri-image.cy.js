const { GRAY } = require("../support/gray-color");

describe("data-uri-image", () => {
  it("flattens to neutral instantly, then upgrades to the real color", () => {
    cy.visit("/data-uri-image.html");
    // Zero-latency CSS safety net — no JS involved, should already be set.
    cy.get("img").should("have.css", "filter").and("include", "contrast");

    // The wrap-for-color scan has no debounce, but still needs a tick.
    cy.get("img", { timeout: 2000 }).should("have.attr", "data-gray-wrapped");
    cy.get("img")
      .next("[data-gray-overlay]")
      .should("have.css", "background-color", GRAY)
      .and("have.css", "pointer-events", "none");
  });
});
