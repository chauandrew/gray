const GRAY = "rgb(156, 144, 134)";

describe("class-toggle-background", () => {
  it("has no box before the delayed class is added", () => {
    cy.visit("/class-toggle-background.html");
    // Runs immediately; the page's own 1s timer hasn't fired yet.
    cy.get("#card").should("not.have.attr", "data-gray-bg");
    cy.get("#card").should("not.have.css", "background-color", GRAY);
  });

  it("gets boxed after the class is added to an already-mounted node", () => {
    cy.visit("/class-toggle-background.html");
    // The page's own script adds the class ~1s in; the mutation observer
    // then has its own 200ms debounce on top. Cypress retries until then.
    cy.get("#card", { timeout: 3000 }).should("have.attr", "data-gray-bg");
    cy.get("#card").should("have.css", "background-color", GRAY);
  });
});
