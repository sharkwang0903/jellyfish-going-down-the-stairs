(function () {
  "use strict";

  const Game = window.JellyfishGame;
  const C = Game.CONFIG;

  function getPlayerHitbox(player, x, y) {
    const playerX = x === undefined ? player.x : x;
    const playerY = y === undefined ? player.y : y;

    return {
      left: playerX + C.PLAYER_HITBOX_OFFSET_X,
      right: playerX + C.PLAYER_HITBOX_OFFSET_X + C.PLAYER_HITBOX_WIDTH,
      top: playerY + C.PLAYER_HITBOX_OFFSET_Y,
      bottom: playerY + C.PLAYER_HITBOX_OFFSET_Y + C.PLAYER_HITBOX_HEIGHT
    };
  }

  function hasHorizontalOverlap(hitbox, platform) {
    return hitbox.right > platform.x && hitbox.left < platform.x + platform.width;
  }

  function findLanding(player, platforms) {
    if (player.vy <= 0) {
      return null;
    }

    const previousHitbox = getPlayerHitbox(player, player.previousX, player.previousY);
    const currentHitbox = getPlayerHitbox(player);
    let landingPlatform = null;

    for (const platform of platforms) {
      if (!platform.active || !hasHorizontalOverlap(currentHitbox, platform)) {
        continue;
      }

      const previousTop = platform.previousY;
      const crossedFromAbove =
        previousHitbox.bottom <= previousTop + C.LANDING_TOLERANCE &&
        currentHitbox.bottom >= platform.y - C.LANDING_TOLERANCE &&
        currentHitbox.top < platform.y;

      if (crossedFromAbove && (!landingPlatform || platform.y < landingPlatform.y)) {
        landingPlatform = platform;
      }
    }

    return landingPlatform;
  }

  function simulateFallTime(verticalGap, scrollSpeed) {
    let elapsed = 0;
    let playerFootY = 0;
    let platformTopY = verticalGap;
    let velocityY = 0;

    while (elapsed < C.REACH_SIMULATION_MAX_TIME) {
      velocityY = Math.min(
        C.MAX_FALL_SPEED,
        velocityY + C.GRAVITY * C.REACH_SIMULATION_STEP
      );
      playerFootY += velocityY * C.REACH_SIMULATION_STEP;
      platformTopY -= scrollSpeed * C.REACH_SIMULATION_STEP;
      elapsed += C.REACH_SIMULATION_STEP;

      if (playerFootY >= platformTopY) {
        return elapsed;
      }
    }

    return null;
  }

  function getSupportedCenterRange(platform) {
    const halfHitboxWidth = C.PLAYER_HITBOX_WIDTH / 2;
    const overlap = C.MIN_SAFE_LANDING_OVERLAP;

    return {
      min: platform.x - halfHitboxWidth + overlap,
      max: platform.x + platform.width + halfHitboxWidth - overlap
    };
  }

  function getMinimumHorizontalDistance(fromPlatform, toPlatform) {
    const fromRange = getSupportedCenterRange(fromPlatform);
    const toRange = getSupportedCenterRange(toPlatform);

    if (fromRange.max < toRange.min) {
      return toRange.min - fromRange.max;
    }

    if (toRange.max < fromRange.min) {
      return fromRange.min - toRange.max;
    }

    return 0;
  }

  function evaluateReachability(fromPlatform, toPlatform, scrollSpeed) {
    const verticalGap = toPlatform.y - fromPlatform.y;
    const fallTime = simulateFallTime(verticalGap, scrollSpeed);
    const requiredDistance = getMinimumHorizontalDistance(fromPlatform, toPlatform);
    const safeDistance = fallTime === null
      ? 0
      : C.MOVE_SPEED * fallTime * C.SAFE_REACH_FACTOR;

    return {
      reachable: fallTime !== null && requiredDistance <= safeDistance,
      fallTime,
      requiredDistance,
      safeDistance
    };
  }

  Game.Physics = Object.freeze({
    getPlayerHitbox,
    hasHorizontalOverlap,
    findLanding,
    simulateFallTime,
    getMinimumHorizontalDistance,
    evaluateReachability
  });
})();
