(function () {
  "use strict";

  const Game = window.JellyfishGame;

  function initialize(canvas, game) {
    let activePointerId = null;
    let activeDirection = null;

    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
    canvas.style.webkitTouchCallout = "none";

    canvas.addEventListener("pointerdown", (event) => {
      if (
        activePointerId !== null ||
        event.isPrimary === false ||
        event.pointerType === "mouse" ||
        game.state !== "running"
      ) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0) {
        return;
      }

      activePointerId = event.pointerId;
      activeDirection = event.clientX - bounds.left < bounds.width / 2
        ? "left"
        : "right";

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      game.setInput(activeDirection, true);
    });

    const stopActivePointer = (event) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      event.preventDefault();
      game.setInput(activeDirection, false);
      activePointerId = null;
      activeDirection = null;
    };

    canvas.addEventListener("pointerup", stopActivePointer);
    canvas.addEventListener("pointercancel", stopActivePointer);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  Game.MobileControls = { initialize };
})();
