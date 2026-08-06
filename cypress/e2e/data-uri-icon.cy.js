describe("data-uri-icon", () => {
  it("leaves a small data: URI icon inside a large container untouched", () => {
    cy.visit("/data-uri-icon.html");
    cy.get(".search-bar").should("not.have.attr", "data-gray-bg");
    cy.get(".search-bar").should("have.css", "background-image").and("include", "data:image/svg+xml");
  });
});
