const { GRAY } = require("../support/gray-color");

// Cypress's AUT iframe renders any failed <img> load (blocked or a plain
// 404, verified against both) as display:none regardless of width/height —
// a Cypress-environment quirk, not something this extension causes or can
// see, so rendered-size assertions can't be checked here. The manual
// fixture page is the source of truth for "is the box actually the right
// size" (see baseline-network-image.html).

describe("baseline-network-image", () => {
  it("boxes the blocked image in the chosen color", () => {
    cy.visit("/baseline-network-image.html");
    cy.get("img").should("have.css", "background-color", GRAY);
  });
});
