(function () {
  "use strict";

  const Game = window.JellyfishGame;
  const C = Game.CONFIG;

  class Player {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = (C.GAME_WIDTH - C.PLAYER_WIDTH) / 2;
      this.y = 0;
      this.previousX = this.x;
      this.previousY = this.y;
      this.vx = 0;
      this.vy = 0;
      this.hp = C.MAX_HP;
      this.invincibleRemaining = 0;
      this.hurtRemaining = 0;
      this.standingPlatform = null;
      this.direction = 1;
    }

    placeOn(platform) {
      this.standingPlatform = platform;
      this.vy = 0;
      this.y = platform.y - C.PLAYER_HITBOX_OFFSET_Y - C.PLAYER_HITBOX_HEIGHT;
      this.previousY = this.y;
    }

    update(dt, input) {
      this.previousX = this.x;
      this.previousY = this.y;
      this.invincibleRemaining = Math.max(0, this.invincibleRemaining - dt);
      this.hurtRemaining = Math.max(0, this.hurtRemaining - dt);

      if (input.left === input.right) {
        this.vx = 0;
      } else if (input.left) {
        this.vx = -C.MOVE_SPEED;
        this.direction = -1;
      } else {
        this.vx = C.MOVE_SPEED;
        this.direction = 1;
      }

      this.x += this.vx * dt;
      const minX = C.PLAYER_SIDE_MARGIN - C.PLAYER_HITBOX_OFFSET_X;
      const maxX =
        C.GAME_WIDTH - C.PLAYER_SIDE_MARGIN -
        C.PLAYER_HITBOX_OFFSET_X - C.PLAYER_HITBOX_WIDTH;
      this.x = Math.max(minX, Math.min(maxX, this.x));

      if (this.standingPlatform) {
        const platform = this.standingPlatform;
        const supported =
          platform.active &&
          Game.Physics.hasHorizontalOverlap(Game.Physics.getPlayerHitbox(this), platform);

        if (supported) {
          this.y = platform.y - C.PLAYER_HITBOX_OFFSET_Y - C.PLAYER_HITBOX_HEIGHT;
          this.vy = 0;
          return;
        }

        this.standingPlatform = null;
        this.vy = 0;
      }

      this.vy = Math.min(C.MAX_FALL_SPEED, this.vy + C.GRAVITY * dt);
      this.y += this.vy * dt;
    }

    landOn(platform) {
      this.placeOn(platform);
    }

    heal(amount) {
      this.hp = Math.min(C.MAX_HP, this.hp + amount);
    }

    takeDamage(amount) {
      if (this.invincibleRemaining > 0) {
        return false;
      }

      this.hp = Math.max(0, this.hp - amount);
      this.invincibleRemaining = C.INVINCIBLE_TIME;
      this.hurtRemaining = C.HURT_DISPLAY_TIME;
      return true;
    }

    knockDown() {
      this.standingPlatform = null;
      this.vy = C.TOP_KNOCKDOWN_SPEED;
      const minimumY =
        C.TOP_SPIKE_HEIGHT - C.PLAYER_HITBOX_OFFSET_Y + C.TOP_KNOCKDOWN_CLEARANCE;
      this.y = Math.max(this.y, minimumY);
    }

    isFullyBelowScreen() {
      const drawTop = this.y - (C.PLAYER_DRAW_HEIGHT - C.PLAYER_HEIGHT) / 2;
      return drawTop >= C.GAME_HEIGHT;
    }

    shouldBlink() {
      if (this.invincibleRemaining <= 0) {
        return false;
      }

      return Math.floor(this.invincibleRemaining / C.INVINCIBLE_BLINK_INTERVAL) % 2 === 0;
    }

    getSpriteKey() {
      if (this.hurtRemaining > 0) {
        return "playerHurt";
      }

      if (this.standingPlatform && this.vx !== 0) {
        return "playerMove";
      }

      return "playerIdle";
    }
  }

  Game.Player = Player;
})();
