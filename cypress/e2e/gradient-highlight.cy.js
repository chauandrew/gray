describe("gradient-highlight", () => {
  it("leaves a gradient-highlighted span untouched — no image to hide", () => {
    cy.visit("/gradient-highlight.html");
    cy.get(".highlight").should("not.have.attr", "data-gray-bg");
    cy.get(".highlight").should("have.css", "background-image").and("include", "gradient");
  });
});
