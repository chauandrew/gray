const { GRAY } = require("../support/gray-color");

describe("video", () => {
  it("shows the real box color, and stays clickable through the overlay", () => {
    cy.visit("/video.html");
    cy.get("video", { timeout: 2000 }).should("have.attr", "data-gray-wrapped");
    cy.get("video")
      .next("[data-gray-overlay]")
      .should("have.css", "background-color", GRAY)
      .and("have.css", "pointer-events", "none"); // lets clicks/controls pass through to the real element
  });

  it("force-mutes on play", () => {
    cy.visit("/video.html");
    cy.get("video").then(($video) => {
      // Dispatches the event directly rather than calling .play(), which
      // sidesteps browser autoplay-gesture policy flakiness entirely — this
      // is testing our listener's reaction to the event, not real playback.
      $video[0].dispatchEvent(new Event("play"));
    });
    cy.get("video").its("0.muted").should("be.true");
  });
});
