(function () {
  "use strict";

  const Game = window.JellyfishGame;
  const C = Game.CONFIG;

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  class PlatformManager {
    constructor() {
      this.platforms = [];
      this.nextId = 1;
      this.lastPathPlatform = null;
      this.consecutiveSpikes = 0;
      this.depthSinceNormal = 0;
      this.generatedCount = 0;
    }

    reset(scrollSpeed) {
      this.platforms = [];
      this.nextId = 1;
      this.consecutiveSpikes = 0;
      this.depthSinceNormal = 0;
      this.generatedCount = 0;

      const firstPlatform = this.createPlatform(
        (C.GAME_WIDTH - C.PLATFORM_WIDTH) / 2,
        C.INITIAL_PLATFORM_Y,
        "normal"
      );
      this.platforms.push(firstPlatform);
      this.lastPathPlatform = firstPlatform;
      this.fillBelowScreen(scrollSpeed);
      return firstPlatform;
    }

    createPlatform(x, y, type) {
      const platform = {
        id: this.nextId++,
        x,
        y,
        previousY: y,
        width: C.PLATFORM_WIDTH,
        height: C.PLATFORM_HEIGHT,
        type,
        active: true
      };

      if (type === "breakable") {
        platform.state = "idle";
        platform.triggered = false;
        platform.breakTimer = 0;
      }

      return platform;
    }

    triggerBreakable(platform) {
      if (platform.type !== "breakable" || platform.triggered || !platform.active) {
        return;
      }

      platform.triggered = true;
      platform.breakTimer = 0;
      platform.state = "cracking1";
    }

    updateBreakable(platform, dt) {
      if (platform.type !== "breakable" || !platform.triggered) {
        return;
      }

      platform.breakTimer += dt;
      const stageDuration = C.BREAKABLE_LIFETIME / 3;

      if (platform.breakTimer >= C.BREAKABLE_LIFETIME) {
        platform.state = "gone";
        platform.active = false;
      } else if (platform.breakTimer >= stageDuration * 2) {
        platform.state = "breaking";
      } else if (platform.breakTimer >= stageDuration) {
        platform.state = "cracking2";
      } else {
        platform.state = "cracking1";
      }
    }

    chooseGap() {
      if (Math.random() < C.PREFERRED_GAP_RATE) {
        return randomBetween(C.PREFERRED_GAP_MIN, C.PREFERRED_GAP_MAX);
      }

      const chooseSmallGap = Math.random() < 0.5;
      return chooseSmallGap
        ? randomBetween(C.MIN_PLATFORM_GAP, C.PREFERRED_GAP_MIN)
        : randomBetween(C.PREFERRED_GAP_MAX, C.MAX_PLATFORM_GAP);
    }

    getReachableXPositions(fromPlatform, y, scrollSpeed) {
      const positions = [];
      const minX = C.PLAYER_SIDE_MARGIN;
      const maxX = C.GAME_WIDTH - C.PLAYER_SIDE_MARGIN - C.PLATFORM_WIDTH;

      for (let x = minX; x <= maxX; x += C.REACH_CANDIDATE_STEP) {
        const candidate = {
          x,
          y,
          width: C.PLATFORM_WIDTH
        };
        const result = Game.Physics.evaluateReachability(
          fromPlatform,
          candidate,
          scrollSpeed
        );

        if (result.reachable) {
          positions.push(x);
        }
      }

      return positions;
    }

    choosePlatformType(gap) {
      const isInitialSafeSection = this.generatedCount < C.INITIAL_SAFE_PLATFORM_COUNT;
      const wouldExceedSpikeRun = this.consecutiveSpikes >= C.MAX_CONSECUTIVE_SPIKES;
      const wouldExceedNormalLimit =
        this.depthSinceNormal + gap >= C.MAX_DEPTH_WITHOUT_NORMAL_PLATFORM;

      if (isInitialSafeSection || wouldExceedNormalLimit) {
        return "normal";
      }

      const availableTypes = wouldExceedSpikeRun
        ? ["normal", "breakable"]
        : C.PLATFORM_TYPES;

      return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }

    appendReachablePlatform(scrollSpeed) {
      const fromPlatform = this.lastPathPlatform;
      let gap = this.chooseGap();
      let y = fromPlatform.y + gap;
      let reachablePositions = this.getReachableXPositions(fromPlatform, y, scrollSpeed);

      if (reachablePositions.length === 0) {
        gap = C.PREFERRED_GAP_MIN;
        y = fromPlatform.y + gap;
        reachablePositions = this.getReachableXPositions(fromPlatform, y, scrollSpeed);
      }

      const fallbackX = Math.max(
        C.PLAYER_SIDE_MARGIN,
        Math.min(
          C.GAME_WIDTH - C.PLAYER_SIDE_MARGIN - C.PLATFORM_WIDTH,
          fromPlatform.x
        )
      );
      const x = reachablePositions.length > 0
        ? reachablePositions[Math.floor(Math.random() * reachablePositions.length)]
        : fallbackX;
      const type = this.choosePlatformType(gap);
      const platform = this.createPlatform(x, y, type);

      this.generatedCount += 1;
      if (type === "spike") {
        this.consecutiveSpikes += 1;
        this.depthSinceNormal += gap;
      } else {
        this.consecutiveSpikes = 0;
        this.depthSinceNormal = type === "normal"
          ? 0
          : this.depthSinceNormal + gap;
      }

      this.platforms.push(platform);
      this.lastPathPlatform = platform;
    }

    fillBelowScreen(scrollSpeed) {
      while (this.lastPathPlatform.y < C.GAME_HEIGHT + C.SPAWN_BUFFER) {
        this.appendReachablePlatform(scrollSpeed);
      }
    }

    update(dt, scrollSpeed) {
      for (const platform of this.platforms) {
        platform.previousY = platform.y;
        platform.y -= scrollSpeed * dt;
        this.updateBreakable(platform, dt);

        if (platform.y + C.SPIKE_VISUAL_HEIGHT + platform.height < -C.PLATFORM_CULL_MARGIN) {
          platform.active = false;
        }
      }

      this.platforms = this.platforms.filter((platform) => platform.active);
      this.fillBelowScreen(scrollSpeed);
    }
  }

  Game.PlatformManager = PlatformManager;
})();
