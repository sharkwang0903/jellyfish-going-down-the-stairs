(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ui = new window.JellyfishGame.UI();
    const game = new window.JellyfishGame.Game(canvas, ui);

    ui.startButton.addEventListener("click", () => game.start());
    ui.restartButton.addEventListener("click", () => game.start());

    window.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      if (game.state === "running") {
        event.preventDefault();
        game.setInput(event.key === "ArrowLeft" ? "left" : "right", true);
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      game.setInput(event.key === "ArrowLeft" ? "left" : "right", false);
    });

    window.addEventListener("blur", () => game.clearInput());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        game.clearInput();
      }
    });

    game.initialize();
  });
})();
