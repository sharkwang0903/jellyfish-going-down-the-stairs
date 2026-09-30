(function () {
  "use strict";

  const OFFICIAL_URL = "https://sharkwang0903.github.io/jellyfish-going-down-the-stairs/";
  const BUTTON_LABEL = "📤 分享戰績";

  document.addEventListener("DOMContentLoaded", () => {
    const screen = document.getElementById("gameOverScreen");
    const restartButton = document.getElementById("restartButton");
    const finalFloor = document.getElementById("finalFloor");
    const deathReason = document.getElementById("deathReason");
    const finalBest = document.getElementById("finalBest");
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
    let preparedCard;

    // Load only the existing, same-origin artwork; sharing still works without it.
    function loadArtwork(source) {
      return new Promise((resolve) => {
        const image = new Image();
        const timer = window.setTimeout(() => finish(null), 1500);
        function finish(value) {
          window.clearTimeout(timer);
          image.onload = null;
          image.onerror = null;
          resolve(value);
        }
        image.onload = () => finish(image);
        image.onerror = () => finish(null);
        image.src = source;
      });
    }

    const artwork = typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" && typeof File === "function"
      ? Promise.all([
        loadArtwork("assets/cave-background.png"),
        loadArtwork("assets/cave-wall.png"),
        loadArtwork("assets/jellyfish-idle.png")
      ])
      : Promise.resolve([]);

    function readResult() {
      const currentUrl = window.location.origin + window.location.pathname;
      return {
        floor: finalFloor.textContent.trim(),
        reason: deathReason.textContent.trim(),
        best: finalBest ? finalBest.textContent.trim() : "",
        // Keep local files, preview paths, queries and hashes out of the share.
        url: currentUrl === OFFICIAL_URL ? currentUrl : OFFICIAL_URL
      };
    }

    async function createShareCard(result) {
      const [background, wall, jellyfish] = await artwork;
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas unavailable");
      }
      context.imageSmoothingEnabled = false;
      context.fillStyle = "#020819";
      context.fillRect(0, 0, 1080, 1350);
      if (background) {
        for (let y = 0; y < 1350; y += 540) {
          for (let x = 0; x < 1080; x += 540) {
            context.drawImage(background, x, y, 540, 540);
          }
        }
      }
      if (wall) {
        for (let y = 0; y < 1350; y += 288) {
          context.drawImage(wall, 0, y, 96, 288);
          context.save();
          context.translate(1080, 0);
          context.scale(-1, 1);
          context.drawImage(wall, 0, y, 96, 288);
          context.restore();
        }
      }
      context.fillStyle = "rgba(0, 5, 18, 0.55)";
      context.fillRect(0, 0, 1080, 1350);
      context.strokeStyle = "#3cc4e3";
      context.lineWidth = 6;
      context.strokeRect(42, 42, 996, 1266);
      context.strokeStyle = "#1d6688";
      context.lineWidth = 4;
      context.strokeRect(54, 54, 972, 1242);
      context.fillStyle = "rgba(2, 12, 35, 0.94)";
      context.fillRect(108, 108, 864, 1134);
      context.strokeStyle = "#07142b";
      context.lineWidth = 12;
      context.strokeRect(108, 108, 864, 1134);
      context.strokeStyle = "#6ae0ff";
      context.lineWidth = 4;
      context.strokeRect(108, 108, 864, 1134);

      // Scanlines and square accents echo the game's pixel UI.
      context.fillStyle = "rgba(87, 214, 255, 0.035)";
      for (let y = 112; y < 1240; y += 8) {
        context.fillRect(112, y, 856, 2);
      }
      function drawText(text, x, y, size, color, maxWidth, align = "center") {
        const font = '"Courier New", "Noto Sans TC", "Microsoft JhengHei", monospace';
        context.font = `bold ${size}px ${font}`;
        while (context.measureText(text).width > maxWidth && size > 18) {
          size -= 2;
          context.font = `bold ${size}px ${font}`;
        }
        context.textAlign = align;
        context.fillStyle = color;
        context.fillText(text, x, y);
      }
      drawText("水母下樓梯", 540, 198, 46, "#c4f7ff", 728);
      drawText("EXPEDITION ENDED", 540, 258, 25, "#6ae0ff", 728);
      drawText("遊戲結束", 546, 338, 64, "#7b1859", 728);
      drawText("遊戲結束", 540, 332, 64, "#ffffff", 728);
      context.fillStyle = "#ff4f9a";
      for (let x = 312; x < 768; x += 36) {
        context.fillRect(x, 370, 24, 6);
      }
      if (jellyfish) {
        const scale = Math.min(256 / jellyfish.width, 256 / jellyfish.height);
        const width = Math.round(jellyfish.width * scale);
        const height = Math.round(jellyfish.height * scale);
        context.drawImage(jellyfish, Math.round(540 - width / 2), 410, width, height);
      } else {
        // A small pixel jellyfish keeps the card complete if an asset is missing.
        const pixels = ["00111100", "01111110", "11211211", "11111111", "01111110", "01011010", "01011010"];
        pixels.forEach((row, y) => Array.from(row).forEach((pixel, x) => {
          if (pixel !== "0") {
            context.fillStyle = pixel === "2" ? "#ffffff" : "#ff4f9a";
            context.fillRect(444 + x * 24, 430 + y * 24, 24, 24);
          }
        }));
      }
      drawText("本局最深地下樓層", 540, 702, 34, "#a8d9e8", 728);
      drawText(`抵達 ${result.floor}`, 546, 804, 104, "#7b1859", 728);
      drawText(`抵達 ${result.floor}`, 540, 798, 104, "#ff4f9a", 728);

      function drawStat(label, value, y) {
        context.fillStyle = "rgba(8, 42, 74, 0.8)";
        context.fillRect(176, y, 728, 86);
        context.strokeStyle = "rgba(106, 224, 255, 0.45)";
        context.lineWidth = 2;
        context.strokeRect(176, y, 728, 86);
        drawText(label, 202, y + 55, 32, "#a8d9e8", 230, "left");
        drawText(value, 878, y + 55, 36, "#e9fbff", 414, "right");
      }
      if (result.best) {
        drawStat("最高紀錄", result.best, 862);
      }
      drawStat("死亡原因", result.reason, 968);
      drawText("你能下得比我更深嗎？", 540, 1140, 38, "#c4f7ff", 728);
      drawText("DEEP CAVE EXPEDITION", 540, 1196, 22, "#6ae0ff", 728);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG unavailable")), "image/png");
      });
      return new File([blob], "jellyfish-result.png", { type: "image/png" });
    }

    function prepareShareCard(result) {
      if (typeof navigator.share !== "function" ||
          typeof navigator.canShare !== "function" || typeof File !== "function") {
        return null;
      }
      const key = JSON.stringify(result);
      if (!preparedCard || preparedCard.key !== key) {
        const card = { key, file: null, promise: null };
        preparedCard = card;
        // Prepare at game over so the click usually calls share without waiting.
        card.promise = createShareCard(result).then((file) => {
          card.file = file;
          return file;
        }).catch(() => null);
      }
      return preparedCard;
    }

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

      const result = readResult();
      const url = result.url;
      // These are the already-computed results shown for this run, not finalBest.
      const text = `🪼 我在《水母下樓梯》抵達 ${result.floor}\n` +
        `最後因為「${result.reason}」結束探險。\n` +
        "你能下得比我更深嗎？";
      const fullText = `${text}\n🎮 ${url}`;

      try {
        if (typeof navigator.share === "function") {
          const data = { title: "水母下樓梯", text: `${text}\n🎮`, url };
          const card = prepareShareCard(result);
          if (card) {
            button.textContent = "分享中...";
            const file = card.file || await card.promise;
            if (screen.hidden || preparedCard !== card) {
              return;
            }
            if (file) {
              try {
                if (navigator.canShare({ files: [file] }) &&
                    navigator.canShare({ ...data, files: [file] })) {
                  await navigator.share({ ...data, files: [file] });
                  return;
                }
              } catch (error) {
                if (error && error.name === "AbortError") {
                  return;
                }
                // Unsupported files or a real image-share failure try text next.
              }
            }
          }
          try {
            // The URL belongs only in url so share targets do not receive it twice.
            await navigator.share(data);
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
        if (button.textContent === "分享中...") {
          button.textContent = BUTTON_LABEL;
        }
      }
    });

    new MutationObserver(() => {
      window.clearTimeout(feedbackTimer);
      button.textContent = BUTTON_LABEL;
      preparedCard = null;
      if (!screen.hidden) {
        prepareShareCard(readResult());
      }
    }).observe(screen, { attributes: true, attributeFilter: ["hidden"] });
    if (!screen.hidden) {
      prepareShareCard(readResult());
    }
  });
})();
