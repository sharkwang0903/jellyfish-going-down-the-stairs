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
      this.modeInputs = Array.from(document.querySelectorAll('input[name="gameMode"]'));
      this.modeMenuButton = document.getElementById("modeMenuButton");
      this.gameMode = null;
      this.ready = false;
      for (const input of this.modeInputs) {
        input.addEventListener("change", () => {
          this.gameMode = input.value;
          this.startButton.disabled = !this.ready;
          if (this.ready) {
            this.startButton.textContent = "開始遊戲";
          }
        });
      }
    }

    setReady() {
      this.ready = true;
      this.startButton.disabled = !this.gameMode;
      this.startButton.textContent = this.gameMode ? "開始遊戲" : "請先選擇模式";
      this.loadMessage.textContent = "";
    }

    setSpecialReady(ready) {
      const input = this.modeInputs.find((input) => input.value === "special");
      input.disabled = !ready;
      if (!ready) {
        this.loadMessage.textContent = "特殊模式素材載入失敗，仍可選擇經典模式。";
      }
    }

    resetModeSelection() {
      this.gameMode = null;
      this.modeInputs.forEach((input) => { input.checked = false; });
      this.startButton.disabled = true;
      this.startButton.textContent = "請先選擇模式";
    }

    showLoadError(message) {
      this.startButton.disabled = true;
      this.ready = false;
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
