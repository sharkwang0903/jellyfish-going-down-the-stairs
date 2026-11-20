"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");

function makeRuntime(root = ROOT, seed = 42) {
  let randomState = seed >>> 0;
  const math = Object.create(Math);
  math.random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const ctx = vm.createContext({
    window: {}, Math: math, console,
    localStorage: { getItem: () => null, setItem: () => {} },
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {}
  });
  for (const name of ["config", "physics", "player", "special-mode", "platforms", "game"]) {
    const file = path.join(root, "js", `${name}.js`);
    if (fs.existsSync(file)) {
      vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
    }
  }
  const namespace = ctx.window.JellyfishGame;
  const calls = [];
  const draw = new Proxy({}, { get: (target, name) => {
    if (name === "createLinearGradient") {
      return () => ({ addColorStop: (...args) => calls.push(["colorStop", ...args]) });
    }
    return (...args) => calls.push([name, ...args.map((arg) => arg && arg.key || arg)]);
  }});
  const ui = { result: null, hud: null };
  for (const name of ["showStart", "setReady", "showGame", "resetModeSelection", "setSpecialReady"]) {
    ui[name] = () => {};
  }
  ui.updateHUD = (...args) => { ui.hud = args; };
  ui.showGameOver = (...args) => { ui.result = args; };
  const game = new namespace.Game({ getContext: () => draw }, ui);
  game.state = "menu";
  game.specialImagesReady = true;
  const assets = { ...namespace.CONFIG.ASSETS, ...namespace.SpecialMode?.ASSETS };
  game.images = Object.fromEntries(Object.keys(assets).map((key) => [key, { key, width: 2172, height: 724 }]));
  return { namespace, game, ui, calls, ctx, math };
}

function special() {
  const runtime = makeRuntime();
  runtime.game.start("special");
  return runtime;
}

function land(game, type) {
  const platform = game.platformManager.createPlatform(140, 300, type);
  game.handleLanding(platform);
  return platform;
}

function tick(state, player, seconds) {
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    state.update(1 / 120, player);
  }
}

test("mode is required; restart preserves it; returning to menu clears it", () => {
  const { game } = makeRuntime();
  game.start();
  assert.equal(game.state, "menu");
  game.start("bogus");
  assert.equal(game.state, "menu");
  game.start("classic");
  assert.equal(game.gameMode, "classic");
  assert.equal(game.specialMode, null);
  game.start("special");
  game.specialMode.collectCream();
  game.start();
  assert.equal(game.gameMode, "special");
  assert.equal(game.specialMode.shieldRemaining, 0);
  game.returnToMenu();
  assert.equal(game.gameMode, null);
  assert.equal(game.specialMode, null);
  game.start("classic");
  assert.equal(game.platformManager.gameMode, "classic");
  assert.equal(game.platformManager.nextPpaFloor, 2);
});

test("missing special assets do not block Classic", () => {
  const { game } = makeRuntime();
  game.specialImagesReady = false;
  game.start("special");
  assert.equal(game.state, "menu");
  game.start("classic");
  assert.equal(game.state, "running");
});

test("Classic retains spike invincibility, all healing platforms and spring/break behavior", () => {
  const { game, namespace } = makeRuntime();
  game.start("classic");
  land(game, "spike");
  assert.equal(game.player.hp, 6);
  land(game, "spike");
  assert.equal(game.player.hp, 6);
  for (const type of ["normal", "breakable", "spring", "conveyor-left", "conveyor-right"]) {
    game.player.hp = 5;
    const platform = land(game, type);
    assert.equal(game.player.hp, 6, type);
    if (type === "breakable") {
      assert.equal(platform.triggered, true);
      game.platformManager.updateBreakable(platform, namespace.CONFIG.BREAKABLE_LIFETIME);
      assert.equal(platform.active, false);
    }
    if (type === "spring") assert.equal(platform.state, "compressed");
  }
});

test("irritant: immediate hit plus exactly three 1-second hits, even during invincibility", () => {
  const { game } = special();
  game.player.invincibleRemaining = 1;
  land(game, "irritant");
  assert.equal(game.player.hp, 9);
  tick(game.specialMode, game.player, 0.5);
  assert.equal(game.player.hp, 9);
  tick(game.specialMode, game.player, 0.5);
  assert.equal(game.player.hp, 8);
  tick(game.specialMode, game.player, 1);
  assert.equal(game.player.hp, 7);
  tick(game.specialMode, game.player, 1);
  assert.equal(game.player.hp, 6);
  assert.equal(game.specialMode.itchTicksRemaining, 0);
  tick(game.specialMode, game.player, 4);
  assert.equal(game.player.hp, 6);
});

test("repeated irritant landings refresh a single state and cancel the old tick schedule", () => {
  const { game } = special();
  const state = game.specialMode;
  land(game, "irritant");
  tick(state, game.player, 0.75);
  land(game, "irritant");
  assert.equal(game.specialMode, state);
  assert.equal(game.player.hp, 8);
  tick(state, game.player, 0.5);
  assert.equal(game.player.hp, 8);
  tick(state, game.player, 0.5);
  assert.equal(game.player.hp, 7);
  tick(state, game.player, 2);
  assert.equal(game.player.hp, 5);
  assert.equal(state.itchTicksRemaining, 0);
});

test("cream cancels all pending itch damage without healing; refreshes rather than stacks", () => {
  const { game } = special();
  land(game, "irritant");
  tick(game.specialMode, game.player, 1.5);
  assert.equal(game.player.hp, 8);
  game.specialMode.collectCream();
  assert.equal(game.player.hp, 8);
  assert.equal(game.specialMode.itchTicksRemaining, 0);
  tick(game.specialMode, game.player, 2);
  game.specialMode.collectCream();
  assert.equal(game.specialMode.shieldRemaining, 3);
  tick(game.specialMode, game.player, 3);
  assert.equal(game.specialMode.isProtected(), false);
  assert.equal(game.player.hp, 8);
});

test("shield prevents spike and irritant damage, preserves spike contact, expires normally", () => {
  const { game, namespace } = special();
  game.player.hp = 5;
  game.specialMode.collectCream();
  const spike = land(game, "spike");
  assert.equal(game.player.hp, 5);
  assert.equal(game.player.standingPlatform, spike);
  land(game, "irritant");
  assert.equal(game.player.hp, 5);
  assert.equal(game.specialMode.itchTicksRemaining, 0);
  game.player.y = 0;
  game.handleTopSpikes();
  assert.equal(game.player.hp, 5);
  assert.equal(game.player.vy, namespace.CONFIG.TOP_KNOCKDOWN_SPEED);
  assert.equal(game.player.standingPlatform, null);
  tick(game.specialMode, game.player, 3);
  land(game, "spike");
  assert.equal(game.player.hp, 1);
});

test("original healing continues during itching and shield", () => {
  const { game } = special();
  game.player.hp = 5;
  land(game, "irritant");
  for (const type of ["normal", "breakable", "spring", "conveyor-left", "conveyor-right"]) {
    const hp = game.player.hp;
    land(game, type);
    assert.equal(game.player.hp, hp + 1);
  }
  tick(game.specialMode, game.player, 1);
  assert.equal(game.player.hp, 8);
  game.specialMode.collectCream();
  land(game, "normal");
  assert.equal(game.player.hp, 9);
});

test("shield wins conflicting status; death and restart clear all effects", () => {
  const { game } = special();
  game.specialMode.collectCream();
  game.specialMode.itchTicksRemaining = 3;
  game.specialMode.itchNextTick = 0.1;
  assert.equal(game.specialMode.getOverlayKey("playerIdle"), "ppaShieldIdle");
  assert.equal(game.specialMode.itchTicksRemaining, 0);
  game.endGame("hp");
  assert.equal(game.specialMode.shieldRemaining, 0);
  assert.equal(game.specialMode.itchTicksRemaining, 0);
  game.start();
  assert.equal(game.player.hp, 10);
});

test("fall death remains fatal for Classic, normal Special, itch and shield", () => {
  for (const status of ["classic", "normal", "itch", "shield"]) {
    const { game, ui } = makeRuntime();
    game.start(status === "classic" ? "classic" : "special");
    if (status === "itch") game.specialMode.landOnIrritant(game.player);
    if (status === "shield") game.specialMode.collectCream();
    game.player.standingPlatform = null;
    game.player.y = 650;
    game.player.previousY = 650;
    game.update(1 / 60);
    assert.equal(game.state, "gameOver", status);
    assert.equal(ui.result[2], "fall", status);
  }
});

test("1 HP dying from itch cannot be revived by a landing in the same frame", () => {
  const { game, ui } = special();
  game.player.hp = 2;
  land(game, "irritant");
  game.specialMode.itchNextTick = 0;
  game.update(1 / 60);
  assert.equal(game.player.hp, 0);
  assert.equal(ui.result[2], "hp");
});

test("cream is collected only by touching its bounds; missed cream is not replaced", () => {
  const { game, namespace } = special();
  const platform = game.platformManager.createPlatform(140, 300, "normal");
  platform.ppaFloor = 5;
  platform.ppaCollected = false;
  const bounds = namespace.SpecialMode.getItemBounds(platform);
  game.player.x = 50;
  game.player.y = bounds.y;
  game.specialMode.collectItems(game.player, [platform], 5);
  assert.equal(platform.ppaCollected, false);
  game.player.x = bounds.x - 4;
  game.specialMode.collectItems(game.player, [platform], 4);
  assert.equal(platform.ppaCollected, false);
  game.player.hp = 5;
  game.specialMode.landOnIrritant(game.player);
  const hp = game.player.hp;
  game.specialMode.collectItems(game.player, [platform], 5);
  assert.equal(platform.ppaCollected, true);
  assert.equal(game.player.hp, hp);
  assert.equal(game.specialMode.shieldRemaining, 3);
  assert.equal(game.specialMode.itchTicksRemaining, 0);
  tick(game.specialMode, game.player, 1);
  game.specialMode.collectItems(game.player, [platform], 5);
  assert.ok(game.specialMode.shieldRemaining < 2.01);
  const missed = game.platformManager.createPlatform(140, -120, "normal");
  missed.ppaFloor = 10;
  game.platformManager.platforms.push(missed);
  game.platformManager.update(1 / 60, game.scrollSpeed, game.worldDepth);
  assert.equal(game.platformManager.platforms.includes(missed), false);
});

test("Special generation preserves B2 start and the B52 cadence change", () => {
  for (const mode of ["classic", "special"]) {
    const { namespace } = makeRuntime();
    const manager = new namespace.PlatformManager();
    manager.reset(75, mode);
    // Isolate generation decisions; original reachability gets separate comparison.
    manager.getReachableXPositions = () => [150];
    for (let i = 0; i < 450; i++) manager.appendReachablePlatform(75);
    const creams = manager.platforms.filter((p) => p.ppaFloor);
    if (mode === "classic") {
      assert.equal(creams.length, 0);
      assert.equal(manager.platforms.some((p) => p.type === "irritant"), false);
      continue;
    }
    const floors = creams.map((p) => p.ppaFloor);
    for (const floor of [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 55, 58]) {
      assert.equal(floors.filter((value) => value === floor).length, 1, `B${floor}`);
    }
    assert.ok(creams.every((p) => p.type === "normal"));
    assert.ok(manager.platforms.some((p) => p.type === "irritant"));
    for (const p of manager.platforms.filter((p) => p.type === "irritant")) {
      assert.ok(p.y >= namespace.CONFIG.FLOOR_HEIGHT + namespace.CONFIG.GAME_HEIGHT);
    }
    const first = creams.find((p) => p.ppaFloor === 2);
    assert.ok(first.y >= 1200 && first.y < 1340);
  }
});

test("irritant threshold is 10% at B2–B29 and 1/6 at B30+, with original safety guarantees", () => {
  const { namespace, math } = makeRuntime();
  const manager = new namespace.PlatformManager();
  manager.generatedCount = 20;
  manager.nextPpaFloor = Infinity;
  for (const [floor, sample, expected] of [
    [1, 0, null], [2, 0.0999, "irritant"], [2, 0.1, null],
    [29, 0.1, null], [30, 0.16, "irritant"], [30, 1 / 6, null]
  ]) {
    math.random = () => sample;
    manager.worldDepth = (floor - 1) * 600;
    assert.equal(namespace.SpecialMode.planPlatform(manager, 80, 600).type, expected);
  }
  math.random = () => 0;
  manager.depthSinceNormal = 1950;
  assert.equal(namespace.SpecialMode.planPlatform(manager, 80, 600).type, null);
  manager.depthSinceNormal = 0;
  manager.generatedCount = 0;
  assert.equal(namespace.SpecialMode.planPlatform(manager, 80, 600).type, null);
});

test("base sprite is drawn before idle/move effects, and both share left mirroring", () => {
  const { game, calls } = special();
  for (const status of ["shield", "itch"]) {
    game.specialMode.reset();
    if (status === "shield") game.specialMode.collectCream();
    else game.specialMode.landOnIrritant(game.player);
    game.player.hurtRemaining = 0;
    for (const direction of [0, 1, -1]) {
      game.player.vx = direction * 220;
      game.player.direction = direction || 1;
      calls.length = 0;
      game.drawPlayer();
      const draws = calls.filter(([name]) => name === "drawImage");
      const moving = direction !== 0;
      assert.equal(draws[0][1], moving ? "playerMove" : "playerIdle");
      assert.equal(draws[1][1], `${status === "shield" ? "ppaShield" : "itch"}${moving ? "Move" : "Idle"}`);
      assert.equal(calls.some(([name]) => name === "scale"), direction === -1);
      if (direction === -1) {
        assert.ok(calls.findIndex(([name]) => name === "scale") < calls.findIndex(([name]) => name === "drawImage"));
      }
    }
  }
});

test("all asset references exist and core physics, config, player, touch and share files remain unchanged", () => {
  const { namespace } = makeRuntime();
  for (const source of Object.values({ ...namespace.CONFIG.ASSETS, ...namespace.SpecialMode.ASSETS })) {
    assert.ok(fs.existsSync(path.join(ROOT, source)), source);
  }
  const baseline = process.env.JELLYFISH_CLASSIC_BASELINE;
  if (!baseline) return;
  for (const file of ["js/config.js", "js/physics.js", "js/player.js", "mobile-controls.js", "share.js"]) {
    assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), fs.readFileSync(path.join(baseline, file)), file);
  }
});

test("real UI/main wiring preserves keyboard and mobile controls in all modes", () => {
  for (const mode of ["classic", "special", "crazy-ppa"]) {
    const { namespace, ctx, game: drawingGame } = makeRuntime();
    const events = () => ({
      listeners: {}, style: {}, hidden: false, disabled: false, checked: false,
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute() {}, focus() {}
    });
    const elements = Object.fromEntries([
      "hud", "hpText", "hpBar", "floorText", "bestText", "startScreen",
      "gameOverScreen", "startButton", "restartButton", "loadMessage",
      "finalFloor", "finalBest", "deathReason", "modeMenuButton", "gameCanvas"
    ].map((id) => [id, events()]));
    const canvas = elements.gameCanvas;
    canvas.getContext = () => drawingGame.context;
    canvas.getBoundingClientRect = () => ({ left: 10, width: 400 });
    canvas.setPointerCapture = () => {};
    const inputs = ["classic", "special", "crazy-ppa"].map((value) => ({ ...events(), value }));
    const document = { ...events(), getElementById: (id) => elements[id], querySelectorAll: () => inputs };
    ctx.document = document;
    ctx.window.addEventListener = (name, fn) => { ctx.window[name] = fn; };
    const OriginalGame = namespace.Game;
    let active;
    namespace.Game = class extends OriginalGame {
      constructor(...args) { super(...args); active = this; }
      initialize() {
        this.state = "menu";
        this.images = drawingGame.images;
        this.specialImagesReady = true;
        this.resetWorld();
        this.ui.setReady();
        this.ui.setSpecialReady(true);
      }
    };
    for (const file of ["js/ui.js", "mobile-controls.js", "js/main.js"]) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx);
    }
    document.listeners.DOMContentLoaded();
    assert.equal(elements.startButton.disabled, true);
    const selected = inputs.find((input) => input.value === mode);
    selected.checked = true;
    selected.listeners.change();
    assert.equal(elements.startButton.disabled, false);
    elements.startButton.listeners.click();
    assert.equal(active.gameMode, mode);
    assert.equal(active.state, "running");
    const key = { key: "ArrowLeft", preventDefault() {} };
    ctx.window.keydown(key);
    assert.equal(active.input.left, true);
    const oldX = active.player.x;
    active.player.update(1 / 60, active.input);
    assert.ok(active.player.x < oldX);
    ctx.window.keyup(key);
    assert.equal(active.input.left, false);
    ctx.window.keydown({ ...key, key: "ArrowRight" });
    assert.equal(active.input.right, true);
    ctx.window.blur();
    assert.equal(active.input.right, false);
    const touch = { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 70, preventDefault() {} };
    canvas.listeners.pointerdown(touch);
    assert.equal(active.input.left, true);
    canvas.listeners.pointerup(touch);
    assert.equal(active.input.left, false);
    canvas.listeners.pointerdown({ ...touch, clientX: 350 });
    assert.equal(active.input.right, true);
    canvas.listeners.pointercancel(touch);
    assert.equal(active.input.right, false);
    canvas.listeners.pointerdown({ ...touch, pointerType: "mouse" });
    assert.equal(active.input.left, false);
    active.endGame("fall");
    assert.equal(elements.deathReason.textContent, "墜落");
    elements.restartButton.listeners.click();
    assert.equal(active.gameMode, mode);
    assert.equal(active.player.hp, 10);
    active.endGame("hp");
    elements.modeMenuButton.listeners.click();
    assert.equal(active.state, "menu");
    assert.equal(elements.startButton.disabled, true);
    assert.ok(inputs.every((input) => !input.checked));
  }
});

test("live scrolling preserves HUD floor timing, item cadence and first irritant visibility", () => {
  const { namespace } = makeRuntime();
  const manager = new namespace.PlatformManager();
  manager.reset(75, "special");
  manager.getReachableXPositions = () => [150];
  const seen = new Map();
  let depth = 0;
  let visibleB2Cream = false;
  while (depth < 60 * 600) {
    const floor = Math.floor(depth / 600) + 1;
    const speed = Math.min(255, 75 + Math.floor((floor - 1) / 10) * 10);
    depth += speed / 30;
    const currentFloor = Math.floor(depth / 600) + 1;
    manager.update(1 / 30, speed, depth);
    for (const platform of manager.platforms) {
      if (platform.type === "irritant" && platform.y < 600) {
        assert.ok(currentFloor >= 2);
      }
      if (platform.ppaFloor) {
        seen.set(platform.id, platform.ppaFloor);
        if (platform.ppaFloor === 2 && currentFloor === 2 && platform.y < 600) {
          visibleB2Cream = true;
        }
      }
    }
  }
  assert.equal(visibleB2Cream, true);
  for (const floor of [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 55, 58]) {
    assert.equal([...seen.values()].filter((value) => value === floor).length, 1, `B${floor}`);
  }
});

test("Classic and Special match their pre-change generation, gameplay and rendering", {
  skip: !process.env.JELLYFISH_CLASSIC_BASELINE
}, () => {
  const baseline = process.env.JELLYFISH_CLASSIC_BASELINE;
  for (const mode of ["classic", "special"]) {
  for (const seed of [1, 42, 12345]) {
    const before = makeRuntime(baseline, seed);
    const after = makeRuntime(ROOT, seed);
    before.game.start(mode);
    after.game.start(mode);
    before.game.platformManager.getReachableXPositions = () => [150];
    after.game.platformManager.getReachableXPositions = () => [150];
    for (let i = 0; i < 500; i++) {
      before.game.platformManager.appendReachablePlatform(75);
      after.game.platformManager.appendReachablePlatform(75);
    }
    assert.equal(JSON.stringify(before.game.platformManager.platforms), JSON.stringify(after.game.platformManager.platforms));
    const serialize = ({ game, ui }) => JSON.stringify({
      player: game.player, platforms: game.platformManager.platforms,
      depth: game.worldDepth, floor: game.currentFloor, best: game.bestFloor,
      speed: game.scrollSpeed, state: game.state, hud: ui.hud, result: ui.result
    });
    for (let frame = 0; frame < 2400; frame++) {
      for (const runtime of [before, after]) {
        if (runtime.game.state !== "running") {
          runtime.game.start(mode);
        }
        runtime.game.setInput("left", frame % 120 < 30);
        runtime.game.setInput("right", frame % 120 >= 60 && frame % 120 < 90);
        runtime.game.update(1 / 60);
      }
      assert.equal(serialize(before), serialize(after), `seed ${seed}, frame ${frame}`);
      if (frame % 60 === 0) {
        before.calls.length = after.calls.length = 0;
        before.game.render();
        after.game.render();
        assert.equal(JSON.stringify(before.calls), JSON.stringify(after.calls));
      }
    }
  }
  }
});

test("Crazy PPA has four poison platforms per normal, independently of PPA items", () => {
  const itemSlots = new Set();
  const arrangements = new Set();
  for (const seed of [1, 42, 12345, 987, 555]) {
    for (const fixedGap of [null, 40, 140]) {
      const { namespace } = makeRuntime(ROOT, seed);
      const C = namespace.CONFIG;
      const manager = new namespace.PlatformManager();
      if (fixedGap) manager.chooseGap = () => fixedGap;
      manager.reset(C.INITIAL_SCROLL_SPEED, "crazy-ppa");
      manager.getReachableXPositions = () => [150];
      while (manager.lastPathPlatform.y < 62 * C.FLOOR_HEIGHT) {
        manager.appendReachablePlatform(C.MAX_SCROLL_SPEED);
      }
      const floorOf = (p) => Math.max(1, Math.floor((p.y - C.GAME_HEIGHT) / C.FLOOR_HEIGHT) + 1);
      assert.ok(manager.platforms.every((p) => ["normal", "irritant"].includes(p.type)));
      const start = manager.platforms[0];
      assert.equal(start.type, "normal");
      assert.equal(start.ppaFloor, 1);
      const generated = manager.platforms.slice(1);
      for (let i = 0; i + 5 <= generated.length; i += 5) {
        const group = generated.slice(i, i + 5);
        assert.equal(group.filter((p) => p.type === "irritant").length, 4);
        assert.equal(group.filter((p) => p.type === "normal").length, 1);
        arrangements.add(group.map((p) => p.type).join(','));
      }
      assert.ok(generated.slice(0, 5).some((p) => floorOf(p) === 1 && p.type === "irritant"));
      for (let floor = 2; floor <= 60; floor += 1) {
        const platforms = manager.platforms.filter((p) => floorOf(p) === floor);
        const creams = platforms.filter((p) => p.ppaFloor);
        assert.equal(creams.length, 1);
        assert.equal(creams[0].ppaFloor, floor);
        assert.equal(floorOf(creams[0]), floor);
        itemSlots.add(platforms.indexOf(creams[0]));
      }
      const creamFloors = manager.platforms.filter((p) => p.ppaFloor).map((p) => p.ppaFloor);
      assert.equal(new Set(creamFloors).size, creamFloors.length);
    }
  }
  assert.ok(itemSlots.size > 1);
  assert.ok(arrangements.size > 1);
});

test("Crazy PPA opening item is visible, collectible immediately, and restored on restart", () => {
  const { game, calls } = makeRuntime();
  game.start("crazy-ppa");
  const start = game.platformManager.platforms[0];
  assert.equal(start.ppaFloor, 1);
  assert.equal(start.ppaCollected, false);
  game.specialMode.drawItems(game.context, game.images, [start], 1);
  assert.ok(calls.some(([name, key]) => name === "drawImage" && key === "ppaCream"));
  game.update(1 / 60);
  assert.equal(start.ppaCollected, true);
  assert.equal(game.specialMode.shieldRemaining, 3);
  assert.equal(game.player.hp, 10);
  land(game, "irritant");
  assert.equal(game.player.hp, 10);
  game.endGame("fall");
  game.start();
  const restarted = game.platformManager.platforms[0];
  assert.equal(restarted.ppaFloor, 1);
  assert.equal(restarted.ppaCollected, false);
  game.update(1 / 60);
  assert.equal(restarted.ppaCollected, true);
  assert.equal(game.specialMode.shieldRemaining, 3);
});

test("Crazy PPA reuses damage, pickup, shield and reset behavior and requires its assets", () => {
  const { game, namespace } = makeRuntime();
  game.specialImagesReady = false;
  game.start("crazy-ppa");
  assert.equal(game.state, "menu");
  game.specialImagesReady = true;
  game.start("crazy-ppa");
  land(game, "irritant");
  assert.equal(game.player.hp, 9);
  tick(game.specialMode, game.player, 1);
  assert.equal(game.player.hp, 8);
  const carrier = land(game, "normal");
  carrier.ppaFloor = 2;
  game.specialMode.collectItems(game.player, [carrier], 2);
  assert.equal(carrier.ppaCollected, true);
  assert.equal(game.specialMode.itchTicksRemaining, 0);
  assert.equal(game.specialMode.shieldRemaining, 3);
  land(game, "irritant");
  assert.equal(game.player.hp, 9);
  tick(game.specialMode, game.player, 3);
  land(game, "irritant");
  assert.equal(game.player.hp, 8);
  game.endGame("hp");
  game.start();
  assert.equal(game.gameMode, "crazy-ppa");
  assert.equal(game.player.hp, namespace.CONFIG.MAX_HP);
  assert.equal(game.specialMode.shieldRemaining, 0);
  assert.equal(game.platformManager.nextPpaFloor, 2);
  assert.equal(game.platformManager.crazyPpaItemSlot, null);
  game.returnToMenu();
  assert.equal(game.specialMode, null);
});

test("Crazy PPA live scrolling keeps one collectible on every floor from B1 through B60", () => {
  const { namespace } = makeRuntime();
  const C = namespace.CONFIG;
  const manager = new namespace.PlatformManager();
  manager.reset(C.INITIAL_SCROLL_SPEED, "crazy-ppa");
  manager.getReachableXPositions = () => [150];
  const seen = new Map([[manager.platforms[0].id, 1]]);
  let depth = 0;
  while (depth < 60 * C.FLOOR_HEIGHT) {
    const floor = Math.floor(depth / C.FLOOR_HEIGHT) + 1;
    const speed = Math.min(C.MAX_SCROLL_SPEED, C.INITIAL_SCROLL_SPEED + Math.floor((floor - 1) / C.FLOORS_PER_SPEED_UP) * C.SPEED_STEP);
    depth += speed / 30;
    manager.update(1 / 30, speed, depth);
    const currentFloor = Math.floor(depth / C.FLOOR_HEIGHT) + 1;
    for (const p of manager.platforms) {
      if (p.ppaFloor && currentFloor >= p.ppaFloor && p.y < C.GAME_HEIGHT && p.y > 0) seen.set(p.id, p.ppaFloor);
    }
  }
  for (let floor = 1; floor <= 60; floor += 1) {
    assert.equal([...seen.values()].filter((f) => f === floor).length, 1, `B${floor}`);
  }
});
