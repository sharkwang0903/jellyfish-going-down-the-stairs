(function () {
  "use strict";

  const GameNamespace = window.JellyfishGame;
  const C = GameNamespace.CONFIG;

  class Game {
    constructor(canvas, ui) {
      this.canvas = canvas;
      this.context = canvas.getContext("2d");
      this.context.imageSmoothingEnabled = false;
      this.ui = ui;
      this.images = {};
      this.player = new GameNamespace.Player();
      this.platformManager = new GameNamespace.PlatformManager();
      this.input = { left: false, right: false };
      this.state = "loading";
      this.worldDepth = 0;
      this.currentFloor = 1;
      this.bestFloor = this.loadBestFloor();
      this.scrollSpeed = C.INITIAL_SCROLL_SPEED;
      this.lastFrameTime = 0;
      this.animationFrameId = null;
      this.loop = this.loop.bind(this);
    }

    async initialize() {
      try {
        await this.loadImages();
        this.resetWorld();
        this.state = "menu";
        this.render();
        this.ui.showStart();
        this.ui.setReady();
      } catch (error) {
        this.state = "error";
        this.ui.showLoadError("圖片素材載入失敗，請確認 assets 資料夾完整。 ");
        console.error(error);
      }
    }

    loadImages() {
      const entries = Object.entries(C.ASSETS);
      return Promise.all(entries.map(([key, source]) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          this.images[key] = image;
          resolve();
        };
        image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
        image.src = source;
      })));
    }

    loadBestFloor() {
      try {
        const stored = Number.parseInt(localStorage.getItem(C.STORAGE_KEY), 10);
        return Number.isFinite(stored) && stored > 0 ? stored : 1;
      } catch (error) {
        return 1;
      }
    }

    saveBestFloor() {
      try {
        localStorage.setItem(C.STORAGE_KEY, String(this.bestFloor));
      } catch (error) {
        // The game still works if browser storage is unavailable.
      }
    }

    resetWorld() {
      this.input.left = false;
      this.input.right = false;
      this.worldDepth = 0;
      this.currentFloor = 1;
      this.scrollSpeed = C.INITIAL_SCROLL_SPEED;
      this.player.reset();
      const startingPlatform = this.platformManager.reset(this.scrollSpeed);
      this.player.x = startingPlatform.x + (startingPlatform.width - C.PLAYER_WIDTH) / 2;
      this.player.placeOn(startingPlatform);
      this.ui.updateHUD(this.player.hp, this.currentFloor, this.bestFloor);
    }

    start() {
      if (this.state === "loading" || this.state === "error") {
        return;
      }

      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }

      this.resetWorld();
      this.state = "running";
      this.ui.showGame();
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    setInput(direction, pressed) {
      if (direction === "left") {
        this.input.left = pressed;
      } else if (direction === "right") {
        this.input.right = pressed;
      }
    }

    clearInput() {
      this.input.left = false;
      this.input.right = false;
    }

    loop(timestamp) {
      if (this.state !== "running") {
        return;
      }

      const rawDt = (timestamp - this.lastFrameTime) / 1000;
      const dt = Math.min(C.MAX_DELTA_TIME, Math.max(0, rawDt));
      this.lastFrameTime = timestamp;
      this.update(dt);
      this.render();

      if (this.state === "running") {
        this.animationFrameId = requestAnimationFrame(this.loop);
      }
    }

    update(dt) {
      const speedLevel = Math.floor(
        (this.currentFloor - 1) / C.FLOORS_PER_SPEED_UP
      );
      this.scrollSpeed = Math.min(
        C.MAX_SCROLL_SPEED,
        C.INITIAL_SCROLL_SPEED + speedLevel * C.SPEED_STEP
      );
      this.worldDepth += this.scrollSpeed * dt;
      this.currentFloor = Math.floor(this.worldDepth / C.FLOOR_HEIGHT) + 1;

      if (this.currentFloor > this.bestFloor) {
        this.bestFloor = this.currentFloor;
        this.saveBestFloor();
      }

      this.platformManager.update(dt, this.scrollSpeed);
      this.player.update(dt, this.input);

      if (!this.player.standingPlatform) {
        const landingPlatform = GameNamespace.Physics.findLanding(
          this.player,
          this.platformManager.platforms
        );

        if (landingPlatform) {
          this.handleLanding(landingPlatform);
        }
      }

      this.handleTopSpikes();

      if (this.player.hp <= 0) {
        this.endGame("hp");
        return;
      }

      if (this.player.isFullyBelowScreen()) {
        this.endGame("fall");
        return;
      }

      this.ui.updateHUD(this.player.hp, this.currentFloor, this.bestFloor);
    }

    handleLanding(platform) {
      this.player.landOn(platform);

      if (platform.type === "spike") {
        this.player.takeDamage(C.SPIKE_DAMAGE);
      } else {
        this.player.heal(C.NORMAL_HEAL);

        if (platform.type === "breakable") {
          this.platformManager.triggerBreakable(platform);
        }
      }
    }

    handleTopSpikes() {
      const hitbox = GameNamespace.Physics.getPlayerHitbox(this.player);
      if (hitbox.top > C.TOP_SPIKE_HEIGHT) {
        return;
      }

      this.player.takeDamage(C.SPIKE_DAMAGE);
      this.player.knockDown();
    }

    endGame(reason) {
      this.state = "gameOver";
      this.clearInput();
      this.saveBestFloor();
      this.ui.updateHUD(this.player.hp, this.currentFloor, this.bestFloor);
      this.ui.showGameOver(this.currentFloor, this.bestFloor, reason);
    }

    drawBackground() {
      const ctx = this.context;
      const tileSize = C.BACKGROUND_TILE_SIZE;
      const offset = (this.worldDepth * C.BACKGROUND_PARALLAX) % tileSize;

      for (let y = -tileSize - offset; y < C.GAME_HEIGHT; y += tileSize) {
        ctx.drawImage(this.images.background, 0, y, C.GAME_WIDTH, tileSize);
      }

      const shade = ctx.createLinearGradient(0, 0, 0, C.GAME_HEIGHT);
      shade.addColorStop(0, "rgba(0, 7, 28, 0.05)");
      shade.addColorStop(1, "rgba(0, 3, 18, 0.48)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, C.GAME_WIDTH, C.GAME_HEIGHT);
    }

    drawPlatforms() {
      const ctx = this.context;
      const breakableImages = {
        idle: this.images.platformBreakableIdle,
        cracking1: this.images.platformBreakableCracked1,
        cracking2: this.images.platformBreakableCracked2,
        breaking: this.images.platformBreakableBreaking
      };
      const breakableReference = this.images.platformBreakableCracked1;
      const breakableDrawHeight = C.PLATFORM_WIDTH *
        (breakableReference.height / breakableReference.width);

      for (const platform of this.platformManager.platforms) {
        if (platform.type === "spike") {
          const image = this.images.platformSpike;
          const drawHeight = platform.width * (image.height / image.width);
          ctx.drawImage(
            image,
            platform.x,
            platform.y,
            platform.width,
            drawHeight
          );
        } else if (platform.type === "breakable") {
          ctx.drawImage(
            breakableImages[platform.state] || breakableImages.idle,
            platform.x,
            platform.y,
            platform.width,
            breakableDrawHeight
          );
        } else if (
          platform.type === "conveyor-left" ||
          platform.type === "conveyor-right"
        ) {
          this.drawConveyor(platform);
        } else {
          ctx.drawImage(
            this.images.platform,
            platform.x,
            platform.y,
            platform.width,
            platform.height
          );
        }
      }
    }

    drawConveyor(platform) {
      const ctx = this.context;
      const base = this.images.conveyorBase;
      const belt = this.images.conveyorBeltStrip;
      const drawWidth = platform.width;
      const drawHeight = drawWidth * (base.height / base.width);
      const drawY = platform.y;
      const slot = C.CONVEYOR_BELT_SLOT;
      const source = C.CONVEYOR_BELT_SOURCE;
      const slotX = platform.x + drawWidth * slot.x;
      const slotY = drawY + drawHeight * slot.y;
      const slotWidth = drawWidth * slot.width;
      const slotHeight = drawHeight * slot.height;
      const sourceX = belt.width * source.x;
      const sourceY = belt.height * source.y;
      const sourceWidth = belt.width * source.width;
      const sourceHeight = belt.height * source.height;
      const beltWidth = drawWidth * source.width;
      const beltHeight = drawHeight * source.height;
      const isLeftConveyor = platform.type === "conveyor-left";
      const renderSlotX = isLeftConveyor
        ? platform.x + drawWidth - (slotX - platform.x) - slotWidth
        : slotX;
      const renderOffset = isLeftConveyor
        ? -platform.beltOffset
        : platform.beltOffset;
      const rawOffset = renderOffset % beltWidth;
      const beltOffset = rawOffset < 0 ? rawOffset + beltWidth : rawOffset;
      const firstBeltX = renderSlotX - beltWidth + beltOffset;
      const beltY = drawY + drawHeight * source.y;

      ctx.save();
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotWidth, slotHeight);
      ctx.clip();

      if (isLeftConveyor) {
        ctx.translate(platform.x * 2 + drawWidth, 0);
        ctx.scale(-1, 1);
      }

      for (let x = firstBeltX; x < renderSlotX + slotWidth; x += beltWidth) {
        ctx.drawImage(
          belt,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          x,
          beltY,
          beltWidth,
          beltHeight
        );
      }

      ctx.restore();
      ctx.drawImage(base, platform.x, drawY, drawWidth, drawHeight);
    }

    drawPlayer() {
      if (this.player.shouldBlink()) {
        return;
      }

      const ctx = this.context;
      const image = this.images[this.player.getSpriteKey()];
      const drawX = this.player.x - (C.PLAYER_DRAW_WIDTH - C.PLAYER_WIDTH) / 2;
      const drawY = this.player.y - (C.PLAYER_DRAW_HEIGHT - C.PLAYER_HEIGHT) / 2;

      ctx.save();
      if (this.player.direction < 0 && this.player.getSpriteKey() === "playerMove") {
        ctx.translate(drawX + C.PLAYER_DRAW_WIDTH, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, C.PLAYER_DRAW_WIDTH, C.PLAYER_DRAW_HEIGHT);
      } else {
        ctx.drawImage(
          image,
          drawX,
          drawY,
          C.PLAYER_DRAW_WIDTH,
          C.PLAYER_DRAW_HEIGHT
        );
      }
      ctx.restore();
    }

    drawWalls() {
      const ctx = this.context;
      const wallWidth = C.SIDE_WALL_WIDTH;
      const tileHeight = C.WALL_TILE_HEIGHT;
      const offset = (this.worldDepth * C.WALL_PARALLAX) % tileHeight;

      for (let y = -tileHeight - offset; y < C.GAME_HEIGHT; y += tileHeight) {
        ctx.drawImage(this.images.wall, 0, y, wallWidth, tileHeight);

        ctx.save();
        ctx.translate(C.GAME_WIDTH, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.images.wall, 0, y, wallWidth, tileHeight);
        ctx.restore();
      }
    }

    drawTopSpikes() {
      const ctx = this.context;
      const image = this.images.ceilingSpikes;
      const drawWidth = C.TOP_SPIKE_HEIGHT * (image.width / image.height);

      for (let x = 0; x < C.GAME_WIDTH; x += drawWidth) {
        ctx.drawImage(image, x, 0, drawWidth, C.TOP_SPIKE_HEIGHT);
      }
    }

    render() {
      const ctx = this.context;
      ctx.clearRect(0, 0, C.GAME_WIDTH, C.GAME_HEIGHT);
      ctx.imageSmoothingEnabled = false;
      this.drawBackground();
      this.drawPlatforms();
      this.drawPlayer();
      this.drawWalls();
      this.drawTopSpikes();
    }
  }

  GameNamespace.Game = Game;
})();
