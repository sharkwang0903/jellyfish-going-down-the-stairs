(function () {
  "use strict";

  const Game = window.JellyfishGame;
  const C = Game.CONFIG;

  class UI {
    constructor() {
      this.hud = document.getElementById("hud");
      this.hpText = document.getElementById("hpText");
      this.hpBar = document.getElementById("hpBar");
      this.floorText = document.getElementById("floorText");
      this.bestText = document.getElementById("bestText");
      this.startScreen = document.getElementById("startScreen");
      this.gameOverScreen = document.getElementById("gameOverScreen");
      this.startButton = document.getElementById("startButton");
      this.restartButton = document.getElementById("restartButton");
      this.loadMessage = document.getElementById("loadMessage");
      this.finalFloor = document.getElementById("finalFloor");
      this.finalBest = document.getElementById("finalBest");
      this.deathReason = document.getElementById("deathReason");
    }

    setReady() {
      this.startButton.disabled = false;
      this.startButton.textContent = "開始遊戲";
      this.loadMessage.textContent = "";
    }

    showLoadError(message) {
      this.startButton.disabled = true;
      this.startButton.textContent = "無法開始";
      this.loadMessage.textContent = message;
    }

    showStart() {
      this.hud.setAttribute("aria-hidden", "true");
      this.startScreen.hidden = false;
      this.gameOverScreen.hidden = true;
    }

    showGame() {
      this.hud.setAttribute("aria-hidden", "false");
      this.startScreen.hidden = true;
      this.gameOverScreen.hidden = true;
    }

    updateHUD(hp, floor, best) {
      this.hpText.textContent = `${hp} / ${C.MAX_HP}`;
      this.hpBar.style.width = `${(hp / C.MAX_HP) * 100}%`;
      this.floorText.textContent = `B${floor}`;
      this.bestText.textContent = `B${best}`;
    }

    showGameOver(floor, best, reason) {
      this.hud.setAttribute("aria-hidden", "false");
      this.startScreen.hidden = true;
      this.gameOverScreen.hidden = false;
      this.finalFloor.textContent = `B${floor}`;
      this.finalBest.textContent = `B${best}`;
      this.deathReason.textContent = reason === "hp" ? "生命值歸零" : "墜落";
      this.restartButton.focus();
    }
  }

  Game.UI = UI;
})();
