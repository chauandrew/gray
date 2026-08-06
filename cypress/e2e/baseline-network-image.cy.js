const GRAY = "rgb(156, 144, 134)"; // #9c9086, the default box color

// Cypress's AUT iframe renders any failed <img> load (blocked or a plain
// 404, verified against both) as display:none regardless of width/height —
// a Cypress-environment quirk, not something this extension causes or can
// see, so rendered-size assertions can't be checked here. The manual
// fixture page is the source of truth for "is the box actually the right
// size" (see baseline-network-image.html). Cypress also refuses to .click()
// an element it considers invisible; {force: true} bypasses that check,
// since it is genuinely clickable in every real browser this was tested in.

describe("baseline-network-image", () => {
  it("boxes the blocked image in the chosen color", () => {
    cy.visit("/baseline-network-image.html");
    cy.get("img").should("have.css", "background-color", GRAY);
  });

  it("reveals the real image on click, and re-boxes it on a second click", () => {
    cy.visit("/baseline-network-image.html");

    cy.get("img").click({ force: true });
    cy.get("img").should("have.attr", "data-gray-show");
    cy.get("img").should("not.have.css", "background-color", GRAY);

    cy.get("img").click({ force: true });
    cy.get("img").should("not.have.attr", "data-gray-show");
    cy.get("img").should("have.css", "background-color", GRAY);
  });
});
