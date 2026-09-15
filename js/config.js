(function () {
  "use strict";

  window.JellyfishGame = window.JellyfishGame || {};

  window.JellyfishGame.CONFIG = Object.freeze({
    GAME_WIDTH: 400,
    GAME_HEIGHT: 600,

    PLAYER_WIDTH: 30,
    PLAYER_HEIGHT: 40,
    PLAYER_DRAW_WIDTH: 54,
    PLAYER_DRAW_HEIGHT: 54,
    PLAYER_HITBOX_OFFSET_X: 4,
    PLAYER_HITBOX_OFFSET_Y: 4,
    PLAYER_HITBOX_WIDTH: 22,
    PLAYER_HITBOX_HEIGHT: 32,
    MOVE_SPEED: 220,
    GRAVITY: 900,
    MAX_FALL_SPEED: 520,

    PLATFORM_WIDTH: 100,
    PLATFORM_HEIGHT: 18,
    SPIKE_VISUAL_HEIGHT: 26,
    MIN_PLATFORM_GAP: 40,
    MAX_PLATFORM_GAP: 140,
    PREFERRED_GAP_MIN: 60,
    PREFERRED_GAP_MAX: 110,
    PREFERRED_GAP_RATE: 0.82,
    MIN_SAFE_LANDING_OVERLAP: 8,
    SAFE_REACH_FACTOR: 0.75,
    REACH_SIMULATION_STEP: 1 / 120,
    REACH_SIMULATION_MAX_TIME: 3,
    REACH_CANDIDATE_STEP: 2,
    SPAWN_BUFFER: 180,
    PLATFORM_CULL_MARGIN: 50,
    INITIAL_PLATFORM_Y: 285,
    INITIAL_SAFE_PLATFORM_COUNT: 3,
    BREAKABLE_LIFETIME: 0.3,
    SPRING_COMPRESS_TIME: 0.07,
    SPRING_RELEASE_TIME: 0.07,
    BOUNCE_SPEED: 450,
    SPRING_COMPRESS_OFFSET: 6,
    SPRING_EXTEND_OFFSET: -4,
    SPRING_IMAGE_SURFACE_Y: Object.freeze({
      idle: 179 / 724,
      compressed: 263 / 724,
      extended: 71 / 724
    }),
    CONVEYOR_IDLE_DRIFT: 90,
    CONVEYOR_SAME_DIRECTION_MULTIPLIER: 1.6,
    CONVEYOR_OPPOSITE_DIRECTION_MULTIPLIER: 0.45,
    CONVEYOR_VISUAL_SPEED: 80,
    CONVEYOR_BELT_SLOT: Object.freeze({
      x: 389 / 2172,
      y: 300 / 724,
      width: 1395 / 2172,
      height: 126 / 724
    }),
    CONVEYOR_BELT_SOURCE: Object.freeze({
      x: 66 / 2172,
      y: 275 / 724,
      width: 2041 / 2172,
      height: 176 / 724
    }),

    MAX_HP: 10,
    NORMAL_HEAL: 1,
    SPIKE_DAMAGE: 4,
    INVINCIBLE_TIME: 1,
    HURT_DISPLAY_TIME: 0.28,
    INVINCIBLE_BLINK_INTERVAL: 0.09,

    FLOORS_PER_SPEED_UP: 10,
    INITIAL_SCROLL_SPEED: 75,
    SPEED_STEP: 10,
    MAX_SCROLL_SPEED: 255,
    FLOOR_HEIGHT: 600,

    PLATFORM_TYPES: Object.freeze([
      "normal",
      "spike",
      "breakable",
      "conveyor-left",
      "conveyor-right",
      "spring"
    ]),
    MAX_CONSECUTIVE_SPIKES: 1,
    MAX_DEPTH_WITHOUT_NORMAL_PLATFORM: 2000,

    TOP_SPIKE_HEIGHT: 52,
    TOP_KNOCKDOWN_SPEED: 250,
    TOP_KNOCKDOWN_CLEARANCE: 2,
    LANDING_TOLERANCE: 2,

    SIDE_WALL_WIDTH: 42,
    PLAYER_SIDE_MARGIN: 44,
    BACKGROUND_TILE_SIZE: 400,
    BACKGROUND_PARALLAX: 0.12,
    WALL_PARALLAX: 0.42,
    WALL_TILE_HEIGHT: 126,
    MAX_DELTA_TIME: 1 / 30,

    STORAGE_KEY: "jellyfish-going-down-best-floor-v2",

    ASSETS: Object.freeze({
      background: "assets/cave-background.png",
      wall: "assets/cave-wall.png",
      playerIdle: "assets/jellyfish-idle.png",
      playerMove: "assets/jellyfish-move-right.png",
      playerHurt: "assets/jellyfish-hurt.png",
      platform: "assets/platform-normal.png",
      platformSpike: "assets/platform-spike.png",
      platformBreakableIdle: "assets/platform-breakable-idle.png",
      platformBreakableCracked1: "assets/platform-breakable-cracked-1.png",
      platformBreakableCracked2: "assets/platform-breakable-cracked-2.png",
      platformBreakableBreaking: "assets/platform-breakable-breaking.png",
      conveyorBase: "assets/conveyor-base.png",
      conveyorBeltStrip: "assets/conveyor-belt-strip.png",
      platformSpringIdle: "assets/platform-spring-idle.png",
      platformSpringCompressed: "assets/platform-spring-compressed.png",
      platformSpringExtended: "assets/platform-spring-extended.png",
      ceilingSpikes: "assets/ceiling-spikes.png"
    })
  });
})();
