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
    return getMinimumHorizontalTravel(fromPlatform, toPlatform).distance;
  }

  function getMinimumHorizontalTravel(fromPlatform, toPlatform) {
    const fromRange = getSupportedCenterRange(fromPlatform);
    const toRange = getSupportedCenterRange(toPlatform);

    if (fromRange.max < toRange.min) {
      return {
        distance: toRange.min - fromRange.max,
        direction: 1
      };
    }

    if (toRange.max < fromRange.min) {
      return {
        distance: fromRange.min - toRange.max,
        direction: -1
      };
    }

    return { distance: 0, direction: 0 };
  }

  function getConveyorDirection(platform) {
    if (!platform) {
      return 0;
    }

    if (platform.type === "conveyor-left") {
      return -1;
    }

    if (platform.type === "conveyor-right") {
      return 1;
    }

    return 0;
  }

  function getConveyorHorizontalVelocity(platform, inputDirection) {
    const conveyorDirection = getConveyorDirection(platform);
    if (conveyorDirection === 0) {
      return 0;
    }

    if (inputDirection === 0) {
      return conveyorDirection * C.CONVEYOR_IDLE_DRIFT;
    }

    const multiplier = inputDirection === conveyorDirection
      ? C.CONVEYOR_SAME_DIRECTION_MULTIPLIER
      : C.CONVEYOR_OPPOSITE_DIRECTION_MULTIPLIER;

    return inputDirection * C.MOVE_SPEED * multiplier;
  }

  function evaluateReachability(fromPlatform, toPlatform, scrollSpeed) {
    const verticalGap = toPlatform.y - fromPlatform.y;
    const fallTime = simulateFallTime(verticalGap, scrollSpeed);
    const horizontalTravel = getMinimumHorizontalTravel(fromPlatform, toPlatform);
    const requiredDistance = horizontalTravel.distance;
    const conveyorDirection = getConveyorDirection(fromPlatform);
    const directedSpeed = horizontalTravel.direction === 0 || conveyorDirection === 0
      ? C.MOVE_SPEED
      : Math.abs(getConveyorHorizontalVelocity(fromPlatform, horizontalTravel.direction));
    const safeDistance = fallTime === null
      ? 0
      : directedSpeed * fallTime * C.SAFE_REACH_FACTOR;

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
    getMinimumHorizontalTravel,
    getConveyorDirection,
    getConveyorHorizontalVelocity,
    evaluateReachability
  });
})();
