const GRAY = "rgb(156, 144, 134)";

describe("inline-style-background", () => {
  it("boxes an inline style background-image, no scan delay needed", () => {
    cy.visit("/inline-style-background.html");
    cy.get(".card").should("have.css", "background-color", GRAY);
    cy.get(".card").should("have.css", "background-image", "none");
  });
});
