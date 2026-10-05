(function () {
  "use strict";

  const Game = window.JellyfishGame;
  const C = Game.CONFIG;
  const DURATION = 3;
  const ITEM_WIDTH = 22;
  const ITEM_HEIGHT = 40;
  // Crop the supplied cream's transparent margins without changing the asset.
  const ITEM_SOURCE = { x: 479, y: 330, width: 336, height: 624 };

  class SpecialMode {
    constructor() {
      this.reset();
    }

    reset() {
      this.shieldRemaining = 0;
      this.clearItch();
    }

    clearItch() {
      this.itchTicksRemaining = 0;
      this.itchNextTick = 0;
    }

    isProtected() {
      if (this.shieldRemaining <= 1e-9) {
        this.shieldRemaining = 0;
        return false;
      }
      // Shield always wins, including an accidentally restored conflicting state.
      this.clearItch();
      return true;
    }

    collectCream() {
      this.clearItch();
      this.shieldRemaining = DURATION;
    }

    damage(player) {
      // These guaranteed 1-HP hits must not be swallowed by spike invincibility.
      // Do not grant invincibility or change the original spike damage method.
      player.hp = Math.max(0, player.hp - 1);
      player.hurtRemaining = C.HURT_DISPLAY_TIME;
    }

    landOnIrritant(player) {
      if (this.isProtected()) {
        return;
      }
      this.damage(player);
      this.itchTicksRemaining = DURATION;
      this.itchNextTick = 1;
    }

    update(dt, player) {
      if (this.isProtected()) {
        this.shieldRemaining = Math.max(0, this.shieldRemaining - dt);
        return;
      }
      if (this.itchTicksRemaining === 0) {
        return;
      }
      this.itchNextTick -= dt;
      while (this.itchTicksRemaining > 0 && this.itchNextTick <= 1e-9) {
        this.damage(player);
        this.itchTicksRemaining -= 1;
        this.itchNextTick += 1;
      }
      if (this.itchTicksRemaining === 0) {
        this.clearItch();
      }
    }

    getOverlayKey(spriteKey) {
      const pose = spriteKey === "playerMove" ? "Move" : "Idle";
      if (this.isProtected()) {
        return `ppaShield${pose}`;
      }
      return this.itchTicksRemaining > 0 ? `itch${pose}` : null;
    }

    static planPlatform(manager, gap, y) {
      // A platform's floor is when it first enters the viewport, using the same
      // scrolling depth as the HUD. Generation ahead of the screen is unchanged.
      const floor = Math.max(1, Math.floor(
        (manager.worldDepth + y - C.GAME_HEIGHT) / C.FLOOR_HEIGHT
      ) + 1);
      if (floor >= manager.nextPpaFloor) {
        const ppaFloor = manager.nextPpaFloor;
        manager.nextPpaFloor += 5;
        return { type: "normal", ppaFloor };
      }
      const mustBeNormal = manager.generatedCount < C.INITIAL_SAFE_PLATFORM_COUNT ||
        manager.depthSinceNormal + gap >= C.MAX_DEPTH_WITHOUT_NORMAL_PLATFORM;
      if (floor < 5 || mustBeNormal) {
        return { type: null };
      }
      const rate = floor < 50 ? 0.1 : 1 / 6;
      return { type: Math.random() < rate ? "irritant" : null };
    }

    static getItemBounds(platform) {
      return {
        x: platform.x + (platform.width - ITEM_WIDTH) / 2,
        y: platform.y - ITEM_HEIGHT,
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT
      };
    }

    collectItems(player, platforms, currentFloor) {
      const hitbox = Game.Physics.getPlayerHitbox(player);
      for (const platform of platforms) {
        if (!platform.active || !platform.ppaFloor || platform.ppaCollected ||
            currentFloor < platform.ppaFloor) {
          continue;
        }
        const item = SpecialMode.getItemBounds(platform);
        if (hitbox.right > item.x && hitbox.left < item.x + item.width &&
            hitbox.bottom > item.y && hitbox.top < item.y + item.height) {
          platform.ppaCollected = true;
          this.collectCream();
        }
      }
    }

    drawItems(ctx, images, platforms, currentFloor) {
      for (const platform of platforms) {
        if (!platform.active || !platform.ppaFloor || platform.ppaCollected ||
            currentFloor < platform.ppaFloor) {
          continue;
        }
        const item = SpecialMode.getItemBounds(platform);
        ctx.drawImage(images.ppaCream,
          ITEM_SOURCE.x, ITEM_SOURCE.y, ITEM_SOURCE.width, ITEM_SOURCE.height,
          item.x, item.y, item.width, item.height);
      }
    }
  }

  // Keep optional assets out of CONFIG.ASSETS so Classic can load independently.
  SpecialMode.ASSETS = Object.freeze({
    ppaCream: "assets/item-ppa-cream.png.png",
    platformIrritant: "assets/platform-irritant.png.png",
    ppaShieldIdle: "assets/effect-ppa-shield-idle.png.png",
    ppaShieldMove: "assets/effect-ppa-shield-move-right.png.png",
    itchIdle: "assets/effect-itch-idle.png.png",
    itchMove: "assets/effect-itch-move-right.png.png"
  });
  Game.SpecialMode = SpecialMode;
})();
