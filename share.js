(function () {
  "use strict";

  const OFFICIAL_URL = "https://sharkwang0903.github.io/jellyfish-going-down-the-stairs/";
  const BUTTON_LABEL = "📤 分享戰績";

  document.addEventListener("DOMContentLoaded", () => {
    const screen = document.getElementById("gameOverScreen");
    const restartButton = document.getElementById("restartButton");
    const finalFloor = document.getElementById("finalFloor");
    const deathReason = document.getElementById("deathReason");
    if (!screen || !restartButton || !finalFloor || !deathReason) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      #shareButton {
        display: block;
        margin: 0 auto 14px;
        border-color: var(--ice);
        color: var(--ice-bright);
        background: linear-gradient(180deg, #123d5c, #08243e);
        box-shadow: 0 4px 0 #031529;
      }
      #shareButton:active:not(:disabled) {
        box-shadow: 0 1px 0 #031529;
      }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "shareButton";
    button.type = "button";
    button.className = "game-button";
    button.textContent = BUTTON_LABEL;
    button.setAttribute("aria-live", "polite");
    restartButton.before(button);
    let feedbackTimer;

    function showFeedback(message) {
      window.clearTimeout(feedbackTimer);
      button.textContent = message;
      feedbackTimer = window.setTimeout(() => {
        button.textContent = BUTTON_LABEL;
      }, 1800);
    }

    async function copyText(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch (error) {
          // Permission restrictions may still allow the legacy copy fallback.
        }
      }

      const focusedElement = document.activeElement;
      const selection = window.getSelection();
      const ranges = [];
      if (selection) {
        for (let i = 0; i < selection.rangeCount; i += 1) {
          ranges.push(selection.getRangeAt(i).cloneRange());
        }
      }
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.readOnly = true;
      textarea.style.cssText = "position:fixed;left:-9999px;top:0;font-size:16px;";
      document.body.appendChild(textarea);
      try {
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        if (!document.execCommand("copy")) {
          throw new Error("Copy unavailable");
        }
      } finally {
        textarea.remove();
        if (selection) {
          selection.removeAllRanges();
          ranges.forEach((range) => selection.addRange(range));
        }
        if (focusedElement && typeof focusedElement.focus === "function") {
          focusedElement.focus({ preventScroll: true });
        }
      }
    }

    button.addEventListener("click", async () => {
      if (screen.hidden || button.disabled) {
        return;
      }
      window.clearTimeout(feedbackTimer);
      button.textContent = BUTTON_LABEL;
      button.disabled = true;

      // Only use the current page when it is the confirmed production URL.
      // Local files, preview paths and development hosts use the official URL.
      const currentUrl = window.location.origin + window.location.pathname;
      const url = currentUrl === OFFICIAL_URL ? currentUrl : OFFICIAL_URL;
      // These are the already-computed results shown for this run, not finalBest.
      const text = `🪼 我在《水母下樓梯》抵達 ${finalFloor.textContent.trim()}\n` +
        `最後因為「${deathReason.textContent.trim()}」結束探險。\n` +
        "你能下得比我更深嗎？";
      const fullText = `${text}\n🎮 ${url}`;

      try {
        if (typeof navigator.share === "function") {
          try {
            // The URL belongs only in url so share targets do not receive it twice.
            await navigator.share({ title: "水母下樓梯", text: `${text}\n🎮`, url });
            return;
          } catch (error) {
            if (error && error.name === "AbortError") {
              return;
            }
            // A real sharing failure can still fall back to copying the result.
          }
        }
        await copyText(fullText);
        if (!screen.hidden) {
          showFeedback("已複製戰績！");
        }
      } catch (error) {
        if (!screen.hidden) {
          showFeedback("複製失敗，請重試");
        }
      } finally {
        button.disabled = false;
      }
    });

    new MutationObserver(() => {
      window.clearTimeout(feedbackTimer);
      button.textContent = BUTTON_LABEL;
    }).observe(screen, { attributes: true, attributeFilter: ["hidden"] });
  });
})();
