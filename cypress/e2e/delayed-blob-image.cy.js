const GRAY = "rgb(156, 144, 134)";

describe("delayed-blob-image", () => {
  it("is untouched before the blob src is assigned", () => {
    cy.visit("/delayed-blob-image.html");
    cy.get("#target").should("not.have.attr", "data-gray-wrapped");
  });

  it("wraps and colors the image once a blob: src is assigned to the existing node", () => {
    cy.visit("/delayed-blob-image.html");
    // Page's own script assigns src ~1s in; attributeFilter: ["src"] on the
    // mutation observer catches it with no debounce, but still needs a tick.
    cy.get("#target", { timeout: 3000 })
      .should("have.attr", "src")
      .and("match", /^blob:/);
    cy.get("#target").should("have.attr", "data-gray-wrapped");
    cy.get("#target").next("[data-gray-overlay]").should("have.css", "background-color", GRAY);
  });
});
