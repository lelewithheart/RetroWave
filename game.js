// ════════════════════════════════════════════════════════════════════════════
// RogueWave – Survivor Roguelite
// A polished, modular HTML5 Canvas game ready for CrazyGames SDK v3.
// All code is in this single file for rapid prototyping.
// ════════════════════════════════════════════════════════════════════════════

"use strict";

const CFG = (typeof window !== "undefined" && window.RogueConfig)
    ? window.RogueConfig
    : {
        perf: {
            minReadableScale: 0.95,
            lowThreshold: 48,
            recoverThreshold: 54,
            sampleWindow: 1.2,
        },
        wave: {
            baseKills: 10,
            killsGrowth: 5,
            baseSpawnCd: 1.5,
            minSpawnCd: 0.3,
            spawnCdDecay: 0.92,
            hpScale: 1.22,
            speedScale: 1.07,
            damageScale: 1.10,
            restTime: 2.5,
            maxWave: 25,
        },
        bosses: {
            minibossName: "Shard Warden",
            bigbossName: "Iron Tyrant",
            bigbossNamesByWave: {
                10: "Iron Tyrant",
                20: "Abyss Colossus",
            },
            endbossName: "The Null Sovereign",
        },
        skinShop: {
            skins: [
                { id: "default", name: "Classic Cyan", player: "#33ccff", glow: "rgba(51,204,255,0.25)", cost: 0, asset: "assets/playerskins/default.png" },
                { id: "surge", name: "Lime Surge", player: "#66ff99", glow: "rgba(102,255,153,0.25)", cost: 140, asset: "assets/playerskins/surge.png" },
                { id: "ember", name: "Ember Pulse", player: "#ff6688", glow: "rgba(255,102,136,0.25)", cost: 140, asset: "assets/playerskins/ember.png" },
                { id: "nova", name: "Nova Gold", player: "#ffd166", glow: "rgba(255,209,102,0.28)", cost: 180, asset: "assets/playerskins/nova.png" },
                { id: "rainbow", name: "Rainbow", player: "#ff00ff", glow: "rgba(255,0,255,0.4)", cost: 200, asset: "assets/playerskins/rainbow.png" },
                { id: "spiderman", name: "Spiderman Skin", player: "#d32f2f", glow: "rgba(30,90,200,0.35)", cost: 240, asset: "assets/playerskins/SpidermanSkin.png" },
            ],
            featuredIds: ["rainbow", "nova", "spiderman"],
        },
        upgrades: {
            rarityBaseWeights: {
                common: 100,
                rare: 16,
                epic: 5,
            },
            rarityColors: {
                common: "#cfd9e6",
                rare: "#66ddff",
                epic: "#c38bff",
            },
            epicUnlockWave: 6,
            waveBoosts: [
                { wave: 8, rare: 1.35, epic: 1.5 },
                { wave: 15, rare: 1.7, epic: 2.2 },
                { wave: 20, rare: 2.1, epic: 3.0 },
            ],
            bonusWaveBoost: {
                rare: 1.25,
                epic: 1.4,
            },
            bigbossBoost: {
                rare: 1.2,
                epic: 1.35,
            },
            tuning: {
                damage1: 5,
                damage2: 10,
                moveSpeedMult1: 1.15,
                moveSpeedMult2: 1.25,
                fireRateMult1: 0.8,
                fireRateMult2: 0.65,
                maxHp1: 25,
                maxHp2: 50,
                healPercent: 0.3,
                xpMagnetRange: 40,
                armor1: 3,
                armor2: 6,
                hpRegen1: 2,
                hpRegen2: 5,
                piercing: 1,
                multiShot: 1,
                critChanceAdd: 0.1,
                critDamageAdd: 0.5,
                bulletSizeMult: 1.3,
                rangeMult1: 1.2,
                rangeMult2: 1.4,
                xpGainMult1: 1.25,
                xpGainMult2: 1.5,
                executeAdd1: 0.08,
                executeAdd2: 0.12,
                executeCap: 0.5,
                weaponLevelAdd: 1,
            },
        },
        prestige: {
            enabled: true,
            gainPerClear: 1,
            resetShards: true,
            resetMeta: true,
        },
    };

// ─────────────────────────────────────────────
// §1  CONSTANTS & CONFIGURATION
// ─────────────────────────────────────────────

const CANVAS_W = 960;
const CANVAS_H = 640;
const MIN_READABLE_SCALE = CFG.perf.minReadableScale;
const TARGET_FPS = 60;
const MAX_DT = 0.1;                      // Cap to avoid spiral of death
let GAME_VERSION = "loading...";
let CHANGELOG_ENTRIES = [];

const BOOT_DIAGNOSTICS = {
    env: { ok: false, source: "none" },
    changelogs: { ok: false, source: "none", entries: 0, version: "loading..." },
    skinShop: { ok: false, source: "none", skins: 0, featured: 0 },
    progression: { ok: false },
    runtimeWarnings: [],
};

const SKIN_ASSET_TELEMETRY = {
    requests: 0,
    cacheHits: 0,
    loadSuccess: 0,
    loadFailed: 0,
    fallbackRetries: 0,
    resolvedByFallback: 0,
    placeholderRenders: 0,
};

const APP_CONFIG = {
    monetization: false,
};

// Developer/QA overlays (asset telemetry, A/B variants). Keep false in builds the
// players get to see.
const SHOW_DEV_INFO = false;

function cloneSkinShopConfig(raw) {
    const src = raw || {};
    const skins = Array.isArray(src.skins)
        ? src.skins.map((s) => ({
            id: String(s.id || "").trim(),
            name: String(s.name || "").trim(),
            player: String(s.player || "").trim(),
            glow: String(s.glow || "").trim(),
            cost: Math.max(0, Math.floor(Number(s.cost) || 0)),
            asset: String(s.asset || "").trim(),
        }))
        : [];
    const featuredIds = Array.isArray(src.featuredIds)
        ? src.featuredIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
    return { skins, featuredIds };
}

const DEFAULT_SKIN_SHOP_CONFIG = cloneSkinShopConfig(CFG.skinShop);

// Skin shop config (loaded from skinshop.txt at boot)
let SKIN_SHOP_CONFIG = cloneSkinShopConfig(DEFAULT_SKIN_SHOP_CONFIG);

// Game-state identifiers
const STATE = {
    START_MENU:     "START_MENU",
    CHANGELOGS:     "CHANGELOGS",
    SHOP:           "SHOP",
    INVENTORY:      "INVENTORY",
    CHESTS:         "CHESTS",
    LOCKER:         "LOCKER",
    STATS:          "STATS",
    GAMEPLAY:       "GAMEPLAY",
    PAUSED:         "PAUSED",
    CHEAT_MENU:     "CHEAT_MENU",
    UPGRADE_SCREEN: "UPGRADE_SCREEN",
    SETTINGS:       "SETTINGS",
    GAME_OVER:      "GAME_OVER",
    VICTORY:        "VICTORY",
};

// World dimensions (larger than the canvas – camera follows player)
const WORLD_W = 3000;
const WORLD_H = 3000;

// Player defaults
const PLAYER_RADIUS = 16;
const PLAYER_BASE_SPEED = 200;           // px/s
const PLAYER_BASE_HP = 100;
const PLAYER_BASE_DAMAGE = 15;
const PLAYER_BASE_FIRE_RATE = 0.35;      // seconds between shots

// Projectile
const BULLET_SPEED = 500;
const BULLET_RADIUS = 5;
const BULLET_LIFETIME = 1.5;             // seconds

// Range (max targeting distance for auto-aim)
const PLAYER_BASE_RANGE = 300;           // px

// Enemy
const ENEMY_BASE_SPEED = 80;
const ENEMY_BASE_HP = 30;

// Enemy type definitions
const ENEMY_TYPES = {
    normal:   { hpMult: 1,   spdMult: 1,    radius: 14, contactDmg: 10, color: null,      xpMult: 1   },
    tank:     { hpMult: 3.5, spdMult: 0.45, radius: 24, contactDmg: 25, color: "#44bb44", xpMult: 2.5 },
    speedy:   { hpMult: 0.5, spdMult: 2.2,  radius: 10, contactDmg: 8,  color: "#ffdd33", xpMult: 1.2 },
    ranged:   { hpMult: 0.8, spdMult: 0.7,  radius: 13, contactDmg: 6,  color: "#bb55ff", xpMult: 1.8 },
    phaser:   { hpMult: 0.95, spdMult: 1.05, radius: 13, contactDmg: 12, color: "#66aaff", xpMult: 2.0 },
    exploder: { hpMult: 0.9, spdMult: 1.1,  radius: 15, contactDmg: 5,  color: "#ff8800", xpMult: 1.5 },
    miniboss: { hpMult: 12,  spdMult: 0.55, radius: 38, contactDmg: 30, color: "#dd2277", xpMult: 12  },
    bigboss:  { hpMult: 30,  spdMult: 0.35, radius: 56, contactDmg: 50, color: "#cc0000", xpMult: 30  },
    endboss:  { hpMult: 80,  spdMult: 0.3,  radius: 72, contactDmg: 40, color: "#ff00ff", xpMult: 100 },
    splitter: { hpMult: 1.6, spdMult: 0.85, radius: 18, contactDmg: 14, color: "#a0ffdd", xpMult: 2.2 },
    warden:   { hpMult: 4.0, spdMult: 0,    radius: 22, contactDmg: 12, color: "#ffaa33", xpMult: 3.0 },
};

const BOSS_NAMES = {
    miniboss: CFG.bosses.minibossName,
    bigboss: CFG.bosses.bigbossName,
    endboss: CFG.bosses.endbossName,
};

function getBigBossNameForWave(waveNum) {
    const byWave = CFG.bosses.bigbossNamesByWave || {};
    const keyed = byWave[String(waveNum)] || byWave[waveNum];
    return keyed || BOSS_NAMES.bigboss;
}

function getBossDisplayName(enemy) {
    if (!enemy) return "";
    if (enemy.displayName) return enemy.displayName;
    if (enemy.type === "bigboss") return BOSS_NAMES.bigboss;
    if (enemy.type === "miniboss") return BOSS_NAMES.miniboss;
    if (enemy.type === "endboss") return BOSS_NAMES.endboss;
    return "";
}

// XP
const XP_ORB_RADIUS = 6;
const XP_BASE_AMOUNT = 10;
const XP_MAGNET_RANGE = 100;

// Particle
const PARTICLE_LIFETIME = 0.5;

// Damage numbers
const DAMAGE_NUMBER_LIFETIME = 0.8;
const DAMAGE_NUMBER_RISE_SPEED = 60;

// Kill combo
const COMBO_TIMEOUT = 1.5;            // seconds until combo resets

// ── Performance caps ──
const MAX_PARTICLES = 150;
const MAX_ENEMIES = 80;
const MAX_XP_ORBS = 150;
const MAX_DAMAGE_NUMBERS = 60;
const MAX_PARTICLE_POOL = 240;
const MAX_DAMAGE_NUMBER_POOL = 120;
const MAX_FLAME_PATCHES = 50;
const MAX_LIGHTNING_BOLTS = 20;
const PERF_LOW_THRESHOLD = CFG.perf.lowThreshold;
const PERF_RECOVER_THRESHOLD = CFG.perf.recoverThreshold;
const PERF_SAMPLE_WINDOW = CFG.perf.sampleWindow;
const TUTORIAL_HINT_DURATION = 8;

// Camera
const CAMERA_LERP_SPEED = 5;             // Higher = snappier follow

// Screen-shake
const SHAKE_DURATION = 0.15;
const SHAKE_INTENSITY = 6;

// Wave – infinite spawning, kill-target progression
const WAVE_BASE_KILLS = CFG.wave.baseKills;              // kills needed to complete wave 1
const WAVE_KILLS_GROWTH = CFG.wave.killsGrowth;          // additional kills required per wave
const WAVE_BASE_SPAWN_CD = CFG.wave.baseSpawnCd;         // spawn cooldown in seconds (wave 1)
const WAVE_SPAWN_CD_MIN = CFG.wave.minSpawnCd;           // minimum spawn cooldown
const WAVE_SPAWN_CD_DECAY = CFG.wave.spawnCdDecay;       // multiply cooldown by this each wave
const WAVE_HP_SCALE = CFG.wave.hpScale;
const WAVE_SPEED_SCALE = CFG.wave.speedScale;
const WAVE_DAMAGE_SCALE = CFG.wave.damageScale;          // contact damage grows per wave
const WAVE_REST_TIME = CFG.wave.restTime;                // seconds between waves
const WAVE_MAX = CFG.wave.maxWave;                       // completing this wave triggers victory

// ────── RUN EVENTS (between-wave modifiers) ──────
// Every CFG.events.interval waves one event is drawn from the pool and applied
// for the duration of that wave. Each definition exposes the same small
// interface so the wave/spawn code never needs an if-chain:
//   apply(game)   – called once when the event starts
//   expire(game)  – called once when the event ends
//   killTargetMult / enemyHpMult / enemySpeedMult / enemyDmgMult / xpMult
//   spawnOverride(game) – optional; takes over enemy spawning for the wave
const EVENT_DEFS = {
    eliteWave: {
        id: "eliteWave",
        label: "ELITE WAVE",
        desc: "Every enemy is an elite. Deadlier — and far more rewarding.",
        color: "#ffcc66",
        killTargetMult: 1 + CFG.events.eliteWave.extraKillShare,
        enemyHpMult: CFG.events.eliteWave.hpMult,
        xpMult: CFG.events.eliteWave.xpMult,
        forceElite: true,
    },
    storm: {
        id: "storm",
        label: "ION STORM",
        desc: "Enemies are fast and frail. Everything hits harder.",
        color: "#88ddff",
        enemySpeedMult: CFG.events.storm.enemySpeedMult,
        enemyHpMult: CFG.events.storm.enemyHpMult,
        enemyDmgMult: CFG.events.storm.enemyDmgMult,
        playerDamageMult: CFG.events.storm.playerDamageMult,
    },
    fountain: {
        id: "fountain",
        label: "REPAIR FOUNTAIN",
        desc: "You regenerate health this wave, but XP is scarce.",
        color: "#66ff99",
        xpMult: CFG.events.fountain.xpMult,
        apply(game) { game.eventHpRegen = CFG.events.fountain.hpRegenPerSec; },
        expire(game) { game.eventHpRegen = 0; },
    },
    ambush: {
        id: "ambush",
        label: "AMBUSH",
        desc: "Enemies arrive in packs from a single direction. Hold the line.",
        color: "#ff8899",
        killTargetMult: CFG.events.ambush.killsMult,
        spawnOverride(game) { game.spawnAmbushPack(); },
    },
    shardCache: {
        id: "shardCache",
        label: "SHARD CACHE",
        desc: "One enemy carries a shard cache. Hunt it down before it dies elsewhere.",
        color: "#c38bff",
        apply(game) { game.eventShardCachePending = true; },
        expire(game) { game.eventShardCachePending = false; },
    },
    hunt: {
        id: "hunt",
        label: "BOUNTY HUNT",
        desc: "A marked elite prowls the arena. Kill it for a payout.",
        color: "#ff66dd",
        apply(game) { game.spawnBountyTarget(); },
    },
};

const EVENT_INTERVAL = CFG.events.interval;
const EVENT_START_WAVE = CFG.events.startWave;
const EVENT_EXCLUDE_FROM = CFG.events.excludeFromWave;
const EVENTS_ENABLED = CFG.events.enabled;

// ────── BOSS MODIFIERS ──────
// Rolled onto a boss when it spawns. Each def has an optional onSpawn and
// per-frame onUpdate hook so behaviour code stays in one place.
const BOSS_MODIFIER_DEFS = {
    shieldWall: {
        id: "shieldWall",
        label: "Shield Wall",
        color: "#66ddff",
        desc: "Blocks most damage from the front",
        onSpawn(boss) { boss.modShieldWall = true; },
    },
    berserker: {
        id: "berserker",
        label: "Berserker",
        color: "#ff5566",
        desc: "Enrages below 40% health",
        onSpawn(boss) { boss.modBerserker = true; },
    },
    summoner: {
        id: "summoner",
        label: "Summoner",
        color: "#c38bff",
        desc: "Periodically calls in adds",
        onSpawn(boss) { boss.modSummoner = true; boss.modSummonTimer = CFG.bossModifiers.summoner.interval; },
    },
    siphon: {
        id: "siphon",
        label: "Siphon",
        color: "#66ff99",
        desc: "Drains your health when close",
        onSpawn(boss) { boss.modSiphon = true; },
    },
    brutal: {
        id: "brutal",
        label: "Brutal",
        color: "#ff9900",
        desc: "Tougher and hits much harder",
        onSpawn(boss, game) {
            boss.modBrutal = true;
            const c = CFG.bossModifiers.brutal;
            boss.maxHp = Math.floor(boss.maxHp * c.hpMult);
            boss.hp = boss.maxHp;
            boss.contactDamage = Math.floor(boss.contactDamage * c.dmgMult);
            boss.baseSpeed *= c.speedMult;
            boss.speed = boss.baseSpeed;
        },
    },
    brittle: {
        id: "brittle",
        label: "Brittle",
        color: "#b9f1ff",
        desc: "Frail, but shatters into a huge payout",
        onSpawn(boss) {
            boss.modBrittle = true;
            const c = CFG.bossModifiers.brittle;
            boss.maxHp = Math.max(1, Math.floor(boss.maxHp * c.hpMult));
            boss.hp = boss.maxHp;
            boss.shardMult = (boss.shardMult || 1) * c.shardMult;
            boss.xpMult = (boss.xpMult || 1) * c.xpMult;
        },
    },
};

const BOSS_MODIFIERS_ENABLED = CFG.bossModifiers.enabled;
const ELITES_ENABLED = CFG.elites.enabled;
const ELITE_START_WAVE = CFG.elites.startWave;

// ────── LOOT / INVENTORY ──────
const LOOT_CFG = CFG.loot || {};
const LOOT_ENABLED = LOOT_CFG.enabled !== false;
const LOOT_RARITIES = LOOT_CFG.rarities || {};
const LOOT_SLOTS = LOOT_CFG.slots || [];
const LOOT_AFFIXES = LOOT_CFG.affixes || {};
const LOOT_ENCHANTS = LOOT_CFG.enchantments || {};
const LOOT_SETS = LOOT_CFG.sets || {};
const LOOT_CHESTS = LOOT_CFG.chests || [];
// Ordered worst -> best, used for rarity comparisons and display.
const RARITY_ORDER = ["common", "rare", "epic", "legendary"];
const RARITY_RANK = Object.fromEntries(RARITY_ORDER.map((r, i) => [r, i]));


// Upgrade choices per level-up
const UPGRADE_CHOICES = 3;
const CHEAT_CODE_SEQUENCE = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
    "KeyB", "KeyA",
];
const CHEAT_TARGET_LEVEL = 2;
const CHEAT_LEVEL_MIN = 0;
const CHEAT_LEVEL_MAX = 99;
const CHEAT_WEAPON_ROWS = [
    { id: "orbitShield", name: "Orbit Shield", icon: "🔵" },
    { id: "lightningAura", name: "Lightning Aura", icon: "⚡" },
    { id: "frostNova", name: "Frost Nova", icon: "❄️" },
    { id: "flameTrail", name: "Flame Trail", icon: "🔥" },
];

// Colors
const COLOR = {
    bg:          "#111122",
    grid:        "#1a1a33",
    player:      "#33ccff",
    playerGlow:  "rgba(51,204,255,0.25)",
    bullet:      "#ffee55",
    enemyA:      "#ff4466",
    enemyB:      "#ff7744",
    xpOrb:       "#55ff88",
    hpBar:       "#ff3344",
    hpBarBg:     "#440011",
    xpBar:       "#44aaff",
    xpBarBg:     "#112244",
    text:        "#ffffff",
    textDim:     "#8899aa",
    panel:       "rgba(10,10,30,0.92)",
    accent:      "#33ccff",
    accentHover: "#66ddff",
    danger:      "#ff4466",
    enemyBullet: "#ff55ff",
    tank:        "#44bb44",
    speedy:      "#ffdd33",
    ranged:      "#bb55ff",
    phaser:      "#66aaff",
    exploder:    "#ff8800",
};

// Visual foundation for menu/HUD presentation updates.
const UI_THEME = {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    panelFill: "rgba(8,10,24,0.72)",
    panelFillStrong: "rgba(8,10,24,0.88)",
    panelStroke: "rgba(102,204,255,0.42)",
    panelGlow: "rgba(51,204,255,0.28)",
    buttonText: "#eaf6ff",
    buttonTextMuted: "#0b1220",
    transitionTint: "rgba(8, 14, 36, 1)",
};

const UI_FONT = {
    xxs: 9,
    xs: 10,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 24,
    title: 38,
};

function uiFont(sizePx, weight = "normal") {
    return `${weight} ${sizePx}px ${UI_THEME.fontFamily}`;
}

const BIOMES = [
    { name: "Neon District", bg: "#101226", grid: "#1a2448", border: "#33ccff" },
    { name: "Acid Grid", bg: "#131b17", grid: "#1d3a2c", border: "#66ff99" },
    { name: "Crimson Core", bg: "#1d1016", grid: "#3a1d28", border: "#ff6688" },
];

const DEFAULT_CHALLENGE_MODES = [
    {
        id: "none",
        label: "No Challenge",
        desc: "Standard run",
        enemySpeedMult: 1,
        shardRewardMult: 1,
        playerHpMult: 1,
        playerDamageMult: 1,
    },
    {
        id: "rush",
        label: "Rush",
        desc: "Faster enemies, more shards",
        enemySpeedMult: 1.22,
        shardRewardMult: 1.45,
        playerHpMult: 1,
        playerDamageMult: 1,
    },
    {
        id: "glass",
        label: "Glass Cannon",
        desc: "Low HP, high damage",
        enemySpeedMult: 1,
        shardRewardMult: 1.55,
        playerHpMult: 0.62,
        playerDamageMult: 1.45,
    },
    {
        id: "permadeath",
        label: "Permadeath",
        desc: "No revives, bigger shard payout",
        enemySpeedMult: 1.08,
        shardRewardMult: 1.85,
        playerHpMult: 1,
        playerDamageMult: 1,
        allowRevive: false,
    },
];

function normalizeChallengeMode(raw) {
    const id = String(raw?.id || "").trim();
    if (!id) return null;
    return {
        id,
        label: String(raw?.label || id).trim() || id,
        desc: String(raw?.desc || "").trim(),
        enemySpeedMult: Number(raw?.enemySpeedMult) > 0 ? Number(raw.enemySpeedMult) : 1,
        shardRewardMult: Number(raw?.shardRewardMult) > 0 ? Number(raw.shardRewardMult) : 1,
        playerHpMult: Number(raw?.playerHpMult) > 0 ? Number(raw.playerHpMult) : 1,
        playerDamageMult: Number(raw?.playerDamageMult) > 0 ? Number(raw.playerDamageMult) : 1,
        allowRevive: raw?.allowRevive !== false,
    };
}

function resolveChallengeModes(rawModes) {
    const fallback = DEFAULT_CHALLENGE_MODES.map((m) => normalizeChallengeMode(m)).filter(Boolean);
    if (!Array.isArray(rawModes) || rawModes.length === 0) return fallback;
    const mapped = rawModes.map((m) => normalizeChallengeMode(m)).filter(Boolean);
    const dedup = [];
    const seen = new Set();
    for (let i = 0; i < mapped.length; i++) {
        const m = mapped[i];
        if (seen.has(m.id)) continue;
        dedup.push(m);
        seen.add(m.id);
    }
    if (!seen.has("none")) dedup.unshift(fallback[0]);
    return dedup;
}

const CHALLENGE_MODES = resolveChallengeModes(CFG.replay?.challengeModes);
const CHALLENGE_MODE_BY_ID = Object.fromEntries(CHALLENGE_MODES.map((m) => [m.id, m]));

function getChallengeMode(modeId) {
    const requested = String(modeId || "").trim() || "none";
    return CHALLENGE_MODE_BY_ID[requested] || CHALLENGE_MODE_BY_ID.none || CHALLENGE_MODES[0];
}

function currentChallengeMode() {
    return getChallengeMode(Settings.challengeMode);
}


function applyChallengeToRunState(runState, player, challengeMode) {
    const mode = challengeMode || currentChallengeMode();
    if (!runState || !player || !mode) return;
    runState.enemySpeedMult *= mode.enemySpeedMult || 1;
    runState.shardRewardMult *= mode.shardRewardMult || 1;
    player.maxHp = Math.max(1, Math.floor(player.maxHp * (mode.playerHpMult || 1)));
    player.hp = player.maxHp;
    player.damage = Math.max(1, Math.floor(player.damage * (mode.playerDamageMult || 1)));
}

const GAME_SPEED_OPTIONS = [1, 1.5, 2, 3, 5, 10];
const GAME_SPEED_UNLOCK_COST = 75;
const GAME_SPEED_UNLOCK_MAX = GAME_SPEED_OPTIONS.length - 1;

// ─────────────────────────────────────────────
// §2  CANVAS & CONTEXT SETUP
// ─────────────────────────────────────────────

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

const LAYOUT_BREAKPOINTS = {
    compact: 700,
    narrow: 900,
};

function getViewportLayoutMode() {
    const w = window.innerWidth || CANVAS_W;
    if (w <= LAYOUT_BREAKPOINTS.compact) return "compact";
    if (w <= LAYOUT_BREAKPOINTS.narrow) return "narrow";
    return "normal";
}

function getDynamicMinReadableScale() {
    const mode = getViewportLayoutMode();
    if (mode === "compact") return Math.min(MIN_READABLE_SCALE, 0.62);
    if (mode === "narrow") return Math.min(MIN_READABLE_SCALE, 0.78);
    return MIN_READABLE_SCALE;
}

function toCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const displayWidth = canvas.clientWidth || rect.width || CANVAS_W;
    const displayHeight = canvas.clientHeight || rect.height || CANVAS_H;
    return {
        x: (clientX - rect.left) * (CANVAS_W / displayWidth),
        y: (clientY - rect.top) * (CANVAS_H / displayHeight),
    };
}

function resizeCanvas() {
    const fitScale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
    const scale = Math.max(getDynamicMinReadableScale(), fitScale);

    const scrollMode = scale > fitScale;
    document.documentElement.classList.toggle("canvas-scroll-mode", scrollMode);
    document.body.classList.toggle("canvas-scroll-mode", scrollMode);

    canvas.style.width  = (CANVAS_W * scale) + "px";
    canvas.style.height = (CANVAS_H * scale) + "px";
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ─────────────────────────────────────────────
// §3  UTILITY FUNCTIONS
// ─────────────────────────────────────────────

/** Linear interpolation */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Clamp value between min and max */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function splitTextLines(text, maxCharsPerLine = 28) {
    const raw = String(text || "").trim();
    if (!raw) return [""];
    const words = raw.split(/\s+/g);
    const lines = [];
    let line = "";
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length <= maxCharsPerLine || line.length === 0) {
            line = candidate;
        } else {
            lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines.length > 0 ? lines : [raw];
}

function upgradeDescriptionText(upgrade, player) {
    if (!upgrade) return "";
    if (typeof upgrade.desc === "function") {
        return String(upgrade.desc(player || null));
    }
    if (typeof upgrade.desc === "string" && upgrade.desc.trim()) {
        return upgrade.desc.trim();
    }

    const fallback = {
        dmg1: "Increase base damage.",
        dmg2: "Significant base damage boost.",
        spd1: "Move faster around the arena.",
        spd2: "Large movement speed boost.",
        rate1: "Fire bullets more frequently.",
        rate2: "Major fire rate increase.",
        hp1: "Increase max HP and heal.",
        hp2: "Large max HP increase and heal.",
        heal: "Restore part of your HP now.",
        magnet: "XP orbs are pulled from farther away.",
        regen1: "Regenerate HP each second.",
        regen2: "Strong HP regeneration.",
        pierce: "Bullets pass through more enemies.",
        multi: "Shoot one extra projectile.",
        crit1: "Crit chance increased.",
        crit2: "Critical hits deal more damage.",
        bigBullet: "Increase bullet collision size.",
        range1: "Increase effective attack range.",
        range2: "Large range increase.",
        xpgain1: "Gain more XP from kills.",
        xpgain2: "Greatly increase XP gain.",
        execute1: "Finish low-health enemies faster.",
        execute2: "Strong execute threshold boost.",
        orbit: "Level up Orbit Shield weapon.",
        lightning: "Level up Lightning Aura weapon.",
        frost: "Level up Frost Nova weapon.",
        flame: "Level up Flame Trail weapon.",
    };

    return fallback[upgrade.id] || "Enhance your build this run.";
}

/** Distance between two points */
function dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Random float in range [lo, hi) */
function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }

/** Random integer in range [lo, hi] */
function randInt(lo, hi) { return Math.floor(randRange(lo, hi + 1)); }

/** Pick random element from array */
function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function dynamicCap(base) {
    const lowPerf = (typeof game !== "undefined" && game && game.lowPerf);
    return Math.max(4, Math.floor(base * (lowPerf ? 0.65 : 1)));
}

/** Human-readable label for the current game mode */
function gameModeLabel() {
    return Settings.gameMode === "easy" ? "EASY" : Settings.gameMode === "hard" ? "HARD" : "NORMAL";
}

/** Replace the opacity value in an rgba(...) color string. */
function withAlpha(rgbaStr, newAlpha) {
    return rgbaStr.replace(/[\d.]+\)$/, newAlpha + ")");
}

/** Convert a #rrggbb colour and an alpha (0..1) into an rgba() string. */
function hexToRgba(hex, alpha) {
    const h = String(hex || "#ffffff").replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
}

/** Shuffle array in-place (Fisher-Yates) */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function upgradeRarity(upgrade) {
    return upgrade.rarity || "common";
}

const UPGRADE_RARITY_BASE_WEIGHTS = {
    common: Number(CFG.upgrades?.rarityBaseWeights?.common) || 100,
    rare: Number(CFG.upgrades?.rarityBaseWeights?.rare) || 16,
    epic: Number(CFG.upgrades?.rarityBaseWeights?.epic) || 5,
};

const UPGRADE_RARITY_COLORS = {
    common: CFG.upgrades?.rarityColors?.common || "#cfd9e6",
    rare: CFG.upgrades?.rarityColors?.rare || "#66ddff",
    epic: CFG.upgrades?.rarityColors?.epic || "#c38bff",
};

const UPGRADE_EPIC_UNLOCK_WAVE = Number(CFG.upgrades?.epicUnlockWave) || 6;
const UPGRADE_WAVE_BOOSTS = Array.isArray(CFG.upgrades?.waveBoosts) ? CFG.upgrades.waveBoosts : [];
const UPGRADE_BONUS_WAVE_BOOST = CFG.upgrades?.bonusWaveBoost || { rare: 1.25, epic: 1.4 };
const UPGRADE_BIGBOSS_BOOST = CFG.upgrades?.bigbossBoost || { rare: 1.2, epic: 1.35 };
const UPGRADE_TUNING_CFG = CFG.upgrades?.tuning || {};
const UPGRADE_TUNING = {
    damage1: Number(UPGRADE_TUNING_CFG.damage1) || 5,
    damage2: Number(UPGRADE_TUNING_CFG.damage2) || 10,
    moveSpeedMult1: Number(UPGRADE_TUNING_CFG.moveSpeedMult1) || 1.15,
    moveSpeedMult2: Number(UPGRADE_TUNING_CFG.moveSpeedMult2) || 1.25,
    fireRateMult1: Number(UPGRADE_TUNING_CFG.fireRateMult1) || 0.8,
    fireRateMult2: Number(UPGRADE_TUNING_CFG.fireRateMult2) || 0.65,
    maxHp1: Number(UPGRADE_TUNING_CFG.maxHp1) || 25,
    maxHp2: Number(UPGRADE_TUNING_CFG.maxHp2) || 50,
    healPercent: Number(UPGRADE_TUNING_CFG.healPercent) || 0.3,
    xpMagnetRange: Number(UPGRADE_TUNING_CFG.xpMagnetRange) || 40,
    armor1: Number(UPGRADE_TUNING_CFG.armor1) || 3,
    armor2: Number(UPGRADE_TUNING_CFG.armor2) || 6,
    hpRegen1: Number(UPGRADE_TUNING_CFG.hpRegen1) || 2,
    hpRegen2: Number(UPGRADE_TUNING_CFG.hpRegen2) || 5,
    piercing: Number(UPGRADE_TUNING_CFG.piercing) || 1,
    multiShot: Number(UPGRADE_TUNING_CFG.multiShot) || 1,
    critChanceAdd: Number(UPGRADE_TUNING_CFG.critChanceAdd) || 0.1,
    critDamageAdd: Number(UPGRADE_TUNING_CFG.critDamageAdd) || 0.5,
    bulletSizeMult: Number(UPGRADE_TUNING_CFG.bulletSizeMult) || 1.3,
    rangeMult1: Number(UPGRADE_TUNING_CFG.rangeMult1) || 1.2,
    rangeMult2: Number(UPGRADE_TUNING_CFG.rangeMult2) || 1.4,
    xpGainMult1: Number(UPGRADE_TUNING_CFG.xpGainMult1) || 1.25,
    xpGainMult2: Number(UPGRADE_TUNING_CFG.xpGainMult2) || 1.5,
    executeAdd1: Number(UPGRADE_TUNING_CFG.executeAdd1) || 0.08,
    executeAdd2: Number(UPGRADE_TUNING_CFG.executeAdd2) || 0.12,
    executeCap: Number(UPGRADE_TUNING_CFG.executeCap) || 0.5,
    weaponLevelAdd: Number(UPGRADE_TUNING_CFG.weaponLevelAdd) || 1,
};

const PRESTIGE_CFG = CFG.prestige || {};
const PRESTIGE_ENABLED = PRESTIGE_CFG.enabled !== false;
const PRESTIGE_GAIN_PER_CLEAR = Math.max(1, Math.floor(Number(PRESTIGE_CFG.gainPerClear) || 1));
const PRESTIGE_RESET_SHARDS = PRESTIGE_CFG.resetShards !== false;
const PRESTIGE_RESET_META = PRESTIGE_CFG.resetMeta !== false;
const PRESTIGE_FALLBACK_SKIN_THRESHOLDS = [
    { prestigeLevel: 1, skinId: "prestige_bronze" },
    { prestigeLevel: 2, skinId: "prestige_silver" },
    { prestigeLevel: 3, skinId: "prestige_gold" },
    { prestigeLevel: 5, skinId: "prestige_diamond" },
    { prestigeLevel: 7, skinId: "prestige_platinum" },
    { prestigeLevel: 10, skinId: "prestige_emerald" },
];
const PRESTIGE_SKIN_THRESHOLDS = Array.isArray(PRESTIGE_CFG.skinThresholds)
    ? [...PRESTIGE_CFG.skinThresholds].sort((a, b) => (a.prestigeLevel || 0) - (b.prestigeLevel || 0))
    : [];
const RESOLVED_PRESTIGE_SKIN_THRESHOLDS = PRESTIGE_SKIN_THRESHOLDS.length > 0
    ? PRESTIGE_SKIN_THRESHOLDS
    : PRESTIGE_FALLBACK_SKIN_THRESHOLDS;


function upgradeRarityWeight(rarity, opts = {}) {
    const wave = opts.wave || 1;
    const isBonusWave = !!opts.isBonusWave;
    const bossType = opts.bossType || null;

    let weight = UPGRADE_RARITY_BASE_WEIGHTS[rarity] || UPGRADE_RARITY_BASE_WEIGHTS.common;

    if (rarity === "epic" && wave < UPGRADE_EPIC_UNLOCK_WAVE && !isBonusWave) {
        return 0;
    }

    for (let i = 0; i < UPGRADE_WAVE_BOOSTS.length; i++) {
        const b = UPGRADE_WAVE_BOOSTS[i];
        if (!b || wave < (Number(b.wave) || 0)) continue;
        if (rarity === "rare") weight *= Number(b.rare) || 1;
        if (rarity === "epic") weight *= Number(b.epic) || 1;
    }

    if (isBonusWave) {
        if (rarity === "rare") weight *= Number(UPGRADE_BONUS_WAVE_BOOST.rare) || 1;
        if (rarity === "epic") weight *= Number(UPGRADE_BONUS_WAVE_BOOST.epic) || 1;
    }
    if (bossType === "bigboss") {
        if (rarity === "rare") weight *= Number(UPGRADE_BIGBOSS_BOOST.rare) || 1;
        if (rarity === "epic") weight *= Number(UPGRADE_BIGBOSS_BOOST.epic) || 1;
    }

    return weight;
}

function upgradeRarityColor(rarity) {
    return UPGRADE_RARITY_COLORS[rarity] || UPGRADE_RARITY_COLORS.common;
}

function pickUpgradeChoicesByRarity(pool, count, opts = {}) {
    const picks = [];
    const available = [...pool];

    while (available.length > 0 && picks.length < count) {
        let totalWeight = 0;
        for (let i = 0; i < available.length; i++) {
            totalWeight += upgradeRarityWeight(upgradeRarity(available[i]), opts);
        }
        if (totalWeight <= 0) break;

        let roll = Math.random() * totalWeight;
        let chosenIdx = available.length - 1;
        for (let i = 0; i < available.length; i++) {
            roll -= upgradeRarityWeight(upgradeRarity(available[i]), opts);
            if (roll <= 0) {
                chosenIdx = i;
                break;
            }
        }

        picks.push(available[chosenIdx]);
        available.splice(chosenIdx, 1);
    }

    return picks;
}


/** Format seconds as MM:SS */
function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function modeModifiers() {
    switch (Settings.gameMode) {
        case "easy":
            return {
                waveKillsMult: 0.78,
                spawnCdMult: 1.25,
                enemyHpMult: 0.8,
                enemySpdMult: 0.82,
                enemyDmgMult: 0.8,
                xpGainMult: 1.9,
                xpNeedGrowth: 1.16,
                waveRestMult: 1.12,
                specialChanceMult: 0.9,
            };
        case "hard":
            return {
                waveKillsMult: 1.35,
                spawnCdMult: 0.72,
                enemyHpMult: 1.3,
                enemySpdMult: 1.28,
                enemyDmgMult: 1.35,
                xpGainMult: 0.72,
                xpNeedGrowth: 1.32,
                waveRestMult: 0.85,
                specialChanceMult: 1.25,
            };
        default:
            return {
                waveKillsMult: 1,
                spawnCdMult: 1,
                enemyHpMult: 1,
                enemySpdMult: 1,
                enemyDmgMult: 1,
                xpGainMult: 1,
                // Lowered from 1.4: at 1.4 the player only reached ~19 upgrade
                // picks in a full run (level ~20 by wave 25), so the build never
                // came together and DPS could not keep up with the wave scaling.
                xpNeedGrowth: 1.20,
                waveRestMult: 1,
                specialChanceMult: 1,
            };
    }
}

function dateKeyLocal(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function dateFromKey(key) {
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function isYesterdayKey(key, currentKey) {
    const a = dateFromKey(key);
    const b = dateFromKey(currentKey);
    if (!a || !b) return false;
    const ms = b.getTime() - a.getTime();
    return ms > 0 && ms <= 24 * 60 * 60 * 1000 + 2000;
}

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
}

/** True when a mobile device is held in portrait orientation */
function isPortraitMobile() {
    return isMobile && window.innerHeight > window.innerWidth;
}

/** The changelog source is injected as `window.ROGUEWAVE_CHANGELOG_TEXT = `...``.
 *  When we fall back to fetching the file we get that wrapper verbatim, so strip it
 *  to end up with the same plain-text format the embedded copy provides. */
function stripChangelogWrapper(raw) {
    const text = String(raw || "");
    if (!/ROGUEWAVE_CHANGELOG_TEXT/.test(text)) return text;
    const start = text.indexOf("`");
    if (start < 0) return text;
    return text.slice(start + 1).replace(/`\s*;?\s*$/, "");
}

/** Parse plain-text changelog into [{ version, changes[] }, ...] */
function parseChangelogText(text) {
    const entries = [];
    const lines = text.split(/\r?\n/);
    let current = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;

        if (line.startsWith("-")) {
            if (current) {
                current.changes.push(line.replace(/^-+\s*/, ""));
            }
            continue;
        }

        if (current) entries.push(current);
        current = { version: line, changes: [] };
    }

    if (current) entries.push(current);
    return entries;
}

/** Load changelogs from text file and derive version from newest entry */
async function loadChangelogs() {
    const injectedText = (typeof window !== "undefined" && typeof window.ROGUEWAVE_CHANGELOG_TEXT === "string")
        ? window.ROGUEWAVE_CHANGELOG_TEXT
        : "";

    if (injectedText.trim()) {
        const entries = parseChangelogText(injectedText);
        if (entries.length > 0) {
            CHANGELOG_ENTRIES = entries;
            GAME_VERSION = entries[0].version;
            return { ok: true, source: "window", entries: entries.length, version: GAME_VERSION };
        }
    }

    try {
        const res = await fetch("changelogs.txt", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = stripChangelogWrapper(await res.text());
        const entries = parseChangelogText(text);

        if (entries.length > 0) {
            CHANGELOG_ENTRIES = entries;
            GAME_VERSION = entries[0].version;
            return { ok: true, source: "changelogs.txt", entries: entries.length, version: GAME_VERSION };
        }

        GAME_VERSION = "unknown";
        return { ok: false, source: "changelogs.txt", entries: 0, version: GAME_VERSION };
    } catch (err) {
        console.warn("Failed to load changelogs.txt", err);
        CHANGELOG_ENTRIES = [];
        GAME_VERSION = "unknown";
        return { ok: false, source: "error", entries: 0, version: GAME_VERSION };
    }
}

/** Parse skin shop text format into config.
 *
 * Format:
 * [skins]
 * id|name|playerColor|glowColor|cost|assetPath
 *
 * [featured]
 * skinId
 */
function parseSkinShopText(text) {
    const lines = text.split(/\r?\n/);
    const skins = [];
    const featuredIds = [];
    let section = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;

        if (line.toLowerCase() === "[skins]") {
            section = "skins";
            continue;
        }
        if (line.toLowerCase() === "[featured]") {
            section = "featured";
            continue;
        }

        if (section === "skins") {
            const parts = line.split("|").map(s => s.trim());
            if (parts.length < 6) continue;

            const id = parts[0];
            const name = parts[1];
            const player = parts[2];
            const glow = parts[3];
            const cost = Math.max(0, Math.floor(Number(parts[4]) || 0));
            const asset = parts[5];

            if (!id || !name || !player || !glow) continue;
            skins.push({ id, name, player, glow, cost, asset });
            continue;
        }

        if (section === "featured") {
            featuredIds.push(line);
        }
    }

    // Guarantee default skin exists and costs 0.
    let hasDefault = false;
    for (let i = 0; i < skins.length; i++) {
        if (skins[i].id === "default") {
            skins[i].cost = 0;
            hasDefault = true;
            break;
        }
    }
    if (!hasDefault) {
        const defaultFromConfig = (DEFAULT_SKIN_SHOP_CONFIG.skins || []).find((s) => s.id === "default");
        skins.unshift({
            id: "default",
            name: defaultFromConfig ? defaultFromConfig.name : "Classic Cyan",
            player: defaultFromConfig ? defaultFromConfig.player : "#33ccff",
            glow: defaultFromConfig ? defaultFromConfig.glow : "rgba(51,204,255,0.25)",
            cost: 0,
            asset: defaultFromConfig ? defaultFromConfig.asset : "assets/playerskins/default.png",
        });
    }

    const seen = new Set();
    const uniqueSkins = [];
    for (let i = 0; i < skins.length; i++) {
        const s = skins[i];
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        uniqueSkins.push(s);
    }

    const validIds = new Set(uniqueSkins.map(s => s.id));
    const uniqueFeatured = [];
    const featuredSeen = new Set();
    for (let i = 0; i < featuredIds.length; i++) {
        const id = featuredIds[i];
        if (!validIds.has(id) || featuredSeen.has(id)) continue;
        featuredSeen.add(id);
        uniqueFeatured.push(id);
    }

    return {
        skins: uniqueSkins,
        featuredIds: uniqueFeatured,
    };
}

async function loadSkinShopConfig() {
    try {
        const res = await fetch("skinshop.txt", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseSkinShopText(text);
        if (parsed.skins.length > 0) {
            SKIN_SHOP_CONFIG = parsed;
            return {
                ok: true,
                source: "skinshop.txt",
                skins: SKIN_SHOP_CONFIG.skins.length,
                featured: SKIN_SHOP_CONFIG.featuredIds.length,
            };
        }
        return { ok: false, source: "skinshop.txt", skins: 0, featured: 0 };
    } catch (err) {
        console.warn("Failed to load skinshop.txt, using fallback skin config", err);
        return {
            ok: true,
            source: "fallback",
            skins: SKIN_SHOP_CONFIG.skins.length,
            featured: SKIN_SHOP_CONFIG.featuredIds.length,
        };
    }
}

function parseEnvBoolean(raw, fallback) {
    if (typeof raw !== "string") return fallback;
    let v = raw.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
    }
    const hashIndex = v.indexOf("#");
    if (hashIndex >= 0) v = v.slice(0, hashIndex).trim();
    v = v.toLowerCase();
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    return fallback;
}

function applyEnvConfigText(text) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx <= 0) continue;

        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key === "MONETIZATION") {
            APP_CONFIG.monetization = parseEnvBoolean(value, APP_CONFIG.monetization);
        }
    }
}

async function loadEnvConfig() {
    // .env may be blocked on some static hosts; fallback to env.txt.
    const candidates = [".env", "env.txt"];
    let lastErr = null;
    for (let i = 0; i < candidates.length; i++) {
        const path = candidates[i];
        try {
            const res = await fetch(path, { cache: "no-store" });
            if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
            const text = await res.text();
            applyEnvConfigText(text);
            return { ok: true, source: path };
        } catch (err) {
            lastErr = err;
        }
    }

    try {
        console.warn("Failed to load .env/env.txt, using default app config", lastErr);
    } catch (err) {
        // ignore console failures
    }
    return { ok: false, source: "default" };
}

function validateRuntimeConfiguration() {
    const warnings = [];

    if (!Number.isFinite(COLLISION_QUERY_BUFFER) || COLLISION_QUERY_BUFFER <= 0) {
        warnings.push("COLLISION_QUERY_BUFFER must be a positive finite number");
    }
    if (!Array.isArray(SKIN_SHOP_CONFIG.skins) || SKIN_SHOP_CONFIG.skins.length === 0) {
        warnings.push("Skin shop has no skins configured");
    }
    if (!Array.isArray(CHANGELOG_ENTRIES)) {
        warnings.push("Changelog entries failed to initialize");
    }

    BOOT_DIAGNOSTICS.runtimeWarnings = warnings;
    return warnings;
}

function logBootDiagnostics() {
    const summary = {
        env: BOOT_DIAGNOSTICS.env,
        changelogs: BOOT_DIAGNOSTICS.changelogs,
        skinShop: BOOT_DIAGNOSTICS.skinShop,
        progression: BOOT_DIAGNOSTICS.progression,
        monetization: APP_CONFIG.monetization,
        runtimeWarnings: BOOT_DIAGNOSTICS.runtimeWarnings,
    };
    console.info("[Boot] Diagnostics", summary);
    if (BOOT_DIAGNOSTICS.runtimeWarnings.length > 0) {
        console.warn("[Boot] Runtime warnings", BOOT_DIAGNOSTICS.runtimeWarnings);
    }
}

/**
 * Remove dead/expired items in-place using swap-and-pop.
 * Avoids creating a new array every frame (the old .filter() approach).
 * @param {Array} arr  – the array to compact
 * @param {Function} isAlive – predicate; return true to keep
 */
function compactInPlace(arr, isAlive) {
    let write = 0;
    for (let read = 0; read < arr.length; read++) {
        if (isAlive(arr[read])) {
            if (read !== write) arr[write] = arr[read];
            write++;
        }
    }
    arr.length = write;
}

function compactInPlaceWithPool(arr, isAlive, pool, poolCap) {
    let write = 0;
    for (let read = 0; read < arr.length; read++) {
        const item = arr[read];
        if (isAlive(item)) {
            if (read !== write) arr[write] = item;
            write++;
        } else if (pool && pool.length < poolCap) {
            pool.push(item);
        }
    }
    arr.length = write;
}

/** Cached DOMHighResTimeStamp – updated once per frame in mainLoop from requestAnimationFrame */
let frameNow = 0;

// Simple sprite cache for player skin assets.
const SkinAssets = (() => {
    const cache = new Map();
    const status = new Map();
    const placeholderSeen = new Set();

    function cacheBustUrl(path) {
        const version = (typeof GAME_VERSION === "string" && GAME_VERSION && GAME_VERSION !== "loading...")
            ? GAME_VERSION
            : "dev";
        const sep = path.includes("?") ? "&" : "?";
        return `${path}${sep}v=${encodeURIComponent(version)}`;
    }

    function buildPathCandidates(path) {
        const raw = String(path || "").trim();
        if (!raw) return [];

        const noQuery = raw.split("?")[0];
        const noLeadingDot = noQuery.replace(/^\.\//, "");
        const noLeadingSlash = noLeadingDot.replace(/^\/+/, "");
        const withDot = `./${noLeadingSlash}`;
        const fileName = noLeadingSlash.includes("/")
            ? noLeadingSlash.slice(noLeadingSlash.lastIndexOf("/") + 1)
            : noLeadingSlash;

        const candidates = [raw, noQuery, noLeadingSlash, withDot, fileName];
        const uniq = [];
        const seen = new Set();
        for (let i = 0; i < candidates.length; i++) {
            const p = candidates[i];
            if (!p || seen.has(p)) continue;
            seen.add(p);
            uniq.push(p);
        }
        return uniq;
    }

    function get(path) {
        const key = String(path || "").trim();
        if (!key) return null;
        if (cache.has(key)) {
            SKIN_ASSET_TELEMETRY.cacheHits++;
            return cache.get(key);
        }

        SKIN_ASSET_TELEMETRY.requests++;

        const img = new Image();
        const candidates = buildPathCandidates(key);
        let idx = 0;

        status.set(key, {
            state: "loading",
            attempts: candidates.length,
            attemptIndex: 0,
            failed: false,
            loaded: false,
        });

        img.onload = () => {
            const st = status.get(key);
            if (st) {
                st.state = "ready";
                st.loaded = true;
                st.attemptIndex = idx;
            }
            SKIN_ASSET_TELEMETRY.loadSuccess++;
            if (idx > 0) SKIN_ASSET_TELEMETRY.resolvedByFallback++;
        };

        img.onerror = () => {
            idx++;
            const st = status.get(key);
            if (st) st.attemptIndex = idx;
            if (idx < candidates.length) {
                SKIN_ASSET_TELEMETRY.fallbackRetries++;
                img.src = cacheBustUrl(candidates[idx]);
            } else {
                if (st) {
                    st.state = "missing";
                    st.failed = true;
                }
                SKIN_ASSET_TELEMETRY.loadFailed++;
            }
        };

        if (candidates.length > 0) {
            img.src = cacheBustUrl(candidates[0]);
        }

        cache.set(key, img);
        return img;
    }

    function getStatus(path) {
        const key = String(path || "").trim();
        if (!key) return { state: "none" };
        const st = status.get(key);
        if (!st) return { state: "unrequested" };
        return {
            state: st.state,
            attempts: st.attempts,
            attemptIndex: st.attemptIndex,
            failed: st.failed,
            loaded: st.loaded,
        };
    }

    function markPlaceholderRendered(path) {
        const key = String(path || "").trim();
        if (!key || placeholderSeen.has(key)) return;
        placeholderSeen.add(key);
        SKIN_ASSET_TELEMETRY.placeholderRenders++;
    }

    function getTelemetry() {
        return { ...SKIN_ASSET_TELEMETRY };
    }

    return { get, getStatus, markPlaceholderRendered, getTelemetry };
})();

function drawSkinIcon(x, y, radius, skin) {
    if (!skin) return;

    ctx.fillStyle = skin.player;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    const img = SkinAssets.get(skin.asset || "");
    if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        SkinAssets.markPlaceholderRendered(skin.asset || "");
        const skinId = String(skin.id || "");
        const isPrestigeSkin = skinId.startsWith("prestige_");
        if (isPrestigeSkin) {
            const tierLabelMap = {
                prestige_bronze: "B",
                prestige_silver: "S",
                prestige_gold: "G",
                prestige_diamond: "D",
                prestige_platinum: "P",
                prestige_emerald: "E",
            };
            const glyph = tierLabelMap[skinId] || "P";
            const ringColor = withAlpha(skin.glow || "rgba(255,255,255,0.35)", 0.65);
            const innerRing = withAlpha(skin.glow || "rgba(255,255,255,0.35)", 0.3);

            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(2, radius - 1.8), 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = innerRing;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(2, radius - 4), 0, Math.PI * 2);
            ctx.stroke();

            const starR = Math.max(1.8, radius * 0.34);
            ctx.fillStyle = "rgba(255,255,255,0.78)";
            ctx.beginPath();
            ctx.moveTo(x, y - starR);
            for (let i = 1; i < 5; i++) {
                const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
                const p = (i % 2 === 0) ? starR : starR * 0.45;
                ctx.lineTo(x + Math.cos(a) * p, y + Math.sin(a) * p);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(10,14,26,0.9)";
            ctx.font = `bold ${Math.max(6, Math.floor(radius * 0.88))}px 'Segoe UI', Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(glyph, x, y + 0.5);
            return;
        }

        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, radius - 2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", x, y + 3);
        return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    const size = radius * 2;
    ctx.drawImage(img, x - radius, y - radius, size, size);
    ctx.restore();
}

function getNextPrestigeSkinPreview(skins, prestigeCount) {
    if (!Array.isArray(skins) || skins.length === 0) return null;
    const currentPrestige = Math.max(0, Math.floor(prestigeCount || 0));
    const next = skins
        .filter((s) => s && s.prestigeSkin && !s.unlocked && Number.isFinite(s.prestigeRequirement) && s.prestigeRequirement > currentPrestige)
        .sort((a, b) => a.prestigeRequirement - b.prestigeRequirement)[0] || null;
    if (!next) return null;
    return {
        name: next.name,
        requirement: next.prestigeRequirement,
    };
}

// ── Spatial grid for broadphase collision ──
const GRID_CELL = 128;                       // cell size in world-pixels
const GRID_COLS = Math.ceil(WORLD_W / GRID_CELL);
const GRID_ROWS = Math.ceil(WORLD_H / GRID_CELL);
const COLLISION_QUERY_BUFFER = 30;           // extra radius added to grid queries for broadphase margin
const _grid = new Array(GRID_COLS * GRID_ROWS);
for (let i = 0; i < _grid.length; i++) _grid[i] = [];

function gridClear() {
    for (let i = 0; i < _grid.length; i++) _grid[i].length = 0;
}
function gridInsert(entity) {
    const c = Math.floor(entity.x / GRID_CELL);
    const r = Math.floor(entity.y / GRID_CELL);
    if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
        _grid[r * GRID_COLS + c].push(entity);
    }
}
function gridQuery(x, y, radius) {
    const results = [];
    const c0 = Math.max(0, Math.floor((x - radius) / GRID_CELL));
    const c1 = Math.min(GRID_COLS - 1, Math.floor((x + radius) / GRID_CELL));
    const r0 = Math.max(0, Math.floor((y - radius) / GRID_CELL));
    const r1 = Math.min(GRID_ROWS - 1, Math.floor((y + radius) / GRID_CELL));
    for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
            const cell = _grid[r * GRID_COLS + c];
            for (let i = 0; i < cell.length; i++) results.push(cell[i]);
        }
    }
    return results;
}

// ─────────────────────────────────────────────
// §3b  RETRO AUDIO ENGINE  (Web Audio API)
// ─────────────────────────────────────────────

const GameAudio = (() => {
    let actx = null;        // AudioContext (lazy-init on first user gesture)
    let musicGain = null;   // master gain node for music
    let sfxGain = null;     // master gain node for SFX
    let musicPlaying = false;
    let musicTimeout = null;

    function ensureContext() {
        if (!actx) {
            actx = new (window.AudioContext || window.webkitAudioContext)();
            musicGain = actx.createGain();
            musicGain.gain.value = 0.3;
            musicGain.connect(actx.destination);
            sfxGain = actx.createGain();
            sfxGain.gain.value = 0.4;
            sfxGain.connect(actx.destination);
        }
        if (actx.state === "suspended") actx.resume();
        return actx;
    }

    // ── Tiny helper: play a note on an oscillator ──
    function playTone(freq, type, duration, gain, dest, startTime) {
        const ctx = ensureContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gain, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(g);
        g.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    }

    // ── Noise helper for retro percussion ──
    function playNoise(duration, gain, dest, startTime) {
        const ctx = ensureContext();
        const bufSize = ctx.sampleRate * duration;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        src.connect(g);
        g.connect(dest);
        src.start(startTime);
        src.stop(startTime + duration + 0.01);
    }

    // ── SFX ──

    function sfxShoot() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    function sfxHit() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playNoise(0.06, 0.2, sfxGain, t);
        playTone(200, "square", 0.08, 0.15, sfxGain, t);
    }

    function sfxEnemyDeath() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playTone(400, "square", 0.06, 0.15, sfxGain, t);
        playTone(300, "square", 0.06, 0.12, sfxGain, t + 0.06);
        playTone(150, "sawtooth", 0.1, 0.1, sfxGain, t + 0.12);
    }

    function sfxPlayerHit() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playTone(150, "sawtooth", 0.15, 0.2, sfxGain, t);
        playNoise(0.1, 0.25, sfxGain, t);
    }

    function sfxXPPickup() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playTone(600, "sine", 0.05, 0.1, sfxGain, t);
        playTone(900, "sine", 0.05, 0.1, sfxGain, t + 0.05);
    }

    function sfxLevelUp() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((f, i) => {
            playTone(f, "square", 0.12, 0.15, sfxGain, t + i * 0.09);
        });
    }

    function sfxWaveStart() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playTone(220, "sawtooth", 0.15, 0.12, sfxGain, t);
        playTone(330, "sawtooth", 0.15, 0.12, sfxGain, t + 0.12);
        playTone(440, "sawtooth", 0.2, 0.15, sfxGain, t + 0.24);
    }

    function sfxGameOver() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        const notes = [440, 370, 311, 220];
        notes.forEach((f, i) => {
            playTone(f, "sawtooth", 0.25, 0.18, sfxGain, t + i * 0.2);
        });
    }

    function sfxUpgradeSelect() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playTone(440, "square", 0.06, 0.12, sfxGain, t);
        playTone(660, "square", 0.08, 0.12, sfxGain, t + 0.06);
    }

    function sfxCrit() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playTone(880, "triangle", 0.06, 0.13, sfxGain, t);
        playTone(1320, "square", 0.08, 0.12, sfxGain, t + 0.04);
    }

    function sfxExecute() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playNoise(0.05, 0.18, sfxGain, t);
        playTone(220, "sawtooth", 0.08, 0.16, sfxGain, t);
        playTone(140, "triangle", 0.1, 0.1, sfxGain, t + 0.03);
    }

    function sfxComboMilestone(comboCount) {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        const isBig = comboCount >= 25;
        const base = isBig ? 784 : 659;
        playTone(base, "square", 0.09, 0.14, sfxGain, t);
        playTone(base * 1.25, "square", 0.1, 0.13, sfxGain, t + 0.06);
        if (isBig) playTone(base * 1.6, "triangle", 0.12, 0.11, sfxGain, t + 0.12);
    }

    function sfxWaveClear() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playTone(392, "triangle", 0.09, 0.12, sfxGain, t);
        playTone(523, "triangle", 0.11, 0.13, sfxGain, t + 0.08);
        playTone(659, "square", 0.14, 0.14, sfxGain, t + 0.16);
    }

    function sfxBossDefeat(type) {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        const isFinal = type === "endboss";
        playNoise(isFinal ? 0.16 : 0.1, isFinal ? 0.24 : 0.18, sfxGain, t);
        playTone(isFinal ? 220 : 330, "sawtooth", isFinal ? 0.2 : 0.14, 0.16, sfxGain, t);
        playTone(isFinal ? 330 : 494, "square", isFinal ? 0.2 : 0.13, 0.14, sfxGain, t + 0.1);
        if (isFinal) {
            playTone(659, "triangle", 0.22, 0.13, sfxGain, t + 0.22);
        }
    }

    function sfxExplosion() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        playNoise(0.3, 0.3, sfxGain, t);
        playTone(80, "sawtooth", 0.3, 0.2, sfxGain, t);
    }

    function sfxNewHighScore() {
        if (!Settings.soundEnabled) return;
        const ctx = ensureContext();
        const t = ctx.currentTime;
        const notes = [523, 659, 784, 1047, 1319]; // C5-E6
        notes.forEach((f, i) => {
            playTone(f, "square", 0.14, 0.15, sfxGain, t + i * 0.1);
            playTone(f * 1.5, "sine", 0.14, 0.06, sfxGain, t + i * 0.1);
        });
    }

    // ── Chiptune music loop ──
    // Three distinct biome soundtracks with unique vibes (tempo lives per track below)

    // ── Biome 0: Neon District (upbeat, driving synthwave) ──
    const neonMelody = [
        [262, 330, 392, 330,  262, 330, 392, 523],
        [440, 392, 330, 262,  330, 392, 440, 392],
        [349, 440, 523, 440,  349, 330, 262, 330],
        [392, 330, 262, 220,  262, 330, 392, 330],
        [262, 330, 392, 523,  440, 392, 330, 392],
        [440, 523, 440, 392,  330, 262, 330, 392],
        [349, 330, 262, 330,  349, 440, 523, 440],
        [392, 330, 262, 220,  196, 220, 262,   0],
    ];
    const neonBass = [
        [131, 0, 131, 0,  165, 0, 165, 0],
        [220, 0, 220, 0,  196, 0, 196, 0],
        [175, 0, 175, 0,  165, 0, 165, 0],
        [196, 0, 196, 0,  131, 0, 131, 0],
        [131, 0, 131, 0,  220, 0, 220, 0],
        [220, 0, 220, 0,  196, 0, 196, 0],
        [175, 0, 175, 0,  220, 0, 220, 0],
        [196, 0, 196, 0,  131, 0, 131, 0],
    ];

    // ── Biome 1: Acid Grid (tense, minor key, faster pulse) ──
    const acidMelody = [
        [330, 311, 262, 311,  330, 392, 370, 330],
        [294, 330, 370, 330,  294, 262, 247, 262],
        [220, 262, 294, 330,  370, 330, 294, 262],
        [247, 294, 330, 294,  247, 220, 196, 220],
        [330, 370, 392, 440,  392, 370, 330, 370],
        [294, 330, 370, 440,  494, 440, 370, 330],
        [262, 294, 330, 370,  392, 370, 330, 294],
        [247, 262, 294, 262,  247, 220, 196,   0],
    ];
    const acidBass = [
        [110, 0, 110, 110,  0, 110, 0, 110],
        [147, 0, 147, 0,    147, 0, 131, 0],
        [110, 0, 110, 0,    131, 0, 131, 0],
        [123, 0, 123, 123,  0, 110, 0, 110],
        [165, 0, 165, 0,    147, 0, 147, 0],
        [147, 0, 147, 147,  0, 131, 0, 131],
        [131, 0, 131, 0,    147, 0, 147, 0],
        [123, 0, 123, 0,    110, 0, 110, 0],
    ];

    // ── Biome 2: Crimson Core (heavy, aggressive, ominous) ──
    const crimsonMelody = [
        [196, 233, 262, 233,  196, 175, 165, 175],
        [196, 0,   196, 233,  262, 294, 262, 233],
        [175, 196, 233, 262,  294, 349, 294, 262],
        [233, 196, 175, 165,  147, 165, 175, 196],
        [262, 294, 349, 392,  349, 294, 262, 233],
        [196, 233, 262, 294,  349, 294, 262, 233],
        [175, 196, 233, 262,  233, 196, 175, 165],
        [147, 165, 175, 196,  175, 165, 147,   0],
    ];
    const crimsonBass = [
        [98,  0,  98, 98,   0,  98,  0,  98],
        [82,  0,  82,  0,   98,  0,  98,  0],
        [87,  0,  87,  0,   98,  0,  98,  0],
        [82,  0,  82,  82,  0,  82,  0,  82],
        [131, 0, 131,  0,  117, 0, 117,  0],
        [98,  0,  98,  98,  0,  87,  0,  87],
        [87,  0,  87,  0,   82,  0,  82,  0],
        [73,  0,  73,  73,  0,  73,  0,  73],
    ];

    // ── Endboss music (intense, dramatic) ──
    const bossMelody = [
        [392, 440, 494, 523,  494, 440, 392, 370],
        [330, 370, 392, 440,  494, 523, 587, 523],
        [494, 440, 392, 370,  330, 370, 392, 440],
        [494, 523, 587, 659,  587, 523, 494, 440],
        [392, 370, 330, 294,  330, 370, 392, 440],
        [494, 523, 587, 659,  698, 659, 587, 523],
        [494, 440, 392, 370,  330, 294, 262, 294],
        [330, 370, 392, 440,  392, 370, 330,   0],
    ];
    const bossBass = [
        [98,  0,  98,  98,  0,  98,  0,  98],
        [110, 0, 110,  0, 110,  0, 131,  0],
        [98,  0,  98,  0,  82,  0,  82,  0],
        [131, 0, 131, 131, 0, 110,  0, 110],
        [98,  0,  98,  0,  82,  0,  82,  0],
        [131, 0, 131,  0, 147,  0, 147,  0],
        [110, 0, 110, 110, 0,  98,  0,  98],
        [82,  0,  82,  0,  98,  0,  98,  0],
    ];

    // Music track configurations per biome
    const BIOME_MUSIC = [
        { melody: neonMelody,    bass: neonBass,    melType: "square",   bassType: "triangle", bpm: 140, melVol: 0.08, bassVol: 0.10, kickVol: 0.12, hatVol: 0.04 },
        { melody: acidMelody,    bass: acidBass,    melType: "sawtooth", bassType: "triangle", bpm: 152, melVol: 0.07, bassVol: 0.12, kickVol: 0.15, hatVol: 0.06 },
        { melody: crimsonMelody, bass: crimsonBass,  melType: "sawtooth", bassType: "square",   bpm: 130, melVol: 0.09, bassVol: 0.14, kickVol: 0.18, hatVol: 0.05 },
    ];
    const BOSS_MUSIC = { melody: bossMelody, bass: bossBass, melType: "sawtooth", bassType: "square", bpm: 160, melVol: 0.10, bassVol: 0.15, kickVol: 0.20, hatVol: 0.07 };

    let currentMusicBiome = -1; // track which biome music is playing
    let bossMusic = false;

    function scheduleMusic() {
        if (!Settings.musicEnabled || !musicPlaying) return;
        const ctx = ensureContext();
        const now = ctx.currentTime;

        const track = bossMusic ? BOSS_MUSIC : (BIOME_MUSIC[currentMusicBiome] || BIOME_MUSIC[0]);
        const bpm = track.bpm;
        const beatLen = (60 / bpm) * 0.5; // eighth notes
        const barLen = beatLen * 8;
        const totalLen = barLen * track.melody.length;

        for (let bar = 0; bar < track.melody.length; bar++) {
            for (let note = 0; note < 8; note++) {
                const t = now + bar * barLen + note * beatLen;
                // Melody
                const mFreq = track.melody[bar][note];
                if (mFreq > 0) {
                    playTone(mFreq, track.melType, beatLen * 0.8, track.melVol, musicGain, t);
                }
                // Bass
                const bFreq = track.bass[bar][note];
                if (bFreq > 0) {
                    playTone(bFreq, track.bassType, beatLen * 0.9, track.bassVol, musicGain, t);
                }
            }
            // Kick drum on beats 1 and 5
            for (const beat of [0, 4]) {
                const t = now + bar * barLen + beat * beatLen;
                playTone(60, "sine", 0.08, track.kickVol, musicGain, t);
            }
            // Hi-hat pattern
            for (let beat = 0; beat < 8; beat += 2) {
                const t = now + bar * barLen + beat * beatLen + beatLen * 0.5;
                playNoise(0.03, track.hatVol, musicGain, t);
            }
            // Extra percussion for Crimson Core and boss
            if (currentMusicBiome === 2 || bossMusic) {
                // Snare-like hit on beats 2 and 6
                for (const beat of [2, 6]) {
                    const t = now + bar * barLen + beat * beatLen;
                    playNoise(0.06, 0.08, musicGain, t);
                    playTone(180, "triangle", 0.04, 0.06, musicGain, t);
                }
            }
        }

        // Schedule next loop
        musicTimeout = setTimeout(() => scheduleMusic(), totalLen * 1000 - 100);
    }

    function startMusic(biomeIndex) {
        const targetBiome = biomeIndex !== undefined ? biomeIndex : 0;
        if (musicPlaying && currentMusicBiome === targetBiome && !bossMusic) return;
        // Stop previous music if switching
        if (musicPlaying) stopMusic();
        ensureContext();
        currentMusicBiome = targetBiome;
        bossMusic = false;
        musicPlaying = true;
        // Restore music gain (may have been zeroed by stopMusic)
        if (musicGain && Settings.musicEnabled) {
            musicGain.gain.cancelScheduledValues(0);
            musicGain.gain.setValueAtTime(0.3, actx.currentTime);
        }
        scheduleMusic();
    }

    function startBossMusic() {
        if (musicPlaying && bossMusic) return;
        if (musicPlaying) stopMusic();
        ensureContext();
        bossMusic = true;
        musicPlaying = true;
        if (musicGain && Settings.musicEnabled) {
            musicGain.gain.cancelScheduledValues(0);
            musicGain.gain.setValueAtTime(0.35, actx.currentTime);
        }
        scheduleMusic();
    }

    function stopMusic() {
        musicPlaying = false;
        if (musicTimeout) {
            clearTimeout(musicTimeout);
            musicTimeout = null;
        }
        // Immediately silence any already-scheduled oscillators
        if (musicGain) {
            musicGain.gain.cancelScheduledValues(0);
            musicGain.gain.setValueAtTime(0, actx ? actx.currentTime : 0);
        }
    }

    function setMusicEnabled(enabled) {
        if (enabled && musicPlaying) {
            musicGain && (musicGain.gain.value = 0.3);
        } else if (!enabled) {
            musicGain && (musicGain.gain.value = 0);
        }
    }

    function setSfxEnabled(enabled) {
        if (sfxGain) sfxGain.gain.value = enabled ? 0.4 : 0;
    }

    return {
        ensureContext,
        sfxShoot,
        sfxHit,
        sfxEnemyDeath,
        sfxPlayerHit,
        sfxXPPickup,
        sfxLevelUp,
        sfxWaveStart,
        sfxWaveClear,
        sfxGameOver,
        sfxUpgradeSelect,
        sfxCrit,
        sfxExecute,
        sfxComboMilestone,
        sfxBossDefeat,
        sfxExplosion,
        sfxNewHighScore,
        startMusic,
        startBossMusic,
        stopMusic,
        setMusicEnabled,
        setSfxEnabled,
    };
})();

// ─────────────────────────────────────────────
// §3c  HIGH SCORE SYSTEM  (localStorage)
// ─────────────────────────────────────────────

const HighScores = (() => {
    const STORAGE_PREFIX = "roguewave_highscores";
    const MAX_ENTRIES = 5;

    function storageKey(mode, challengeMode) {
        // mode: "easy", "normal", or "hard"
        const m = (mode != null && mode !== "") ? mode : (Settings.gameMode || "normal");
        const challenge = getChallengeMode(challengeMode != null ? challengeMode : Settings.challengeMode);
        return challenge.id !== "none"
            ? `${STORAGE_PREFIX}_${m}__${challenge.id}`
            : `${STORAGE_PREFIX}_${m}`;
    }

    function load(mode, challengeMode) {
        try {
            const raw = localStorage.getItem(storageKey(mode, challengeMode));
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return [];
    }

    function save(scores, mode, challengeMode) {
        try {
            localStorage.setItem(storageKey(mode, challengeMode), JSON.stringify(scores));
        } catch (e) { /* ignore */ }
    }

    /** Submit a score. Returns the rank (1-based) if it's a top score, or 0 if not. */
    let lastSubmittedId = null;

    function submit(wave, kills, timePlayed, won, context = {}) {
        const contextGameMode = context.gameMode || Settings.gameMode;
        const contextChallenge = getChallengeMode(context.challengeMode || Settings.challengeMode);
        const scores = load(contextGameMode, contextChallenge.id);
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const entry = {
            id,
            wave,
            kills,
            time: timePlayed,
            won: !!won,
            gameMode: contextGameMode,
            challengeMode: contextChallenge.id,
            challengeLabel: contextChallenge.label,
            eventId: context.eventId || "",
            eventLabel: context.eventLabel || "",
        };
        lastSubmittedId = id;

        scores.push(entry);
        // Winning runs first (sorted by time asc = fastest wins).
        // Non-winning runs sorted by wave desc, kills desc, time desc.
        scores.sort((a, b) => {
            // Legacy entries (before `won` field) are also treated as wins if wave === WAVE_MAX.
            const aWon = isWinningRun(a);
            const bWon = isWinningRun(b);
            if (aWon !== bWon) return bWon ? 1 : -1;
            if (aWon && bWon) return a.time - b.time;
            return b.wave - a.wave || b.kills - a.kills || b.time - a.time;
        });
        // Keep only top N
        while (scores.length > MAX_ENTRIES) scores.pop();
        save(scores, contextGameMode, contextChallenge.id);

        // Determine rank (0 if not in top list)
        const rank = scores.findIndex(s => s.id === id);
        return rank >= 0 ? rank + 1 : 0;
    }

    function getLastSubmittedId() { return lastSubmittedId; }

    /** Returns true for a winning run (completed all waves). Also handles legacy entries. */
    function isWinningRun(s) { return s.won || s.wave >= WAVE_MAX; }

    function getAll(mode, challengeMode) {
        return load(mode, challengeMode);
    }

    function getBest(mode, challengeMode) {
        const scores = load(mode, challengeMode);
        return scores.length > 0 ? scores[0] : null;
    }

    return { submit, getAll, getBest, getLastSubmittedId, isWinningRun };
})();

// ─────────────────────────────────────────────
// §3d  PERSISTENT PROGRESSION (meta, skins, daily)
// ─────────────────────────────────────────────

const Progression = (() => {
    const STORAGE_KEY = "roguewave_profile_v3";
    const META_MAX = 8;
    let SKIN_CATALOG = [...SKIN_SHOP_CONFIG.skins];
    let FEATURED_SKIN_IDS = [...SKIN_SHOP_CONFIG.featuredIds];
    let SKINS = Object.fromEntries(SKIN_CATALOG.map(s => [s.id, s]));

    let data = {
        shards: 0,
        meta: { hp: 0, dmg: 0, xp: 0, speed: 0 },
        gameSpeedIndex: 0,
        prestige: { count: 0 },
        skins: { unlocked: ["default"], selected: "default" },
        daily: {
            key: "",
            missionId: "",
            target: 0,
            progress: 0,
            completed: false,
            rewardClaimed: false,
            streak: 0,
            lastCompletedKey: "",
        },
        // ── Loot ──
        // items: everything you own (safe unless equipped).
        // equipped: slot -> item id. These are the ones at risk when you die.
        // nextItemId: monotonic id source so items stay addressable.
        loot: {
            items: [],
            equipped: {},
            nextItemId: 1,
            openedChests: 0,
        },
    };

    const dailyMissionPool = [
        { id: "kill_120", label: "Eliminate 120 enemies", type: "kills", target: 120 },
        { id: "wave_8",   label: "Reach Wave 8",          type: "wave",  target: 8 },
        { id: "survive_8",label: "Survive 8 minutes",      type: "time",  target: 8 * 60 },
    ];

    function cloneData() {
        return JSON.parse(JSON.stringify(data));
    }

    function currentMission() {
        return dailyMissionPool.find(m => m.id === data.daily.missionId) || dailyMissionPool[0];
    }

    function ensureDaily() {
        const today = dateKeyLocal();
        if (data.daily.key === today && data.daily.missionId) return;

        const seed = hashString(today);
        const mission = dailyMissionPool[seed % dailyMissionPool.length];

        data.daily.key = today;
        data.daily.missionId = mission.id;
        data.daily.target = mission.target;
        data.daily.progress = 0;
        data.daily.completed = false;
        data.daily.rewardClaimed = false;
    }

    function applyPrestigeSkinUnlocks() {
        if (!PRESTIGE_ENABLED || RESOLVED_PRESTIGE_SKIN_THRESHOLDS.length === 0) return;
        
        const currentPrestige = Math.max(0, Math.floor(data.prestige?.count || 0));
        for (const threshold of RESOLVED_PRESTIGE_SKIN_THRESHOLDS) {
            if (currentPrestige >= threshold.prestigeLevel && SKINS[threshold.skinId]) {
                if (!data.skins.unlocked.includes(threshold.skinId)) {
                    data.skins.unlocked.push(threshold.skinId);
                }
            }
        }
    }

    function getUnlockedSkinsForPrestige(prestigeLevel) {
        if (!PRESTIGE_ENABLED || RESOLVED_PRESTIGE_SKIN_THRESHOLDS.length === 0) return [];
        const prestigeLevel_ = Math.max(0, Math.floor(prestigeLevel || 0));
        const unlockedIds = [];
        for (const threshold of RESOLVED_PRESTIGE_SKIN_THRESHOLDS) {
            if (prestigeLevel_ >= threshold.prestigeLevel && SKINS[threshold.skinId]) {
                unlockedIds.push(threshold.skinId);
            }
        }
        return unlockedIds;
    }

    function getPrestigeSkinRequirement(id) {
        if (!PRESTIGE_ENABLED || RESOLVED_PRESTIGE_SKIN_THRESHOLDS.length === 0) return 0;
        const threshold = RESOLVED_PRESTIGE_SKIN_THRESHOLDS.find((entry) => entry.skinId === id);
        return threshold ? Math.max(0, Math.floor(threshold.prestigeLevel || 0)) : 0;
    }

    function normalize(loaded) {
        SKIN_CATALOG = [...SKIN_SHOP_CONFIG.skins];
        FEATURED_SKIN_IDS = [...SKIN_SHOP_CONFIG.featuredIds];
        SKINS = Object.fromEntries(SKIN_CATALOG.map(s => [s.id, s]));

        const base = cloneData();
        if (!loaded || typeof loaded !== "object") return base;
        base.shards = Number.isFinite(loaded.shards) ? Math.max(0, Math.floor(loaded.shards)) : 0;

        const lm = loaded.meta || {};
        base.meta.hp = clamp(Math.floor(lm.hp || 0), 0, META_MAX);
        base.meta.dmg = clamp(Math.floor(lm.dmg || 0), 0, META_MAX);
        base.meta.xp = clamp(Math.floor(lm.xp || 0), 0, META_MAX);
        base.meta.speed = clamp(Math.floor(lm.speed || 0), 0, GAME_SPEED_UNLOCK_MAX);
        const maxSpeedIdx = Math.min(GAME_SPEED_OPTIONS.length - 1, base.meta.speed);
        base.gameSpeedIndex = Number.isFinite(loaded.gameSpeedIndex)
            ? clamp(Math.floor(loaded.gameSpeedIndex), 0, maxSpeedIdx)
            : 0;

        const lp = loaded.prestige || {};
        base.prestige.count = Number.isFinite(lp.count) ? Math.max(0, Math.floor(lp.count)) : 0;

        const ls = loaded.skins || {};
        const unlocked = Array.isArray(ls.unlocked) ? ls.unlocked.filter(id => !!SKINS[id]) : ["default"];
        const prestigeUnlocked = getUnlockedSkinsForPrestige(base.prestige.count);
        const prestigeUnlockedSet = new Set(prestigeUnlocked);
        for (let i = unlocked.length - 1; i >= 0; i--) {
            const skinId = unlocked[i];
            const prestigeRequirement = getPrestigeSkinRequirement(skinId);
            if (prestigeRequirement > 0 && !prestigeUnlockedSet.has(skinId)) {
                unlocked.splice(i, 1);
            }
        }
        for (const skinId of prestigeUnlocked) {
            if (!unlocked.includes(skinId)) unlocked.push(skinId);
        }
        if (!unlocked.includes("default")) unlocked.push("default");
        base.skins.unlocked = unlocked;
        base.skins.selected = unlocked.includes(ls.selected) ? ls.selected : "default";

        const ld = loaded.daily || {};
        base.daily.key = typeof ld.key === "string" ? ld.key : "";
        base.daily.missionId = typeof ld.missionId === "string" ? ld.missionId : "";
        base.daily.target = Number.isFinite(ld.target) ? Math.max(1, Math.floor(ld.target)) : 0;
        base.daily.progress = Number.isFinite(ld.progress) ? Math.max(0, Math.floor(ld.progress)) : 0;
        base.daily.completed = !!ld.completed;
        base.daily.rewardClaimed = !!ld.rewardClaimed;
        base.daily.streak = Number.isFinite(ld.streak) ? Math.max(0, Math.floor(ld.streak)) : 0;
        base.daily.lastCompletedKey = typeof ld.lastCompletedKey === "string" ? ld.lastCompletedKey : "";

        // ── Loot migration ──
        // Older profiles have no loot block; normalise defensively and drop any
        // item whose shape we no longer recognise (e.g. removed affixes).
        const ll = (loaded && loaded.loot) || {};
        const rawItems = Array.isArray(ll.items) ? ll.items : [];
        const cleanItems = [];
        const seenIds = new Set();
        let maxId = 0;
        for (const it of rawItems) {
            const norm = normalizeItem(it);
            if (!norm) continue;
            if (seenIds.has(norm.id)) continue;      // duplicate id, skip
            seenIds.add(norm.id);
            maxId = Math.max(maxId, norm.id);
            cleanItems.push(norm);
        }
        base.loot.items = cleanItems;
        base.loot.nextItemId = Number.isFinite(ll.nextItemId)
            ? Math.max(Math.floor(ll.nextItemId), maxId + 1)
            : maxId + 1;

        // Equipped map: keep only entries pointing at an existing item and a
        // valid slot.
        const equipped = {};
        const rawEquipped = (ll && ll.equipped) || {};
        for (const slot of LOOT_SLOTS) {
            const id = rawEquipped[slot];
            if (Number.isFinite(id) && seenIds.has(id)) {
                const item = cleanItems.find((i) => i.id === id);
                if (item && item.slot === slot) equipped[slot] = id;
            }
        }
        base.loot.equipped = equipped;
        base.loot.openedChests = Number.isFinite(ll.openedChests) ? Math.max(0, Math.floor(ll.openedChests)) : 0;

        return base;
    }

    async function init() {
        const raw = await CrazyGamesSDK.loadData(STORAGE_KEY);
        let loaded = null;
        if (raw) {
            try { loaded = JSON.parse(raw); } catch (e) { loaded = null; }
        }
        // normalize() also re-syncs the skin catalog from SKIN_SHOP_CONFIG (which is
        // only fetched during boot), so it has to run for fresh profiles too –
        // otherwise the prestige skins stay invisible and can never be earned.
        data = normalize(loaded);
        ensureDaily();
        save();
    }

    function save() {
        void CrazyGamesSDK.saveData(STORAGE_KEY, JSON.stringify(data));
    }

    function get() {
        ensureDaily();
        return cloneData();
    }

    function getDailyView() {
        ensureDaily();
        const mission = currentMission();
        return {
            label: mission.label,
            progress: Math.min(data.daily.progress, data.daily.target),
            target: data.daily.target,
            completed: data.daily.completed,
            streak: data.daily.streak,
        };
    }

    function addShards(amount) {
        if (!Number.isFinite(amount) || amount <= 0) return;
        data.shards += Math.floor(amount);
        save();
    }

    function buyMeta(type) {
        if (!(type in data.meta)) return { ok: false, reason: "unknown" };
        const level = data.meta[type];
        if (type === "speed") {
            if (level >= GAME_SPEED_UNLOCK_MAX) return { ok: false, reason: "max" };
            const cost = GAME_SPEED_UNLOCK_COST + level * GAME_SPEED_UNLOCK_COST;
            if (data.shards < cost) return { ok: false, reason: "shards" };
            data.shards -= cost;
            data.meta.speed += 1;
            const maxSpeedIdx = Math.min(GAME_SPEED_OPTIONS.length - 1, data.meta.speed);
            if (!Number.isFinite(data.gameSpeedIndex)) data.gameSpeedIndex = 0;
            data.gameSpeedIndex = clamp(Math.floor(data.gameSpeedIndex), 0, maxSpeedIdx);
            save();
            return { ok: true };
        }
        if (level >= META_MAX) return { ok: false, reason: "max" };
        const cost = 25 + level * 25;
        if (data.shards < cost) return { ok: false, reason: "shards" };
        data.shards -= cost;
        data.meta[type]++;
        save();
        return { ok: true };
    }

    function skinInfo(id) {
        return SKINS[id] || SKINS.default;
    }

    function unlockOrSelectSkin(id) {
        const skin = SKINS[id];
        if (!skin) return { ok: false, reason: "unknown" };
        const prestigeRequirement = getPrestigeSkinRequirement(id);
        if (prestigeRequirement > 0 && getPrestigeCount() < prestigeRequirement) {
            return { ok: false, reason: "prestige", required: prestigeRequirement };
        }
        if (!data.skins.unlocked.includes(id)) {
            if (data.shards < skin.cost) return { ok: false, reason: "shards" };
            data.shards -= skin.cost;
            data.skins.unlocked.push(id);
        }
        data.skins.selected = id;
        save();
        return { ok: true };
    }

    function getSkinCatalog() {
        const unlocked = new Set(data.skins.unlocked);
        return SKIN_CATALOG.map((s) => {
            const prestigeRequirement = getPrestigeSkinRequirement(s.id);
            const prestigeUnlocked = prestigeRequirement > 0 && getPrestigeCount() >= prestigeRequirement;
            const unlockedByData = unlocked.has(s.id);
            const unlockedByPrestige = prestigeRequirement > 0 ? prestigeUnlocked : unlockedByData;
            return {
                ...s,
                unlocked: unlockedByPrestige,
                selected: data.skins.selected === s.id,
                prestigeRequirement,
                prestigeLocked: prestigeRequirement > 0 && !prestigeUnlocked,
                prestigeSkin: prestigeRequirement > 0,
            };
        });
    }

    function getFeaturedSkinCatalog() {
        const catalogById = Object.fromEntries(getSkinCatalog().map(s => [s.id, s]));
        return FEATURED_SKIN_IDS
            .filter(id => !!catalogById[id])
            .map(id => catalogById[id]);
    }

    function getSelectedSkin() {
        return skinInfo(data.skins.selected);
    }

    function applyMetaToPlayer(player) {
        player.maxHp += data.meta.hp * 10;
        player.hp = player.maxHp;
        player.damage += data.meta.dmg * 2;
        player.xpGainMult *= 1 + data.meta.xp * 0.10;
    }

    function registerRun(kills, wave, timePlayedSec) {
        ensureDaily();
        const mission = currentMission();
        if (!data.daily.completed) {
            if (mission.type === "kills") {
                data.daily.progress += Math.max(0, Math.floor(kills));
            } else if (mission.type === "wave") {
                data.daily.progress = Math.max(data.daily.progress, Math.floor(wave));
            } else {
                data.daily.progress += Math.max(0, Math.floor(timePlayedSec));
            }
            if (data.daily.progress >= data.daily.target) {
                data.daily.completed = true;
            }
        }

        let dailyReward = 0;
        if (data.daily.completed && !data.daily.rewardClaimed) {
            const today = data.daily.key;
            if (isYesterdayKey(data.daily.lastCompletedKey, today)) {
                data.daily.streak += 1;
            } else {
                data.daily.streak = 1;
            }
            data.daily.lastCompletedKey = today;
            data.daily.rewardClaimed = true;
            dailyReward = 30 + Math.min(20, data.daily.streak * 2);
            data.shards += dailyReward;
        }

        save();
        return { dailyReward };
    }

    function metaLevel(type) {
        return data.meta[type] || 0;
    }

    function metaCost(type) {
        if (type === "speed") {
            if (data.meta.speed >= GAME_SPEED_UNLOCK_MAX) return null;
            return GAME_SPEED_UNLOCK_COST + data.meta.speed * GAME_SPEED_UNLOCK_COST;
        }
        const lvl = metaLevel(type);
        return lvl >= META_MAX ? null : 25 + lvl * 25;
    }

    function isGameSpeedUnlocked() {
        return (data.meta.speed || 0) >= 1;
    }

    function getMaxGameSpeedIndex() {
        return clamp(Math.floor(data.meta.speed || 0), 0, GAME_SPEED_OPTIONS.length - 1);
    }

    function getGameSpeedIndex() {
        return clamp(Math.floor(data.gameSpeedIndex || 0), 0, getMaxGameSpeedIndex());
    }

    function getGameSpeedMultiplier() {
        if (!isGameSpeedUnlocked()) return 1;
        return GAME_SPEED_OPTIONS[getGameSpeedIndex()] || 1;
    }

    function setGameSpeedIndex(index) {
        if (!isGameSpeedUnlocked()) return { ok: false, reason: "locked" };
        data.gameSpeedIndex = clamp(Math.floor(index), 0, getMaxGameSpeedIndex());
        save();
        return { ok: true };
    }

    function getPrestigeCount() {
        return Math.max(0, Math.floor(data.prestige?.count || 0));
    }

    function applyPrestigeFromFinalBoss() {
        const gain = PRESTIGE_ENABLED ? PRESTIGE_GAIN_PER_CLEAR : 0;
        if (!data.prestige) data.prestige = { count: 0 };
        data.prestige.count = Math.max(0, Math.floor(data.prestige.count || 0)) + gain;

        if (PRESTIGE_RESET_SHARDS) data.shards = 0;
        if (PRESTIGE_RESET_META) {
            data.meta.hp = 0;
            data.meta.dmg = 0;
            data.meta.xp = 0;
            data.meta.speed = 0;
            data.gameSpeedIndex = 0;
        }

        // Unlock prestige skins based on new prestige level
        applyPrestigeSkinUnlocks();

        save();
        return { gain, total: data.prestige.count };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOOT / INVENTORY
    // ─────────────────────────────────────────────────────────────────────────

    /** Validate/repair a stored item. Returns null if it is unusable. */
    function normalizeItem(raw) {
        if (!raw || typeof raw !== "object") return null;
        const id = Number(raw.id);
        if (!Number.isFinite(id) || id <= 0) return null;
        const slot = String(raw.slot || "");

            const rarity = Object.prototype.hasOwnProperty.call(LOOT_RARITIES, raw.rarity) ? raw.rarity : "common";

            // Affixes: keep only known ones with a finite value.
            const affixes = [];
            if (Array.isArray(raw.affixes)) {
                for (const a of raw.affixes) {
                    if (!a || !Object.prototype.hasOwnProperty.call(LOOT_AFFIXES, a.stat)) continue;
                    const value = Number(a.value);
                    if (!Number.isFinite(value)) continue;
                    affixes.push({ stat: a.stat, value });
                }
            }

            // Enchantments: keep known ones.
            const enchants = [];
            if (Array.isArray(raw.enchants)) {
                for (const e of raw.enchants) {
                    if (typeof e === "string" && Object.prototype.hasOwnProperty.call(LOOT_ENCHANTS, e)) {
                        enchants.push(e);
                    }
                }
            }

            const set = (typeof raw.set === "string" && LOOT_SETS[raw.set]) ? raw.set : null;
            return {
                id,
                slot,
                rarity,
                name: typeof raw.name === "string" && raw.name ? raw.name : defaultItemName(slot, rarity),
                affixes,
                enchants,
                set,
                // Whether this item has been "saved" by the enchanter; purely for UI.
                locked: !!raw.locked,
            };
        }

        function defaultItemName(slot, rarity) {
            const slotLabel = (LOOT_CFG.slotLabels && LOOT_CFG.slotLabels[slot]) || slot;
            const rarityLabel = (LOOT_RARITIES[rarity] && LOOT_RARITIES[rarity].label) || rarity;
            return `${rarityLabel} ${slotLabel}`;
        }

        /** Weighted pick from a { key: weight } map. */
        function weightedPick(weights) {
            const keys = Object.keys(weights).filter((k) => weights[k] > 0);
            if (keys.length === 0) return null;
            let total = 0;
            for (const k of keys) total += weights[k];
            let roll = Math.random() * total;
            for (const k of keys) {
                roll -= weights[k];
                if (roll <= 0) return k;
            }
            return keys[keys.length - 1];
        }

        /**
         * Roll a single item. `opts.rarityWeights` overrides the default rarity
         * table, `opts.forceRarity` pins the rarity, `opts.forceSet` guarantees a
         * set piece.
         */
        function rollItem(opts = {}) {
            const slot = randPick(LOOT_SLOTS);

            let rarity = opts.forceRarity;
            if (!rarity) {
                const weights = {};
                const table = opts.rarityWeights || null;
                for (const r of RARITY_ORDER) {
                    weights[r] = table ? (table[r] || 0) : ((LOOT_RARITIES[r] && LOOT_RARITIES[r].weight) || 0);
                }
                rarity = weightedPick(weights) || "common";
            }

            const rarityDef = LOOT_RARITIES[rarity] || LOOT_RARITIES.common;
            const rank = RARITY_RANK[rarity] || 0;

            // Roll affixes: pick distinct stats, take the value for this rarity tier.
            const affixKeys = Object.keys(LOOT_AFFIXES);
            const count = Math.min(rarityDef.affixCount || 1, affixKeys.length);
            const chosenAffixes = [];
            const pool = affixKeys.slice();
            for (let i = 0; i < count; i++) {
                const idx = randInt(0, pool.length - 1);
                const key = pool.splice(idx, 1)[0];
                const def = LOOT_AFFIXES[key];
                const base = (def.perRarity && def.perRarity[rank]) || 0;
                if (base <= 0) continue;
                // Small variance so two items of the same rarity are not identical.
                const value = base * randRange(0.85, 1.15);
                const rounded = Math.abs(value) >= 1 ? Math.round(value * 10) / 10 : Math.round(value * 1000) / 1000;
                chosenAffixes.push({ stat: key, value: rounded });
            }

            // Set piece?
            let set = null;
            const wantSet = opts.forceSet || Math.random() < (LOOT_CFG.setChance || 0);
            if (wantSet) {
                const setKeys = Object.keys(LOOT_SETS);
                if (setKeys.length > 0) set = randPick(setKeys);
            }

            // Enchantments: rarity grants slots, drop chance decides if one is filled.
            const enchants = [];
            const slots = rarityDef.enchantSlots || 0;
            if (slots > 0 && Math.random() < (LOOT_CFG.dropEnchantChance || 0)) {
                const enchKeys = Object.keys(LOOT_ENCHANTS);
                enchants.push(randPick(enchKeys));
            }

            const item = normalizeItem({
                id: data.loot.nextItemId++,
                slot,
                rarity,
                name: itemNameFor(slot, rarity, set),
                affixes: chosenAffixes,
                enchants,
                set,
            });
            return item;
        }

        /** Flavour name so items are readable in the UI. */
        function itemNameFor(slot, rarity, set) {
            const slotLabel = (LOOT_CFG.slotLabels && LOOT_CFG.slotLabels[slot]) || slot;
            if (set && LOOT_SETS[set]) return `${LOOT_SETS[set].label} ${slotLabel}`;
            return defaultItemName(slot, rarity);
        }

        /** Add an item to the collection. Returns the stored item. */
        function addItem(item) {
            if (!item) return null;
            data.loot.items.push(item);
            save();
            return item;
        }

        /**
         * Open a chest by id. Spends shards and rolls the chest's item count.
         * Returns { ok, items, reason }.
         */
        function openChest(chestId, opts = {}) {
            const chest = LOOT_CHESTS.find((c) => c.id === chestId);
            if (!chest) return { ok: false, reason: "unknown" };

            const cost = chest.cost || 0;
            if (data.shards < cost) return { ok: false, reason: "shards", cost };
            data.shards -= cost;

            const items = [];
            const count = chest.itemCount || 1;
            for (let i = 0; i < count; i++) {
                const force = {};
                if (chest.rarityWeights) force.rarityWeights = chest.rarityWeights;
                const item = rollItem(force);
                if (item) items.push(item);
            }
            for (const it of items) data.loot.items.push(it);
            data.loot.openedChests = (data.loot.openedChests || 0) + 1;
            save();
            return { ok: true, items, chest };
        }

        /** All items, newest first. */
        function getItems() {
            return cloneData().loot.items.slice().sort((a, b) => b.id - a.id);
        }

        function getItemById(id) {
            return data.loot.items.find((i) => i.id === id) || null;
        }

        /** Equip an item, displacing whatever was in that slot (stays in inventory). */
        function equipItem(id) {
            const item = getItemById(id);
            if (!item) return { ok: false, reason: "missing" };
            data.loot.equipped[item.slot] = item.id;
            save();
            return { ok: true, item };
        }

        function unequipSlot(slot) {
            if (data.loot.equipped[slot] === undefined) return { ok: false, reason: "empty" };
            delete data.loot.equipped[slot];
            save();
            return { ok: true };
        }

        /** The currently equipped item for a slot, or null. */
        function getEquipped(slot) {
            const id = data.loot.equipped[slot];
            if (id === undefined) return null;
            return getItemById(id);
        }

        /** Map of slot -> item for everything currently equipped. */
        function getEquippedAll() {
            const out = {};
            for (const slot of LOOT_SLOTS) {
                const it = getEquipped(slot);
                if (it) out[slot] = it;
            }
            return out;
        }

        /** Does an item carry the Afterlife enchantment? */
        function hasAfterlife(item) {
            return !!(item && Array.isArray(item.enchants) && item.enchants.indexOf("afterlife") !== -1);
        }

        /**
         * Death penalty: destroy every EQUIPPED item, except those protected by
         * Afterlife. Unequipped inventory is untouched. Returns what was lost/kept.
         */
        function applyDeathPenalty() {
            const lost = [];
            const kept = [];
            const equipped = getEquippedAll();
            for (const slot of Object.keys(equipped)) {
                const item = equipped[slot];
                if (hasAfterlife(item)) {
                    kept.push(item);
                    continue;
                }
                lost.push(item);
            }
            if (lost.length > 0) {
                const lostIds = new Set(lost.map((i) => i.id));
                data.loot.items = data.loot.items.filter((i) => !lostIds.has(i.id));
                for (const slot of Object.keys(data.loot.equipped)) {
                    if (lostIds.has(data.loot.equipped[slot])) delete data.loot.equipped[slot];
                }
                save();
            }
            return { lost, kept };
        }

        /** Apply a chosen enchantment to an item for a shard cost. */
        function enchantItem(id, enchantKey) {
            const item = getItemById(id);
            if (!item) return { ok: false, reason: "missing" };
            if (!Object.prototype.hasOwnProperty.call(LOOT_ENCHANTS, enchantKey)) {
                return { ok: false, reason: "unknown" };
            }
            if (item.enchants.indexOf(enchantKey) !== -1) return { ok: false, reason: "duplicate" };

            const rarityDef = LOOT_RARITIES[item.rarity] || LOOT_RARITIES.common;
            const maxSlots = rarityDef.enchantSlots || 0;
            if (item.enchants.length >= maxSlots) return { ok: false, reason: "full", maxSlots };

            const cost = LOOT_CFG.enchantCost || 0;
            if (data.shards < cost) return { ok: false, reason: "shards", cost };
            data.shards -= cost;
            item.enchants.push(enchantKey);
            save();
            return { ok: true, item, cost };
        }

        /** How many pieces of each set are currently equipped, plus active bonuses. */
        function getSetStatus() {
            const equipped = getEquippedAll();
            const counts = {};
            for (const slot of Object.keys(equipped)) {
                const set = equipped[slot].set;
                if (set) counts[set] = (counts[set] || 0) + 1;
            }
            const result = {};
            for (const setId of Object.keys(LOOT_SETS)) {
                const def = LOOT_SETS[setId];
                const have = counts[setId] || 0;
                const active = (def.bonuses || []).filter((b) => have >= b.need);
                result[setId] = { def, have, active };
            }
            return result;
        }

        /**
         * Aggregate every equipped item's affixes, enchantments and set bonuses
         * into a single stat block. game.js applies this to the player on spawn.
         */
        function computeLootStats() {
            const stats = {
                damage: 0, maxHp: 0, armor: 0, hpRegen: 0,
                speedMult: 1, fireRateMult: 1, damageMult: 1, maxHpMult: 1,
                xpGainMult: 1, magnetMult: 1,
                critChance: 0, critMult: 0, piercing: 0, multiShot: 0,
                perKillHeal: 0, shardMult: 1,
            };
            const equipped = getEquippedAll();

            // Flat + multiplicative affixes.
            for (const slot of Object.keys(equipped)) {
                const item = equipped[slot];
                for (const a of item.affixes) {
                    switch (a.stat) {
                        case "damage":     stats.damage += a.value; break;
                        case "maxHp":      stats.maxHp += a.value; break;
                        case "armor":      stats.armor += a.value; break;
                        case "hpRegen":    stats.hpRegen += a.value; break;
                        case "critChance": stats.critChance += a.value; break;
                        case "critMult":   stats.critMult += a.value; break;
                        case "piercing":   stats.piercing += a.value; break;
                        case "multiShot":  stats.multiShot += a.value; break;
                        case "speedMult":  stats.speedMult += a.value; break;
                        case "fireRateMult": stats.fireRateMult -= a.value; break;   // lower = faster
                        case "xpGainMult": stats.xpGainMult += a.value; break;
                        case "magnet":     stats.magnetMult += a.value / 100; break;
                    }
                }
                // Enchantments.
                for (const key of item.enchants) {
                    const e = LOOT_ENCHANTS[key];
                    if (!e) continue;
                    if (e.perKillHeal) stats.perKillHeal += e.perKillHeal;
                    if (e.speedBonus) stats.speedMult += e.speedBonus;
                    if (e.shardMult) stats.shardMult *= e.shardMult;
                    if (e.damageMult) stats.damageMult *= e.damageMult;
                    if (e.armorBonus) stats.armor += e.armorBonus;
                }
            }

            // Set bonuses (only the highest satisfied tier per set applies its stat).
            const setStatus = getSetStatus();
            for (const setId of Object.keys(setStatus)) {
                const st = setStatus[setId];
                for (const b of st.active) {
                    switch (b.stat) {
                        case "damageMult":   stats.damageMult *= b.value; break;
                        case "maxHpMult":    stats.maxHpMult *= b.value; break;
                        case "fireRateMult": stats.fireRateMult *= b.value; break;
                        case "critChance":   stats.critChance += b.value; break;
                        case "xpGainMult":   stats.xpGainMult *= b.value; break;
                        case "magnetMult":   stats.magnetMult *= b.value; break;
                        case "multiShot":    stats.multiShot += b.value; break;
                    }
                    if (b.extra) {
                        if (b.extra.armor) stats.armor += b.extra.armor;
                        if (b.extra.hpRegen) stats.hpRegen += b.extra.hpRegen;
                    }
                }
            }
            return stats;
        }

        /** Give the player a small starting stash so the first chest is reachable. */
        function ensureStarterShards() {
            const want = (LOOT_CFG.startingShards || 0);
            if (want > 0 && data.shards === 0 && (data.loot.openedChests || 0) === 0 && data.loot.items.length === 0) {
                data.shards = want;
                save();
            }
        }

    return {
        init,
        get,
        getDailyView,
        addShards,
        buyMeta,
        metaLevel,
        metaCost,
        isGameSpeedUnlocked,
        getMaxGameSpeedIndex,
        getGameSpeedIndex,
        getGameSpeedMultiplier,
        setGameSpeedIndex,
        getPrestigeCount,
        applyPrestigeFromFinalBoss,
        getSkinCatalog,
        getFeaturedSkinCatalog,
        getSelectedSkin,
        unlockOrSelectSkin,
        applyMetaToPlayer,
        registerRun,
        // ── loot ──
        rollItem,
        addItem,
        openChest,
        getItems,
        getItemById,
        equipItem,
        unequipSlot,
        getEquipped,
        getEquippedAll,
        hasAfterlife,
        applyDeathPenalty,
        enchantItem,
        getSetStatus,
        computeLootStats,
        ensureStarterShards,
    };
})();

// ─────────────────────────────────────────────
// §3e  LAUNCH EXPERIMENTS (A/B variants)
// ─────────────────────────────────────────────

const Experiments = (() => {
    const STORAGE_KEY = "roguewave_experiments_v1";
    let variants = {
        earlyPacing: "control",   // control | softstart
        gameOverFlow: "reviveFirst", // reviveFirst | restartFirst
        rewardedCopy: "neutral",  // neutral | urgency
    };

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                variants.earlyPacing = (parsed.earlyPacing === "softstart") ? "softstart" : "control";
                variants.gameOverFlow = (parsed.gameOverFlow === "restartFirst") ? "restartFirst" : "reviveFirst";
                variants.rewardedCopy = (parsed.rewardedCopy === "urgency") ? "urgency" : "neutral";
                return;
            }
        } catch (e) { /* ignore */ }

        variants = {
            earlyPacing: pick(["control", "softstart"]),
            gameOverFlow: pick(["reviveFirst", "restartFirst"]),
            rewardedCopy: pick(["neutral", "urgency"]),
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(variants));
        } catch (e) { /* ignore */ }
    }

    function get(key) {
        return variants[key];
    }

    function all() {
        return { ...variants };
    }

    return { load, get, all };
})();

// ─────────────────────────────────────────────
// §4  INPUT MANAGER  (event.code based)
// ─────────────────────────────────────────────

const Input = {
    _pressed: new Set(),
    _justPressed: new Set(),

    init() {
        window.addEventListener("keydown", (e) => {
            if (!this._pressed.has(e.code)) this._justPressed.add(e.code);
            this._pressed.add(e.code);
        });
        window.addEventListener("keyup", (e) => {
            this._pressed.delete(e.code);
        });
    },

    /** Call at end of each frame to clear one-shot presses */
    flush() { this._justPressed.clear(); },

    held(code)  { return this._pressed.has(code); },
    just(code)  { return this._justPressed.has(code); },

    /** Movement vector normalised.  Uses event.code so layout-agnostic.
     *  On mobile, falls back to the virtual joystick. */
    moveVector() {
        let mx = 0, my = 0;
        if (this.held("KeyA") || this.held("ArrowLeft"))  mx -= 1;
        if (this.held("KeyD") || this.held("ArrowRight")) mx += 1;
        if (this.held("KeyW") || this.held("ArrowUp"))    my -= 1;
        if (this.held("KeyS") || this.held("ArrowDown"))  my += 1;
        const len = Math.sqrt(mx * mx + my * my);
        if (len > 0) { mx /= len; my /= len; }

        // Virtual joystick override (mobile)
        // Normalize to unit vector so mobile speed matches keyboard (PC) speed
        if (isMobile && TouchControls.moveActive) {
            mx = TouchControls.moveDx;
            my = TouchControls.moveDy;
            const jLen = Math.sqrt(mx * mx + my * my);
            if (jLen > 0) { mx /= jLen; my /= jLen; }
        }

        return { x: mx, y: my };
    },
};

// ─────────────────────────────────────────────
// §5  MOUSE / POINTER (for menus)
// ─────────────────────────────────────────────

const Mouse = {
    x: 0, y: 0,
    clicked: false,
    wheelDelta: 0,
    touchScrollDelta: 0,
    touchDragId: -1,
    touchLastY: 0,
    touchDragged: false,

    init() {
        canvas.addEventListener("mousemove", (e) => {
            const pos = toCanvasCoords(e.clientX, e.clientY);
            this.x = pos.x;
            this.y = pos.y;
        });
        canvas.addEventListener("mousedown", () => { this.clicked = true; });
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            this.wheelDelta += e.deltaY;
        }, { passive: false });

        // Touch support – map touches to mouse position & click
        canvas.addEventListener("touchstart", (e) => {
            if (isMobile && game.state === STATE.GAMEPLAY) return;
            e.preventDefault();
            // During gameplay on mobile, TouchControls handles all touches (move + aim joysticks).
            // Don't update Mouse position from gameplay touches to avoid absolute-position aiming.
            for (const t of e.changedTouches) {
                const pos = toCanvasCoords(t.clientX, t.clientY);
                const cx = pos.x;
                const cy = pos.y;
                if (isMobile && game.state === STATE.GAMEPLAY) continue;
                this.x = cx;
                this.y = cy;
                this.clicked = true;

                if (game.state === STATE.SHOP && this.touchDragId === -1) {
                    this.touchDragId = t.identifier;
                    this.touchLastY = cy;
                    this.touchDragged = false;
                }
            }
            // Fallback: if no valid touch was found (e.g. all on left side), still mark clicked for menus
            if (!this.clicked && game.state !== STATE.GAMEPLAY) {
                const t = e.changedTouches[0];
                const pos = toCanvasCoords(t.clientX, t.clientY);
                this.x = pos.x;
                this.y = pos.y;
                this.clicked = true;
            }
        }, { passive: false });
        canvas.addEventListener("touchmove", (e) => {
            if (isMobile && game.state === STATE.GAMEPLAY) return;
            e.preventDefault();
            for (const t of e.changedTouches) {
                const pos = toCanvasCoords(t.clientX, t.clientY);
                const cx = pos.x;
                const cy = pos.y;
                if (isMobile && game.state === STATE.GAMEPLAY) continue;
                this.x = cx;
                this.y = cy;

                if (game.state === STATE.SHOP && t.identifier === this.touchDragId) {
                    const dy = cy - this.touchLastY;
                    this.touchLastY = cy;
                    this.touchScrollDelta -= dy;
                    if (Math.abs(dy) > 2) {
                        this.touchDragged = true;
                        this.clicked = false;
                    }
                }
            }
        }, { passive: false });
        canvas.addEventListener("touchend", (e) => {
            if (isMobile && game.state === STATE.GAMEPLAY) return;
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === this.touchDragId) {
                    this.touchDragId = -1;
                    this.touchLastY = 0;
                    this.touchDragged = false;
                }
            }
        }, { passive: false });
        canvas.addEventListener("touchcancel", (e) => {
            if (isMobile && game.state === STATE.GAMEPLAY) return;
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === this.touchDragId) {
                    this.touchDragId = -1;
                    this.touchLastY = 0;
                    this.touchDragged = false;
                }
            }
        }, { passive: false });
    },

    flush() {
        this.clicked = false;
        this.wheelDelta = 0;
        this.touchScrollDelta = 0;
    },

    /** Check if mouse is inside a rect */
    inRect(rx, ry, rw, rh) {
        return this.x >= rx && this.x <= rx + rw && this.y >= ry && this.y <= ry + rh;
    },
};

// ─────────────────────────────────────────────
// §5b  MOBILE DETECTION & VIRTUAL JOYSTICK
// ─────────────────────────────────────────────

const isMobile = (() => {
    return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
})();

const TouchControls = {
    // Movement joystick (left side)
    moveActive: false,
    moveId: -1,           // touch identifier
    moveOriginX: 0,       // center of joystick in canvas coords
    moveOriginY: 0,
    moveDx: 0,            // normalised direction (-1..1)
    moveDy: 0,
    moveRaw: { x: 0, y: 0 },  // current stick pos in canvas coords

    // Aim joystick (right side – used in hard mode)
    aimActive: false,
    aimId: -1,
    aimOriginX: 0,
    aimOriginY: 0,
    aimDx: 0,
    aimDy: 0,
    aimRaw: { x: 0, y: 0 },

    // Joystick visual config
    baseRadius: 56,
    stickRadius: 24,
    maxDist: 50,          // max travel from center

    pauseTapped: false,

    getPauseButtonRect() {
        if (isPortraitMobile()) {
            return { x: CANVAS_W - 78, y: 8, w: 70, h: 46 };
        }
        return { x: CANVAS_W - 58, y: 8, w: 50, h: 44 };
    },

    init() {
        if (!isMobile) return;

        canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                const pos = this._toCanvas(t);
                const pauseBtn = this.getPauseButtonRect();

                // Check pause button tap during gameplay
                if (game.state === STATE.GAMEPLAY &&
                    pos.x >= pauseBtn.x && pos.x <= pauseBtn.x + pauseBtn.w &&
                    pos.y >= pauseBtn.y && pos.y <= pauseBtn.y + pauseBtn.h) {
                    this.pauseTapped = true;
                    continue;
                }

                // Only activate joystick during gameplay states
                if (game.state !== STATE.GAMEPLAY) continue;

                // Left half of screen → movement joystick
                if (!this.moveActive && pos.x < CANVAS_W / 2) {
                    this.moveActive = true;
                    this.moveId = t.identifier;
                    this.moveOriginX = pos.x;
                    this.moveOriginY = pos.y;
                    this.moveRaw = { x: pos.x, y: pos.y };
                    this.moveDx = 0;
                    this.moveDy = 0;
                }

                // Right half of screen → aim joystick (hard mode) or fire-direction
                if (!this.aimActive && pos.x >= CANVAS_W / 2) {
                    this.aimActive = true;
                    this.aimId = t.identifier;
                    this.aimOriginX = pos.x;
                    this.aimOriginY = pos.y;
                    this.aimRaw = { x: pos.x, y: pos.y };
                    this.aimDx = 0;
                    this.aimDy = 0;
                }
            }
        }, { passive: false });

        canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (this.moveActive && t.identifier === this.moveId) {
                    const pos = this._toCanvas(t);
                    let dx = pos.x - this.moveOriginX;
                    let dy = pos.y - this.moveOriginY;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d > this.maxDist) {
                        dx = dx / d * this.maxDist;
                        dy = dy / d * this.maxDist;
                    }
                    this.moveRaw = { x: this.moveOriginX + dx, y: this.moveOriginY + dy };
                    const norm = Math.min(d, this.maxDist) / this.maxDist;
                    if (d > 5) {  // dead zone
                        this.moveDx = (dx / d) * norm;
                        this.moveDy = (dy / d) * norm;
                    } else {
                        this.moveDx = 0;
                        this.moveDy = 0;
                    }
                }
                if (this.aimActive && t.identifier === this.aimId) {
                    const pos = this._toCanvas(t);
                    let dx = pos.x - this.aimOriginX;
                    let dy = pos.y - this.aimOriginY;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d > this.maxDist) {
                        dx = dx / d * this.maxDist;
                        dy = dy / d * this.maxDist;
                    }
                    this.aimRaw = { x: this.aimOriginX + dx, y: this.aimOriginY + dy };
                    if (d > 5) {  // dead zone
                        this.aimDx = dx / d;
                        this.aimDy = dy / d;
                    } else {
                        this.aimDx = 0;
                        this.aimDy = 0;
                    }
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (this.moveActive && t.identifier === this.moveId) {
                    this.moveActive = false;
                    this.moveId = -1;
                    this.moveDx = 0;
                    this.moveDy = 0;
                }
                if (this.aimActive && t.identifier === this.aimId) {
                    this.aimActive = false;
                    this.aimId = -1;
                    this.aimDx = 0;
                    this.aimDy = 0;
                }
            }
        };
        canvas.addEventListener("touchend", endTouch, { passive: false });
        canvas.addEventListener("touchcancel", endTouch, { passive: false });
    },

    /** Convert a Touch to canvas-logical coordinates */
    _toCanvas(touch) {
        return toCanvasCoords(touch.clientX, touch.clientY);
    },

    /** Draw the virtual joystick overlay (call from drawHUD) */
    draw() {
        if (!isMobile || game.state !== STATE.GAMEPLAY) return;
        const portrait = isPortraitMobile();

        // Movement joystick
        if (this.moveActive) {
            // Base circle
            ctx.beginPath();
            ctx.arc(this.moveOriginX, this.moveOriginY, this.baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Stick circle
            ctx.beginPath();
            ctx.arc(this.moveRaw.x, this.moveRaw.y, this.stickRadius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Hint: ghost joystick at bottom-left
            const hx = 90, hy = portrait ? CANVAS_H - 104 : CANVAS_H - 90;
            ctx.beginPath();
            ctx.arc(hx, hy, portrait ? 62 : this.baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.04)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.1)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("MOVE", hx, hy);
        }

        // Pause button
        this.drawPauseButton();

        // Aim joystick (right side) – always shown in hard mode
        if (Settings.gameMode !== "hard") return;
        if (this.aimActive) {
            // Base circle
            ctx.beginPath();
            ctx.arc(this.aimOriginX, this.aimOriginY, this.baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,120,80,0.10)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,120,80,0.25)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Stick circle
            ctx.beginPath();
            ctx.arc(this.aimRaw.x, this.aimRaw.y, this.stickRadius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,120,80,0.30)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,120,80,0.50)";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Hint: ghost aim joystick at bottom-right
            const hx = CANVAS_W - 90, hy = portrait ? CANVAS_H - 104 : CANVAS_H - 90;
            ctx.beginPath();
            ctx.arc(hx, hy, portrait ? 62 : this.baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,120,80,0.05)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,120,80,0.15)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = "rgba(255,120,80,0.20)";
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("AIM", hx, hy);
        }
    },

    drawPauseButton() {
        if (game.state !== STATE.GAMEPLAY) return;
        const btn = this.getPauseButtonRect();
        const x = btn.x, y = btn.y;
        const w = btn.w, h = btn.h;
        drawRoundRect(x, y, w, h, 6);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pause icon (two bars)
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        const barW = Math.max(5, Math.floor(w * 0.12));
        const barH = Math.max(16, Math.floor(h * 0.45));
        const cx = x + w / 2, cy = y + h / 2;
        ctx.fillRect(cx - barW - 2, cy - barH / 2, barW, barH);
        ctx.fillRect(cx + 2,         cy - barH / 2, barW, barH);
    },

    flush() {
        this.pauseTapped = false;
    },
};

// ─────────────────────────────────────────────
// §6  CAMERA
// ─────────────────────────────────────────────

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.shakeTimer = 0;
        this.shakeDuration = SHAKE_DURATION;
        this.shakeIntensity = SHAKE_INTENSITY;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }

    follow(entity) {
        this.targetX = entity.x - CANVAS_W / 2;
        this.targetY = entity.y - CANVAS_H / 2;
    }

    update(dt) {
        // Smooth lerp follow
        const t = 1 - Math.exp(-CAMERA_LERP_SPEED * dt);
        this.x = lerp(this.x, this.targetX, t);
        this.y = lerp(this.y, this.targetY, t);

        // Clamp to world bounds
        this.x = clamp(this.x, 0, WORLD_W - CANVAS_W);
        this.y = clamp(this.y, 0, WORLD_H - CANVAS_H);

        // Screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const safeDuration = Math.max(0.0001, this.shakeDuration);
            const intensity = this.shakeIntensity * (this.shakeTimer / safeDuration);
            this.shakeOffsetX = randRange(-intensity, intensity);
            this.shakeOffsetY = randRange(-intensity, intensity);
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
    }

    shake(intensity = SHAKE_INTENSITY, duration = SHAKE_DURATION) {
        if (!Settings.shakeEnabled) return;
        this.shakeIntensity = Math.max(1, Number(intensity) || SHAKE_INTENSITY);
        this.shakeDuration = Math.max(0.03, Number(duration) || SHAKE_DURATION);
        this.shakeTimer = this.shakeDuration;
    }

    /** Apply camera transform before drawing world objects */
    applyTransform() {
        ctx.save();
        ctx.translate(
            -Math.round(this.x + this.shakeOffsetX),
            -Math.round(this.y + this.shakeOffsetY)
        );
    }

    resetTransform() {
        ctx.restore();
    }

    /** Convert world coords to screen coords */
    worldToScreen(wx, wy) {
        return {
            x: wx - this.x - this.shakeOffsetX,
            y: wy - this.y - this.shakeOffsetY,
        };
    }
}

// ─────────────────────────────────────────────
// §7  ENTITY BASE CLASS
// ─────────────────────────────────────────────

class Entity {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.alive = true;
    }

    /** Circle–circle collision check */
    collidesWith(other) {
        return dist(this.x, this.y, other.x, other.y) < this.radius + other.radius;
    }
}

// ─────────────────────────────────────────────
// §8  PLAYER CLASS
// ─────────────────────────────────────────────

class Player extends Entity {
    constructor() {
        super(WORLD_W / 2, WORLD_H / 2, PLAYER_RADIUS);
        this.hp        = PLAYER_BASE_HP;
        this.maxHp     = PLAYER_BASE_HP;
        this.speed     = PLAYER_BASE_SPEED;
        this.damage    = PLAYER_BASE_DAMAGE;
        this.fireRate  = PLAYER_BASE_FIRE_RATE;
        this.fireTimer = 0;
        this.xp        = 0;
        this.level     = 1;
        this.xpToNext  = 50;
        this.angle     = 0;       // facing direction
        this.invTimer  = 0;       // invincibility frames after hit

        // New stats
        this.armor        = 0;    // flat damage reduction
        this.hpRegen      = 0;    // hp per second
        this.piercing     = 0;    // extra enemies a bullet can hit
        this.multiShot    = 0;    // extra bullets per shot
        this.critChance   = 0;    // 0-1
        this.critMult     = 2.0;
        this.bulletSize   = 1.0;  // multiplier on bullet radius
        this.range        = PLAYER_BASE_RANGE; // max targeting distance
        this.xpGainMult   = 1.0;              // multiplier on XP gained from kills
        this.executeThreshold = 0;            // instant-kill non-boss enemies below this HP ratio

        // Tracks how many times each stat upgrade id has been taken (for HUD display)
        this.upgradeCounts = {};

        // Weapons (vampire-survivor style)
        this.weapons = {
            orbitShield:  { level: 0, timer: 0, angle: 0 },
            lightningAura:{ level: 0, timer: 0 },
            frostNova:    { level: 0, timer: 0 },
            flameTrail:   { level: 0, timer: 0, lastX: 0, lastY: 0 },
        };

        const skin = Progression.getSelectedSkin();
        this.skinColor = skin.player;
        this.skinGlow = skin.glow;
        this.skinAssetPath = skin.asset || "";
        this.skinImage = SkinAssets.get(this.skinAssetPath);
        Progression.applyMetaToPlayer(this);

        // Apply equipped loot (affixes + enchantments + set bonuses).
        this.applyLootStats(Progression.computeLootStats());
    }

    /**
     * Fold the aggregated loot stat block into the player. Flat stats add,
     * multiplicative stats multiply. Runs once per run start (see constructor).
     */
    applyLootStats(s) {
        if (!s) return;
        this.damage += s.damage || 0;
        this.maxHp += s.maxHp || 0;
        this.armor += s.armor || 0;
        this.hpRegen += s.hpRegen || 0;
        this.critChance = Math.min(1, this.critChance + (s.critChance || 0));
        this.critMult += s.critMult || 0;
        this.piercing += s.piercing || 0;
        this.multiShot += s.multiShot || 0;
        this.speed *= s.speedMult || 1;
        this.fireRate *= s.fireRateMult || 1;
        this.damage = Math.floor(this.damage * (s.damageMult || 1));
        this.maxHp = Math.floor(this.maxHp * (s.maxHpMult || 1));
        this.xpGainMult *= s.xpGainMult || 1;
        this.magnetRangeMult = (this.magnetRangeMult || 1) * (s.magnetMult || 1);
        // Enchantment-driven per-kill heal (Vampiric) and shard bonus (Fortune)
        // are read by the game loop; stash them on the player.
        this.perKillHeal = s.perKillHeal || 0;
        this.shardPayoutMult = s.shardMult || 1;
        // Keep HP consistent with a raised maxHp from gear.
        this.hp = this.maxHp;
    }

    update(dt) {
        // Movement
        const mv = Input.moveVector();
        this.x += mv.x * this.speed * dt;
        this.y += mv.y * this.speed * dt;

        // Clamp to world
        this.x = clamp(this.x, this.radius, WORLD_W - this.radius);
        this.y = clamp(this.y, this.radius, WORLD_H - this.radius);

        // HP regen
        if (this.hpRegen > 0) {
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        }

        // Facing direction
        const nearest = game.findNearestEnemy(this.x, this.y, this.range);
        if (Settings.gameMode === "hard") {
            // Hard mode: manual aim
            if (isMobile && TouchControls.aimActive && (TouchControls.aimDx !== 0 || TouchControls.aimDy !== 0)) {
                // Mobile: use aim joystick direction
                this.angle = Math.atan2(TouchControls.aimDy, TouchControls.aimDx);
            } else if (!isMobile) {
                // Desktop: aim toward mouse cursor
                const worldMouseX = Mouse.x + game.camera.x;
                const worldMouseY = Mouse.y + game.camera.y;
                this.angle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);
            }
            // If mobile joystick is inactive, keep the last angle (finger lifted)
        } else if (nearest) {
            // Default / Easy: auto-aim toward nearest enemy
            this.angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        } else if (mv.x !== 0 || mv.y !== 0) {
            this.angle = Math.atan2(mv.y, mv.x);
        }

        // Auto-fire
        this.fireTimer -= dt;
        const canFire = Settings.gameMode === "hard" ? true : !!nearest;
        if (this.fireTimer <= 0 && canFire) {
            this.fireTimer = this.fireRate;
            // Multi-shot: spread bullets
            const totalBullets = 1 + this.multiShot;
            const spreadAngle = 0.12; // radians between each extra bullet
            const startAngle = this.angle - (totalBullets - 1) * spreadAngle / 2;
            for (let i = 0; i < totalBullets; i++) {
                const a = startAngle + i * spreadAngle;
                const isCrit = Math.random() < this.critChance;
                const dmg = isCrit ? Math.floor(this.damage * this.critMult) : this.damage;
                const bulletLife = this.range / BULLET_SPEED;
                game.spawnBullet(this.x, this.y, a, dmg, this.piercing, this.bulletSize, isCrit, bulletLife);
            }
        }

        // Invincibility
        if (this.invTimer > 0) this.invTimer -= dt;

        // Update weapons
        this.updateWeapons(dt);
    }

    updateWeapons(dt) {
        const w = this.weapons;

        // ── Orbit Shield ──
        if (w.orbitShield.level > 0) {
            w.orbitShield.angle += (3.5 + w.orbitShield.level * 0.5) * dt;
            const orbCount = 1 + w.orbitShield.level;
            const orbRadius = 80 + w.orbitShield.level * 12;
            const orbDmg = 8 + w.orbitShield.level * 6;
            const orbSize = 12;
            for (let i = 0; i < orbCount; i++) {
                const a = w.orbitShield.angle + (Math.PI * 2 / orbCount) * i;
                const ox = this.x + Math.cos(a) * orbRadius;
                const oy = this.y + Math.sin(a) * orbRadius;
                // Block enemy projectiles
                for (let bi = game.bullets.length - 1; bi >= 0; bi--) {
                    const b = game.bullets[bi];
                    if (!b.alive || !b.isEnemy) continue;
                    if (dist(ox, oy, b.x, b.y) < orbSize + b.radius) {
                        b.alive = false;
                        game.spawnParticles(ox, oy, "#88ccff", isMobile ? 1 : 3);
                    }
                }
                for (const e of game.enemies) {
                    if (dist(ox, oy, e.x, e.y) < orbSize + e.radius) {
                        if (e.orbitCooldown === undefined) e.orbitCooldown = 0;
                        if (e.orbitCooldown <= 0) {
                            e.takeDamage(orbDmg);
                            e.orbitCooldown = 0.3;
                            game.spawnParticles(ox, oy, COLOR.accent, isMobile ? 1 : 3);
                        }
                    }
                }
            }
            // Tick cooldowns
            for (const e of game.enemies) {
                if (e.orbitCooldown > 0) e.orbitCooldown -= dt;
            }
        }

        // ── Lightning Aura ──
        if (w.lightningAura.level > 0) {
            w.lightningAura.timer -= dt;
            const interval = Math.max(0.15, 0.8 - w.lightningAura.level * 0.12);
            if (w.lightningAura.timer <= 0) {
                w.lightningAura.timer = interval;
                const range = 120 + w.lightningAura.level * 30;
                const dmg = 10 + w.lightningAura.level * 8;
                const targets = 1 + w.lightningAura.level; // always hit multiple: 2 at lv1, 3 at lv2, etc.
                // Single-pass N-nearest selection (avoids spread/map/filter/sort allocations)
                // Uses a max-heap (farthest at index 0) so we can replace the worst candidate
                const nearest = [];
                for (let i = 0; i < game.enemies.length; i++) {
                    const e = game.enemies[i];
                    const d = dist(this.x, this.y, e.x, e.y);
                    if (d >= range) continue;
                    if (nearest.length < targets) {
                        nearest.push({ e, d });
                        // Bubble up to maintain max-heap (largest d at index 0)
                        for (let j = nearest.length - 1; j > 0 && nearest[j].d > nearest[j - 1].d; j--) {
                            const tmp = nearest[j]; nearest[j] = nearest[j - 1]; nearest[j - 1] = tmp;
                        }
                    } else if (d < nearest[0].d) {
                        // Replace the farthest candidate (reuse object to avoid allocation)
                        nearest[0].e = e;
                        nearest[0].d = d;
                        // Bubble down to restore max-heap
                        for (let j = 0; j < nearest.length - 1 && nearest[j].d < nearest[j + 1].d; j++) {
                            const tmp = nearest[j]; nearest[j] = nearest[j + 1]; nearest[j + 1] = tmp;
                        }
                    }
                }
                for (let i = 0; i < nearest.length; i++) {
                    const e = nearest[i].e;
                    e.takeDamage(dmg);
                    if (game.lightningBolts.length < dynamicCap(MAX_LIGHTNING_BOLTS)) {
                        game.lightningBolts.push({ x1: this.x, y1: this.y, x2: e.x, y2: e.y, life: 0.15 });
                    }
                    game.spawnParticles(e.x, e.y, "#88ddff", isMobile ? 2 : 4);
                }
            }
        }

        // ── Frost Nova ──
        if (w.frostNova.level > 0) {
            w.frostNova.timer -= dt;
            const interval = Math.max(1.5, 4.5 - w.frostNova.level * 0.6);
            if (w.frostNova.timer <= 0) {
                w.frostNova.timer = interval;
                const range = 130 + w.frostNova.level * 25;
                const dmg = 5 + w.frostNova.level * 4;
                const slowDuration = 1.5 + w.frostNova.level * 0.3;
                game.frostWaves.push({ x: this.x, y: this.y, radius: 0, maxRadius: range, life: 0.4, maxLife: 0.4 });
                for (const e of game.enemies) {
                    if (dist(this.x, this.y, e.x, e.y) < range) {
                        e.takeDamage(dmg);
                        e.slowTimer = slowDuration;
                        e.slowFactor = 0.35;
                    }
                }
            }
        }

        // ── Flame Trail ──
        if (w.flameTrail.level > 0) {
            w.flameTrail.timer -= dt;
            const interval = 0.08;
            if (w.flameTrail.timer <= 0 &&
                game.flamePatches.length < dynamicCap(MAX_FLAME_PATCHES) &&
                (Math.abs(this.x - w.flameTrail.lastX) > 6 || Math.abs(this.y - w.flameTrail.lastY) > 6)) {
                w.flameTrail.timer = interval;
                w.flameTrail.lastX = this.x;
                w.flameTrail.lastY = this.y;
                const dmg = 4 + w.flameTrail.level * 4;
                const duration = 1.5 + w.flameTrail.level * 0.4;
                game.flamePatches.push({ x: this.x, y: this.y, radius: 16 + w.flameTrail.level * 3, dmg, life: duration, maxLife: duration, dmgTimer: 0 });
            }
        }
    }

    draw() {
        // Range indicator circle
        if (!game.lowPerf) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(51,204,255,0.12)";
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Level-scaled power glow (grows with level)
        if (!game.lowPerf) {
            const glowSize = this.radius * (2.2 + Math.min(this.level * 0.08, 1.2));
            const glowPulse = 1 + 0.08 * Math.sin(frameNow * 0.004);
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowSize * glowPulse, 0, Math.PI * 2);
            ctx.fillStyle = this.skinGlow;
            ctx.fill();
            // Second, larger glow ring for high levels
            if (this.level >= 5) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, glowSize * 1.5 * glowPulse, 0, Math.PI * 2);
                ctx.fillStyle = withAlpha(this.skinGlow, 0.08);
                ctx.fill();
            }
        } else {
            // Basic glow for low-perf
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = this.skinGlow;
            ctx.fill();
        }

        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const flash = this.invTimer > 0 && Math.floor(this.invTimer * 20) % 2;
        ctx.fillStyle = flash ? "#ffffff" : this.skinColor;
        ctx.fill();

        // Skin sprite overlay (opaque assets fully cover the body area).
        const img = this.skinImage;
        if (!flash && img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.clip();
            const size = this.radius * 2;
            ctx.drawImage(img, this.x - this.radius, this.y - this.radius, size, size);
            ctx.restore();
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 3, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fill();

        // Direction indicator (gun barrel)
        const tipX = this.x + Math.cos(this.angle) * (this.radius + 8);
        const tipY = this.y + Math.sin(this.angle) * (this.radius + 8);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.bullet;
        ctx.fill();
        // Barrel glow
        if (!game.lowPerf) {
            ctx.beginPath();
            ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,238,85,0.15)";
            ctx.fill();
        }

        // Draw orbit shield orbs
        const w = this.weapons;
        if (w.orbitShield.level > 0) {
            const orbCount = 1 + w.orbitShield.level;
            const orbRadius = 80 + w.orbitShield.level * 12;
            for (let i = 0; i < orbCount; i++) {
                const a = w.orbitShield.angle + (Math.PI * 2 / orbCount) * i;
                const ox = this.x + Math.cos(a) * orbRadius;
                const oy = this.y + Math.sin(a) * orbRadius;
                ctx.beginPath();
                ctx.arc(ox, oy, 12, 0, Math.PI * 2);
                ctx.fillStyle = COLOR.accent;
                ctx.globalAlpha = 0.8;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Orbit trail
                if (!game.lowPerf) {
                    ctx.beginPath();
                    ctx.arc(ox, oy, 16, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(51,204,255,0.12)";
                    ctx.fill();
                }
            }
        }
    }

    takeDamage(amount) {
        if (this.invTimer > 0) return;
        const finalDmg = Math.max(1, amount - this.armor);
        this.hp -= finalDmg;
        this.invTimer = 0.35;
        game.camera.shake();
        game.spawnParticles(this.x, this.y, COLOR.danger, isMobile ? 3 : 8);
        GameAudio.sfxPlayerHit();
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }

    addXP(amount) {
        this.xp += amount;
        GameAudio.sfxXPPickup();
        const mods = modeModifiers();
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(this.xpToNext * mods.xpNeedGrowth);
            game.triggerUpgrade();
        }
    }
}

// ─────────────────────────────────────────────
// §9  PROJECTILE CLASS
// ─────────────────────────────────────────────

class Projectile extends Entity {
    constructor(x, y, angle, damage, piercing, sizeMultiplier, isCrit, isEnemy, lifetime) {
        super(x, y, BULLET_RADIUS * (sizeMultiplier || 1));
        this.vx = Math.cos(angle) * (isEnemy ? 280 : BULLET_SPEED);
        this.vy = Math.sin(angle) * (isEnemy ? 280 : BULLET_SPEED);
        this.damage = damage;
        this.life = lifetime !== undefined ? lifetime : BULLET_LIFETIME;
        this.piercing = piercing || 0;  // how many extra enemies it can hit
        this.hitCount = 0;
        this.isCrit = isCrit || false;
        this.isEnemy = isEnemy || false;
        this.sizeMultiplier = sizeMultiplier || 1;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0 || this.x < 0 || this.x > WORLD_W || this.y < 0 || this.y > WORLD_H) {
            this.alive = false;
        }
    }

    draw() {
        if (this.isEnemy) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = COLOR.enemyBullet;
            ctx.fill();
            return;
        }
        // Trail
        ctx.beginPath();
        ctx.arc(this.x - this.vx * 0.02, this.y - this.vy * 0.02, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,238,85,0.3)";
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isCrit ? "#ff4444" : COLOR.bullet;
        ctx.fill();
        // Crit indicator
        if (this.isCrit) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.strokeStyle = "#ff8888";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

// ─────────────────────────────────────────────
// §10  ENEMY CLASS
// ─────────────────────────────────────────────

class Enemy extends Entity {
    constructor(x, y, hp, speed, radius, type) {
        const typeDef = ENEMY_TYPES[type] || ENEMY_TYPES.normal;
        super(x, y, typeDef.radius);
        this.hp = Math.floor(hp * typeDef.hpMult);
        this.maxHp = this.hp;
        this.speed = speed * typeDef.spdMult;
        this.baseSpeed = this.speed;
        this.hitFlash = 0;
        this.contactDamage = typeDef.contactDmg;
        this.contactTimer = 0;
        this.type = type || "normal";
        this.xpMult = typeDef.xpMult;
        this.displayName = this.type === "bigboss"
            ? BOSS_NAMES.bigboss
            : (this.type === "miniboss" ? BOSS_NAMES.miniboss : (this.type === "endboss" ? BOSS_NAMES.endboss : ""));

        // Slow effect
        this.slowTimer = 0;
        this.slowFactor = 1;

        // Type-specific
        if (this.type === "normal") {
            this.color = randPick([COLOR.enemyA, COLOR.enemyB]);
        } else {
            this.color = typeDef.color;
        }

        // Ranged enemy
        this.fireTimer = 0;
        this.preferredDist = 200; // ranged enemies try to maintain distance
        this.blinkTimer = randRange(1.6, 2.6);

        // Exploder
        this.exploded = false;

        // Endboss special mechanics
        if (this.type === "endboss") {
            this.phase = 1;            // 3 phases based on HP thresholds
            this.attackTimer = 0;      // timer for special attacks
            this.attackCooldown = 3.0; // seconds between attacks
            this.dashTimer = 0;        // dash attack duration
            this.dashDx = 0;
            this.dashDy = 0;
            this.shieldActive = false; // damage reduction shield
            this.shieldTimer = 0;
            this.spinAngle = 0;        // rotating visual element
            this.spawnTimer = 0;       // timer for spawning minions
        }
    }

    update(dt, target) {
        // Apply slow
        const currentSpeed = this.slowTimer > 0
            ? this.baseSpeed * this.slowFactor
            : this.baseSpeed;
        if (this.slowTimer > 0) this.slowTimer -= dt;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (this.type === "endboss") {
            this.updateEndboss(dt, target, dx, dy, d, currentSpeed);
        } else if (this.type === "ranged") {
            // Ranged enemies try to maintain distance and shoot
            if (d > 1) {
                const nx = dx / d;
                const ny = dy / d;

                let forward = 1;
                if (d < this.preferredDist - 20) forward = -0.7; // back away
                else if (d < this.preferredDist + 20) forward = 0; // hold position

                const strafe = Math.sin(frameNow * 0.003 + this.x) * 0.5;
                const moveX = nx * forward + (-ny) * strafe;
                const moveY = ny * forward + nx * strafe;
                const mag = Math.hypot(moveX, moveY);
                const speedScale = mag > 1 ? 1 / mag : 1;

                this.x += moveX * speedScale * currentSpeed * dt;
                this.y += moveY * speedScale * currentSpeed * dt;
            }
            // Shoot at player
            this.fireTimer -= dt;
            if (this.fireTimer <= 0 && d < 350) {
                this.fireTimer = 1.8;
                const angle = Math.atan2(dy, dx);
                // Intentional slight inaccuracy
                const spread = randRange(-0.15, 0.15);
                game.bullets.push(new Projectile(this.x, this.y, angle + spread, this.contactDamage, 0, 0.8, false, true));
            }
        } else if (this.type === "phaser") {
            // Phaser: pressure movement + blink reposition + short burst shots.
            if (d > 1) {
                this.x += (dx / d) * currentSpeed * 1.15 * dt;
                this.y += (dy / d) * currentSpeed * 1.15 * dt;
            }

            this.blinkTimer -= dt;
            if (this.blinkTimer <= 0 && d > 120) {
                this.blinkTimer = randRange(1.6, 2.6);
                const blinkAngle = randRange(0, Math.PI * 2);
                const blinkDist = randRange(130, 210);
                this.x = clamp(target.x + Math.cos(blinkAngle) * blinkDist, this.radius, WORLD_W - this.radius);
                this.y = clamp(target.y + Math.sin(blinkAngle) * blinkDist, this.radius, WORLD_H - this.radius);
                game.spawnParticles(this.x, this.y, COLOR.phaser, isMobile ? 3 : 8);
            }

            this.fireTimer -= dt;
            if (this.fireTimer <= 0 && d < 420) {
                this.fireTimer = 1.25;
                const angle = Math.atan2(dy, dx);
                for (let i = -1; i <= 1; i++) {
                    const spread = i * 0.12;
                    game.bullets.push(new Projectile(this.x, this.y, angle + spread, Math.floor(this.contactDamage * 0.7), 0, 0.75, false, true));
                }
            }
        } else if (this.type === "warden") {
            // Warden: stationary turret. It does not chase - it rotates a beam
            // around itself and forces the player to keep moving.
            this.beamAngle = (this.beamAngle || randRange(0, Math.PI * 2)) + dt * 0.9;
            this.beamTick = (this.beamTick || 0) - dt;
            if (this.beamTick <= 0) {
                this.beamTick = 0.35;
                // Damage the player if they are caught in the rotating beam.
                const bx = this.x + Math.cos(this.beamAngle) * 150;
                const by = this.y + Math.sin(this.beamAngle) * 150;
                if (dist(bx, by, target.x, target.y) < 46) {
                    target.takeDamage(this.contactDamage);
                }
            }
            if (!game.lowPerf) {
                this.spawnBeamParticles();
            }
        } else {
            // All other types chase the player
            if (d > 1) {
                this.x += (dx / d) * currentSpeed * dt;
                this.y += (dy / d) * currentSpeed * dt;
            }
        }

        // ── Boss modifier behaviour ──
        if (this.modSummoner) this.updateSummoner(dt);
        if (this.modSiphon) this.updateSiphon(dt, target, d);
        if (this.modBerserker) this.updateBerserker();

        // Clamp to world
        this.x = clamp(this.x, this.radius, WORLD_W - this.radius);
        this.y = clamp(this.y, this.radius, WORLD_H - this.radius);

        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.contactTimer = Math.max(0, this.contactTimer - dt);
    }

    /** Summoner modifier: periodically calls in two normal adds. */
    updateSummoner(dt) {
        if (this.hp <= 0) return;
        this.modSummonTimer -= dt;
        if (this.modSummonTimer > 0) return;
        const c = CFG.bossModifiers.summoner;
        this.modSummonTimer = c.interval;
        if (game.enemies.length >= dynamicCap(MAX_ENEMIES) - c.addCount) return;
        for (let i = 0; i < c.addCount; i++) {
            const a = randRange(0, Math.PI * 2);
            const sx = clamp(this.x + Math.cos(a) * (this.radius + 60), 0, WORLD_W);
            const sy = clamp(this.y + Math.sin(a) * (this.radius + 60), 0, WORLD_H);
            const add = new Enemy(sx, sy, ENEMY_BASE_HP * Math.pow(WAVE_HP_SCALE, game.wave - 1),
                ENEMY_BASE_SPEED, undefined, "normal");
            game.enemies.push(add);
        }
        game.spawnParticles(this.x, this.y, "#c38bff", isMobile ? 4 : 12);
    }

    /** Siphon modifier: heals the boss while the player stays close. */
    updateSiphon(dt, target, d) {
        const c = CFG.bossModifiers.siphon;
        if (d > c.radius) return;
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + c.healPerSec * dt);
        if (Math.floor(this.hp) !== Math.floor(before) && !game.lowPerf) {
            game.spawnParticles(this.x, this.y, "#66ff99", 2);
        }
    }

    /** Berserker modifier: enrages below the HP threshold, once. */
    updateBerserker() {
        if (this.enraged) return;
        const c = CFG.bossModifiers.berserker;
        if (this.hp / this.maxHp > c.hpThreshold) return;
        this.enraged = true;
        this.baseSpeed *= c.speedMult;
        this.speed = this.baseSpeed;
        this.contactDamage = Math.floor(this.contactDamage * c.dmgMult);
        game.triggerEventToast(`${this.displayName || "Boss"} enrages!`, "#ff5566", 1.4);
        game.camera.shake(5, 0.18);
    }

    /** Warden beam ambient particles (skipped in low-perf mode). */
    spawnBeamParticles() {
        const bx = this.x + Math.cos(this.beamAngle) * 150;
        const by = this.y + Math.sin(this.beamAngle) * 150;
        if (Math.random() < 0.35) game.spawnParticles(bx, by, "#ffaa33", 1);
    }

    updateEndboss(dt, target, dx, dy, d, currentSpeed) {
        if (!this.alive || this.hp <= 0) return;
        this.spinAngle += dt * 1.5;

        // Phase transitions based on HP
        const hpPct = this.hp / this.maxHp;
        if (hpPct <= 0.3 && this.phase < 3) {
            this.phase = 3;
            this.attackCooldown = 1.8;
            game.camera.shake();
            game.spawnParticles(this.x, this.y, "#ff00ff", 25);
            GameAudio.sfxExplosion();
        } else if (hpPct <= 0.6 && this.phase < 2) {
            this.phase = 2;
            this.attackCooldown = 2.4;
            game.camera.shake();
            game.spawnParticles(this.x, this.y, "#ff44aa", 20);
            GameAudio.sfxExplosion();
        }

        // Shield mechanic
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            this.shieldActive = this.shieldTimer > 0;
        }

        // Dash mechanic
        if (this.dashTimer > 0) {
            this.dashTimer -= dt;
            this.x += this.dashDx * currentSpeed * 4 * dt;
            this.y += this.dashDy * currentSpeed * 4 * dt;
        } else {
            // Normal movement: orbit around the player at a distance
            const orbitDist = this.phase === 3 ? 150 : (this.phase === 2 ? 220 : 280);
            if (d > orbitDist + 40) {
                // Move closer
                if (d > 1) {
                    this.x += (dx / d) * currentSpeed * 1.3 * dt;
                    this.y += (dy / d) * currentSpeed * 1.3 * dt;
                }
            } else if (d < orbitDist - 40) {
                // Back away
                if (d > 1) {
                    this.x -= (dx / d) * currentSpeed * 0.8 * dt;
                    this.y -= (dy / d) * currentSpeed * 0.8 * dt;
                }
            } else {
                // Orbit (strafe around)
                if (d > 1) {
                    const orbSpd = currentSpeed * (0.6 + this.phase * 0.2);
                    this.x += (-dy / d) * orbSpd * dt;
                    this.y += (dx / d) * orbSpd * dt;
                }
            }
        }

        // Special attacks
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.attackTimer = this.attackCooldown;
            this.performEndbossAttack(dx, dy, d);
        }

        // Spawn minions in phases 2 and 3
        if (this.phase >= 2) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnTimer = this.phase === 3 ? 6 : 10;
                this.spawnEndbossMinions();
            }
        }

        // Clamp to world
        this.x = clamp(this.x, this.radius, WORLD_W - this.radius);
        this.y = clamp(this.y, this.radius, WORLD_H - this.radius);
    }

    performEndbossAttack(dx, dy, d) {
        const angle = Math.atan2(dy, dx);

        if (this.phase === 1) {
            // Phase 1: Triple shot
            for (let i = -1; i <= 1; i++) {
                game.bullets.push(new Projectile(
                    this.x, this.y, angle + i * 0.25,
                    Math.floor(this.contactDamage * 0.6), 0, 1.2, false, true
                ));
            }
        } else if (this.phase === 2) {
            // Phase 2: Alternates between ring shot and dash
            if (Math.random() < 0.5) {
                // Ring of 8 bullets
                for (let i = 0; i < 8; i++) {
                    const a = (Math.PI * 2 / 8) * i;
                    game.bullets.push(new Projectile(
                        this.x, this.y, a,
                        Math.floor(this.contactDamage * 0.5), 0, 1.0, false, true
                    ));
                }
                GameAudio.sfxExplosion();
            } else {
                // Dash toward player
                if (d > 1) {
                    this.dashDx = dx / d;
                    this.dashDy = dy / d;
                    this.dashTimer = 0.4;
                }
            }
        } else {
            // Phase 3: Spiral burst + shield + dash combo
            const attackType = Math.random();
            if (attackType < 0.35) {
                // Spiral burst: 12 bullets in a spiral pattern
                for (let i = 0; i < 12; i++) {
                    const a = this.spinAngle + (Math.PI * 2 / 12) * i;
                    game.bullets.push(new Projectile(
                        this.x, this.y, a,
                        Math.floor(this.contactDamage * 0.4), 0, 1.0, false, true
                    ));
                }
                GameAudio.sfxExplosion();
            } else if (attackType < 0.6) {
                // Shield: reduce incoming damage for 2 seconds
                this.shieldActive = true;
                this.shieldTimer = 2.0;
            } else {
                // Dash + triple shot
                if (d > 1) {
                    this.dashDx = dx / d;
                    this.dashDy = dy / d;
                    this.dashTimer = 0.35;
                }
                for (let i = -1; i <= 1; i++) {
                    game.bullets.push(new Projectile(
                        this.x, this.y, angle + i * 0.3,
                        Math.floor(this.contactDamage * 0.5), 0, 1.2, false, true
                    ));
                }
            }
        }
    }

    spawnEndbossMinions() {
        if (game.enemies.length >= dynamicCap(MAX_ENEMIES) - 2) return;
        const types = this.phase === 3 ? ["speedy", "exploder"] : ["speedy", "normal"];
        for (let i = 0; i < (this.phase === 3 ? 3 : 2); i++) {
            const a = Math.random() * Math.PI * 2;
            const spawnDist = this.radius + 40;
            const ex = this.x + Math.cos(a) * spawnDist;
            const ey = this.y + Math.sin(a) * spawnDist;
            const minionType = randPick(types);
            const minion = new Enemy(ex, ey, this.maxHp * 0.01, this.baseSpeed * 2, undefined, minionType);
            minion.contactDamage = Math.floor(this.contactDamage * 0.3);
            game.enemies.push(minion);
        }
        game.spawnParticles(this.x, this.y, "#ff00ff", 10);
    }

    draw() {
        const isSlow = this.slowTimer > 0;
        const col = this.hitFlash > 0 ? "#ffffff" : (isSlow ? "#88ccff" : this.color);

        if (this.type === "tank") {
            // Tank: drawn as a hexagon-like shape
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i - Math.PI / 6;
                const px = this.x + Math.cos(a) * this.radius;
                const py = this.y + Math.sin(a) * this.radius;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = "#226622";
            ctx.stroke();
        } else if (this.type === "speedy") {
            // Speedy: drawn as a diamond
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x, this.y + this.radius);
            ctx.lineTo(this.x - this.radius, this.y);
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#aa8800";
            ctx.stroke();
        } else if (this.type === "ranged") {
            // Ranged: drawn as a triangle
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius * 1.2);
            ctx.lineTo(this.x + this.radius, this.y + this.radius * 0.7);
            ctx.lineTo(this.x - this.radius, this.y + this.radius * 0.7);
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#7733aa";
            ctx.stroke();
        } else if (this.type === "exploder") {
            // Exploder: drawn with spikes
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i;
                const r = i % 2 === 0 ? this.radius * 1.2 : this.radius * 0.7;
                const px = this.x + Math.cos(a) * r;
                const py = this.y + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#aa5500";
            ctx.stroke();
            // Pulsing warning glow when low HP
            if (this.hp < this.maxHp * 0.3) {
                const pulse = 0.3 + 0.3 * Math.sin(frameNow * 0.015);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,136,0,${pulse})`;
                ctx.fill();
            }
        } else if (this.type === "miniboss") {
            // Miniboss: 8-pointed star
            const pulse = 0.08 + 0.05 * Math.sin(frameNow * 0.006);
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
                const a = (Math.PI * 2 / 16) * i - Math.PI / 2;
                const r = i % 2 === 0 ? this.radius : this.radius * (0.55 + pulse);
                ctx.lineTo(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#ff88bb";
            ctx.stroke();
            // Outer glow
            const glowAlpha = 0.18 + 0.1 * Math.sin(frameNow * 0.007);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(221,34,119,${glowAlpha})`;
            ctx.fill();
        } else if (this.type === "bigboss") {
            // Big boss: rotating octagon + inner circle + spikes
            const rot = frameNow * 0.001;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i + rot;
                const px = this.x + Math.cos(a) * this.radius;
                const py = this.y + Math.sin(a) * this.radius;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#ff3333";
            ctx.stroke();
            // Inner pulsing core
            const coreR = this.radius * (0.4 + 0.08 * Math.sin(frameNow * 0.01));
            ctx.beginPath();
            ctx.arc(this.x, this.y, coreR, 0, Math.PI * 2);
            ctx.fillStyle = "#ff6666";
            ctx.fill();
            // Outer danger glow
            const bossGlow = 0.2 + 0.12 * Math.sin(frameNow * 0.008);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(204,0,0,${bossGlow})`;
            ctx.fill();
        } else if (this.type === "endboss") {
            // ── ENDBOSS: Multi-layered eldritch horror ──
            const rot = (this.spinAngle || 0);
            const phaseColor = this.phase === 3 ? "#ff0044" : (this.phase === 2 ? "#ff44aa" : "#ff00ff");
            const phaseGlow = this.phase === 3 ? "rgba(255,0,68," : (this.phase === 2 ? "rgba(255,68,170," : "rgba(255,0,255,");

            // Outer danger aura (larger in later phases)
            const auraSize = this.radius * (1.8 + this.phase * 0.3);
            const auraAlpha = 0.12 + 0.08 * Math.sin(frameNow * 0.005);
            ctx.beginPath();
            ctx.arc(this.x, this.y, auraSize, 0, Math.PI * 2);
            ctx.fillStyle = `${phaseGlow}${auraAlpha})`;
            ctx.fill();

            // Rotating outer ring of spikes
            ctx.beginPath();
            const spikeCount = 10 + this.phase * 2;
            for (let i = 0; i < spikeCount * 2; i++) {
                const a = (Math.PI * 2 / (spikeCount * 2)) * i + rot;
                const r = i % 2 === 0 ? this.radius * 1.15 : this.radius * 0.75;
                const px = this.x + Math.cos(a) * r;
                const py = this.y + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = phaseColor;
            ctx.stroke();

            // Inner body (hexagonal)
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i - rot * 0.7;
                const r = this.radius * 0.6;
                const px = this.x + Math.cos(a) * r;
                const py = this.y + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = phaseColor;
            ctx.globalAlpha = 0.6;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Core eye (pulsing)
            const eyeR = this.radius * (0.25 + 0.06 * Math.sin(frameNow * 0.012));
            ctx.beginPath();
            ctx.arc(this.x, this.y, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            // Pupil (tracks player)
            const pupilOffset = Math.min(eyeR * 0.4, 6);
            const toPlayer = Math.atan2(game.player.y - this.y, game.player.x - this.x);
            ctx.beginPath();
            ctx.arc(
                this.x + Math.cos(toPlayer) * pupilOffset,
                this.y + Math.sin(toPlayer) * pupilOffset,
                eyeR * 0.5, 0, Math.PI * 2
            );
            ctx.fillStyle = "#220022";
            ctx.fill();

            // Shield visual
            if (this.shieldActive) {
                const shieldPulse = 0.3 + 0.15 * Math.sin(frameNow * 0.015);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 1.35, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100,200,255,${shieldPulse + 0.3})`;
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.fillStyle = `rgba(100,200,255,${shieldPulse * 0.3})`;
                ctx.fill();
            }

            // Dashing trail effect
            if (this.dashTimer > 0) {
                ctx.globalAlpha = 0.3;
                for (let i = 1; i <= 3; i++) {
                    const trailX = this.x - this.dashDx * i * 20;
                    const trailY = this.y - this.dashDy * i * 20;
                    ctx.beginPath();
                    ctx.arc(trailX, trailY, this.radius * (1 - i * 0.15), 0, Math.PI * 2);
                    ctx.fillStyle = phaseColor;
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // Phase indicator orbs orbiting the boss
            for (let i = 0; i < this.phase; i++) {
                const orbAngle = rot * 2 + (Math.PI * 2 / this.phase) * i;
                const orbDist = this.radius * 1.5;
                const ox = this.x + Math.cos(orbAngle) * orbDist;
                const oy = this.y + Math.sin(orbAngle) * orbDist;
                ctx.beginPath();
                ctx.arc(ox, oy, 5, 0, Math.PI * 2);
                ctx.fillStyle = phaseColor;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ox, oy, 8, 0, Math.PI * 2);
                ctx.fillStyle = `${phaseGlow}0.2)`;
                ctx.fill();
            }
        } else if (this.type === "splitter") {
            // Splitter: rounded blob with a visible seam, so the split reads.
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#2a6b5a";
            ctx.stroke();
            // Seam line hinting at the two halves that will break apart.
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius * 0.8, this.y);
            ctx.lineTo(this.x + this.radius * 0.8, this.y);
            ctx.strokeStyle = "rgba(20,60,50,0.75)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else if (this.type === "warden") {
            // Warden: stationary hex turret with a rotating damage beam.
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i;
                const px = this.x + Math.cos(a) * this.radius;
                const py = this.y + Math.sin(a) * this.radius;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = "#664400";
            ctx.stroke();
            // Rotating beam.
            const beamAngle = this.beamAngle || 0;
            const beamLen = 150;
            const bxa = this.x + Math.cos(beamAngle) * beamLen;
            const bya = this.y + Math.sin(beamAngle) * beamLen;
            const grad = ctx.createLinearGradient(this.x, this.y, bxa, bya);
            grad.addColorStop(0, "rgba(255,170,51,0.85)");
            grad.addColorStop(1, "rgba(255,170,51,0)");
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(bxa, bya);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 6;
            ctx.stroke();
            // Beam tip glow (the damaging spot).
            ctx.beginPath();
            ctx.arc(bxa, bya, 10, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,220,120,0.6)";
            ctx.fill();
        } else {
            // Normal: circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#000000";
            ctx.stroke();
        }

        // ── Elite marker: golden aura ring so promoted enemies read instantly ──
        if (this.isElite) {
            const auraPulse = 0.5 + 0.25 * Math.sin(frameNow * 0.008);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.45, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,209,102,${auraPulse})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            // Bounty targets get an extra magenta ring + marker on top.
            if (this.isBounty) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 1.75, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255,102,221,0.9)";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = "#ff66dd";
                ctx.fillText("★ BOUNTY", this.x, this.y - this.radius * 1.9);
            }
        }
        // Shard cache carrier marker.
        if (this.carriesShardCache) {
            const c = 0.6 + 0.3 * Math.sin(frameNow * 0.01);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(195,139,255,${c})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "#c38bff";
            ctx.fillText("◆ CACHE", this.x, this.y - this.radius * 2);
        }

        // HP bar (only if damaged)
        if (this.hp < this.maxHp) {
            const bw = this.type === "endboss" ? this.radius * 3 : this.radius * 2.5;
            const bh = this.type === "endboss" ? 10 : ((this.type === "bigboss") ? 8 : (this.type === "miniboss" ? 6 : 4));
            const bx = this.x - bw / 2;
            const by = this.y - this.radius - (this.type === "endboss" ? 20 : 12);
            ctx.fillStyle = COLOR.hpBarBg;
            ctx.fillRect(bx, by, bw, bh);
            const hpColor = this.type === "endboss" ? "#ff00ff"
                : (this.type === "bigboss" ? "#ff3333" : (this.type === "miniboss" ? "#ff88bb" : COLOR.hpBar));
            ctx.fillStyle = hpColor;
            ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
            // Boss name label
            if (this.type === "endboss") {
                const phaseName = this.phase === 3 ? "RAGE" : (this.phase === 2 ? "FURY" : "");
                ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = "#ff00ff";
                ctx.fillText(`☠ ${BOSS_NAMES.endboss} ${phaseName ? "— " + phaseName : ""} ☠`, this.x, by - 4);
            } else if (this.type === "miniboss" || this.type === "bigboss") {
                ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = this.type === "bigboss" ? "#ff3333" : "#ff88bb";
                const bossName = getBossDisplayName(this);
                ctx.fillText(`★ ${bossName} ★`, this.x, by - 2);
            }
        }

        // Boss modifier labels - shown even at full HP so the boss's "thesis"
        // is readable before the fight starts.
        if ((this.type === "miniboss" || this.type === "bigboss" || this.type === "endboss")) {
            const defs = this.modDefs;
            if (defs && defs.length > 0) {
                const labelY = this.y + this.radius + 18;
                ctx.font = "bold 10px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const text = defs.map((d) => d.label).join("  ·  ");
                ctx.fillStyle = defs[0].color;
                ctx.fillText(text, this.x, labelY);
            }
        }
    }

    takeDamage(amount, isCrit) {
        // Endboss shield reduces damage by 60%
        let finalAmount = amount;
        if (this.type === "endboss" && this.shieldActive) {
            finalAmount = Math.max(1, Math.floor(amount * 0.4));
        }
        // Shield Wall modifier: blocks most damage coming from the boss's front
        // arc. The player has to get around it. Direction is derived from where
        // the player is relative to the boss's facing (towards the player), so
        // the practical counter is strafing round the back.
        if (this.modShieldWall) {
            const c = CFG.bossModifiers.shieldWall;
            // The boss has a facing that lerps slowly towards the player, so
            // the player can genuinely flank around the shield by strafing.
            const facing = game.player ? Math.atan2(game.player.y - this.y, game.player.x - this.x) : 0;
            let fa = this.faceAngle === undefined ? facing : this.faceAngle;
            let delta = ((facing - fa + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            fa += delta * Math.min(1, 1.1 * (1 / 60));   // slow turn
            this.faceAngle = fa;
            // A hit is blocked when it comes from within the boss's front arc.
            const fromAngle = Math.atan2(this.y - (game.player ? game.player.y : this.y),
                                         this.x - (game.player ? game.player.x : this.x));
            const rel = Math.abs(((fromAngle - fa + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (rel < c.arc / 2) {
                finalAmount = Math.max(1, Math.floor(finalAmount * (1 - c.frontReduction)));
            }
        }
        this.hp -= finalAmount;
        this.hitFlash = 0.1;
        // Spawn damage number
        const color = (this.type === "endboss" && this.shieldActive) ? "#88ccff" : (isCrit ? "#ff4444" : "#ffffff");
        game.spawnDamageNumber(this.x, this.y - this.radius, finalAmount, color, isCrit);
        if (this.hp <= 0) {
            this.alive = false;
            game.onEnemyKilled(this);
            // Exploder: deal AoE damage on death
            if (this.type === "exploder" && !this.exploded) {
                this.exploded = true;
                const explosionRadius = 80;
                const explosionDmg = 20;
                // Damage the player if in range
                if (dist(this.x, this.y, game.player.x, game.player.y) < explosionRadius) {
                    game.player.takeDamage(explosionDmg);
                }
                // Damage other enemies too (chain reaction)
                for (const e of game.enemies) {
                    if (e !== this && e.alive && dist(this.x, this.y, e.x, e.y) < explosionRadius) {
                        e.takeDamage(Math.floor(explosionDmg * 0.5));
                    }
                }
                // Visual explosion
                game.spawnParticles(this.x, this.y, COLOR.exploder, 20);
                game.camera.shake();
                GameAudio.sfxExplosion();
            }
        }
    }
}

// ─────────────────────────────────────────────
// §11  XP ORB CLASS
// ─────────────────────────────────────────────

class XPOrb extends Entity {
    constructor(x, y, amount) {
        super(x, y, XP_ORB_RADIUS);
        this.amount = amount;
        this.vy = -60;        // small pop-up on spawn
        this.magnetised = false;
    }

    update(dt, player) {
        // Pop-up animation
        if (this.vy < 0) {
            this.y += this.vy * dt;
            this.vy += 200 * dt;
        }

        // Magnet toward player
        const d = dist(this.x, this.y, player.x, player.y);
        const magnetMult = player.magnetRangeMult || 1;
        if (d < (XP_MAGNET_RANGE + game.xpMagnetBonus) * magnetMult) {
            this.magnetised = true;
        }
        if (this.magnetised) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const spd = 400;
            if (d > 1) {
                this.x += (dx / d) * spd * dt;
                this.y += (dy / d) * spd * dt;
            }
        }

        // Pickup
        if (d < player.radius + this.radius) {
            player.addXP(this.amount);
            this.alive = false;
        }
    }

    draw() {
        const pulse = 1 + 0.2 * Math.sin(frameNow * 0.008);
        // Outer glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(85,255,136,0.12)";
        ctx.fill();
        // Main orb
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.xpOrb;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        // Bright center
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ─────────────────────────────────────────────
// §12  PARTICLE CLASS
// ─────────────────────────────────────────────

class Particle {
    constructor(x, y, color) {
        this.reset(x, y, color);
    }

    reset(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = randRange(60, 200);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = PARTICLE_LIFETIME;
        this.maxLife = PARTICLE_LIFETIME;
        this.color = color;
        this.radius = randRange(2, 5);
        this.alive = true;
        return this;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }

    draw() {
        const alpha = clamp(this.life / this.maxLife, 0, 1);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * alpha, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ─────────────────────────────────────────────
// §12b  DAMAGE NUMBER CLASS
// ─────────────────────────────────────────────

class DamageNumber {
    constructor(x, y, amount, color, isCrit) {
        this.reset(x, y, amount, color, isCrit);
    }

    reset(x, y, amount, color, isCrit) {
        this.x = x + randRange(-8, 8);
        this.y = y;
        this.amount = amount;
        this.color = color || "#ffffff";
        this.isCrit = isCrit || false;
        this.life = DAMAGE_NUMBER_LIFETIME;
        this.maxLife = DAMAGE_NUMBER_LIFETIME;
        this.alive = true;
        this.scale = isCrit ? 1.4 : 1.0;
        return this;
    }

    update(dt) {
        this.y -= DAMAGE_NUMBER_RISE_SPEED * dt;
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }

    draw() {
        const alpha = clamp(this.life / this.maxLife, 0, 1);
        const t = 1 - (this.life / this.maxLife);
        const scale = this.scale * (1 + t * 0.3);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.floor(14 * scale)}px 'Segoe UI', Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Shadow for readability
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillText(this.amount, this.x + 1, this.y + 1);
        ctx.fillStyle = this.color;
        ctx.fillText(this.amount, this.x, this.y);
        if (this.isCrit) {
            ctx.font = `bold ${Math.floor(9 * scale)}px 'Segoe UI', Arial, sans-serif`;
            ctx.fillStyle = "#ffcc00";
            ctx.fillText("CRIT!", this.x, this.y - 12 * scale);
        }
        ctx.globalAlpha = 1;
    }
}

// ─────────────────────────────────────────────
// §12c  PLAYER TRAIL
// ─────────────────────────────────────────────

class TrailParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.life = 0.3;
        this.maxLife = 0.3;
        this.radius = randRange(3, 6);
        this.color = color;
        this.alive = true;
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }

    draw() {
        const alpha = clamp(this.life / this.maxLife, 0, 1) * 0.35;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * alpha, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ─────────────────────────────────────────────
// §12d  BACKGROUND STARFIELD
// ─────────────────────────────────────────────

const Starfield = (() => {
    const STAR_COUNT = 80;
    const stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * WORLD_W,
            y: Math.random() * WORLD_H,
            radius: randRange(0.5, 2),
            brightness: randRange(0.15, 0.5),
            twinkleSpeed: randRange(0.002, 0.006),
            twinkleOffset: Math.random() * Math.PI * 2,
        });
    }

    function draw(cameraX, cameraY) {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            // Parallax: stars move slower than the camera
            const sx = s.x - cameraX * 0.3;
            const sy = s.y - cameraY * 0.3;
            // Wrap around
            const wx = ((sx % CANVAS_W) + CANVAS_W) % CANVAS_W;
            const wy = ((sy % CANVAS_H) + CANVAS_H) % CANVAS_H;
            const twinkle = s.brightness + 0.15 * Math.sin(frameNow * s.twinkleSpeed + s.twinkleOffset);
            ctx.beginPath();
            ctx.arc(wx, wy, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180,200,255,${clamp(twinkle, 0, 0.6)})`;
            ctx.fill();
        }
    }

    return { draw };
})();

const UPGRADES = [
    // ── Stat upgrades ──
    { id: "dmg1",   name: "+5 Damage",          icon: "⚔️",  cat: "stat", apply(p) { p.damage += UPGRADE_TUNING.damage1; } },
    { id: "dmg2",   name: "+10 Damage",         icon: "🗡️",  rarity: "rare", cat: "stat", apply(p) { p.damage += UPGRADE_TUNING.damage2; } },
    { id: "spd1",   name: "+15% Move Speed",    icon: "👟",  cat: "stat", apply(p) { p.speed *= UPGRADE_TUNING.moveSpeedMult1; } },
    { id: "spd2",   name: "+25% Move Speed",    icon: "💨",  rarity: "rare", cat: "stat", apply(p) { p.speed *= UPGRADE_TUNING.moveSpeedMult2; } },
    { id: "rate1",  name: "+20% Fire Rate",     icon: "🔫",  cat: "stat", apply(p) { p.fireRate *= UPGRADE_TUNING.fireRateMult1; } },
    { id: "rate2",  name: "+35% Fire Rate",     icon: "💥",  rarity: "rare", cat: "stat", apply(p) { p.fireRate *= UPGRADE_TUNING.fireRateMult2; } },
    { id: "hp1",    name: "+25 Max HP",         icon: "❤️",  cat: "stat", apply(p) { p.maxHp += UPGRADE_TUNING.maxHp1; p.hp = Math.min(p.hp + UPGRADE_TUNING.maxHp1, p.maxHp); } },
    { id: "hp2",    name: "+50 Max HP",         icon: "💖",  rarity: "rare", cat: "stat", apply(p) { p.maxHp += UPGRADE_TUNING.maxHp2; p.hp = Math.min(p.hp + UPGRADE_TUNING.maxHp2, p.maxHp); } },
    { id: "heal",   name: "Heal 30%",           icon: "🩹",  cat: "stat", apply(p) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * UPGRADE_TUNING.healPercent); } },
    { id: "magnet", name: "+XP Magnet Range",   icon: "🧲",  cat: "stat", apply()  { game.xpMagnetBonus += UPGRADE_TUNING.xpMagnetRange; } },
    { id: "armor1", name: "+3 Armor",           icon: "🛡️",  cat: "stat", apply(p) { p.armor += UPGRADE_TUNING.armor1; },
        desc: `Reduces all damage taken by ${UPGRADE_TUNING.armor1}` },
    { id: "armor2", name: "+6 Armor",           icon: "🏰",  rarity: "rare", cat: "stat", apply(p) { p.armor += UPGRADE_TUNING.armor2; },
        desc: `Reduces all damage taken by ${UPGRADE_TUNING.armor2}` },
    { id: "regen1", name: "+2 HP/sec Regen",    icon: "💚",  cat: "stat", apply(p) { p.hpRegen += UPGRADE_TUNING.hpRegen1; } },
    { id: "regen2", name: "+5 HP/sec Regen",    icon: "🌿",  rarity: "rare", cat: "stat", apply(p) { p.hpRegen += UPGRADE_TUNING.hpRegen2; } },
    { id: "pierce", name: "Piercing +1",          icon: "📌",  cat: "stat", apply(p) { p.piercing += UPGRADE_TUNING.piercing; },
        desc(p) { return `Bullets pierce through ${p.piercing + UPGRADE_TUNING.piercing} enemies`; } },
    { id: "multi",  name: "+1 Multi-Shot",      icon: "🎯",  cat: "stat", apply(p) { p.multiShot += UPGRADE_TUNING.multiShot; } },
    { id: "crit1",  name: "+10% Crit Chance",   icon: "🎲",  cat: "stat", apply(p) { p.critChance = Math.min(1, p.critChance + UPGRADE_TUNING.critChanceAdd); } },
    { id: "crit2",  name: "+0.5x Crit Damage",  icon: "💎",  rarity: "rare", cat: "stat", apply(p) { p.critMult += UPGRADE_TUNING.critDamageAdd; } },
    { id: "bigBullet", name: "+30% Bullet Size", icon: "⭕",  cat: "stat", apply(p) { p.bulletSize *= UPGRADE_TUNING.bulletSizeMult; } },
    { id: "range1", name: "+20% Range",        icon: "📡",  cat: "stat", apply(p) { p.range *= UPGRADE_TUNING.rangeMult1; } },
    { id: "range2", name: "+40% Range",        icon: "🔭",  rarity: "rare", cat: "stat", apply(p) { p.range *= UPGRADE_TUNING.rangeMult2; } },
    { id: "xpgain1", name: "+25% XP Gain",    icon: "✨",  cat: "stat", apply(p) { p.xpGainMult *= UPGRADE_TUNING.xpGainMult1; } },
    { id: "xpgain2", name: "+50% XP Gain",    icon: "⭐",  rarity: "rare", cat: "stat", apply(p) { p.xpGainMult *= UPGRADE_TUNING.xpGainMult2; } },
    { id: "execute1", name: "+8% Execute Threshold", icon: "⚰️", rarity: "rare", cat: "stat", apply(p) { p.executeThreshold = Math.min(UPGRADE_TUNING.executeCap, p.executeThreshold + UPGRADE_TUNING.executeAdd1); } },
    { id: "execute2", name: "+12% Execute Threshold", icon: "🩸", rarity: "epic", cat: "stat", apply(p) { p.executeThreshold = Math.min(UPGRADE_TUNING.executeCap, p.executeThreshold + UPGRADE_TUNING.executeAdd2); } },

    // ── Weapon upgrades ──
    { id: "orbit",     name: "Orbit Shield +1",    icon: "🔵", rarity: "rare", cat: "weapon", apply(p) { p.weapons.orbitShield.level += UPGRADE_TUNING.weaponLevelAdd; } },
    { id: "lightning",  name: "Lightning Aura +1",  icon: "⚡", rarity: "rare", cat: "weapon", apply(p) { p.weapons.lightningAura.level += UPGRADE_TUNING.weaponLevelAdd; } },
    { id: "frost",     name: "Frost Nova +1",      icon: "❄️",  rarity: "rare", cat: "weapon", apply(p) { p.weapons.frostNova.level += UPGRADE_TUNING.weaponLevelAdd; } },
    { id: "flame",     name: "Flame Trail +1",     icon: "🔥", rarity: "rare", cat: "weapon", apply(p) { p.weapons.flameTrail.level += UPGRADE_TUNING.weaponLevelAdd; } },
];

// Groups of stat upgrades shown in the bottom-right HUD, one icon per family
const STAT_GROUPS = [
    { icon: "⚔️",  ids: ["dmg1", "dmg2"]         },
    { icon: "👟",  ids: ["spd1", "spd2"]          },
    { icon: "🔫",  ids: ["rate1", "rate2"]        },
    { icon: "❤️",  ids: ["hp1", "hp2"]            },
    { icon: "🛡️",  ids: ["armor1", "armor2"]      },
    { icon: "💚",  ids: ["regen1", "regen2"]      },
    { icon: "📌",  ids: ["pierce"]                },
    { icon: "🎯",  ids: ["multi"]                 },
    { icon: "🎲",  ids: ["crit1", "crit2"]        },
    { icon: "⭕",  ids: ["bigBullet"]             },
    { icon: "📡",  ids: ["range1", "range2"]      },
    { icon: "🧲",  ids: ["magnet"]                },
    { icon: "✨",  ids: ["xpgain1", "xpgain2"]   },
    { icon: "⚰️",  ids: ["execute1", "execute2"] },
];

// ─────────────────────────────────────────────
// §14  CRAZYGAMES SDK v3 INTEGRATION
// ─────────────────────────────────────────────

const CrazyGamesSDK = (() => {
    let sdkAvailable = false;
    let currentUser = null;          // { username, profilePictureUrl } or null
    let sdkInitialised = false;

    // ── Leaderboard encryption key ──
    // IMPORTANT: Replace with your own 32-byte base64-encoded key, generated at
    // https://www.devglan.com/online-tools/aes-encryption-decryption or any
    // cryptographically secure random bytes encoded as base64 (32 raw bytes → 44 chars).
    // The same key must be submitted to CrazyGames when configuring the leaderboard.
    const LEADERBOARD_ENCRYPTION_KEY = "h5dMujlEwwSJAN8zV43G9yscOIdGhK89FwtB4vwreXU=";

    /** Safely get the SDK object */
    function sdk() {
        return window.CrazyGames && window.CrazyGames.SDK ? window.CrazyGames.SDK : null;
    }

    /** Initialise the SDK – call once on boot */
    async function init() {
        if (sdkInitialised) return;
        sdkInitialised = true;
        const s = sdk();
        if (!s) {
            console.log("[CrazyGames] SDK not loaded – running in standalone mode");
            return;
        }
        try {
            await s.init();
            sdkAvailable = true;
            console.log("[CrazyGames] SDK initialised");

            // Apply initial platform settings (muteAudio etc.)
            applyPlatformSettings();

            // Listen for setting changes from CrazyGames platform
            s.game.addSettingsChangeListener(onSettingsChange);

            // Try to get the logged-in user
            try {
                currentUser = await s.user.getUser();
                if (currentUser) {
                    console.log("[CrazyGames] Logged in as:", currentUser.username);
                }
            } catch (e) {
                console.log("[CrazyGames] User not logged in or unavailable");
            }
        } catch (e) {
            console.warn("[CrazyGames] SDK init failed:", e);
        }
    }

    // Snapshot of user's chosen settings before a platform-forced mute
    let preMuteSoundEnabled = true;
    let preMuteMusicEnabled = true;

    /** Apply CrazyGames platform settings to our game settings */
    function applyPlatformSettings() {
        const s = sdk();
        if (!s || !s.game.settings) return;
        const cgSettings = s.game.settings;
        if (cgSettings.muteAudio) {
            // Platform says mute – save user prefs first, then mute
            preMuteSoundEnabled = Settings.soundEnabled;
            preMuteMusicEnabled = Settings.musicEnabled;
            Settings.soundEnabled = false;
            Settings.musicEnabled = false;
            GameAudio.setSfxEnabled(false);
            GameAudio.setMusicEnabled(false);
        }
        // If muteAudio is false, keep the user's current settings as-is
    }

    /** CrazyGames settings change callback */
    function onSettingsChange(key, value) {
        if (key === "muteAudio") {
            if (value) {
                // Platform requests mute – save user prefs, then mute
                preMuteSoundEnabled = Settings.soundEnabled;
                preMuteMusicEnabled = Settings.musicEnabled;
                Settings.soundEnabled = false;
                Settings.musicEnabled = false;
                GameAudio.setSfxEnabled(false);
                GameAudio.setMusicEnabled(false);
            } else {
                // Platform requests unmute – restore user's previous preferences
                Settings.soundEnabled = preMuteSoundEnabled;
                Settings.musicEnabled = preMuteMusicEnabled;
                GameAudio.setSfxEnabled(Settings.soundEnabled);
                GameAudio.setMusicEnabled(Settings.musicEnabled);
            }
        }
    }

    // ── Game lifecycle ──

    function gameplayStart() {
        const s = sdk();
        if (sdkAvailable && s) {
            try { s.game.gameplayStart(); } catch (e) { /* ignore */ }
        }
    }

    function gameplayStop() {
        const s = sdk();
        if (sdkAvailable && s) {
            try { s.game.gameplayStop(); } catch (e) { /* ignore */ }
        }
    }

    function happyTime() {
        const s = sdk();
        if (sdkAvailable && s && typeof s.game.happyTime === "function") {
            try { s.game.happyTime(); } catch (e) { /* ignore */ }
        }
    }

    function loadingStart() {
        const s = sdk();
        if (sdkAvailable && s && typeof s.game.loadingStart === "function") {
            try { s.game.loadingStart(); } catch (e) { /* ignore */ }
        }
    }

    function loadingStop() {
        const s = sdk();
        if (sdkAvailable && s && typeof s.game.loadingStop === "function") {
            try { s.game.loadingStop(); } catch (e) { /* ignore */ }
        }
    }

    // ── Ads ──

    /** Request a midgame ad (between waves). Mutes audio during ad. */
    function requestMidroll() {
        if (!APP_CONFIG.monetization) return;
        const s = sdk();
        if (!sdkAvailable || !s) return;
        try {
            s.ad.requestAd("midgame", {
                adStarted()  {
                    gameplayStop();
                    GameAudio.setSfxEnabled(false);
                    GameAudio.setMusicEnabled(false);
                },
                adFinished() {
                    if (Settings.soundEnabled) GameAudio.setSfxEnabled(true);
                    if (Settings.musicEnabled) GameAudio.setMusicEnabled(true);
                    gameplayStart();
                },
                adError() {
                    if (Settings.soundEnabled) GameAudio.setSfxEnabled(true);
                    if (Settings.musicEnabled) GameAudio.setMusicEnabled(true);
                    gameplayStart();
                },
            });
        } catch (e) {
            console.warn("[CrazyGames] requestAd('midgame') failed:", e);
        }
    }

    /** Request a rewarded ad (e.g. revive). Returns promise<boolean> indicating success. */
    function requestRewarded() {
        return new Promise((resolve) => {
            if (!APP_CONFIG.monetization) { resolve(false); return; }
            const s = sdk();
            if (!sdkAvailable || !s) { resolve(false); return; }
            try {
                s.ad.requestAd("rewarded", {
                    adStarted()  {
                        gameplayStop();
                        GameAudio.setSfxEnabled(false);
                        GameAudio.setMusicEnabled(false);
                    },
                    adFinished() {
                        if (Settings.soundEnabled) GameAudio.setSfxEnabled(true);
                        if (Settings.musicEnabled) GameAudio.setMusicEnabled(true);
                        gameplayStart();
                        resolve(true);
                    },
                    adError() {
                        if (Settings.soundEnabled) GameAudio.setSfxEnabled(true);
                        if (Settings.musicEnabled) GameAudio.setMusicEnabled(true);
                        gameplayStart();
                        resolve(false);
                    },
                });
            } catch (e) {
                resolve(false);
            }
        });
    }

    // ── User ──

    function getUser() { return currentUser; }

    /** Prompt user to log in. Returns user object or null. */
    async function promptLogin() {
        const s = sdk();
        if (!sdkAvailable || !s) return null;
        try {
            currentUser = await s.user.showAuthPrompt();
            return currentUser;
        } catch (e) {
            return null;
        }
    }

    function isAvailable() { return sdkAvailable; }

    // ── Leaderboards ──

    /**
     * Encrypt a numeric score using AES-GCM (required by the CrazyGames MVP leaderboard).
     * @param {number} score – the plain numeric score to encrypt
     * @param {string} encryptionKey – 32-byte base64-encoded key
     * @returns {Promise<string>} base64-encoded ciphertext (IV + ciphertext)
     */
    async function encryptScore(score, encryptionKey) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const algorithm = { name: "AES-GCM", iv };

        const keyBytes = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));

        const cryptoKey = await window.crypto.subtle.importKey(
            "raw", keyBytes, algorithm, false, ["encrypt"],
        );

        const dataBuffer = new TextEncoder().encode(score.toString());
        const encryptedBuffer = await window.crypto.subtle.encrypt(algorithm, cryptoKey, dataBuffer);

        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        return btoa(Array.from(combined, c => String.fromCharCode(c)).join(""));
    }

    /**
     * Encode game stats into a single composite score for leaderboard ranking.
     * Formula: wave × 100000 + kills × 100 + seconds_survived
     * This ensures wave is the primary sort key, kills secondary, time tertiary.
     */
    function encodeScore(wave, kills, timePlayed, won) {
        if (won) {
            // Winners always score above non-winners.
            // Fastest time = highest score: 10,000,000 - seconds_played.
            return 10000000 - Math.floor(timePlayed);
        }
        return wave * 100000 + kills * 100 + Math.floor(timePlayed);
    }

    /**
     * Encrypt and submit a score to the CrazyGames leaderboard.
     * Uses the MVP API: CrazyGames.SDK.user.submitScore({ encryptedScore }).
     * Always fires and-forget – the server always returns success to prevent
     * reverse-engineering of anti-cheat validation.
     */
    async function submitScore(wave, kills, timePlayed, won, context = {}) {
        if (!sdkAvailable || !currentUser) return;
        const s = sdk();
        if (!s) return;
        const score = encodeScore(wave, kills, timePlayed, won);
        try {
            const encryptedScore = await encryptScore(score, LEADERBOARD_ENCRYPTION_KEY);
            await s.user.submitScore({ encryptedScore });
            const runTag = `${context.gameMode || "normal"}/${context.challengeMode || "none"}`;
            console.log(`[CrazyGames] Score ${score} submitted to leaderboard (${runTag})`);
        } catch (e) {
            console.warn("[CrazyGames] submitScore failed:", e);
        }
    }

    /** Data persistence (cloud save via SDK.data) */
    async function saveData(key, value) {
        const s = sdk();
        if (sdkAvailable && s) {
            try { await s.data.setItem(key, value); return; } catch (e) { /* fallthrough */ }
        }
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }

    async function loadData(key) {
        const s = sdk();
        if (sdkAvailable && s) {
            try { return await s.data.getItem(key); } catch (e) { /* fallthrough */ }
        }
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    return {
        init,
        isAvailable,
        gameplayStart,
        gameplayStop,
        happyTime,
        loadingStart,
        loadingStop,
        requestMidroll,
        requestRewarded,
        getUser,
        promptLogin,
        submitScore,
        saveData,
        loadData,
    };
})();

// ─────────────────────────────────────────────
// §15  SETTINGS STORE
// ─────────────────────────────────────────────

const Settings = {
    soundEnabled:  true,
    musicEnabled:  true,
    shakeEnabled:  true,
    gameMode:      "normal",    // "normal" | "easy" | "hard"
    challengeMode: "none",      // dynamic ids from CHALLENGE_MODES
};

// ─────────────────────────────────────────────
// §16  UI / HUD DRAWING HELPERS
// ─────────────────────────────────────────────

/** Draw a rounded rect */
function drawRoundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawPanel(x, y, w, h, r = 8, opts = {}) {
    drawRoundRect(x, y, w, h, r);
    ctx.fillStyle = opts.fill || UI_THEME.panelFill;
    ctx.fill();
    if (opts.stroke !== false) {
        ctx.strokeStyle = opts.strokeColor || UI_THEME.panelStroke;
        ctx.lineWidth = opts.lineWidth || 1.2;
        ctx.stroke();
    }
}

/** Draw a stylised button, returns true if clicked */
function drawButton(text, x, y, w, h, hovered, fontSize) {
    const pulse = hovered ? (0.92 + 0.08 * Math.sin(frameNow * 0.012)) : 0.88;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, hovered ? "#7be6ff" : COLOR.accentHover);
    grad.addColorStop(1, hovered ? COLOR.accent : "#1f7ea8");
    drawRoundRect(x, y, w, h, 8);
    ctx.fillStyle = grad;
    ctx.globalAlpha = pulse;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hovered ? "rgba(197,247,255,0.95)" : "rgba(132,220,246,0.65)";
    ctx.lineWidth = hovered ? 1.8 : 1.2;
    ctx.stroke();
    if (!hovered) {
        drawRoundRect(x + 1, y + 1, w - 2, h - 2, 7);
        ctx.strokeStyle = "rgba(10,16,24,0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.fillStyle = UI_THEME.buttonTextMuted;
    ctx.font = uiFont(fontSize || 18, "bold");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, y + h / 2);
    return hovered && Mouse.clicked;
}

// ─────────────────────────────────────────────
// §17  MAIN GAME OBJECT
// ─────────────────────────────────────────────

const game = {
    state: STATE.START_MENU,
    player: null,
    bullets: [],
    enemies: [],
    xpOrbs: [],
    particles: [],
    lightningBolts: [],   // visual lightning effects
    frostWaves: [],       // visual frost nova rings
    flamePatches: [],     // flame trail damage zones
    damageNumbers: [],    // floating damage numbers
    trailParticles: [],   // player movement trail
    particlePool: [],
    damageNumberPool: [],
    camera: new Camera(),

    // Wave tracking
    wave: 0,
    waveKills: 0,
    waveKillsRequired: 0,
    spawnTimer: 0,
    spawnCooldown: 0,
    waveRestTimer: 0,
    waveActive: false,
    activeBoss: null,

    // ── Run events ──
    activeEvent: null,        // { id, def, wave } or null
    lastEventId: "",          // to avoid repeating the same event twice in a row
    eventHpRegen: 0,          // per-second HP regen granted by the fountain event
    eventShardCachePending: false,
    eventShardCarrier: null,  // the enemy currently holding the shard cache
    eventShardsEarned: 0,     // shards banked by events this run (cashed in on game over)
    bountyTarget: null,       // the marked elite from the hunt event
    ambushTimer: 0,           // burst timer while the ambush event runs
    ambushDir: null,          // { x, y } unit vector packs arrive from

    // ── Boss modifiers ──
    activeBossModifiers: [],  // defs rolled onto the current boss (for the HUD)

    // Upgrade
    upgradeChoices: [],
    upgradeQueue: [],        // level-ups that arrived while the screen was already open
    upgradeIsBonusWave: false,
    xpMagnetBonus: 0,

    // Wave event flags
    pendingBonusUpgrade: false,
    pendingBossType: null,
    pendingVictory: false,
    pendingEndboss: false,
    endbossActive: false,

    // Stats
    killCount: 0,
    timePlayed: 0,
    lastHighScoreRank: 0,  // rank achieved on last game over (0 = not a high score)
    lastRunShardGain: 0,
    lastLostItems: null,      // gear destroyed by the death penalty on the last run
    lastKeptItems: null,      // gear saved by Afterlife on the last run
    lastRunGameMode: "normal",
    lastRunChallengeMode: "none",
    lastRunChallengeLabel: "No Challenge",
    lastRunEventId: "",
    lastRunEventLabel: "",
    lastDailyReward: 0,
    lastPrestigeGain: 0,
    lastPrestigeTotal: 0,
    runShotsFired: 0,
    runShotsHit: 0,
    runUpgradesTaken: 0,
    runBossesDefeated: 0,

    // Kill combo
    comboCount: 0,
    comboTimer: 0,
    bestCombo: 0,
    comboSfxCooldown: 0,

    // Moment-to-moment polish feedback
    eventFlashTimer: 0,
    eventFlashColor: "rgba(255,255,255,0.2)",
    eventToastTimer: 0,
    eventToastText: "",
    eventToastColor: COLOR.accent,

    // Level up flash
    levelUpFlashTimer: 0,

    // Wave banner animation
    waveBannerTimer: 0,
    waveBannerText: "",

    // Run modifiers
    enemySpeedMult: 1,
    shardRewardMult: 1,
    gameSpeedIndex: 0,
    gameSpeedMult: 1,
    adBoosterActive: false,
    adBoosterPending: false,
    adBoosterLoading: false,
    shardCacheClaimedThisRun: false,
    shardCacheLoading: false,
    lastMidrollAt: -999,
    lastMidrollWave: 0,

    // Runtime quality state
    fpsEma: TARGET_FPS,
    perfSampleTimer: 0,
    lowPerf: false,
    perfPromptDecision: null,
    perfPromptVisible: false,

    // UX flow state
    tutorialDismissed: false,
    revivedThisRun: false,
    reviveInProgress: false,
    runFinalized: false,

    // Launch experiment variants
    expEarlyPacing: "control",
    expGameOverFlow: "reviveFirst",
    expRewardedCopy: "neutral",
    activeEventId: "",
    activeEventLabel: "",
    challengeAllowsRevive: true,

    // Shop scrolling
    shopScroll: 0,
    shopMaxScroll: 0,
    shopTelemetryLogged: false,

    // ── Loot UI ──
    inventoryScroll: 0,
    inventoryMaxScroll: 0,
    inventorySelectedId: null,   // item id selected in the inventory list
    chestsScroll: 0,
    chestReveal: null,           // { items, chest, phase, t, ... } reveal animation state
    enchantMenuOpen: false,
    enchantTargetId: null,
    lootToastText: "",
    lootToastTimer: 0,
    lootToastColor: COLOR.accent,

    // Cheat code state
    cheatProgress: 0,
    cheatRows: [],
    cheatScroll: 0,
    cheatMaxScroll: 0,

    transition: {
        active: false,
        timer: 0,
        duration: 0.22,
    },

    // ────── INITIALISE ──────

    init() {
        Input.init();
        Mouse.init();
        TouchControls.init();
        // Initialise CrazyGames SDK
        void CrazyGamesSDK.init().catch(() => {});
        this.resetGame();
    },

    resetGame() {
        const selectedChallenge = currentChallengeMode();
        Settings.challengeMode = selectedChallenge.id;
        this.player = new Player();
        this.bullets = [];
        this.enemies = [];
        this.xpOrbs = [];
        this.particles = [];
        this.lightningBolts = [];
        this.frostWaves = [];
        this.flamePatches = [];
        this.damageNumbers = [];
        this.trailParticles = [];
        this.particlePool = [];
        this.damageNumberPool = [];
        this.camera = new Camera();
        this.wave = 0;
        this.waveKills = 0;
        this.waveKillsRequired = 0;
        this.spawnTimer = 0;
        this.spawnCooldown = 0;
        this.waveRestTimer = 1;
        this.waveActive = false;
        this.activeBoss = null;
        // Run events
        this.activeEvent = null;
        this.lastEventId = "";
        this.eventHpRegen = 0;
        this.eventShardCachePending = false;
        this.eventShardCarrier = null;
        this.eventShardsEarned = 0;
        this.bountyTarget = null;
        this.ambushTimer = 0;
        this.ambushDir = null;
        this.activeBossModifiers = [];
        this.upgradeChoices = [];
        this.upgradeQueue = [];
        this.upgradeIsBonusWave = false;
        this.xpMagnetBonus = 0;
        this.pendingBonusUpgrade = false;
        this.pendingBossType = null;
        this.pendingVictory = false;
        this.pendingEndboss = false;
        this.endbossActive = false;
        this.killCount = 0;
        this.timePlayed = 0;
        this.lastHighScoreRank = 0;
        this.lastRunShardGain = 0;
        this.lastLostItems = null;
        this.lastKeptItems = null;
        this.lastRunGameMode = Settings.gameMode;
        this.lastRunChallengeMode = selectedChallenge.id;
        this.lastRunChallengeLabel = selectedChallenge.label;
        this.lastRunEventId = "";
        this.lastRunEventLabel = "";
        this.lastDailyReward = 0;
        this.lastPrestigeGain = 0;
        this.lastPrestigeTotal = 0;
        this.runShotsFired = 0;
        this.runShotsHit = 0;
        this.runUpgradesTaken = 0;
        this.runBossesDefeated = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.bestCombo = 0;
        this.comboSfxCooldown = 0;
        this.eventFlashTimer = 0;
        this.eventFlashColor = "rgba(255,255,255,0.2)";
        this.eventToastTimer = 0;
        this.eventToastText = "";
        this.eventToastColor = COLOR.accent;
        this.levelUpFlashTimer = 0;
        this.waveBannerTimer = 0;
        this.waveBannerText = "";
        this.enemySpeedMult = 1;
        this.shardRewardMult = 1;
        this.gameSpeedIndex = Progression.getGameSpeedIndex();
        this.gameSpeedMult = Progression.getGameSpeedMultiplier();
        this.adBoosterActive = false;
        this.shardCacheClaimedThisRun = false;
        this.shardCacheLoading = false;
        this.lastMidrollAt = -999;
        this.lastMidrollWave = 0;
        this.fpsEma = TARGET_FPS;
        this.perfSampleTimer = 0;
        this.lowPerf = false;
        this.perfPromptDecision = null;
        this.perfPromptVisible = false;
        this.tutorialDismissed = false;
        this.revivedThisRun = false;
        this.reviveInProgress = false;
        this.runFinalized = false;
        this.expEarlyPacing = Experiments.get("earlyPacing");
        this.expGameOverFlow = Experiments.get("gameOverFlow");
        this.expRewardedCopy = Experiments.get("rewardedCopy");
        this.activeEventId = "";
        this.activeEventLabel = "";
        this.challengeAllowsRevive = selectedChallenge.allowRevive !== false;
        this.shopScroll = 0;
        this.shopMaxScroll = 0;
        this.shopTelemetryLogged = false;
        this.cheatProgress = 0;
        this.cheatRows = [];
        this.cheatScroll = 0;
        this.cheatMaxScroll = 0;

        applyChallengeToRunState(this, this.player, selectedChallenge);

        if (this.adBoosterPending) {
            this.adBoosterPending = false;
            this.adBoosterActive = true;
            this.player.damage = Math.floor(this.player.damage * 1.12);
            this.player.fireRate *= 0.88;
            this.player.speed *= 1.08;
        }
    },

    currentBiome() {
        if (this.wave >= 15) return BIOMES[2];
        if (this.wave >= 8) return BIOMES[1];
        return BIOMES[0];
    },

    currentBiomeIndex() {
        if (this.wave >= 15) return 2;
        if (this.wave >= 8) return 1;
        return 0;
    },

    trackPerformance(dt) {
        const fps = dt > 0 ? 1 / dt : TARGET_FPS;
        this.fpsEma = lerp(this.fpsEma, fps, 0.08);
        this.perfSampleTimer += dt;
        if (this.perfSampleTimer < PERF_SAMPLE_WINDOW) return;
        this.perfSampleTimer = 0;

        // Player accepted performance mode for this run: keep it forced on.
        if (this.perfPromptDecision === "accept") {
            this.lowPerf = true;
            return;
        }

        if (!this.lowPerf && this.fpsEma < PERF_LOW_THRESHOLD) {
            // Ask once per run via a non-blocking in-canvas prompt. window.confirm()
            // would freeze the whole game loop (and is unreliable on game portals).
            if (this.perfPromptDecision !== "decline" &&
                this.perfPromptDecision !== "accept" &&
                !this.perfPromptVisible) {
                this.perfPromptVisible = true;
            }
        } else if (this.lowPerf && this.fpsEma > PERF_RECOVER_THRESHOLD) {
            this.lowPerf = false;
        }
    },

    getPerfPromptLayout() {
        const w = 452, h = 132;
        const x = CANVAS_W / 2 - w / 2;
        const y = CANVAS_H / 2 - h / 2;
        const bw = 186, bh = 36, gap = 16;
        const by = y + h - bh - 14;
        return {
            x, y, w, h,
            yes: { x: x + w / 2 - bw - gap / 2, y: by, w: bw, h: bh },
            no:  { x: x + w / 2 + gap / 2, y: by, w: bw, h: bh },
        };
    },

    /** Handles the performance-mode prompt. Returns true while it is open. */
    updatePerfPrompt() {
        // Never leave the prompt visible in a state where update() is not
        // processing it — otherwise it renders as a dead overlay.
        if (!this.perfPromptVisible) return false;
        const l = this.getPerfPromptLayout();
        const clickedYes = Mouse.clicked && Mouse.inRect(l.yes.x, l.yes.y, l.yes.w, l.yes.h);
        const clickedNo = Mouse.clicked && Mouse.inRect(l.no.x, l.no.y, l.no.w, l.no.h);

        // Accept both physical keys that can be labelled "Y" on the user's
        // keyboard. event.code is layout-agnostic: on QWERTY "Y" reports KeyY,
        // on QWERTZ the key printed "Z" sits in the same physical slot and also
        // reports KeyY — but users on other layouts may still reach for the key
        // that physically reports KeyZ, so treat it as "yes" too. The button is
        // labelled "ENABLE (Y)" because Y reads as "yes"; both codes are accepted
        // behind the scenes.
        if (Input.just("KeyY") || Input.just("KeyZ") || clickedYes) {
            this.perfPromptDecision = "accept";
            this.lowPerf = true;
            this.perfPromptVisible = false;
            this.triggerEventToast("Performance mode ON", "#ffcc66", 1.4);
            return false;
        }
        // Escape is deliberately not handled here: it would both decline the prompt
        // and fall through to the pause shortcut in the same frame.
        if (Input.just("KeyN") || clickedNo) {
            this.perfPromptDecision = "decline";
            this.perfPromptVisible = false;
            return false;
        }
        return true;
    },

    drawPerfPrompt() {
        if (!this.perfPromptVisible) return;
        // Safety net: the prompt is only ever actionable during an active run.
        // If it somehow survives into a menu state, drop it instead of drawing
        // an overlay the player cannot dismiss.
        if (this.state !== STATE.GAMEPLAY &&
            this.state !== STATE.UPGRADE_SCREEN &&
            this.state !== STATE.PAUSED &&
            this.state !== STATE.SETTINGS &&
            this.state !== STATE.CHEAT_MENU) {
            this.perfPromptVisible = false;
            return;
        }
        const l = this.getPerfPromptLayout();

        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        drawPanel(l.x, l.y, l.w, l.h, 10, {
            fill: "rgba(8,10,24,0.97)",
            strokeColor: "#ffcc66",
            lineWidth: 1.6,
        });

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffcc66";
        ctx.font = uiFont(17, "bold");
        ctx.fillText("Low FPS detected", CANVAS_W / 2, l.y + 28);
        ctx.fillStyle = COLOR.text;
        ctx.font = uiFont(13);
        ctx.fillText(`Average ~${Math.max(1, Math.round(this.fpsEma))} FPS. Enable Performance Mode?`, CANVAS_W / 2, l.y + 54);
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(11);
        ctx.fillText("Fewer particles and effects for a smoother run.", CANVAS_W / 2, l.y + 76);

        const yesHover = Mouse.inRect(l.yes.x, l.yes.y, l.yes.w, l.yes.h);
        const noHover = Mouse.inRect(l.no.x, l.no.y, l.no.w, l.no.h);
        drawButton("ENABLE (Y)", l.yes.x, l.yes.y, l.yes.w, l.yes.h, yesHover, 14);
        drawButton("NOT NOW (N)", l.no.x, l.no.y, l.no.w, l.no.h, noHover, 14);
    },

    /** True when a rewarded revive is still available for the current run. */
    canOfferRevive() {
        return APP_CONFIG.monetization && this.challengeAllowsRevive && !this.revivedThisRun;
    },

    async tryRewardedRevive() {
        if (!this.canOfferRevive() || this.reviveInProgress) return;
        this.reviveInProgress = true;
        const ok = await CrazyGamesSDK.requestRewarded();
        if (ok && this.state === STATE.GAME_OVER) {
            this.player.alive = true;
            this.player.hp = Math.max(1, Math.floor(this.player.maxHp * 0.45));
            this.player.invTimer = 1.2;
            this.state = STATE.GAMEPLAY;
            this.revivedThisRun = true;
            CrazyGamesSDK.gameplayStart();
            GameAudio.startMusic(this.currentBiomeIndex());
        }
        this.reviveInProgress = false;
    },

    async requestMenuAdBooster() {
        if (!APP_CONFIG.monetization) return;
        if (this.adBoosterLoading || this.adBoosterPending) return;
        this.adBoosterLoading = true;
        const ok = await CrazyGamesSDK.requestRewarded();
        if (ok) this.adBoosterPending = true;
        this.adBoosterLoading = false;
    },

    async claimRunShardCache() {
        if (!APP_CONFIG.monetization) return;
        if (this.shardCacheLoading || this.shardCacheClaimedThisRun) return;
        if (!(this.player && this.player.alive && this.wave > 0)) return;
        this.shardCacheLoading = true;
        const ok = await CrazyGamesSDK.requestRewarded();
        if (ok) {
            const bonus = 20 + Math.floor(this.wave * 2);
            Progression.addShards(bonus);
            this.shardCacheClaimedThisRun = true;
        }
        this.shardCacheLoading = false;
    },

    isBossWave(waveNum) {
        return waveNum === 5 || waveNum === 10 || waveNum === 15 || waveNum === 20;
    },

    /**
     * Base HP for a boss on the given wave, before the boss-modifier multipliers.
     * Prefers the explicit per-wave table in CFG.bosses.hpByWave (which keeps
     * bosses at a hand-tuned, beatable size) and falls back to the wave curve
     * for any boss wave that is not listed.
     */
    bossHpForWave(waveNum) {
        const table = CFG.bosses.hpByWave || {};
        const explicit = table[String(waveNum)] || table[waveNum];
        if (typeof explicit === "number" && explicit > 0) return explicit;
        return Math.floor(ENEMY_BASE_HP * Math.pow(WAVE_HP_SCALE, waveNum - 1));
    },

    /**
     * Roll 0..max modifiers onto a freshly spawned boss, apply their onSpawn
     * hooks and store the defs for the HUD. Returns the applied defs.
     */
    rollBossModifiers(boss) {
        this.activeBossModifiers = [];
        if (!BOSS_MODIFIERS_ENABLED) return this.activeBossModifiers;
        let max;
        if (boss.type === "endboss") max = CFG.bossModifiers.maxForEndboss;
        else if (boss.type === "bigboss") max = CFG.bossModifiers.maxForBigboss;
        else max = CFG.bossModifiers.maxForMiniboss;

        // The very first boss (wave 5) keeps it simple: exactly one modifier.
        if (this.wave === 5) max = 1;

        const pool = CFG.bossModifiers.pool || {};
        const ids = Object.keys(BOSS_MODIFIER_DEFS).filter((id) => (pool[id] || 0) > 0);
        const chosen = [];
        for (let i = 0; i < max && ids.length > 0; i++) {
            let total = 0;
            for (const id of ids) total += pool[id];
            let roll = Math.random() * total;
            let picked = ids[ids.length - 1];
            for (const id of ids) {
                roll -= pool[id];
                if (roll <= 0) { picked = id; break; }
            }
            // Remove from the pool so the same modifier is never rolled twice.
            ids.splice(ids.indexOf(picked), 1);
            const def = BOSS_MODIFIER_DEFS[picked];
            chosen.push(def);
            if (typeof def.onSpawn === "function") def.onSpawn(boss, this);
        }
        this.activeBossModifiers = chosen;
        boss.modDefs = chosen;
        if (chosen.length > 0) {
            const names = chosen.map((d) => d.label).join(" + ");
            this.triggerEventToast(`${boss.displayName || "Boss"}: ${names}`, chosen[0].color, 2.2);
        }
        return chosen;
    },

    // ────── RUN EVENT SYSTEM ──────

    /** True when a wave is eligible to host a run event. */
    isEventWave(waveNum) {
        if (!EVENTS_ENABLED) return false;
        if (waveNum < EVENT_START_WAVE) return false;
        if (waveNum >= EVENT_EXCLUDE_FROM) return false;
        // Boss waves stay clean so the boss fight is never muddied by an event.
        if (this.isBossWave(waveNum)) return false;
        // Final boss setup wave stays clean too.
        if (waveNum >= WAVE_MAX) return false;
        return (waveNum - EVENT_START_WAVE) % EVENT_INTERVAL === 0;
    },

    /** Weighted pick from CFG.events.pool, skipping the previous event. */
    pickEventDef() {
        const pool = CFG.events.pool || {};
        const ids = Object.keys(EVENT_DEFS).filter((id) => {
            if (id === this.lastEventId) return false;      // no repeats in a row
            const w = pool[id];
            return typeof w === "number" && w > 0;
        });
        if (ids.length === 0) return null;
        let total = 0;
        for (const id of ids) total += pool[id];
        let roll = Math.random() * total;
        for (const id of ids) {
            roll -= pool[id];
            if (roll <= 0) return EVENT_DEFS[id];
        }
        return EVENT_DEFS[ids[ids.length - 1]];
    },

    /** Start an event for the current wave. */
    startEvent(def) {
        if (!def) return;
        this.activeEvent = { id: def.id, def, wave: this.wave };
        this.lastEventId = def.id;
        this.lastRunEventId = def.id;
        this.lastRunEventLabel = def.label;
        if (typeof def.apply === "function") def.apply(this);

        // Announce it
        this.waveBannerTimer = 2.4;
        this.waveBannerText = `◆ ${def.label} ◆`;
        this.triggerEventToast(def.desc, def.color, 2.6);
        this.triggerEventFlash(def.color, 0.25);
        GameAudio.sfxWaveStart();
    },

    /** End the current event and run its cleanup. */
    endEvent() {
        const ev = this.activeEvent;
        if (!ev) return;
        if (typeof ev.def.expire === "function") ev.def.expire(this);
        this.activeEvent = null;
        // Clear per-event transient state that is not covered by expire().
        this.eventShardCarrier = null;
        this.bountyTarget = null;
        this.ambushDir = null;
        this.ambushTimer = 0;
    },

    /** Multiplier accessors so callers never touch the def shape directly. */
    eventMult(key) {
        const ev = this.activeEvent;
        if (!ev || !ev.def) return 1;
        const v = ev.def[key];
        return typeof v === "number" ? v : 1;
    },

    eventForceElite() {
        return !!(this.activeEvent && this.activeEvent.def && this.activeEvent.def.forceElite);
    },

    /** Per-frame event upkeep. Called from updateGameplay while a wave runs. */
    updateEvent(dt) {
        const ev = this.activeEvent;
        if (!ev) return;
        // Fountain regen
        if (this.eventHpRegen > 0 && this.player && this.player.alive) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.eventHpRegen * dt);
        }
        // Ambush: release packs on a timer instead of the normal spawn drip.
        if (ev.id === "ambush") {
            this.ambushTimer -= dt;
            if (this.ambushTimer <= 0) {
                this.ambushTimer += CFG.events.ambush.burstInterval;
                this.spawnAmbushPack();
            }
        }
    },

    maybeRequestMidroll() {
        if (!APP_CONFIG.monetization) return;
        if (this.wave < 2) return;
        if (this.pendingVictory || this.wave >= WAVE_MAX) return;
        if (this.isBossWave(this.wave)) return;
        if (this.timePlayed - this.lastMidrollAt < 90) return;
        if (this.wave - this.lastMidrollWave < 3) return;

        this.lastMidrollAt = this.timePlayed;
        this.lastMidrollWave = this.wave;
        CrazyGamesSDK.requestMidroll();
    },

    earlyPacingMultiplier() {
        if (this.expEarlyPacing !== "softstart") return 1;
        if (this.timePlayed > 60) return 1;
        return 0.88;
    },

    getSpeedSelectorLayout() {
        const portrait = isPortraitMobile();
        const pad = portrait ? 12 : 16;
        const buttonW = portrait ? 34 : 38;
        const buttonH = portrait ? 18 : 20;
        const gap = 4;
        const cols = 3;
        const rows = 2;
        const innerW = cols * buttonW + (cols - 1) * gap;
        const panelW = innerW + 16;
        const panelH = 24 + rows * buttonH + gap + 10;
        const x = CANVAS_W - pad - panelW;
        const y = pad + 62;

        const buttons = [];
        for (let i = 0; i < GAME_SPEED_OPTIONS.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            buttons.push({
                index: i,
                mult: GAME_SPEED_OPTIONS[i],
                x: x + 8 + col * (buttonW + gap),
                y: y + 26 + row * (buttonH + gap),
                w: buttonW,
                h: buttonH,
            });
        }

        return { x, y, panelW, panelH, buttons };
    },

    updateGameSpeedSelection() {
        if (!Progression.isGameSpeedUnlocked() || !Mouse.clicked) return;
        const layout = this.getSpeedSelectorLayout();
        const maxUnlockedIdx = Progression.getMaxGameSpeedIndex();
        for (let i = 0; i < layout.buttons.length; i++) {
            const b = layout.buttons[i];
            if (b.index > maxUnlockedIdx) continue;
            if (!Mouse.inRect(b.x, b.y, b.w, b.h)) continue;
            Progression.setGameSpeedIndex(b.index);
            this.gameSpeedIndex = Progression.getGameSpeedIndex();
            this.gameSpeedMult = Progression.getGameSpeedMultiplier();
            return;
        }
    },

    commitLossIfNeeded() {
        if (this.runFinalized) return;
        const runContext = this.getRunContext();
        this.lastHighScoreRank = HighScores.submit(this.wave, this.killCount, this.timePlayed, false, runContext);
        this.finalizeRun(false);
        // Death penalty: equipped gear is destroyed unless it carries Afterlife.
        // Unequipped inventory stays safe, so the risk is entirely in what you wear.
        const penalty = Progression.applyDeathPenalty();
        this.lastLostItems = penalty.lost;
        this.lastKeptItems = penalty.kept;
        if (this.lastHighScoreRank === 1) {
            GameAudio.sfxNewHighScore();
            CrazyGamesSDK.happyTime();
        }
        CrazyGamesSDK.submitScore(this.wave, this.killCount, this.timePlayed, false, runContext);
        this.runFinalized = true;
    },

    getRunContext() {
        return {
            gameMode: Settings.gameMode,
            challengeMode: this.lastRunChallengeMode,
            challengeLabel: this.lastRunChallengeLabel,
            eventId: this.lastRunEventId,
            eventLabel: this.lastRunEventLabel,
        };
    },

    // ────── GAME LOOP ──────

    update(dt) {
        this.updateTransition(dt);

        // The one-time performance prompt is drawn on top of every state, so it
        // must also be handled in every state. Keeping this here (instead of only
        // in updateGameplay) prevents the prompt from becoming an unresponsive
        // overlay during UPGRADE_SCREEN / PAUSED / GAME_OVER / VICTORY.
        const perfPromptOpen = this.updatePerfPrompt();
        if (perfPromptOpen) return;

        switch (this.state) {
            case STATE.START_MENU:   this.updateStartMenu(dt); break;
            case STATE.CHANGELOGS:   this.updateChangelogs(dt); break;
            case STATE.SHOP:         this.updateShop(dt); break;
            case STATE.INVENTORY:    this.updateInventory(dt); break;
            case STATE.CHESTS:       this.updateChests(dt); break;
            case STATE.LOCKER:       this.updateLocker(dt); break;
            case STATE.STATS:        this.updateStats(dt); break;
            case STATE.GAMEPLAY:     this.updateGameplay(dt);  break;
            case STATE.PAUSED:       this.updatePaused(dt);  break;
            case STATE.CHEAT_MENU:   this.updateCheatMenu(dt); break;
            case STATE.UPGRADE_SCREEN: this.updateUpgrade(dt); break;
            case STATE.SETTINGS:     this.updateSettings(dt);  break;
            case STATE.GAME_OVER:    this.updateGameOver(dt);  break;
            case STATE.VICTORY:      this.updateVictory(dt);   break;
        }
    },

    draw() {
        // Clear
        ctx.fillStyle = (this.state === STATE.GAMEPLAY || this.state === STATE.UPGRADE_SCREEN || this.state === STATE.GAME_OVER)
            ? this.currentBiome().bg
            : COLOR.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        switch (this.state) {
            case STATE.START_MENU:   this.drawStartMenu();   break;
            case STATE.CHANGELOGS:   this.drawChangelogs();  break;
            case STATE.SHOP:         this.drawShop();         break;
            case STATE.INVENTORY:    this.drawInventory();    break;
            case STATE.CHESTS:       this.drawChests();       break;
            case STATE.LOCKER:       this.drawLocker();       break;
            case STATE.STATS:        this.drawStats();        break;
            case STATE.GAMEPLAY:     this.drawGameplay();     break;
            case STATE.PAUSED:       this.drawSettings();     break;
            case STATE.CHEAT_MENU:
                this.drawGameplay();
                this.drawCheatMenuOverlay();
                break;
            case STATE.UPGRADE_SCREEN:
                this.drawGameplay();  // gameplay as background
                this.drawUpgradeOverlay();
                break;
            case STATE.SETTINGS:     this.drawSettings();     break;
            case STATE.GAME_OVER:
                this.drawGameplay();  // gameplay as background
                this.drawGameOverOverlay();
                break;
            case STATE.VICTORY:      this.drawVictory();      break;
        }

        this.drawTransitionOverlay();
    },

    updateTransition(dt) {
        if (!this.transition.active) return;
        this.transition.timer = Math.max(0, this.transition.timer - dt);
        if (this.transition.timer <= 0) {
            this.transition.active = false;
        }
    },

    drawTransitionOverlay() {
        if (!this.transition.active) return;
        const t = 1 - (this.transition.timer / this.transition.duration);
        const alpha = Math.sin(Math.PI * clamp(t, 0, 1)) * 0.26;
        if (alpha <= 0.001) return;
        ctx.fillStyle = UI_THEME.transitionTint;
        ctx.globalAlpha = alpha;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.globalAlpha = 1;
    },

    setState(nextState, withTransition = true) {
        if (this.state === nextState) return;
        if (withTransition) {
            this.transition.active = true;
            this.transition.timer = this.transition.duration;
        }
        this.state = nextState;
    },

    // ────── START MENU ──────

    updateStartMenu() {
        // "Play" button
        if (Input.just("Enter") || Input.just("Space")) {
            this.startGame();
        }

        if (Input.just("KeyK")) {
            this.setState(STATE.SHOP);
        }

        if (Input.just("KeyB")) {
            void this.requestMenuAdBooster();
        }
    },

    drawStartMenu() {
        const profile = Progression.get();
        const daily = Progression.getDailyView();

        this.drawMenuBackdrop();

        // ── Status strip (top-left, clear of the centred title) ──
        this.drawStatusStrip(profile);

        // ── Version badge (top-right, balances the status strip) ──
        // GAME_VERSION already reads like "beta 17.10:2", so no extra "v".
        const verText = GAME_VERSION;
        ctx.font = uiFont(11, "bold");
        const verW = ctx.measureText(verText).width + 28;
        const verX = CANVAS_W - verW - 24;
        drawPanel(verX, 66, verW, 54, 12, {
            fill: "rgba(8,12,26,0.9)",
            strokeColor: "rgba(102,204,255,0.24)",
            lineWidth: 1.2,
        });
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(9, "bold");
        ctx.fillText("BUILD", verX + verW / 2, 81);
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(11, "bold");
        ctx.fillText(verText, verX + verW / 2, 101, verW - 12);

        // ── Title block ──
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const titleGlow = 0.55 + 0.15 * Math.sin(frameNow * 0.002);
        ctx.save();
        ctx.shadowColor = `rgba(51,204,255,${titleGlow})`;
        ctx.shadowBlur = 28;
        ctx.fillStyle = "#eaf9ff";
        ctx.font = uiFont(56, "bold");
        ctx.fillText("ROGUEWAVE", CANVAS_W / 2, 96);
        ctx.restore();
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(13, "bold");
        ctx.fillText("S U R V I V O R   R O G U E L I T E", CANVAS_W / 2, 136);

        // ── Centre: mode + challenge + PLAY ──
        // Wrap the two setup rows in a subtle panel so they read as one group
        // ("configure your run") separate from the PLAY action below.
        const cW = 520;
        const cX = CANVAS_W / 2 - cW / 2;
        const panelY = 152;
        drawPanel(cX - 22, panelY, cW + 44, 196, 14, {
            fill: "rgba(8,12,26,0.72)",
            strokeColor: "rgba(102,204,255,0.18)",
            lineWidth: 1.2,
        });
        let y = panelY + 24;

        y = this.drawModeRow(cX, y, cW);
        y = this.drawChallengeGrid(cX, y + 20, cW);

        // PLAY: the single most prominent element.
        const playW = cW + 44;
        const playH = 76;
        const playY = panelY + 196 + 24;
        const playX = cX - 22;
        const playHov = Mouse.inRect(playX, playY, playW, playH);
        const pulse = 0.94 + 0.06 * Math.sin(frameNow * 0.006);
        ctx.save();
        ctx.shadowColor = `rgba(51,204,255,${playHov ? 0.85 : 0.45})`;
        ctx.shadowBlur = playHov ? 34 : 20;
        const pg = ctx.createLinearGradient(playX, playY, playX, playY + playH);
        pg.addColorStop(0, playHov ? "#8beeff" : "#4fd8ff");
        pg.addColorStop(1, playHov ? "#33ccff" : "#1f9fd0");
        drawRoundRect(playX, playY, playW, playH, 14);
        ctx.fillStyle = pg;
        ctx.globalAlpha = pulse;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(220,250,255,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#062033";
        ctx.font = uiFont(32, "bold");
        ctx.fillText("▶  PLAY", CANVAS_W / 2, playY + playH / 2);
        if (playHov && Mouse.clicked) this.startGame();

        // ── Daily mission: a slim pill directly under PLAY, framing the action ──
        const dailyY = playY + playH + 14;
        const dailyDone = daily.completed;
        const dailyText = `◆ Daily: ${daily.label}   ${daily.progress}/${daily.target}${dailyDone ? "  ✓" : ""}   ·   Streak ${daily.streak}`;
        ctx.font = uiFont(12, "bold");
        const dailyTextW = ctx.measureText(dailyText).width;
        const pillW = dailyTextW + 56;
        const pillH = 32;
        const pillX = CANVAS_W / 2 - pillW / 2;
        const pillAccent = dailyDone ? "#66ff99" : "#ffcc66";
        ctx.save();
        ctx.shadowColor = hexToRgba(pillAccent, 0.45);
        ctx.shadowBlur = dailyDone ? 16 : 10;
        drawRoundRect(pillX, dailyY, pillW, pillH, 16);
        ctx.fillStyle = dailyDone ? "rgba(102,255,153,0.14)" : "rgba(255,204,102,0.12)";
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = hexToRgba(pillAccent, 0.7);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = pillAccent;
        ctx.fillText(dailyText, CANVAS_W / 2, dailyY + pillH / 2);

        // ── Bottom navigation: six even buttons, one clean row ──
        this.drawMenuNav();

        // ── Footer hint ──
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(12);
        const aimHint = Settings.gameMode === "hard"
            ? (isMobile ? "Touch right side to aim" : "Mouse to aim")
            : "Auto-aim";
        ctx.fillText(`WASD / Arrows to move  ·  ${aimHint}  ·  ENTER to play`, CANVAS_W / 2, CANVAS_H - 18);
    },

    /** Soft ambient backdrop shared by the menu screens. */
    drawMenuBackdrop() {
        const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
        g.addColorStop(0, "#0a0f25");
        g.addColorStop(0.5, "#0d1533");
        g.addColorStop(1, "#090e1f");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        // Faint horizon lines, fading toward the edges.
        for (let i = 0; i < 7; i++) {
            const yy = 60 + i * 92;
            ctx.fillStyle = `rgba(80,200,255,${0.05 - i * 0.005})`;
            ctx.fillRect(60 + i * 10, yy, CANVAS_W - 120 - i * 20, 1.5);
        }
    },

    /** Compact shards/prestige readout pinned top-left, level with the title. */
    drawStatusStrip(profile) {
        const w = 300, h = 54;
        const x = 24, y = 66;
        drawPanel(x, y, w, h, 12, {
            fill: "rgba(8,12,26,0.9)",
            strokeColor: "rgba(102,204,255,0.42)",
            lineWidth: 1.4,
        });
        const half = w / 2;

        // Divider between the two readouts.
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + half, y + 10);
        ctx.lineTo(x + half, y + h - 10);
        ctx.stroke();

        // Shards
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(9, "bold");
        ctx.fillText("SHARDS", x + half / 2, y + 15);
        ctx.fillStyle = "#66ff99";
        ctx.font = uiFont(20, "bold");
        ctx.fillText(`◆ ${profile.shards}`, x + half / 2, y + 34);

        // Prestige
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(9, "bold");
        ctx.fillText("PRESTIGE", x + half + half / 2, y + 15);
        ctx.fillStyle = "#ffd166";
        ctx.font = uiFont(20, "bold");
        ctx.fillText(`✦ ${profile.prestige?.count || 0}`, x + half + half / 2, y + 34);
    },

    /**
     * Mode picker: three equal cards in a row. Returns the y after the block.
     */
    drawModeRow(x, y, w) {
        const modes = [
            { id: "easy",   label: "EASY",   icon: "😊", desc: "Faster XP" },
            { id: "normal", label: "NORMAL", icon: "⚔️", desc: "Auto-aim" },
            { id: "hard",   label: "HARD",   icon: "💀", desc: "Manual aim" },
        ];
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(11, "bold");
        ctx.fillText("DIFFICULTY", x, y);

        const top = y + 16;
        const h = 56;
        const gap = 12;
        const cw = (w - gap * 2) / 3;

        for (let i = 0; i < modes.length; i++) {
            const m = modes[i];
            const mx = x + i * (cw + gap);
            const selected = Settings.gameMode === m.id;
            const hov = Mouse.inRect(mx, top, cw, h);

            drawRoundRect(mx, top, cw, h, 10);
            if (selected) {
                const g = ctx.createLinearGradient(mx, top, mx, top + h);
                g.addColorStop(0, "rgba(51,204,255,0.95)");
                g.addColorStop(1, "rgba(31,159,208,0.95)");
                ctx.fillStyle = g;
            } else {
                ctx.fillStyle = hov ? "rgba(51,204,255,0.16)" : "rgba(255,255,255,0.05)";
            }
            ctx.fill();
            ctx.strokeStyle = selected ? "#8beeff" : (hov ? "rgba(140,220,246,0.7)" : "rgba(255,255,255,0.14)");
            ctx.lineWidth = selected ? 2 : 1.3;
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.fillStyle = selected ? "#062033" : COLOR.text;
            ctx.font = uiFont(19);
            ctx.fillText(m.icon, mx + cw / 2, top + 17);
            ctx.font = uiFont(14, "bold");
            ctx.fillText(m.label, mx + cw / 2, top + 36);
            ctx.fillStyle = selected ? "#0a2a3a" : COLOR.textDim;
            ctx.font = uiFont(10);
            ctx.fillText(m.desc, mx + cw / 2, top + 48);

            if (hov && Mouse.clicked) Settings.gameMode = m.id;
        }
        return top + h;
    },

    /**
     * Challenge picker: one compact row of four chips. Returns the y after.
     */
    drawChallengeGrid(x, y, w) {
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(11, "bold");
        ctx.fillText("CHALLENGE", x, y);

        const top = y + 16;
        const h = 48;
        const gap = 10;
        const cw = (w - gap * (CHALLENGE_MODES.length - 1)) / CHALLENGE_MODES.length;

        for (let i = 0; i < CHALLENGE_MODES.length; i++) {
            const cm = CHALLENGE_MODES[i];
            const mx = x + i * (cw + gap);
            const selected = Settings.challengeMode === cm.id;
            const hov = Mouse.inRect(mx, top, cw, h);

            drawRoundRect(mx, top, cw, h, 9);
            if (selected) {
                const g = ctx.createLinearGradient(mx, top, mx, top + h);
                g.addColorStop(0, "rgba(120,255,175,0.95)");
                g.addColorStop(1, "rgba(80,220,140,0.95)");
                ctx.fillStyle = g;
            } else {
                ctx.fillStyle = hov ? "rgba(102,255,153,0.20)" : "rgba(255,255,255,0.06)";
            }
            ctx.fill();
            ctx.strokeStyle = selected ? "#c2ffd9" : (hov ? "rgba(102,255,153,0.7)" : "rgba(255,255,255,0.16)");
            ctx.lineWidth = selected ? 2 : 1.3;
            ctx.stroke();

            // Two lines: name + short effect, so the chips carry real info.
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = selected ? "#042314" : COLOR.text;
            ctx.font = uiFont(12, "bold");
            ctx.fillText(cm.label, mx + cw / 2, top + 18, cw - 10);
            ctx.fillStyle = selected ? "#0b3a22" : COLOR.textDim;
            ctx.font = uiFont(9);
            ctx.fillText(cm.desc, mx + cw / 2, top + 34, cw - 8);

            if (hov && Mouse.clicked) Settings.challengeMode = cm.id;
        }
        return top + h;
    },

    /** Bottom navigation bar: six even buttons with icon over label. */
    drawMenuNav() {
        const items = [
            { icon: "🎒", label: "LOCKER",    state: STATE.LOCKER },
            { icon: "🎁", label: "CHESTS",    state: STATE.CHESTS },
            { icon: "🛍", label: "SKINS",     state: STATE.SHOP },
            { icon: "📊", label: "STATS",      state: STATE.STATS },
            { icon: "⚙",  label: "SETTINGS",  state: STATE.SETTINGS },
            { icon: "📜", label: "CHANGELOG", state: STATE.CHANGELOGS },
        ];
        const n = items.length;
        const gap = 12;
        const totalW = 704;
        const bw = (totalW - gap * (n - 1)) / n;
        const bh = 64;
        const x0 = CANVAS_W / 2 - totalW / 2;
        const y = CANVAS_H - bh - 44;

        for (let i = 0; i < n; i++) {
            const it = items[i];
            const bx = x0 + i * (bw + gap);
            const hov = Mouse.inRect(bx, y, bw, bh);

            drawRoundRect(bx, y, bw, bh, 10);
            ctx.fillStyle = hov ? "rgba(51,204,255,0.16)" : "rgba(255,255,255,0.045)";
            ctx.fill();
            ctx.strokeStyle = hov ? "rgba(140,220,246,0.75)" : "rgba(255,255,255,0.12)";
            ctx.lineWidth = hov ? 1.8 : 1.2;
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = uiFont(22);
            ctx.fillStyle = COLOR.text;
            ctx.fillText(it.icon, bx + bw / 2, y + 22);
            ctx.font = uiFont(11, "bold");
            ctx.fillStyle = hov ? COLOR.accentHover : COLOR.textDim;
            ctx.fillText(it.label, bx + bw / 2, y + 46, bw - 8);

            if (hov && Mouse.clicked) this.setState(it.state);
        }
    },

    /** LOCKER: meta upgrades live here so the start menu stays clean. */
    drawLocker() {
        const profile = Progression.get();
        const skin = Progression.getSelectedSkin();

        this.drawMenuBackdrop();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(26, "bold");
        ctx.fillText("LOCKER", CANVAS_W / 2, 40);

        ctx.textAlign = "right";
        ctx.fillStyle = "#66ff99";
        ctx.font = uiFont(14, "bold");
        ctx.fillText(`◆ ${profile.shards}`, CANVAS_W - 24, 40);

        // ── Meta upgrades ──
        const px = 40, py = 84, pw = 460, ph = 372;
        drawPanel(px, py, pw, ph, 12, { fill: "rgba(8,12,26,0.9)" });
        ctx.textAlign = "left";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(14, "bold");
        ctx.fillText("PERMANENT UPGRADES", px + 18, py + 24);

        const rows = [
            { key: "hp",    label: "Vital Core",   bonus: "+10 max HP",      max: 8 },
            { key: "dmg",   label: "Pulse Cannon", bonus: "+2 base damage",  max: 8 },
            { key: "xp",    label: "Data Magnet",  bonus: "+10% XP gain",    max: 8 },
            { key: "speed", label: "Game Speed",   bonus: "unlocks a speed tier", max: GAME_SPEED_UNLOCK_MAX },
        ];
        const rowH = 72;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ry = py + 58 + i * rowH;
            const level = Progression.metaLevel(row.key);
            const cost = Progression.metaCost(row.key);
            const maxed = cost === null;

            drawRoundRect(px + 16, ry, pw - 32, rowH - 12, 8);
            ctx.fillStyle = "rgba(255,255,255,0.04)";
            ctx.fill();
            ctx.strokeStyle = maxed ? "rgba(102,255,153,0.45)" : "rgba(255,255,255,0.1)";
            ctx.lineWidth = 1.1;
            ctx.stroke();

            ctx.textAlign = "left";
            ctx.fillStyle = COLOR.text;
            ctx.font = uiFont(14, "bold");
            ctx.fillText(row.label, px + 30, ry + 20);
            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(11);
            ctx.fillText(row.bonus, px + 30, ry + 38);

            // Level pips
            const pipY = ry + 50;
            for (let lv = 0; lv < row.max; lv++) {
                const on = lv < level;
                drawRoundRect(px + 30 + lv * 15, pipY, 11, 5, 2);
                ctx.fillStyle = on ? "#66ff99" : "rgba(255,255,255,0.14)";
                ctx.fill();
            }

            const ubW = 116, ubH = 40;
            const ubX = px + pw - ubW - 28, ubY = ry + 12;
            const hov = !maxed && Mouse.inRect(ubX, ubY, ubW, ubH);
            drawRoundRect(ubX, ubY, ubW, ubH, 8);
            ctx.fillStyle = maxed ? "rgba(255,255,255,0.06)" : (hov ? "rgba(102,255,153,0.28)" : "rgba(102,255,153,0.14)");
            ctx.fill();
            ctx.strokeStyle = maxed ? "rgba(255,255,255,0.15)" : "#66ff99";
            ctx.lineWidth = 1.3;
            ctx.stroke();
            ctx.textAlign = "center";
            ctx.fillStyle = maxed ? COLOR.textDim : "#b9ffd6";
            ctx.font = uiFont(12, "bold");
            ctx.fillText(maxed ? "MAX" : `${cost} ◆`, ubX + ubW / 2, ubY + 14);
            ctx.font = uiFont(10);
            ctx.fillText(maxed ? `Lv ${level}/${row.max}` : `Lv ${level}  →  ${level + 1}`, ubX + ubW / 2, ubY + 29);
            if (hov && Mouse.clicked) Progression.buyMeta(row.key);
        }

        // ── Prestige + equipped skin ──
        const rx = 520, rw = CANVAS_W - rx - 40;
        drawPanel(rx, py, rw, 176, 12, { fill: "rgba(8,12,26,0.9)" });
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffd166";
        ctx.font = uiFont(14, "bold");
        ctx.fillText("PRESTIGE", rx + 18, py + 24);
        ctx.fillStyle = "#ffd166";
        ctx.font = uiFont(30, "bold");
        ctx.fillText(String(profile.prestige?.count || 0), rx + 18, py + 58);
        const allSkins = Progression.getSkinCatalog();
        const nextSkin = getNextPrestigeSkinPreview(allSkins, profile.prestige?.count || 0);
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(11);
        ctx.fillText(
            nextSkin ? `Next: ${nextSkin.name} at Prestige ${nextSkin.requirement}` : "Prestige track complete",
            rx + 18, py + 88, rw - 36
        );
        ctx.fillText("Clear the final boss to gain prestige.", rx + 18, py + 108, rw - 36);

        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(12, "bold");
        ctx.fillText("EQUIPPED SKIN", rx + 18, py + 140);
        ctx.fillStyle = skin.player;
        ctx.beginPath();
        ctx.arc(rx + 30, py + 160, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLOR.text;
        ctx.font = uiFont(12, "bold");
        ctx.fillText(skin.name, rx + 48, py + 160);

        // ── Gear summary (links into the full inventory) ──
        const gy = py + 196;
        drawPanel(rx, gy, rw, 176, 12, { fill: "rgba(8,12,26,0.9)" });
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(14, "bold");
        ctx.fillText("LOADOUT", rx + 18, gy + 24);

        const equippedAll = Progression.getEquippedAll();
        const setStatus = Progression.getSetStatus();
        let ly = gy + 50;
        const slotLabel = LOOT_CFG.slotLabels || {};
        for (const slot of LOOT_SLOTS) {
            const item = equippedAll[slot];
            ctx.fillStyle = item ? this.rarityColor(item.rarity) : COLOR.textDim;
            ctx.font = uiFont(11, item ? "bold" : "normal");
            const name = item ? item.name : "—";
            ctx.fillText(`${(slotLabel[slot] || slot)}: ${name}`, rx + 18, ly, rw - 36);
            ly += 18;
        }
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(10);
        const activeSets = Object.keys(setStatus).filter((k) => setStatus[k].have >= 2);
        ctx.fillText(
            activeSets.length ? `Active sets: ${activeSets.map((k) => setStatus[k].def.label).join(", ")}` : "No set bonuses active",
            rx + 18, gy + 160, rw - 36
        );

        // Open inventory / chests
        if (drawButton("OPEN GEAR", rx + 18, CANVAS_H - 66, 180, 38, Mouse.inRect(rx + 18, CANVAS_H - 66, 180, 38), 13)) {
            this.setState(STATE.INVENTORY);
        }
        if (drawButton("OPEN CHESTS", rx + 208, CANVAS_H - 66, 180, 38, Mouse.inRect(rx + 208, CANVAS_H - 66, 180, 38), 13)) {
            this.setState(STATE.CHESTS);
        }

        if (drawButton("BACK", 40, CANVAS_H - 66, 130, 38, Mouse.inRect(40, CANVAS_H - 66, 130, 38), 13)) {
            this.setState(STATE.START_MENU);
        }
    },

    /** STATS: high scores + daily, moved off the start menu. */
    drawStats() {
        const mode = gameModeLabel();
        const scores = HighScores.getAll();
        const daily = Progression.getDailyView();

        this.drawMenuBackdrop();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(26, "bold");
        ctx.fillText("STATS", CANVAS_W / 2, 40);

        // ── Daily mission card ──
        const dw = 420, dh = 210;
        const dx = 60, dy = 96;
        drawPanel(dx, dy, dw, dh, 12, { fill: "rgba(16,8,24,0.92)", strokeColor: "#ffcc66", lineWidth: 1.4 });
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffcc66";
        ctx.font = uiFont(15, "bold");
        ctx.fillText("DAILY MISSION", dx + 20, dy + 28);
        ctx.fillStyle = COLOR.text;
        ctx.font = uiFont(18, "bold");
        ctx.fillText(daily.label, dx + 20, dy + 60);
        ctx.fillStyle = daily.completed ? "#66ff99" : COLOR.textDim;
        ctx.font = uiFont(14);
        ctx.fillText(`${daily.progress} / ${daily.target}${daily.completed ? "   ✓ COMPLETED" : ""}`, dx + 20, dy + 88);
        // progress bar
        const barW = dw - 40;
        drawRoundRect(dx + 20, dy + 106, barW, 12, 6);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fill();
        const pct = clamp(daily.target > 0 ? daily.progress / daily.target : 0, 0, 1);
        drawRoundRect(dx + 20, dy + 106, barW * pct, 12, 6);
        ctx.fillStyle = daily.completed ? "#66ff99" : "#ffcc66";
        ctx.fill();
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(12);
        ctx.fillText(`Streak: ${daily.streak} day${daily.streak === 1 ? "" : "s"}`, dx + 20, dy + 142);
        ctx.fillText("Complete it for bonus shards.", dx + 20, dy + 166);

        // ── High scores ──
        const sw = CANVAS_W - dx - dw - 140;
        const sx = dx + dw + 40;
        drawPanel(sx, dy, sw, 420, 12, { fill: "rgba(8,12,26,0.9)", strokeColor: "rgba(102,204,255,0.4)", lineWidth: 1.4 });
        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(16, "bold");
        ctx.fillText(`🏆 ${mode} SCORES`, sx + sw / 2, dy + 30);

        ctx.font = uiFont(11, "bold");
        ctx.textAlign = "left";
        ctx.fillStyle = COLOR.textDim;
        ctx.fillText("RANK", sx + 24, dy + 60);
        ctx.fillText("WAVE", sx + 90, dy + 60);
        ctx.fillText("KILLS", sx + 180, dy + 60);
        ctx.textAlign = "right";
        ctx.fillText("TIME", sx + sw - 24, dy + 60);

        if (scores.length === 0) {
            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(13);
            ctx.fillText("No runs recorded yet. Play a run!", sx + sw / 2, dy + 140);
        }
        const shown = Math.min(scores.length, 9);
        for (let i = 0; i < shown; i++) {
            const s = scores[i];
            const ty = dy + 88 + i * 34;
            ctx.textAlign = "left";
            ctx.fillStyle = i === 0 ? "#ffd700" : COLOR.text;
            ctx.font = uiFont(14, i === 0 ? "bold" : "normal");
            ctx.fillText(`${i + 1}`, sx + 24, ty);
            ctx.fillText(`W${s.wave}`, sx + 90, ty);
            ctx.fillStyle = COLOR.textDim;
            ctx.fillText(`☠ ${s.kills}`, sx + 180, ty);
            ctx.textAlign = "right";
            ctx.fillText(formatTime(s.time), sx + sw - 24, ty);
        }

        if (drawButton("BACK", 60, CANVAS_H - 66, 130, 38, Mouse.inRect(60, CANVAS_H - 66, 130, 38), 13)) {
            this.setState(STATE.START_MENU);
        }
    },

    // ────── SKIN SHOP ──────

    updateShop(dt) {
        if (Input.just("Escape")) {
            this.shopTelemetryLogged = false;
            this.state = STATE.START_MENU;
        }

        const wheelStep = Mouse.wheelDelta;
        if (wheelStep !== 0) {
            this.shopScroll += wheelStep;
        }
        const touchStep = Mouse.touchScrollDelta;
        if (touchStep !== 0) {
            this.shopScroll += touchStep;
        }
        if (Input.held("ArrowDown") || Input.held("KeyS")) {
            this.shopScroll += 420 * dt;
        }
        if (Input.held("ArrowUp") || Input.held("KeyW")) {
            this.shopScroll -= 420 * dt;
        }
        this.shopScroll = clamp(this.shopScroll, 0, this.shopMaxScroll);
    },

    updateInventory(dt) {
        if (Input.just("Escape")) {
            if (this.enchantMenuOpen) {
                this.enchantMenuOpen = false;
                return;
            }
            this.state = STATE.START_MENU;
        }
        const wheelStep = Mouse.wheelDelta;
        if (wheelStep !== 0) this.inventoryScroll += wheelStep;
        const touchStep = Mouse.touchScrollDelta;
        if (touchStep !== 0) this.inventoryScroll += touchStep;
        if (Input.held("ArrowDown") || Input.held("KeyS")) this.inventoryScroll += 420 * dt;
        if (Input.held("ArrowUp") || Input.held("KeyW")) this.inventoryScroll -= 420 * dt;
        this.inventoryScroll = clamp(this.inventoryScroll, 0, this.inventoryMaxScroll);
        if (this.lootToastTimer > 0) this.lootToastTimer -= dt;
    },

    updateChests(dt) {
        if (Input.just("Escape")) {
            if (this.chestReveal) {
                // Only dismissable once the reveal has played out.
                if (this.chestRevealDone()) this.chestReveal = null;
                return;
            }
            this.state = STATE.START_MENU;
        }
        // Drive the chest-opening animation.
        this.updateChestReveal(dt);
        if (this.lootToastTimer > 0) this.lootToastTimer -= dt;
    },

    /** Simple menu screens that only need an ESC-to-back handler. */
    updateLocker(dt) {
        if (Input.just("Escape")) this.setState(STATE.START_MENU);
        if (this.lootToastTimer > 0) this.lootToastTimer -= dt;
    },

    updateStats(dt) {
        if (Input.just("Escape")) this.setState(STATE.START_MENU);
    },

    /** Toast helper for loot feedback. */
    showLootToast(text, color) {
        this.lootToastText = text;
        this.lootToastColor = color || COLOR.accent;
        this.lootToastTimer = 2.2;
    },

    /** Open a chest from the UI and start the reveal animation. */
    handleChestOpen(chestId) {
        const res = Progression.openChest(chestId);
        if (!res.ok) {
            if (res.reason === "shards") this.showLootToast("Not enough shards", COLOR.danger);
            else this.showLootToast("Chest unavailable", COLOR.danger);
            return;
        }
        this.startChestReveal(res.items, res.chest);
    },

    /**
     * Begin the chest-opening sequence. Phases:
     *   shake  - the chest rattles and builds up
     *   burst  - it pops open with a light burst
     *   cards  - item cards fly in one at a time with a rarity aura
     */
    startChestReveal(items, chest) {
        this.chestReveal = {
            items,
            chest,
            phase: "shake",
            t: 0,
            shakeDur: 0.75,
            burstDur: 0.45,
            perCard: 0.28,        // staggered card reveal
            cardsShown: 0,
            burstParticles: [],
            auraT: 0,
        };
        this.triggerEventFlash(chest.color || COLOR.accent, 0.18);
        if (chest.itemCount >= 3) GameAudio.sfxComboMilestone(5);
        else GameAudio.sfxComboMilestone(3);
    },

    updateChestReveal(dt) {
        const r = this.chestReveal;
        if (!r) return;
        r.t += dt;
        r.auraT += dt;

        if (r.phase === "shake") {
            if (r.t >= r.shakeDur) {
                r.phase = "burst";
                r.t = 0;
                // Spawn burst particles once when it pops.
                const col = r.chest.color || COLOR.accent;
                for (let i = 0; i < 40; i++) {
                    const a = randRange(0, Math.PI * 2);
                    const sp = randRange(120, 420);
                    r.burstParticles.push({
                        x: CANVAS_W / 2, y: CANVAS_H / 2,
                        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                        life: randRange(0.5, 1.1), age: 0,
                        color: Math.random() < 0.5 ? col : "#ffffff",
                    });
                }
                this.cameraShakeLoot = 0.15;
                GameAudio.sfxExplosion();
            }
        } else if (r.phase === "burst") {
            if (r.t >= r.burstDur) { r.phase = "cards"; r.t = 0; }
        } else if (r.phase === "cards") {
            const target = Math.min(r.items.length, Math.floor(r.t / r.perCard) + 1);
            if (target > r.cardsShown) {
                r.cardsShown = target;
                GameAudio.sfxEnemyDeath();
            }
        }

        // Advance burst particles
        for (let i = r.burstParticles.length - 1; i >= 0; i--) {
            const p = r.burstParticles[i];
            p.age += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
            if (p.age >= p.life) r.burstParticles.splice(i, 1);
        }
    },

    /** True once every card has been revealed and can be dismissed. */
    chestRevealDone() {
        const r = this.chestReveal;
        if (!r) return false;
        return r.phase === "cards" && r.cardsShown >= r.items.length;
    },

    // ────── LOOT UI DRAWING ──────

    rarityColor(rarity) {
        const def = LOOT_RARITIES[rarity];
        return (def && def.color) || "#cfd9e6";
    },

    rarityLabel(rarity) {
        const def = LOOT_RARITIES[rarity];
        return (def && def.label) || rarity;
    },

    affixLabel(statKey, value) {
        const def = LOOT_AFFIXES[statKey];
        const label = (def && def.label) || statKey;
        // Stats stored as fractions should read as percentages. Keep this in
        // sync with the stat keys used in config.js loot.affixes.
        const isPct = ["speedMult", "fireRateMult", "critChance", "critMult", "xpGain"].indexOf(statKey) !== -1;
        if (isPct) return `+${Math.round(value * 100)}% ${label}`;
        const rounded = Math.round(value * 10) / 10;
        return `+${rounded} ${label}`;
    },

    /**
     * Render one item card. Returns the card rect for hit-testing.
     * `compact` renders a shorter two-line variant for grids.
     */
    drawItemCard(item, x, y, w, h, opts = {}) {
        const isEquipped = opts.isEquipped;
        const selected = opts.selected;
        const rarityCol = this.rarityColor(item.rarity);

        drawRoundRect(x, y, w, h, 8);
        ctx.fillStyle = selected ? "rgba(102,204,255,0.16)" : "rgba(255,255,255,0.05)";
        ctx.fill();
        ctx.strokeStyle = rarityCol;
        ctx.lineWidth = selected ? 2.2 : 1.2;
        ctx.stroke();

        // Rarity stripe on the left edge.
        ctx.save();
        drawRoundRect(x, y, w, h, 8);
        ctx.clip();
        ctx.fillStyle = rarityCol;
        ctx.fillRect(x, y, 4, h);
        ctx.restore();

        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        // Name (+ slot)
        ctx.fillStyle = rarityCol;
        ctx.font = uiFont(UI_FONT.sm, "bold");
        ctx.fillText(item.name, x + 10, y + 8, w - 46);

        // Rarity + slot tag
        const slotLabel = (LOOT_CFG.slotLabels && LOOT_CFG.slotLabels[item.slot]) || item.slot;
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(UI_FONT.xxs);
        ctx.fillText(`${this.rarityLabel(item.rarity)} · ${slotLabel}`, x + 10, y + 24);

        // Set tag
        let ty = y + 38;
        if (item.set && LOOT_SETS[item.set]) {
            ctx.fillStyle = LOOT_SETS[item.set].color;
            ctx.font = uiFont(UI_FONT.xxs, "bold");
            ctx.fillText(`◈ ${LOOT_SETS[item.set].label}`, x + 10, ty);
            ty += 13;
        }

        // Affixes
        ctx.fillStyle = COLOR.text;
        ctx.font = uiFont(UI_FONT.xs);
        const maxAffix = opts.compact ? 2 : 6;
        for (let i = 0; i < item.affixes.length && i < maxAffix; i++) {
            const a = item.affixes[i];
            ctx.fillText(this.affixLabel(a.stat, a.value), x + 10, ty);
            ty += 14;
        }
        if (opts.compact && item.affixes.length > maxAffix) {
            ctx.fillStyle = COLOR.textDim;
            ctx.fillText(`+${item.affixes.length - maxAffix} more`, x + 10, ty);
            ty += 14;
        }

        // Enchantments
        for (const key of item.enchants) {
            const e = LOOT_ENCHANTS[key];
            if (!e) continue;
            ctx.fillStyle = e.color;
            ctx.font = uiFont(UI_FONT.xs, "bold");
            ctx.fillText(`✦ ${e.label}`, x + 10, ty);
            ty += 14;
        }

        // Equipped badge
        if (isEquipped) {
            ctx.fillStyle = "#66ff99";
            ctx.font = uiFont(UI_FONT.xxs, "bold");
            ctx.textAlign = "right";
            ctx.fillText("EQUIPPED", x + w - 10, y + 8);
            ctx.textAlign = "left";
        }
        return { x, y, w, h };
    },

    drawInventory() {
        ctx.fillStyle = COLOR.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const profile = Progression.get();
        const items = Progression.getItems();
        const equippedAll = Progression.getEquippedAll();
        const equippedIds = new Set(Object.keys(equippedAll).map((s) => equippedAll[s].id));

        // ── Header ──
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(UI_FONT.lg, "bold");
        ctx.fillText("INVENTORY", CANVAS_W / 2, 30);
        ctx.textAlign = "right";
        ctx.fillStyle = "#66ff99";
        ctx.font = uiFont(UI_FONT.sm, "bold");
        ctx.fillText(`◆ ${profile.shards}`, CANVAS_W - 24, 30);

        // ── Left: equipped loadout + set status ──
        const leftW = 300;
        const leftX = 24;
        const leftY = 58;
        drawPanel(leftX, leftY, leftW, CANVAS_H - 130, 8, { fill: UI_THEME.panelFillStrong });

        ctx.textAlign = "left";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(UI_FONT.sm, "bold");
        ctx.fillText("LOADOUT", leftX + 12, leftY + 18);

        let ly = leftY + 42;
        const slotH = 34;
        for (const slot of LOOT_SLOTS) {
            const item = equippedAll[slot];
            const slotLabel = (LOOT_CFG.slotLabels && LOOT_CFG.slotLabels[slot]) || slot;
            const rect = { x: leftX + 10, y: ly, w: leftW - 20, h: slotH };

            drawRoundRect(rect.x, rect.y, rect.w, rect.h, 6);
            ctx.fillStyle = item ? "rgba(102,204,255,0.10)" : "rgba(255,255,255,0.04)";
            ctx.fill();
            ctx.strokeStyle = item ? this.rarityColor(item.rarity) : "rgba(255,255,255,0.12)";
            ctx.lineWidth = 1.1;
            ctx.stroke();

            ctx.textAlign = "left";
            if (item) {
                const afx = Progression.hasAfterlife(item) ? " ✦" : "";
                ctx.fillStyle = this.rarityColor(item.rarity);
                ctx.font = uiFont(UI_FONT.xxs, "bold");
                ctx.fillText(`${slotLabel}: ${item.name}${afx}`, rect.x + 8, rect.y + 12, rect.w - 60);
                ctx.fillStyle = COLOR.textDim;
                ctx.font = uiFont(UI_FONT.xxs);
                ctx.fillText(item.affixes.map((a) => this.affixLabel(a.stat, a.value)).join(", "), rect.x + 8, rect.y + 24, rect.w - 60);
            } else {
                ctx.fillStyle = COLOR.textDim;
                ctx.font = uiFont(UI_FONT.xs);
                ctx.fillText(`${slotLabel}: empty`, rect.x + 8, rect.y + 12);
            }

            // Unequip button for filled slots.
            if (item) {
                const ux = rect.x + rect.w - 54;
                const uy = rect.y + 6;
                if (drawButton("OFF", ux, uy, 48, 22, Mouse.inRect(ux, uy, 48, 22), UI_FONT.xxs)) {
                    Progression.unequipSlot(slot);
                    this.showLootToast(`${item.name} unequipped`, COLOR.textDim);
                }
            }
            ly += slotH + 4;
        }

        // Set bonus readout
        ly += 6;
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(UI_FONT.xs, "bold");
        ctx.fillText("SET BONUSES", leftX + 12, ly);
        ly += 18;
        const setStatus = Progression.getSetStatus();
        for (const setId of Object.keys(setStatus)) {
            const st = setStatus[setId];
            ctx.fillStyle = st.have > 0 ? st.def.color : COLOR.textDim;
            ctx.font = uiFont(UI_FONT.xxs, "bold");
            ctx.fillText(`${st.def.label}  ${st.have}/${st.def.pieces}`, leftX + 12, ly);
            ly += 13;
            for (const b of st.def.bonuses) {
                const active = st.have >= b.need;
                ctx.fillStyle = active ? st.def.color : "rgba(255,255,255,0.28)";
                ctx.font = uiFont(UI_FONT.xxs);
                ctx.fillText(`  ${active ? "✔" : "·"} ${b.need}pc: ${b.desc}`, leftX + 12, ly, leftW - 30);
                ly += 12;
            }
        }

        // ── Right: item list ──
        const listX = leftX + leftW + 16;
        const listW = CANVAS_W - listX - 24;
        const listY = leftY;
        const listH = CANVAS_H - 130;
        drawPanel(listX, listY, listW, listH, 8, { fill: UI_THEME.panelFillStrong });

        ctx.textAlign = "left";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(UI_FONT.sm, "bold");
        ctx.fillText(`ITEMS (${items.length})`, listX + 12, listY + 18);

        if (items.length === 0) {
            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(UI_FONT.xs);
            ctx.fillText("No items yet. Open chests to find gear.", listX + 12, listY + 48);
            ctx.fillText("Unequipped items are safe. Equipped items", listX + 12, listY + 66);
            ctx.fillText("are lost on death unless they have Afterlife.", listX + 12, listY + 82);
        }

        // Two-column grid of item cards with scroll.
        const cardW = (listW - 40) / 2;
        const cardH = 118;
        const gap = 8;
        const viewTop = listY + 34;
        const viewH = listH - 44;
        const rows = Math.ceil(items.length / 2);
        const contentH = rows * (cardH + gap);
        this.inventoryMaxScroll = Math.max(0, contentH - viewH);
        const scroll = this.inventoryScroll;

        ctx.save();
        ctx.beginPath();
        ctx.rect(listX + 8, viewTop, listW - 16, viewH);
        ctx.clip();

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = listX + 12 + col * (cardW + gap);
            const cy = viewTop + row * (cardH + gap) - scroll;
            if (cy + cardH < viewTop - 20 || cy > viewTop + viewH + 20) continue;

            const rect = this.drawItemCard(item, cx, cy, cardW, cardH, {
                isEquipped: equippedIds.has(item.id),
                selected: this.inventorySelectedId === item.id,
            });

            // Click: select the item.
            if (Mouse.clicked && Mouse.inRect(rect.x, rect.y, rect.w, rect.h)) {
                this.inventorySelectedId = item.id;
            }
        }
        ctx.restore();

        // Scrollbar
        if (this.inventoryMaxScroll > 0) {
            const barH = viewH;
            const thumbH = Math.max(26, barH * (viewH / contentH));
            const travel = barH - thumbH;
            const t = this.inventoryMaxScroll > 0 ? scroll / this.inventoryMaxScroll : 0;
            drawRoundRect(listX + listW - 10, viewTop, 3, barH, 2);
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fill();
            drawRoundRect(listX + listW - 10, viewTop + travel * t, 3, thumbH, 2);
            ctx.fillStyle = "rgba(102,204,255,0.9)";
            ctx.fill();
        }

        // ── Selected item action bar ──
        const selItem = this.inventorySelectedId != null ? Progression.getItemById(this.inventorySelectedId) : null;
        const barY = CANVAS_H - 62;
        if (selItem) {
            const isEq = equippedIds.has(selItem.id);
            const bw = 150, bh = 34;
            const bx = CANVAS_W - 24 - bw * 2 - 10;
            const label = isEq ? "UNEQUIP" : "EQUIP";
            if (drawButton(label, bx, barY, bw, bh, Mouse.inRect(bx, barY, bw, bh), UI_FONT.xs)) {
                if (isEq) {
                    Progression.unequipSlot(selItem.slot);
                    this.showLootToast(`${selItem.name} unequipped`, COLOR.textDim);
                } else {
                    Progression.equipItem(selItem.id);
                    this.showLootToast(`${selItem.name} equipped`, this.rarityColor(selItem.rarity));
                }
            }
            const ex = bx + bw + 10;
            const canEnchant = (LOOT_RARITIES[selItem.rarity].enchantSlots || 0) > selItem.enchants.length;
            const enchantLabel = canEnchant ? `ENCHANT (${LOOT_CFG.enchantCost || 0}◆)` : "ENCHANT FULL";
            if (drawButton(enchantLabel, ex, barY, bw, bh, Mouse.inRect(ex, barY, bw, bh), UI_FONT.xxs) && canEnchant) {
                this.enchantMenuOpen = true;
                this.enchantTargetId = selItem.id;
            }
        } else {
            ctx.textAlign = "right";
            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(UI_FONT.xs);
            ctx.fillText("Select an item to equip or enchant", CANVAS_W - 24, barY + 17);
        }

        // ── Back ──
        if (drawButton("BACK", 24, CANVAS_H - 62, 120, 34, Mouse.inRect(24, CANVAS_H - 62, 120, 34), UI_FONT.xs)) {
            this.state = STATE.START_MENU;
        }

        // ── Enchant picker overlay ──
        if (this.enchantMenuOpen) this.drawEnchantPicker();

        // Toast
        this.drawLootToast();
    },

    drawEnchantPicker() {
        const item = this.enchantTargetId != null ? Progression.getItemById(this.enchantTargetId) : null;
        if (!item) { this.enchantMenuOpen = false; return; }

        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const w = 520, h = 420;
        const x = CANVAS_W / 2 - w / 2;
        const y = CANVAS_H / 2 - h / 2;
        drawPanel(x, y, w, h, 10, { fill: "rgba(8,10,24,0.97)", strokeColor: "#c38bff", lineWidth: 1.6 });

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#c38bff";
        ctx.font = uiFont(UI_FONT.md, "bold");
        ctx.fillText("ENCHANT", CANVAS_W / 2, y + 26);
        ctx.fillStyle = COLOR.text;
        ctx.font = uiFont(UI_FONT.xs);
        ctx.fillText(item.name, CANVAS_W / 2, y + 48);
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(UI_FONT.xxs);
        const maxSlots = LOOT_RARITIES[item.rarity].enchantSlots || 0;
        ctx.fillText(`${item.enchants.length}/${maxSlots} slots used · ${LOOT_CFG.enchantCost || 0} ◆ each`, CANVAS_W / 2, y + 66);

        const keys = Object.keys(LOOT_ENCHANTS);
        const rowH = 46;
        let ry = y + 86;
        ctx.textAlign = "left";
        for (const key of keys) {
            const e = LOOT_ENCHANTS[key];
            const already = item.enchants.indexOf(key) !== -1;
            const rect = { x: x + 16, y: ry, w: w - 32, h: rowH - 6 };

            drawRoundRect(rect.x, rect.y, rect.w, rect.h, 6);
            ctx.fillStyle = already ? "rgba(102,255,153,0.10)" : (Mouse.inRect(rect.x, rect.y, rect.w, rect.h) ? "rgba(195,139,255,0.16)" : "rgba(255,255,255,0.04)");
            ctx.fill();
            ctx.strokeStyle = already ? "#66ff99" : e.color;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = e.color;
            ctx.font = uiFont(UI_FONT.xs, "bold");
            ctx.fillText(e.label, rect.x + 10, rect.y + 14);
            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(UI_FONT.xxs);
            ctx.fillText(e.desc, rect.x + 10, rect.y + 28, rect.w - 130);

            ctx.textAlign = "right";
            ctx.fillStyle = already ? "#66ff99" : COLOR.text;
            ctx.font = uiFont(UI_FONT.xxs, "bold");
            ctx.fillText(already ? "APPLIED" : `APPLY ${LOOT_CFG.enchantCost || 0}◆`, rect.x + rect.w - 10, rect.y + 20);
            ctx.textAlign = "left";

            if (!already && Mouse.clicked && Mouse.inRect(rect.x, rect.y, rect.w, rect.h)) {
                const res = Progression.enchantItem(item.id, key);
                if (res.ok) {
                    this.showLootToast(`${e.label} applied to ${item.name}`, e.color);
                    this.enchantMenuOpen = false;
                } else if (res.reason === "shards") {
                    this.showLootToast("Not enough shards", COLOR.danger);
                } else if (res.reason === "full") {
                    this.showLootToast("No free enchant slot", COLOR.danger);
                }
            }
            ry += rowH;
        }

        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(UI_FONT.xxs);
        ctx.fillText("ESC or click CLOSE to cancel", CANVAS_W / 2, y + h - 32);
        if (drawButton("CLOSE", CANVAS_W / 2 - 60, y + h - 26, 120, 20, Mouse.inRect(CANVAS_W / 2 - 60, y + h - 26, 120, 20), UI_FONT.xxs)) {
            this.enchantMenuOpen = false;
        }
    },

    drawChests() {
        ctx.fillStyle = COLOR.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const profile = Progression.get();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR.accent;
        ctx.font = uiFont(UI_FONT.lg, "bold");
        ctx.fillText("CHESTS", CANVAS_W / 2, 30);
        ctx.textAlign = "right";
        ctx.fillStyle = "#66ff99";
        ctx.font = uiFont(UI_FONT.sm, "bold");
        ctx.fillText(`◆ ${profile.shards}`, CANVAS_W - 24, 30);

        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(UI_FONT.xs);
        ctx.fillText("Open chests to roll gear. Equip what helps — but equipped gear is lost on death.", CANVAS_W / 2, 54);

        // Chest cards laid out in a row. Only three tiers now, so give each
        // card more room than the old four-across layout.
        const count = LOOT_CHESTS.length;
        const cardW = Math.min(250, (CANVAS_W - 60 - (count - 1) * 20) / count);
        const cardH = 330;
        const totalW = count * cardW + (count - 1) * 20;
        let cx = CANVAS_W / 2 - totalW / 2;
        const cy = 104;

        for (const chest of LOOT_CHESTS) {
            const hover = Mouse.inRect(cx, cy, cardW, cardH);
            drawRoundRect(cx, cy, cardW, cardH, 10);
            ctx.fillStyle = hover ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.045)";
            ctx.fill();
            ctx.strokeStyle = chest.color;
            ctx.lineWidth = hover ? 2.2 : 1.4;
            ctx.stroke();

            // Chest icon with a rarity-tinted glow behind it.
            const icx = cx + cardW / 2;
            const icy = cy + 60;
            const g = ctx.createRadialGradient(icx, icy, 0, icx, icy, 58);
            g.addColorStop(0, hexToRgba(chest.color, hover ? 0.34 : 0.2));
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(icx - 58, icy - 58, 116, 116);
            this.drawChestSprite(icx, icy, 0.82, chest.color, 0);

            ctx.textAlign = "center";
            ctx.fillStyle = chest.color;
            ctx.font = uiFont(UI_FONT.sm, "bold");
            ctx.fillText(chest.label, icx, cy + 118, cardW - 16);

            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(UI_FONT.xxs);
            // Wrap the description over as many lines as it needs.
            const words = (chest.desc || "").split(" ");
            let line = "";
            let ly = cy + 138;
            for (const word of words) {
                const test = line ? line + " " + word : word;
                if (ctx.measureText(test).width > cardW - 24 && line) {
                    ctx.fillText(line, icx, ly);
                    ly += 13;
                    line = word;
                } else {
                    line = test;
                }
            }
            if (line) ctx.fillText(line, icx, ly);

            // Item-count badge so the value is readable at a glance.
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            const badgeW = 96, badgeH = 20;
            drawRoundRect(icx - badgeW / 2, cy + cardH - 100, badgeW, badgeH, 6);
            ctx.fill();
            ctx.fillStyle = COLOR.text;
            ctx.font = uiFont(UI_FONT.xxs, "bold");
            ctx.fillText(`${chest.itemCount} ITEM${chest.itemCount > 1 ? "S" : ""}`, icx, cy + cardH - 90);

            // Price + button
            ctx.fillStyle = "#66ff99";
            ctx.font = uiFont(UI_FONT.md, "bold");
            ctx.fillText(`◆ ${chest.cost}`, icx, cy + cardH - 66);

            const bw = cardW - 24, bh = 36;
            const bx = cx + 12, by = cy + cardH - 52;
            const affordable = profile.shards >= chest.cost;
            if (drawButton("OPEN", bx, by, bw, bh, Mouse.inRect(bx, by, bw, bh), UI_FONT.sm) && affordable) {
                this.handleChestOpen(chest.id);
            } else if (!affordable) {
                ctx.fillStyle = COLOR.danger;
                ctx.font = uiFont(UI_FONT.xxs);
                ctx.fillText("not enough shards", icx, by - 8);
            }

            cx += cardW + 14;
        }

        if (drawButton("BACK", 24, CANVAS_H - 62, 120, 34, Mouse.inRect(24, CANVAS_H - 62, 120, 34), UI_FONT.xs)) {
            this.state = STATE.START_MENU;
        }

        // Reveal overlay
        if (this.chestReveal) this.drawChestReveal();
        this.drawLootToast();
    },

    drawChestReveal() {
        const r = this.chestReveal;
        const t = frameNow;

        // Dim backdrop, a touch darker during the build-up so the burst pops.
        const dim = r.phase === "cards" ? 0.78 : 0.86;
        ctx.fillStyle = `rgba(0,0,0,${dim})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const cx = CANVAS_W / 2;
        const cy = CANVAS_H / 2;

        // ── Phase: shake. Chest rattles, glow builds. ──
        if (r.phase === "shake") {
            const prog = Math.min(1, r.t / r.shakeDur);
            const amp = 2 + prog * 9;
            const ox = Math.sin(t * 0.05) * amp;
            const oy = Math.cos(t * 0.063) * amp * 0.6;
            const pulse = 0.35 + 0.65 * prog;

            // Build-up glow behind the chest
            const glowR = 90 + prog * 150;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
            g.addColorStop(0, `rgba(255,255,255,${0.22 * pulse})`);
            g.addColorStop(0.45, hexToRgba(r.chest.color, 0.5 * pulse));
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

            this.drawChestSprite(cx + ox, cy + oy, 1 + prog * 0.06, r.chest.color, 0);

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffffff";
            ctx.globalAlpha = 0.5 + 0.5 * prog;
            ctx.font = uiFont(UI_FONT.md, "bold");
            ctx.fillText("OPENING…", cx, cy + 120);
            ctx.globalAlpha = 1;
        }

        // ── Phase: burst. Burst particles + expanding light ring. ──
        if (r.phase === "burst" || r.phase === "cards") {
            const bp = r.phase === "burst" ? Math.min(1, r.t / r.burstDur) : 1;

            // Expanding ring
            if (r.phase === "burst") {
                const ringR = 40 + bp * 300;
                ctx.beginPath();
                ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
                ctx.strokeStyle = hexToRgba(r.chest.color, (1 - bp) * 0.8);
                ctx.lineWidth = 6 * (1 - bp) + 1;
                ctx.stroke();
            }

            // Burst particles
            for (const p of r.burstParticles) {
                const a = Math.max(0, 1 - p.age / p.life);
                ctx.globalAlpha = a;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3 * a + 1, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // While bursting, keep the chest visible with an opening lid.
            if (r.phase === "burst") {
                this.drawChestSprite(cx, cy, 1, r.chest.color, bp);
            }
        }

        // ── Phase: cards. Staggered reveal with rarity aura. ──
        if (r.phase === "cards") {
            const items = r.items;
            const cols = Math.min(3, Math.max(1, items.length));
            const cardW = 230;
            const cardH = 130;
            const gap = 12;
            const totalW = cols * cardW + (cols - 1) * gap;
            const rows = Math.ceil(items.length / cols);
            const totalH = rows * cardH + (rows - 1) * gap;
            const startX = CANVAS_W / 2 - totalW / 2;
            const startY = CANVAS_H / 2 - totalH / 2 + 10;

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = r.chest.color;
            ctx.font = uiFont(UI_FONT.md, "bold");
            ctx.fillText(`${r.chest.label} opened`, CANVAS_W / 2, startY - 40);

            for (let i = 0; i < items.length; i++) {
                if (i >= r.cardsShown) break;
                const col = i % cols;
                const row = Math.floor(i / cols);
                const tx = startX + col * (cardW + gap);
                const ty = startY + row * (cardH + gap);

                // Fly-in + fade for the newest card.
                const isNewest = i === r.cardsShown - 1;
                const local = isNewest ? clamp(r.t - i * r.perCard, 0, 1) : 1;
                const ease = 1 - Math.pow(1 - local, 3);   // ease-out cubic
                const scale = 0.72 + 0.28 * ease;
                const alpha = local;
                const offY = (1 - ease) * 26;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(tx + cardW / 2, ty + cardH / 2 + offY);
                ctx.scale(scale, scale);
                ctx.translate(-(tx + cardW / 2), -(ty + cardH / 2));

                // Rarity aura ring that pulses while fresh.
                if (isNewest) {
                    const rc = this.rarityColor(items[i].rarity);
                    const pulse = 0.5 + 0.5 * Math.sin(t * 0.02);
                    ctx.save();
                    ctx.shadowColor = rc;
                    ctx.shadowBlur = 24 + pulse * 16;
                    drawRoundRect(tx, ty, cardW, cardH, 8);
                    ctx.strokeStyle = hexToRgba(rc, 0.55 + pulse * 0.35);
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.restore();
                }

                this.drawItemCard(items[i], tx, ty, cardW, cardH, {});
                ctx.restore();
            }

            // Hint only once everything is on screen.
            if (this.chestRevealDone()) {
                const bl = 0.55 + 0.45 * Math.sin(t * 0.006);
                ctx.globalAlpha = bl;
                ctx.textAlign = "center";
                ctx.fillStyle = COLOR.textDim;
                ctx.font = uiFont(UI_FONT.xs);
                ctx.fillText("Click or press ESC to continue", CANVAS_W / 2, startY + totalH + 34);
                ctx.globalAlpha = 1;

                if (Mouse.clicked || Input.just("Escape") || Input.just("Enter")) {
                    this.chestReveal = null;
                }
            }
        }
    },

    /**
     * Draw the chest box itself. `openAmount` 0..1 lifts and tilts the lid so
     * the opening can be animated.
     */
    drawChestSprite(x, y, scale, color, openAmount) {
        const w = 92 * scale;
        const h = 62 * scale;
        const bx = x - w / 2;
        const by = y - h / 2;

        // Body
        drawRoundRect(bx, by, w, h, 6);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // strap
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(bx, by + h * 0.55, w, h * 0.10);

        // Lid: pivots upward as it opens.
        const lidH = h * 0.42;
        const lift = openAmount * 16 * scale;
        const tilt = openAmount * 0.22;
        ctx.save();
        ctx.translate(bx + w / 2, by - lift);
        ctx.rotate(-tilt);
        drawRoundRect(-w / 2, -lidH, w, lidH, 5);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(-w / 2 + 4, -lidH + 4, w - 8, 3);
        ctx.restore();

        // Interior glow when open
        if (openAmount > 0.05) {
            const g = ctx.createLinearGradient(x, by, x, by + h * 0.5);
            g.addColorStop(0, `rgba(255,255,255,${0.5 * openAmount})`);
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(bx + 4, by, w - 8, h * 0.5);
        }
    },

    drawLootToast() {
        if (this.lootToastTimer <= 0) return;
        const alpha = Math.min(1, this.lootToastTimer / 0.5);
        ctx.globalAlpha = alpha;
        const w = 420, h = 38;
        const x = CANVAS_W / 2 - w / 2;
        const y = CANVAS_H - 108;
        drawPanel(x, y, w, h, 8, { fill: "rgba(8,10,24,0.92)", strokeColor: this.lootToastColor, lineWidth: 1.4 });
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.lootToastColor;
        ctx.font = uiFont(UI_FONT.sm, "bold");
        ctx.fillText(this.lootToastText, CANVAS_W / 2, y + h / 2, w - 20);
        ctx.globalAlpha = 1;
    },

    drawShop() {
        const layoutMode = getViewportLayoutMode();
        const compactLayout = layoutMode === "compact";
        const narrowLayout = layoutMode === "narrow";
        const profile = Progression.get();
        const featured = Progression.getFeaturedSkinCatalog();
        const allSkins = Progression.getSkinCatalog();
        const skinAssetTelemetry = SkinAssets.getTelemetry();
        const prestigeCount = Progression.getPrestigeCount();
        const prestigeSkinsTotal = allSkins.filter((s) => s.prestigeSkin).length;

        const drawLockedButton = (text, x, y, w, h, fontSize) => {
            drawRoundRect(x, y, w, h, 8);
            ctx.fillStyle = "rgba(88,94,112,0.72)";
            ctx.fill();
            ctx.strokeStyle = "rgba(170,176,196,0.34)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.font = `bold ${fontSize || 18}px 'Segoe UI', Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, x + w / 2, y + h / 2);
        };

        if (!this.shopTelemetryLogged) {
            console.info("[SkinAssets] Telemetry", skinAssetTelemetry);
            this.shopTelemetryLogged = true;
        }

        const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
        bgGrad.addColorStop(0, "#0e1228");
        bgGrad.addColorStop(0.5, "#121a3b");
        bgGrad.addColorStop(1, "#0b0f22");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = COLOR.accent;
        ctx.font = compactLayout ? "bold 36px 'Segoe UI', Arial, sans-serif" : (narrowLayout ? "bold 42px 'Segoe UI', Arial, sans-serif" : "bold 46px 'Segoe UI', Arial, sans-serif");
        ctx.textAlign = "center";
        ctx.fillText("🛍 SKIN SHOP", CANVAS_W / 2, compactLayout ? 58 : 66);
        ctx.fillStyle = "#9fc6ff";
        ctx.font = compactLayout ? "12px 'Segoe UI', Arial, sans-serif" : "13px 'Segoe UI', Arial, sans-serif";
        if (SHOW_DEV_INFO) {
            ctx.fillText("Shop config is loaded from skinshop.txt", CANVAS_W / 2, compactLayout ? 78 : 88);
            ctx.font = compactLayout ? "10px 'Segoe UI', Arial, sans-serif" : "11px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#8fb0e6";
            ctx.fillText(
                `Asset telemetry  ok:${skinAssetTelemetry.loadSuccess}  missing:${skinAssetTelemetry.loadFailed}  fallback retries:${skinAssetTelemetry.fallbackRetries}  placeholders:${skinAssetTelemetry.placeholderRenders}  •  Prestige clears:${prestigeCount}/${prestigeSkinsTotal}`,
                CANVAS_W / 2,
                compactLayout ? 94 : 104
            );
        }

        const shardPanelW = compactLayout ? 182 : 200;
        const shardPanelH = compactLayout ? 38 : 44;
        const shardPanelX = CANVAS_W - shardPanelW - (compactLayout ? 18 : 30);
        const shardPanelY = compactLayout ? 24 : 28;
        drawRoundRect(shardPanelX, shardPanelY, shardPanelW, shardPanelH, 8);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fill();
        ctx.strokeStyle = "#66ff99";
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = "#66ff99";
        ctx.font = compactLayout ? "bold 15px 'Segoe UI', Arial, sans-serif" : "bold 18px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`◆ SHARDS ${profile.shards}`, shardPanelX + 12, shardPanelY + (compactLayout ? 24 : 28));

        // Featured section
        const fX = compactLayout ? 22 : 44;
        const fY = compactLayout ? 106 : 114;
        const fW = CANVAS_W - (compactLayout ? 44 : 88);
        const fH = compactLayout ? 204 : (narrowLayout ? 210 : 220);
        drawRoundRect(fX, fY, fW, fH, 12);
        ctx.fillStyle = "rgba(6,8,22,0.9)";
        ctx.fill();
        ctx.strokeStyle = "#ffcc66";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = "#ffcc66";
        ctx.font = compactLayout ? "bold 16px 'Segoe UI', Arial, sans-serif" : "bold 18px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("FEATURED", fX + 16, fY + 26);

        const fCount = Math.max(1, featured.length);
        const cardGap = compactLayout ? 10 : 14;
        const cardW = Math.floor((fW - 32 - (fCount - 1) * cardGap) / fCount);
        const cardH = compactLayout ? 150 : 162;
        const cardY = fY + 40;

        for (let i = 0; i < featured.length; i++) {
            const s = featured[i];
            const x = fX + 16 + i * (cardW + cardGap);
            const hov = Mouse.inRect(x, cardY, cardW, cardH);
            drawRoundRect(x, cardY, cardW, cardH, 10);
            ctx.fillStyle = hov ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.06)";
            ctx.fill();
            ctx.strokeStyle = s.selected ? COLOR.accent : (hov ? "#aac8ff" : "#41537a");
            ctx.lineWidth = s.selected ? 2 : 1.2;
            ctx.stroke();

            ctx.fillStyle = withAlpha(s.glow, 0.28);
            ctx.beginPath();
            ctx.arc(x + cardW / 2, cardY + 42, 22, 0, Math.PI * 2);
            ctx.fill();
            drawSkinIcon(x + cardW / 2, cardY + 42, 13, s);

            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.text;
            ctx.font = compactLayout ? "bold 12px 'Segoe UI', Arial, sans-serif" : "bold 14px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(s.name, x + cardW / 2, cardY + 80, cardW - 14);

            ctx.fillStyle = s.unlocked ? (s.selected ? COLOR.accent : COLOR.textDim) : "#ffcc66";
            ctx.font = compactLayout ? "11px 'Segoe UI', Arial, sans-serif" : "12px 'Segoe UI', Arial, sans-serif";
            const priceLabel = s.cost <= 0 ? "Free" : `${s.cost} shards`;
            const stateLabel = s.prestigeLocked
                ? `Prestige ${s.prestigeRequirement} required`
                : (s.prestigeSkin
                    ? (s.selected ? "Selected" : `Prestige ${s.prestigeRequirement} reward`)
                    : (s.unlocked ? (s.selected ? "Selected" : "Owned") : priceLabel));
            ctx.fillText(stateLabel, x + cardW / 2, cardY + 100, cardW - 14);

            // A card shows either the prestige badge or the placeholder hint – never
            // both, they used to be drawn on the same line.
            const featureAssetStatus = SkinAssets.getStatus(s.asset || "");
            if (s.prestigeSkin) {
                ctx.fillStyle = s.prestigeLocked ? "#ffcc66" : "#ffd700";
                ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
                ctx.fillText("PRESTIGE", x + cardW / 2, cardY + 114, cardW - 14);
            } else if (featureAssetStatus.state === "missing") {
                ctx.fillStyle = "#ffb366";
                ctx.font = "10px 'Segoe UI', Arial, sans-serif";
                ctx.fillText("Placeholder art", x + cardW / 2, cardY + 114, cardW - 14);
            }

            const btnW = cardW - 22;
            const btnH = compactLayout ? 30 : 32;
            const btnX = x + 11;
            const btnY = cardY + cardH - 42;
            const btnHover = Mouse.inRect(btnX, btnY, btnW, btnH);
            const actionLabel = s.prestigeLocked ? "LOCKED" : (s.selected ? "EQUIPPED" : (s.unlocked ? "EQUIP" : "BUY"));
            if (s.prestigeLocked) {
                drawLockedButton(actionLabel, btnX, btnY, btnW, btnH, 14);
            } else if (drawButton(actionLabel, btnX, btnY, btnW, btnH, btnHover, 14) && !s.selected) {
                Progression.unlockOrSelectSkin(s.id);
            }
        }

        // All skins section
        const aX = compactLayout ? 22 : 44;
        const aY = fY + fH + 16;
        const aW = CANVAS_W - (compactLayout ? 44 : 88);
        const aH = Math.max(compactLayout ? 198 : 200, CANVAS_H - aY - 78);
        drawRoundRect(aX, aY, aW, aH, 12);
        ctx.fillStyle = "rgba(6,8,22,0.9)";
        ctx.fill();
        ctx.strokeStyle = "#66ccff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "#66ccff";
        ctx.font = compactLayout ? "bold 15px 'Segoe UI', Arial, sans-serif" : "bold 16px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("ALL SKINS", aX + 16, aY + 24);

        const cols = compactLayout ? 2 : (narrowLayout ? 3 : 4);
        const itemGap = 10;
        const itemW = Math.floor((aW - 32 - (cols - 1) * itemGap) / cols);
        const itemH = compactLayout ? 84 : (narrowLayout ? 80 : 74);
        const listStartY = aY + 38;
        const listViewportH = aH - 52;
        const rowCount = Math.ceil(allSkins.length / cols);
        const rowGap = compactLayout ? 8 : 10;
        const contentH = rowCount > 0 ? (rowCount * itemH + (rowCount - 1) * rowGap) : 0;
        this.shopMaxScroll = Math.max(0, contentH - listViewportH);
        this.shopScroll = clamp(this.shopScroll, 0, this.shopMaxScroll);

        // Clip list content to panel viewport so overflow can be scrolled.
        ctx.save();
        drawRoundRect(aX + 10, listStartY - 4, aW - 20, listViewportH + 8, 8);
        ctx.clip();

        for (let i = 0; i < allSkins.length; i++) {
            const s = allSkins[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = aX + 16 + col * (itemW + itemGap);
            const y = listStartY + row * (itemH + rowGap) - this.shopScroll;

            const visible = y + itemH >= listStartY && y <= listStartY + listViewportH;
            if (!visible) continue;

            const hov = Mouse.inRect(x, y, itemW, itemH);

            drawRoundRect(x, y, itemW, itemH, 8);
            ctx.fillStyle = s.selected ? "rgba(51,204,255,0.24)" : (hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)");
            ctx.fill();
            ctx.strokeStyle = s.selected ? COLOR.accent : "#45566f";
            ctx.lineWidth = 1.1;
            ctx.stroke();

            drawSkinIcon(x + 16, y + 20, 8, s);

            ctx.textAlign = "left";
            ctx.fillStyle = COLOR.text;
            ctx.font = compactLayout ? "bold 11px 'Segoe UI', Arial, sans-serif" : "bold 12px 'Segoe UI', Arial, sans-serif";
            // Prestige skins reserve space on the right for their badge.
            ctx.fillText(s.name, x + 30, y + 18, s.prestigeSkin ? itemW - 88 : itemW - 34);
            if (s.prestigeSkin) {
                // Badge lives on the title row; as its own line it collided with the
                // ownership label directly below.
                ctx.fillStyle = s.prestigeLocked ? "#ffcc66" : "#ffd700";
                ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "right";
                ctx.fillText("PRESTIGE", x + itemW - 8, y + 16);
                ctx.textAlign = "left";
            }
            ctx.fillStyle = s.unlocked ? (s.selected ? COLOR.accent : COLOR.textDim) : "#ffcc66";
            ctx.font = compactLayout ? "10px 'Segoe UI', Arial, sans-serif" : "11px 'Segoe UI', Arial, sans-serif";
            const assetStatus = SkinAssets.getStatus(s.asset || "");
            const ownershipLabel = s.prestigeLocked
                ? `Prestige ${s.prestigeRequirement} required`
                : (s.prestigeSkin
                    ? (s.selected ? "Selected" : `Prestige ${s.prestigeRequirement} reward`)
                    : (s.unlocked ? (s.selected ? "Selected" : "Owned") : `${s.cost} shards`));
            const secondaryLabel = s.prestigeSkin
                ? (s.prestigeLocked ? "Achievement reward" : "Prestige reward")
                : (assetStatus.state === "missing" ? "Placeholder" : "");
            const labelJoiner = secondaryLabel ? " • " : "";
            ctx.fillText(`${ownershipLabel}${labelJoiner}${secondaryLabel}`, x + 30, y + 34, itemW - 34);

            const btnW = compactLayout ? 78 : 86;
            const btnH = compactLayout ? 22 : 24;
            const btnX = x + itemW - btnW - 8;
            const btnY = y + itemH - btnH - 6;
            const btnHover = Mouse.inRect(btnX, btnY, btnW, btnH);
            const actionLabel = s.prestigeLocked ? "LOCKED" : (s.selected ? "ON" : (s.unlocked ? "EQUIP" : "BUY"));
            if (s.prestigeLocked) {
                drawLockedButton(actionLabel, btnX, btnY, btnW, btnH, 12);
            } else if (drawButton(actionLabel, btnX, btnY, btnW, btnH, btnHover, 12) && !s.selected) {
                Progression.unlockOrSelectSkin(s.id);
            }
        }
        ctx.restore();

        // Draw scrollbar when content exceeds viewport.
        if (this.shopMaxScroll > 0) {
            const barX = aX + aW - 12;
            const barY = listStartY;
            const barW = 4;
            const barH = listViewportH;
            drawRoundRect(barX, barY, barW, barH, 2);
            ctx.fillStyle = "rgba(255,255,255,0.16)";
            ctx.fill();

            const thumbH = Math.max(24, barH * (listViewportH / contentH));
            const travel = barH - thumbH;
            const t = this.shopMaxScroll > 0 ? this.shopScroll / this.shopMaxScroll : 0;
            const thumbY = barY + travel * t;
            drawRoundRect(barX - 1, thumbY, barW + 2, thumbH, 2);
            ctx.fillStyle = "rgba(102,204,255,0.9)";
            ctx.fill();
        }

        const backW = compactLayout ? 220 : 250;
        const backH = compactLayout ? 40 : 44;
        const backX = CANVAS_W / 2 - backW / 2;
        const backY = CANVAS_H - (compactLayout ? 54 : 58);
        const backHover = Mouse.inRect(backX, backY, backW, backH);
        if (drawButton("← BACK TO MENU", backX, backY, backW, backH, backHover, compactLayout ? 15 : 17)) {
            this.shopTelemetryLogged = false;
            this.setState(STATE.START_MENU);
        }

        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = "12px 'Segoe UI', Arial, sans-serif";
        if (this.shopMaxScroll > 0) {
            ctx.font = "11px 'Segoe UI', Arial, sans-serif";
            // Draw scroll hint above the back button so it does not overlap it
            ctx.fillText("Scroll: mouse wheel or W/S / Up/Down", CANVAS_W / 2, backY - 12);
        }
    },

    // ────── CHANGELOGS ──────

    updateChangelogs() {
        if (Input.just("Escape")) {
            this.setState(STATE.START_MENU);
        }
    },

    drawChangelogs() {
        ctx.fillStyle = COLOR.panel;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = COLOR.accent;
        ctx.font = "bold 38px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("📜 CHANGELOGS", CANVAS_W / 2, 70);

        const panelX = 120;
        const panelY = 110;
        const panelW = CANVAS_W - 240;
        const panelH = CANVAS_H - 210;
        drawRoundRect(panelX, panelY, panelW, panelH, 10);
        ctx.fillStyle = "rgba(8, 8, 24, 0.92)";
        ctx.fill();
        ctx.strokeStyle = COLOR.accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        let y = panelY + 30;
        if (CHANGELOG_ENTRIES.length === 0) {
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "15px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("No changelog data loaded.", panelX + 20, y);
            ctx.fillText("Make sure changelogs.txt is available.", panelX + 20, y + 24);
        } else {
            for (let i = 0; i < CHANGELOG_ENTRIES.length; i++) {
                const entry = CHANGELOG_ENTRIES[i];

                ctx.fillStyle = COLOR.accent;
                ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "left";
                ctx.fillText(entry.version, panelX + 20, y);
                y += 24;

                ctx.fillStyle = COLOR.text;
                ctx.font = "14px 'Segoe UI', Arial, sans-serif";
                for (let j = 0; j < entry.changes.length; j++) {
                    ctx.fillText(`- ${entry.changes[j]}`, panelX + 28, y);
                    y += 20;
                }

                y += 12;
                if (y > panelY + panelH - 26) {
                    ctx.fillStyle = COLOR.textDim;
                    ctx.font = "13px 'Segoe UI', Arial, sans-serif";
                    ctx.fillText("Add more screen space or pagination for additional entries.", panelX + 20, panelY + panelH - 12);
                    break;
                }
            }
        }

        const bw = 260, bh = 44;
        const bx = CANVAS_W / 2 - bw / 2;
        const by = CANVAS_H - 72;
        const backHover = Mouse.inRect(bx, by, bw, bh);
        if (drawButton("← BACK TO MENU", bx, by, bw, bh, backHover)) {
            this.setState(STATE.START_MENU);
        }

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "13px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Press ESC to return", CANVAS_W / 2, CANVAS_H - 92);
    },

    startGame() {
        this.resetGame();
        this.gameSpeedIndex = Progression.getGameSpeedIndex();
        this.gameSpeedMult = Progression.getGameSpeedMultiplier();
        this.state = STATE.GAMEPLAY;
        GameAudio.ensureContext();
        GameAudio.startMusic(0);
        CrazyGamesSDK.gameplayStart();
    },

    // ────── GAMEPLAY ──────

    updateGameplay(dt) {
        this.updateGameSpeedSelection();
        const speedDt = dt * this.gameSpeedMult;

        this.timePlayed += speedDt;
        this.trackPerformance(dt);
        this.updateCheatCode();
        // Run-event upkeep (fountain regen, ambush bursts).
        if (this.waveActive) this.updateEvent(speedDt);

        if (!this.tutorialDismissed) {
            const mv = Input.moveVector();
            if (this.timePlayed > TUTORIAL_HINT_DURATION || mv.x !== 0 || mv.y !== 0 || Mouse.clicked || Input.just("Escape")) {
                this.tutorialDismissed = true;
            }
        }

        // Player
        this.player.update(speedDt);

        // Bullets
        for (const b of this.bullets) b.update(speedDt);
        compactInPlace(this.bullets, b => b.alive);

        // Enemies
        for (const e of this.enemies) {
            e.update(speedDt, this.player);

            // Contact damage
            if (e.collidesWith(this.player) && e.contactTimer <= 0) {
                this.player.takeDamage(e.contactDamage);
                e.contactTimer = 0.5;
            }
        }
        compactInPlace(this.enemies, e => e.alive);

        // ── Build spatial grid for enemy collision broadphase ──
        gridClear();
        for (let i = 0; i < this.enemies.length; i++) gridInsert(this.enemies[i]);

        // Bullet ↔ Enemy collisions (player bullets) & Enemy bullets ↔ Player
        for (const b of this.bullets) {
            if (!b.alive) continue;
            if (b.isEnemy) {
                // Enemy bullet hits player
                if (b.collidesWith(this.player)) {
                    this.player.takeDamage(b.damage);
                    b.alive = false;
                    this.spawnParticles(b.x, b.y, COLOR.enemyBullet, isMobile ? 2 : 4);
                }
            } else {
                // Player bullet hits enemies – use spatial grid instead of full scan
                const nearby = gridQuery(b.x, b.y, BULLET_RADIUS + COLLISION_QUERY_BUFFER);
                for (let i = 0; i < nearby.length; i++) {
                    const e = nearby[i];
                    if (!e.alive) continue;
                    if (b.collidesWith(e)) {
                        this.runShotsHit++;
                        e.takeDamage(b.damage, b.isCrit);
                        if (b.isCrit) GameAudio.sfxCrit();

                        let didExecute = false;
                        if (
                            e.alive &&
                            this.player.executeThreshold > 0 &&
                            e.type !== "miniboss" &&
                            e.type !== "bigboss" &&
                            e.type !== "endboss"
                        ) {
                            const hpRatio = e.maxHp > 0 ? (e.hp / e.maxHp) : 1;
                            if (hpRatio <= this.player.executeThreshold) {
                                e.takeDamage(e.hp, false);
                                didExecute = true;
                                GameAudio.sfxExecute();
                            }
                        }

                        this.spawnParticles(e.x, e.y, COLOR.enemyA, isMobile ? 2 : 5);
                        if (didExecute) this.spawnParticles(e.x, e.y, "#ff5577", isMobile ? 4 : 10);
                        GameAudio.sfxHit();

                        // Piercing: increment hit count, kill bullet when exceeded
                        b.hitCount++;
                        if (b.hitCount > b.piercing) {
                            b.alive = false;
                        }
                        this.camera.shake();

                        // Enemy killed?
                        if (!e.alive) {
                            // Kill effects handled in onEnemyKilled
                        }
                        if (!b.alive) break;
                    }
                }
            }
        }

        // XP orbs
        for (const o of this.xpOrbs) o.update(speedDt, this.player);
        compactInPlace(this.xpOrbs, o => o.alive);

        // Particles
        for (const p of this.particles) p.update(speedDt);
        compactInPlaceWithPool(this.particles, p => p.alive, this.particlePool, MAX_PARTICLE_POOL);

        // Damage numbers
        for (const d of this.damageNumbers) d.update(speedDt);
        compactInPlaceWithPool(this.damageNumbers, d => d.alive, this.damageNumberPool, MAX_DAMAGE_NUMBER_POOL);

        // Trail particles
        for (const t of this.trailParticles) t.update(speedDt);
        compactInPlace(this.trailParticles, t => t.alive);

        // Player trail spawning (only when moving)
        const mv = Input.moveVector();
        if ((mv.x !== 0 || mv.y !== 0) && !this.lowPerf && this.trailParticles.length < 40) {
            this.trailParticles.push(new TrailParticle(
                this.player.x + randRange(-4, 4),
                this.player.y + randRange(-4, 4),
                withAlpha(this.player.skinGlow, 0.5)
            ));
        }

        // Kill combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= speedDt;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }
        if (this.comboSfxCooldown > 0) this.comboSfxCooldown -= speedDt;
        if (this.eventFlashTimer > 0) this.eventFlashTimer -= speedDt;
        if (this.eventToastTimer > 0) this.eventToastTimer -= speedDt;

        // Level-up flash timer
        if (this.levelUpFlashTimer > 0) this.levelUpFlashTimer -= speedDt;

        // Wave banner timer
        if (this.waveBannerTimer > 0) this.waveBannerTimer -= speedDt;

        // Lightning bolts (visual only)
        for (const l of this.lightningBolts) l.life -= speedDt;
        compactInPlace(this.lightningBolts, l => l.life > 0);

        // Frost waves (visual only)
        for (const f of this.frostWaves) {
            f.life -= speedDt;
            f.radius = f.maxRadius * (1 - f.life / f.maxLife);
        }
        compactInPlace(this.frostWaves, f => f.life > 0);

        // Flame patches (damage zones)
        for (const fp of this.flamePatches) {
            fp.life -= speedDt;
            fp.dmgTimer -= speedDt;
            if (fp.dmgTimer <= 0) {
                fp.dmgTimer = 0.3;
                // Use spatial grid for flame-enemy collisions
                const nearby = gridQuery(fp.x, fp.y, fp.radius + COLLISION_QUERY_BUFFER);
                for (let i = 0; i < nearby.length; i++) {
                    const e = nearby[i];
                    if (dist(fp.x, fp.y, e.x, e.y) < fp.radius + e.radius) {
                        e.takeDamage(fp.dmg);
                    }
                }
            }
        }
        compactInPlace(this.flamePatches, fp => fp.life > 0);

        // Camera
        this.camera.follow(this.player);
        this.camera.update(speedDt);

        // Wave management
        this.manageWaves(speedDt);

        // Player death
        if (!this.player.alive) {
            this.state = STATE.GAME_OVER;
            GameAudio.stopMusic();
            GameAudio.sfxGameOver();
            // Finalise the run right away, otherwise the Game Over screen would show
            // stale values (+0 shards, no rank, no score table). Only defer when a
            // rewarded revive is still on the table – that run continues afterwards.
            if (!this.canOfferRevive()) {
                this.commitLossIfNeeded();
            }
            CrazyGamesSDK.gameplayStop();
        }

        // Settings shortcut – only while actually playing. Death may have switched
        // the state to GAME_OVER earlier in this very frame.
        if (this.state === STATE.GAMEPLAY &&
            (Input.just("Escape") || Input.just("KeyP") || TouchControls.pauseTapped)) {
            this.state = STATE.PAUSED;
        }
    },

    updateCheatCode() {
        const expected = CHEAT_CODE_SEQUENCE[this.cheatProgress];
        if (!expected) return;

        if (Input.just(expected)) {
            this.cheatProgress++;
            if (this.cheatProgress >= CHEAT_CODE_SEQUENCE.length) {
                this.openCheatMenu();
                this.cheatProgress = 0;
            }
            return;
        }

        // Reset sequence if a sequence key is pressed out of order.
        for (let i = 0; i < CHEAT_CODE_SEQUENCE.length; i++) {
            const code = CHEAT_CODE_SEQUENCE[i];
            if (Input.just(code)) {
                this.cheatProgress = code === CHEAT_CODE_SEQUENCE[0] ? 1 : 0;
                return;
            }
        }
    },

    sanitizeCheatLevel(level) {
        if (!Number.isFinite(level)) return CHEAT_LEVEL_MIN;
        return clamp(Math.floor(level), CHEAT_LEVEL_MIN, CHEAT_LEVEL_MAX);
    },

    openCheatMenu() {
        if (!this.player) return;
        const statRows = UPGRADES
            .filter(up => up.cat === "stat")
            .map(up => ({
                kind: "stat",
                id: up.id,
                icon: up.icon,
                name: up.name,
                value: this.sanitizeCheatLevel(this.player.upgradeCounts[up.id] || 0),
            }));

        const weaponRows = CHEAT_WEAPON_ROWS.map(w => ({
            kind: "weapon",
            id: w.id,
            icon: w.icon,
            name: w.name,
            value: this.sanitizeCheatLevel(this.player.weapons[w.id].level || 0),
        }));

        this.cheatRows = [...statRows, ...weaponRows];
        this.cheatScroll = 0;
        this.cheatMaxScroll = 0;
        this.state = STATE.CHEAT_MENU;
    },

    setAllCheatRows(level) {
        const value = this.sanitizeCheatLevel(level);
        for (const row of this.cheatRows) row.value = value;
    },

    getCheatMenuLayout() {
        const panelW = 760;
        const panelH = 560;
        const panelX = CANVAS_W / 2 - panelW / 2;
        const panelY = CANVAS_H / 2 - panelH / 2;
        const listX = panelX + 20;
        const listY = panelY + 98;
        const listW = panelW - 40;
        const listH = panelH - 180;
        const rowH = 34;
        const rowGap = 8;
        const footerY = panelY + panelH - 58;
        return { panelX, panelY, panelW, panelH, listX, listY, listW, listH, rowH, rowGap, footerY };
    },

    updateCheatMenu(dt) {
        if (!this.player) {
            this.state = STATE.GAMEPLAY;
            return;
        }

        if (Input.just("Escape")) {
            this.state = STATE.GAMEPLAY;
            return;
        }

        const layout = this.getCheatMenuLayout();
        const contentH = this.cheatRows.length > 0
            ? this.cheatRows.length * layout.rowH + (this.cheatRows.length - 1) * layout.rowGap
            : 0;
        this.cheatMaxScroll = Math.max(0, contentH - layout.listH);

        this.cheatScroll += Mouse.wheelDelta + Mouse.touchScrollDelta;
        if (Input.held("ArrowDown") || Input.held("KeyS")) this.cheatScroll += 400 * dt;
        if (Input.held("ArrowUp") || Input.held("KeyW")) this.cheatScroll -= 400 * dt;
        this.cheatScroll = clamp(this.cheatScroll, 0, this.cheatMaxScroll);

        const cancelRect = { x: layout.panelX + 20, y: layout.footerY, w: 170, h: 36 };
        const allTargetRect = { x: layout.panelX + layout.panelW / 2 - 105, y: layout.footerY, w: 210, h: 36 };
        const applyRect = { x: layout.panelX + layout.panelW - 190, y: layout.footerY, w: 170, h: 36 };

        if (!Mouse.clicked) return;

        if (Mouse.inRect(cancelRect.x, cancelRect.y, cancelRect.w, cancelRect.h)) {
            this.state = STATE.GAMEPLAY;
            return;
        }
        if (Mouse.inRect(allTargetRect.x, allTargetRect.y, allTargetRect.w, allTargetRect.h)) {
            this.setAllCheatRows(CHEAT_TARGET_LEVEL);
            return;
        }
        if (Mouse.inRect(applyRect.x, applyRect.y, applyRect.w, applyRect.h)) {
            this.applyCheatConfiguration();
            this.state = STATE.GAMEPLAY;
            return;
        }

        for (let i = 0; i < this.cheatRows.length; i++) {
            const y = layout.listY + i * (layout.rowH + layout.rowGap) - this.cheatScroll;
            if (y + layout.rowH < layout.listY || y > layout.listY + layout.listH) continue;

            const row = this.cheatRows[i];
            const minusRect = { x: layout.listX + layout.listW - 124, y: y + 4, w: 28, h: 26 };
            const valueRect = { x: layout.listX + layout.listW - 92, y: y + 4, w: 48, h: 26 };
            const plusRect  = { x: layout.listX + layout.listW - 40, y: y + 4, w: 28, h: 26 };

            if (Mouse.inRect(minusRect.x, minusRect.y, minusRect.w, minusRect.h)) {
                row.value = this.sanitizeCheatLevel(row.value - 1);
                return;
            }
            if (Mouse.inRect(plusRect.x, plusRect.y, plusRect.w, plusRect.h)) {
                row.value = this.sanitizeCheatLevel(row.value + 1);
                return;
            }
            if (Mouse.inRect(valueRect.x, valueRect.y, valueRect.w, valueRect.h)) {
                const input = window.prompt(`Set level for ${row.name} (${CHEAT_LEVEL_MIN}-${CHEAT_LEVEL_MAX})`, String(row.value));
                if (input !== null) {
                    const parsed = Number(input);
                    row.value = this.sanitizeCheatLevel(parsed);
                }
                return;
            }
        }
    },

    applyCheatConfiguration() {
        if (!this.player || !Array.isArray(this.cheatRows) || this.cheatRows.length === 0) return;

        const p = this.player;
        if (!p.weapons || !p.upgradeCounts) return;
        const hpBefore = p.hp;
        const fireTimerBefore = p.fireTimer;
        const angleBefore = p.angle;

        // Rebuild from base stats so lowered levels are applied correctly.
        p.maxHp = PLAYER_BASE_HP;
        p.hp = PLAYER_BASE_HP;
        p.speed = PLAYER_BASE_SPEED;
        p.damage = PLAYER_BASE_DAMAGE;
        p.fireRate = PLAYER_BASE_FIRE_RATE;
        p.armor = 0;
        p.hpRegen = 0;
        p.piercing = 0;
        p.multiShot = 0;
        p.critChance = 0;
        p.critMult = 2.0;
        p.bulletSize = 1.0;
        p.range = PLAYER_BASE_RANGE;
        p.xpGainMult = 1.0;
        p.executeThreshold = 0;
        p.upgradeCounts = {};

        p.weapons.orbitShield.level = 0;
        p.weapons.lightningAura.level = 0;
        p.weapons.frostNova.level = 0;
        p.weapons.flameTrail.level = 0;

        Progression.applyMetaToPlayer(p);

        applyChallengeToRunState({ enemySpeedMult: 1, shardRewardMult: 1 }, p, currentChallengeMode());

        if (this.adBoosterActive) {
            p.damage = Math.floor(p.damage * 1.12);
            p.fireRate *= 0.88;
            p.speed *= 1.08;
        }

        for (const row of this.cheatRows) {
            if (row.kind !== "stat") continue;
            const up = UPGRADES.find(u => u.id === row.id && u.cat === "stat");
            if (!up) continue;
            const count = this.sanitizeCheatLevel(row.value);
            for (let i = 0; i < count; i++) up.apply(p);
            p.upgradeCounts[row.id] = count;
        }

        for (const row of this.cheatRows) {
            if (row.kind !== "weapon") continue;
            if (!p.weapons[row.id]) continue;
            p.weapons[row.id].level = this.sanitizeCheatLevel(row.value);
        }

        p.weapons.flameTrail.lastX = p.x;
        p.weapons.flameTrail.lastY = p.y;
        p.hp = clamp(hpBefore, 1, p.maxHp);
        p.fireTimer = Math.min(fireTimerBefore, p.fireRate);
        p.angle = angleBefore;

        // Visual/audio confirmation that the cheat was accepted.
        this.waveBannerTimer = 1.8;
        this.waveBannerText = "CHEAT APPLIED";
        this.levelUpFlashTimer = 0.35;
        GameAudio.sfxLevelUp();
    },

    drawCheatMenuOverlay() {
        const layout = this.getCheatMenuLayout();

        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        drawRoundRect(layout.panelX, layout.panelY, layout.panelW, layout.panelH, 12);
        ctx.fillStyle = "rgba(10, 12, 34, 0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(102,204,255,0.55)";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.accent;
        ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("CHEAT CONFIG", CANVAS_W / 2, layout.panelY + 36);

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "12px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("Set each stat/weapon level. Click the number for direct input.", CANVAS_W / 2, layout.panelY + 58);

        drawRoundRect(layout.listX, layout.listY, layout.listW, layout.listH, 8);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.save();
        drawRoundRect(layout.listX + 1, layout.listY + 1, layout.listW - 2, layout.listH - 2, 7);
        ctx.clip();

        for (let i = 0; i < this.cheatRows.length; i++) {
            const row = this.cheatRows[i];
            const y = layout.listY + i * (layout.rowH + layout.rowGap) - this.cheatScroll;
            if (y + layout.rowH < layout.listY || y > layout.listY + layout.listH) continue;

            drawRoundRect(layout.listX + 8, y, layout.listW - 16, layout.rowH, 6);
            ctx.fillStyle = row.kind === "weapon" ? "rgba(255,200,80,0.10)" : "rgba(102,204,255,0.08)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.textAlign = "left";
            ctx.fillStyle = COLOR.text;
            ctx.font = "13px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(`${row.icon}  ${row.name}`, layout.listX + 18, y + 21);

            ctx.fillStyle = row.kind === "weapon" ? "#ffcc66" : "#7ed9ff";
            ctx.font = "10px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(row.kind === "weapon" ? "WEAPON" : "STAT", layout.listX + 18, y + 31);

            const minusRect = { x: layout.listX + layout.listW - 124, y: y + 4, w: 28, h: 26 };
            const valueRect = { x: layout.listX + layout.listW - 92, y: y + 4, w: 48, h: 26 };
            const plusRect  = { x: layout.listX + layout.listW - 40, y: y + 4, w: 28, h: 26 };

            drawRoundRect(minusRect.x, minusRect.y, minusRect.w, minusRect.h, 5);
            ctx.fillStyle = "rgba(255,255,255,0.09)";
            ctx.fill();
            drawRoundRect(valueRect.x, valueRect.y, valueRect.w, valueRect.h, 5);
            ctx.fillStyle = "rgba(51,204,255,0.18)";
            ctx.fill();
            drawRoundRect(plusRect.x, plusRect.y, plusRect.w, plusRect.h, 5);
            ctx.fillStyle = "rgba(255,255,255,0.09)";
            ctx.fill();

            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.text;
            ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("-", minusRect.x + minusRect.w / 2, minusRect.y + 18);
            ctx.fillText("+", plusRect.x + plusRect.w / 2, plusRect.y + 18);
            ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(String(row.value), valueRect.x + valueRect.w / 2, valueRect.y + 17);
        }

        ctx.restore();

        if (this.cheatMaxScroll > 0) {
            const barX = layout.listX + layout.listW - 7;
            const barY = layout.listY + 6;
            const barH = layout.listH - 12;
            const thumbH = Math.max(26, barH * (layout.listH / (layout.listH + this.cheatMaxScroll)));
            const travel = barH - thumbH;
            const t = this.cheatMaxScroll > 0 ? this.cheatScroll / this.cheatMaxScroll : 0;
            const thumbY = barY + travel * t;
            drawRoundRect(barX, barY, 3, barH, 2);
            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.fill();
            drawRoundRect(barX - 1, thumbY, 5, thumbH, 3);
            ctx.fillStyle = "rgba(102,204,255,0.92)";
            ctx.fill();
        }

        const cancelRect = { x: layout.panelX + 20, y: layout.footerY, w: 170, h: 36 };
        const allTargetRect = { x: layout.panelX + layout.panelW / 2 - 105, y: layout.footerY, w: 210, h: 36 };
        const applyRect = { x: layout.panelX + layout.panelW - 190, y: layout.footerY, w: 170, h: 36 };

        drawButton("CANCEL", cancelRect.x, cancelRect.y, cancelRect.w, cancelRect.h, Mouse.inRect(cancelRect.x, cancelRect.y, cancelRect.w, cancelRect.h), 14);
        drawButton(`ALL -> ${CHEAT_TARGET_LEVEL}`, allTargetRect.x, allTargetRect.y, allTargetRect.w, allTargetRect.h, Mouse.inRect(allTargetRect.x, allTargetRect.y, allTargetRect.w, allTargetRect.h), 14);
        drawButton("APPLY", applyRect.x, applyRect.y, applyRect.w, applyRect.h, Mouse.inRect(applyRect.x, applyRect.y, applyRect.w, applyRect.h), 14);

        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = "11px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("Mouse wheel/W-S to scroll • ESC to close", CANVAS_W / 2, layout.panelY + layout.panelH - 12);
    },

    drawGameplay() {
        // Background starfield (screen-space, drawn before camera transform)
        if (!this.lowPerf) {
            Starfield.draw(this.camera.x, this.camera.y);
        }

        this.camera.applyTransform();

        // Grid background
        this.drawGrid();

        // World border with glow
        const biome = this.currentBiome();
        ctx.shadowColor = biome.border;
        ctx.shadowBlur = this.lowPerf ? 0 : 8;
        ctx.strokeStyle = biome.border;
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
        ctx.shadowBlur = 0;

        // Flame patches
        for (const fp of this.flamePatches) {
            const alpha = clamp(fp.life / fp.maxLife, 0, 1) * 0.5;
            const flicker = 0.8 + 0.2 * Math.sin(frameNow * 0.02 + fp.x);
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, fp.radius * flicker, 0, Math.PI * 2);
            ctx.fillStyle = "#ff6400";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, fp.radius * 0.5 * flicker, 0, Math.PI * 2);
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = "#ffc832";
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Trail particles (behind player)
        for (const t of this.trailParticles) t.draw();

        // XP orbs (with improved glow)
        for (const o of this.xpOrbs) o.draw();

        // Enemies
        for (const e of this.enemies) e.draw();

        // Bullets
        for (const b of this.bullets) b.draw();

        // Player
        this.player.draw();

        // Particles (on top)
        for (const p of this.particles) p.draw();

        // Damage numbers (world-space)
        for (const d of this.damageNumbers) d.draw();

        // Lightning bolts
        for (const l of this.lightningBolts) {
            const alpha = clamp(l.life / 0.15, 0, 1);
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            // Jagged lightning
            const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
            const segments = 5;
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const jx = (i < segments) ? randRange(-12, 12) : 0;
                const jy = (i < segments) ? randRange(-12, 12) : 0;
                ctx.lineTo(l.x1 + dx * t + jx, l.y1 + dy * t + jy);
            }
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = "#88ddff";
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Frost waves
        for (const f of this.frostWaves) {
            const alpha = clamp(f.life / f.maxLife, 0, 1) * 0.4;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#64c8ff";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = "#64c8ff";
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        this.camera.resetTransform();

        // Vignette effect (screen-space)
        if (!this.lowPerf) {
            this.drawVignette();
        }

        // Biome-specific ambient screen effects (screen-space)
        if (!this.lowPerf) {
            const bi = this.currentBiomeIndex();
            if (bi === 1) {
                // Acid Grid: subtle green scan lines
                ctx.globalAlpha = 0.03;
                ctx.fillStyle = "#66ff99";
                const scanY = (frameNow * 0.15) % (CANVAS_H + 40) - 20;
                ctx.fillRect(0, scanY, CANVAS_W, 3);
                ctx.fillRect(0, scanY - CANVAS_H * 0.5, CANVAS_W, 2);
                ctx.globalAlpha = 1;
            } else if (bi === 2) {
                // Crimson Core: pulsing red vignette overlay
                const pulse = 0.02 + 0.015 * Math.sin(frameNow * 0.004);
                ctx.fillStyle = `rgba(255,40,40,${pulse})`;
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                // Ember-like floating particles
                for (let i = 0; i < 12; i++) {
                    const ex = (i * 83 + frameNow * 0.03) % CANVAS_W;
                    const ey = CANVAS_H - ((i * 127 + frameNow * 0.05) % CANVAS_H);
                    const a = 0.15 + 0.1 * Math.sin(frameNow * 0.005 + i);
                    ctx.beginPath();
                    ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,100,60,${a})`;
                    ctx.fill();
                }
            }
        }

        // Level-up flash effect (screen-space)
        if (this.levelUpFlashTimer > 0) {
            const flashAlpha = clamp(this.levelUpFlashTimer / 0.3, 0, 0.25);
            ctx.fillStyle = `rgba(51,204,255,${flashAlpha})`;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Event feedback (flash & toast) - skip on low-perf for reduced overhead
        if (!this.lowPerf) {
            if (this.eventFlashTimer > 0) {
                const flashAlpha = clamp(this.eventFlashTimer / 0.26, 0, 0.24);
                ctx.globalAlpha = flashAlpha;
                ctx.fillStyle = this.eventFlashColor || "#ffffff";
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                ctx.globalAlpha = 1;
            }

            if (this.eventToastTimer > 0) {
                const t = clamp(this.eventToastTimer / 1.1, 0, 1);
                const y = 172 - (1 - t) * 10;
                ctx.textAlign = "center";
                ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
                ctx.fillStyle = this.eventToastColor;
                ctx.globalAlpha = t;
                ctx.fillText(this.eventToastText, CANVAS_W / 2, y);
                ctx.globalAlpha = 1;
            }
        }

        // HUD (screen-space)
        if (this.state === STATE.GAMEPLAY) {
            this.drawHUD();
        }
    },

    drawGrid() {
        const biome = this.currentBiome();
        const gs = 80;
        const sx = Math.floor(this.camera.x / gs) * gs;
        const sy = Math.floor(this.camera.y / gs) * gs;
        ctx.strokeStyle = biome.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = sx; x < this.camera.x + CANVAS_W + gs; x += gs) {
            ctx.moveTo(x, sy); ctx.lineTo(x, sy + CANVAS_H + gs);
        }
        for (let y = sy; y < this.camera.y + CANVAS_H + gs; y += gs) {
            ctx.moveTo(sx, y); ctx.lineTo(sx + CANVAS_W + gs, y);
        }
        ctx.stroke();
    },

    drawVignette() {
        const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
        const outerR = Math.sqrt(cx * cx + cy * cy);
        const grad = ctx.createRadialGradient(cx, cy, outerR * 0.55, cx, cy, outerR);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.35)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    },

    // ────── HUD ──────

    drawHUD() {
        const p = this.player;
        const portrait = isPortraitMobile();
        const layoutMode = getViewportLayoutMode();
        const compactLayout = portrait || layoutMode === "compact";
        const narrowLayout = !compactLayout && layoutMode === "narrow";
        const pad = compactLayout ? 10 : (portrait ? 12 : (narrowLayout ? 14 : 16));
        const leftPanelW = compactLayout ? 228 : (narrowLayout ? 252 : 280);
        const centerPanelW = compactLayout ? 220 : 250;
        const rightPanelW = compactLayout ? 126 : (narrowLayout ? 130 : 136);

        // Soft panel anchors to improve HUD legibility under heavy effects.
        drawPanel(pad - 6, pad - 6, leftPanelW, compactLayout ? 64 : 68, 8, { fill: UI_THEME.panelFill, stroke: false });
        drawPanel(CANVAS_W / 2 - centerPanelW / 2, pad - 8, centerPanelW, this.endbossActive ? 58 : 54, 8, {
            fill: "rgba(8,10,24,0.68)",
            stroke: false,
        });
        drawPanel(CANVAS_W - rightPanelW - pad + 2, pad - 8, rightPanelW, 58, 8, {
            fill: "rgba(8,10,24,0.68)",
            stroke: false,
        });

        // ── Low HP danger vignette ──
        const hpPct = p.hp / p.maxHp;
        if (hpPct < 0.3 && !this.lowPerf) {
            const dangerAlpha = (1 - hpPct / 0.3) * (0.1 + 0.06 * Math.sin(frameNow * 0.008));
            const dangerGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7);
            dangerGrad.addColorStop(0, "rgba(0,0,0,0)");
            dangerGrad.addColorStop(1, `rgba(180,0,0,${dangerAlpha})`);
            ctx.fillStyle = dangerGrad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // ── HP bar ──
        const hpW = compactLayout ? 176 : (portrait ? 190 : (narrowLayout ? 205 : 220));
        const hpH = compactLayout ? 15 : (portrait ? 16 : 18);
        const hpX = pad, hpY = pad;
        drawRoundRect(hpX, hpY, hpW, hpH, 4);
        ctx.fillStyle = COLOR.hpBarBg;
        ctx.fill();
        const hpBarColor = hpPct < 0.25 ? COLOR.danger : (hpPct < 0.5 ? "#dd8822" : COLOR.hpBar);
        drawRoundRect(hpX, hpY, hpW * clamp(hpPct, 0, 1), hpH, 4);
        ctx.fillStyle = hpBarColor;
        ctx.fill();
        ctx.fillStyle = COLOR.text;
        ctx.font = compactLayout ? "bold 11px 'Segoe UI', Arial, sans-serif" : "bold 12px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`HP  ${Math.ceil(p.hp)} / ${p.maxHp}`, hpX + hpW / 2, hpY + hpH / 2);

        // ── XP bar ──
        const xpY = hpY + hpH + 6;
        drawRoundRect(hpX, xpY, hpW, hpH, 4);
        ctx.fillStyle = COLOR.xpBarBg;
        ctx.fill();
        drawRoundRect(hpX, xpY, hpW * clamp(p.xp / p.xpToNext, 0, 1), hpH, 4);
        ctx.fillStyle = COLOR.xpBar;
        ctx.fill();
        ctx.fillStyle = COLOR.text;
        ctx.fillText(`XP  ${p.xp} / ${p.xpToNext}`, hpX + hpW / 2, xpY + hpH / 2);

        // ── Level badge ──
        ctx.fillStyle = COLOR.accent;
        ctx.font = compactLayout ? "bold 14px 'Segoe UI', Arial, sans-serif" : "bold 16px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`LV ${p.level}`, hpX + hpW + 10, hpY + hpH / 2 + 6);

        // ── Regen indicator (next to XP bar row, below level badge) ──
        if (p.hpRegen > 0) {
            ctx.font = compactLayout ? "bold 11px 'Segoe UI', Arial, sans-serif" : "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "#55dd88";
            ctx.fillText(`💚 +${p.hpRegen}/s`, hpX + hpW + 10, xpY + hpH / 2 + 2);
        }

        // ── Armor indicator ──
        if (p.armor > 0) {
            ctx.font = compactLayout ? "bold 10px 'Segoe UI', Arial, sans-serif" : "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "#88bbff";
            const armorText = compactLayout
                ? `🛡️ Armor ${p.armor}`
                : `🛡️ ${p.armor} Armor (−${p.armor} dmg taken)`;
            ctx.fillText(armorText, hpX, xpY + hpH + 16, leftPanelW - 14);
        }

        // ── Wave counter (top-center) ──
        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.text;
        ctx.font = compactLayout ? "bold 20px 'Segoe UI', Arial, sans-serif" : "bold 24px 'Segoe UI', Arial, sans-serif";
        if (this.endbossActive) {
            ctx.fillStyle = "#ff00ff";
            ctx.fillText(`☠ ${BOSS_NAMES.endboss} ☠`, CANVAS_W / 2, pad + 14);
            // Endboss HP bar (full width at top)
            if (this.activeBoss && this.activeBoss.alive) {
                const ebHpW = compactLayout ? 240 : 300;
                const ebHpH = compactLayout ? 10 : 12;
                const ebX = CANVAS_W / 2 - ebHpW / 2;
                const ebY = pad + 26;
                const ebPct = this.activeBoss.hp / this.activeBoss.maxHp;
                ctx.fillStyle = COLOR.hpBarBg;
                ctx.fillRect(ebX, ebY, ebHpW, ebHpH);
                const ebColor = this.activeBoss.phase === 3 ? "#ff0044" : (this.activeBoss.phase === 2 ? "#ff44aa" : "#ff00ff");
                ctx.fillStyle = ebColor;
                ctx.fillRect(ebX, ebY, ebHpW * clamp(ebPct, 0, 1), ebHpH);
                ctx.font = compactLayout ? "bold 10px 'Segoe UI', Arial, sans-serif" : "bold 11px 'Segoe UI', Arial, sans-serif";
                ctx.fillStyle = "#ffffff";
                ctx.fillText(`Phase ${this.activeBoss.phase} — ${Math.ceil(ebPct * 100)}%`, CANVAS_W / 2, ebY + ebHpH / 2);
            }
        } else {
            ctx.fillText(`Wave ${this.wave}`, CANVAS_W / 2, pad + 14);
        }

        // Enemies remaining
        ctx.font = compactLayout ? "bold 12px 'Segoe UI', Arial, sans-serif" : "bold 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#b5c2d3";
        if (!this.endbossActive) {
            ctx.fillText(`Kills: ${this.waveKills} / ${this.waveKillsRequired}`, CANVAS_W / 2, pad + 36);
        }

        // ── Active run event badge (below the wave/kill readout) ──
        if (this.activeEvent && this.activeEvent.def) {
            const ev = this.activeEvent.def;
            ctx.font = compactLayout ? "bold 11px 'Segoe UI', Arial, sans-serif" : "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = ev.color;
            const y = this.endbossActive ? pad + 36 : pad + 56;
            ctx.fillText(`◆ ${ev.label}`, CANVAS_W / 2, y);
        }

        // ── Kill count (top-right) ──
        ctx.textAlign = "right";
        ctx.fillStyle = COLOR.text;
        ctx.font = compactLayout ? "bold 14px 'Segoe UI', Arial, sans-serif" : "bold 16px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`☠ ${this.killCount}`, CANVAS_W - pad, pad + 16, rightPanelW - 12);

        // ── Time ──
        ctx.font = compactLayout ? "bold 12px 'Segoe UI', Arial, sans-serif" : "bold 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#b5c2d3";
        ctx.fillText(formatTime(this.timePlayed), CANVAS_W - pad, pad + 38, rightPanelW - 12);

        // ── Mode badge (top-right, below time) ──
        if (Settings.gameMode !== "normal") {
            ctx.font = compactLayout ? "bold 11px 'Segoe UI', Arial, sans-serif" : "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = Settings.gameMode === "easy" ? "#55ff88" : COLOR.danger;
            ctx.fillText(Settings.gameMode === "easy" ? "😊 EASY" : "💀 HARD", CANVAS_W - pad, pad + 56, rightPanelW - 12);
        }

        if (Progression.isGameSpeedUnlocked()) {
            const layout = this.getSpeedSelectorLayout();
            const maxUnlockedIdx = Progression.getMaxGameSpeedIndex();
            drawPanel(layout.x, layout.y, layout.panelW, layout.panelH, 8, {
                fill: UI_THEME.panelFillStrong,
                strokeColor: "rgba(102,204,255,0.45)",
                lineWidth: 1.2,
            });

            ctx.fillStyle = COLOR.accent;
            ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("GAME SPEED", layout.x + layout.panelW / 2, layout.y + 15);

            for (let i = 0; i < layout.buttons.length; i++) {
                const b = layout.buttons[i];
                const unlocked = b.index <= maxUnlockedIdx;
                const selected = unlocked && this.gameSpeedIndex === b.index;
                drawRoundRect(b.x, b.y, b.w, b.h, 5);
                ctx.fillStyle = selected ? COLOR.accent : (unlocked ? "rgba(255,255,255,0.08)" : "rgba(80,80,80,0.2)");
                ctx.globalAlpha = selected ? 1 : (unlocked ? 0.95 : 0.75);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = selected ? COLOR.accentHover : (unlocked ? "rgba(255,255,255,0.15)" : "rgba(120,120,120,0.25)");
                ctx.lineWidth = selected ? 1.2 : 1;
                ctx.stroke();
                ctx.fillStyle = selected ? "#000" : (unlocked ? COLOR.text : "#8a8f99");
                ctx.font = "bold 10px 'Segoe UI', Arial, sans-serif";
                ctx.fillText(unlocked ? `${b.mult}x` : "🔒", b.x + b.w / 2, b.y + b.h / 2 + 1);
            }
        }

        // ── Wave incoming message ──
        if (!this.waveActive && this.waveRestTimer > 0 && !this.pendingVictory && !this.endbossActive) {
            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.accent;
            ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(frameNow * 0.005);
            let nextLabel;
            if (this.pendingEndboss) {
                nextLabel = "☠ FINAL BOSS Incoming... ☠";
                ctx.fillStyle = "#ff00ff";
            } else if (this.wave + 1 === WAVE_MAX) {
                nextLabel = "⚠️ FINAL WAVE Incoming...";
            } else {
                nextLabel = `Wave ${this.wave + 1} Incoming...`;
            }
            ctx.fillText(nextLabel, CANVAS_W / 2, CANVAS_H / 2 - 40);
            ctx.globalAlpha = 1;
        }

        // ── Animated wave banner ──
        if (this.waveBannerTimer > 0) {
            const bannerProgress = 1 - (this.waveBannerTimer / 2.0);
            const slideIn = bannerProgress < 0.15 ? bannerProgress / 0.15 : 1;
            const fadeOut = this.waveBannerTimer < 0.5 ? this.waveBannerTimer / 0.5 : 1;
            const bannerW = 340;
            const bannerH = 50;
            const bannerX = CANVAS_W / 2 - bannerW / 2;
            const bannerY = 70 + (1 - slideIn) * (-60);
            ctx.globalAlpha = fadeOut * 0.9;
            drawRoundRect(bannerX, bannerY, bannerW, bannerH, 10);
            const isBoss = this.waveBannerText.includes("BOSS");
            ctx.fillStyle = isBoss ? "rgba(180,20,60,0.85)" : "rgba(10,15,40,0.85)";
            ctx.fill();
            ctx.strokeStyle = isBoss ? "#ff4488" : COLOR.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = isBoss ? "#ffd700" : COLOR.accent;
            ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.waveBannerText, CANVAS_W / 2, bannerY + bannerH / 2);
            ctx.globalAlpha = 1;
        }

        // ── Kill combo counter ──
        if (this.comboCount >= 3 && this.comboTimer > 0) {
            const comboAlpha = clamp(this.comboTimer / 0.5, 0.4, 1);
            const comboScale = 1 + Math.min(0.3, this.comboCount * 0.02);
            ctx.globalAlpha = comboAlpha;
            ctx.textAlign = "center";
            ctx.fillStyle = this.comboCount >= 10 ? "#ffd700" : (this.comboCount >= 5 ? "#ff8844" : COLOR.accent);
            ctx.font = `bold ${Math.floor(20 * comboScale)}px 'Segoe UI', Arial, sans-serif`;
            ctx.fillText(`${this.comboCount}x COMBO!`, CANVAS_W / 2, pad + 68);
            ctx.globalAlpha = 1;
        }

        if (this.adBoosterActive) {
            ctx.textAlign = "left";
            ctx.fillStyle = "#66ff99";
            ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("Ad Booster Active", pad, CANVAS_H - (this.lowPerf ? 26 : 12));
        }

        // ── Quick onboarding tutorial (first seconds of run) ──
        if (!this.tutorialDismissed) {
            const tw = portrait ? 320 : 460;
            const th = portrait ? 72 : 64;
            const tx = CANVAS_W / 2 - tw / 2;
            const ty = portrait ? CANVAS_H - 190 : CANVAS_H - 120;
            drawRoundRect(tx, ty, tw, th, 8);
            ctx.fillStyle = "rgba(8, 10, 24, 0.9)";
            ctx.fill();
            ctx.strokeStyle = "rgba(102,204,255,0.5)";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.text;
            ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
            const aim = Settings.gameMode === "hard" ? (isMobile ? "Right touch aims" : "Mouse aims") : "Auto-aim enabled";
            ctx.fillText(`Move: WASD/Arrows  •  ${aim}`, CANVAS_W / 2, ty + 24);
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("Collect green XP, level up, pick upgrades. Press ESC for pause/settings.", CANVAS_W / 2, ty + 44);
        }

        // ── Perf status badge (debug-friendly, player-safe) ──
        if (this.lowPerf) {
            ctx.textAlign = "left";
            ctx.fillStyle = "#ffcc66";
            ctx.font = "11px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("Performance mode: ON", pad, CANVAS_H - 12);
        }

        // ── Boss HP bar (bottom-center) ──
        if (this.activeBoss && this.activeBoss.alive && this.activeBoss.type !== "endboss") {
            const isBig = this.activeBoss.type === "bigboss";
            const bw = isBig ? 400 : 300;
            const bh = isBig ? 14 : 10;
            const bx = CANVAS_W / 2 - bw / 2;
            const by = CANVAS_H - pad - 44;
            const label = `★ ${getBossDisplayName(this.activeBoss)} ★`;
            ctx.textAlign = "center";
            ctx.font = `bold 12px 'Segoe UI', Arial, sans-serif`;
            ctx.fillStyle = isBig ? "#ff3333" : "#ff88bb";
            ctx.fillText(label, CANVAS_W / 2, by - 4);
            ctx.fillStyle = "#330000";
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = isBig ? "#cc0000" : "#dd2277";
            ctx.fillRect(bx, by, bw * clamp(this.activeBoss.hp / this.activeBoss.maxHp, 0, 1), bh);
            ctx.strokeStyle = isBig ? "#ff3333" : "#ff88bb";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, bw, bh);
        } else if (this.activeBoss && !this.activeBoss.alive) {
            this.activeBoss = null;
        }

        // ── Active weapons (bottom-left) ──
        const wp = this.player.weapons;
        const weaponIcons = [];
        if (wp.orbitShield.level > 0)   weaponIcons.push({ icon: "🔵", lv: wp.orbitShield.level });
        if (wp.lightningAura.level > 0) weaponIcons.push({ icon: "⚡", lv: wp.lightningAura.level });
        if (wp.frostNova.level > 0)     weaponIcons.push({ icon: "❄️", lv: wp.frostNova.level });
        if (wp.flameTrail.level > 0)    weaponIcons.push({ icon: "🔥", lv: wp.flameTrail.level });
        if (weaponIcons.length > 0) {
            ctx.textAlign = "left";
            ctx.font = "22px 'Segoe UI', Arial, sans-serif";
            for (let i = 0; i < weaponIcons.length; i++) {
                const wx = pad + i * 50;
                const wy = CANVAS_H - pad - 10;
                ctx.fillStyle = COLOR.text;
                ctx.fillText(weaponIcons[i].icon, wx, wy);
                ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                ctx.fillStyle = COLOR.accent;
                ctx.fillText(`Lv${weaponIcons[i].lv}`, wx + 2, wy + 14);
                ctx.font = "22px 'Segoe UI', Arial, sans-serif";
            }
        }

        // ── Stat upgrade icons (bottom-right) ──
        const statIcons = STAT_GROUPS
            .map(g => ({ icon: g.icon, count: g.ids.reduce((s, id) => s + (p.upgradeCounts[id] || 0), 0) }))
            .filter(g => g.count > 0);
        if (statIcons.length > 0) {
            const slotW = 46;
            ctx.font = "22px 'Segoe UI', Arial, sans-serif";
            for (let i = 0; i < statIcons.length; i++) {
                const sx = CANVAS_W - pad - (statIcons.length - i) * slotW + 2;
                const sy = CANVAS_H - pad - 10;
                ctx.textAlign = "left";
                ctx.fillStyle = COLOR.text;
                ctx.fillText(statIcons[i].icon, sx, sy);
                ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                ctx.fillStyle = COLOR.accent;
                ctx.fillText(`x${statIcons[i].count}`, sx + 2, sy + 14);
                ctx.font = "22px 'Segoe UI', Arial, sans-serif";
            }
        }

        // Touch controls overlay (virtual joystick + pause button)
        TouchControls.draw();

        // One-time performance prompt sits on top of everything else
        this.drawPerfPrompt();
    },

    // ────── WAVE SYSTEM ──────

    manageWaves(dt) {
        // If endboss is active, don't manage normal waves — just keep spawning light adds
        if (this.endbossActive) {
            // Check if endboss was killed (handled in onEnemyKilled)
            return;
        }

        if (this.waveActive) {
            // Check if kill target reached
            if (this.waveKills >= this.waveKillsRequired) {
                this.waveActive = false;
                const mods = modeModifiers();
                this.waveRestTimer = WAVE_REST_TIME * mods.waveRestMult;
                GameAudio.sfxWaveClear();
                this.camera.shake(4, 0.12);
                this.waveBannerTimer = Math.max(this.waveBannerTimer, 1.3);
                this.waveBannerText = `WAVE ${this.wave} CLEARED!`;
                this.triggerEventFlash("#77ccff", 0.2);
                this.triggerEventToast(`Wave ${this.wave} Clear`, "#77ccff", 1.0);
                // Wave 25 triggers endboss instead of pending victory
                if (this.wave === WAVE_MAX) {
                    this.pendingEndboss = true;
                }
                this.maybeRequestMidroll();
                return;
            }
            // Continuously spawn enemies on a timer
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnTimer += this.spawnCooldown;
                this.spawnWaveEnemy();
            }
        } else {
            this.waveRestTimer -= dt;
            if (this.waveRestTimer <= 0) {
                if (this.pendingVictory) {
                    this.pendingVictory = false;
                    this.onVictory();
                } else if (this.pendingEndboss) {
                    this.pendingEndboss = false;
                    this.spawnEndboss();
                } else if (this.pendingBonusUpgrade) {
                    this.pendingBonusUpgrade = false;
                    const bossType = this.pendingBossType;
                    this.pendingBossType = null;
                    this.triggerUpgrade(true, bossType);
                } else {
                    this.startNextWave();
                }
            }
        }
    },

    spawnEndboss() {
        this.endbossActive = true;
        // Clear existing enemies for a clean arena
        this.enemies = [];
        // Spawn the endboss near the player
        const mods = modeModifiers();
        const hpMult = Math.pow(WAVE_HP_SCALE, this.wave - 1);
        const spdMult = Math.pow(WAVE_SPEED_SCALE, this.wave - 1);
        const dmgMult = Math.pow(WAVE_DAMAGE_SCALE, this.wave - 1);
        const bx = clamp(this.player.x + randRange(-150, 150), 200, WORLD_W - 200);
        const by = clamp(this.camera.y - 200, 200, WORLD_H - 200);
        const boss = new Enemy(bx, by,
            Math.floor(ENEMY_BASE_HP * hpMult * mods.enemyHpMult),
            ENEMY_BASE_SPEED * spdMult * this.enemySpeedMult * mods.enemySpdMult,
            undefined, "endboss");
        // Hand-tuned boss HP: overrides the generic wave curve so the fight is a
        // real encounter rather than a scaling wall.
        const bossHp = Math.floor(this.bossHpForWave(this.wave) * mods.enemyHpMult);
        boss.maxHp = bossHp;
        boss.hp = bossHp;
        boss.contactDamage = Math.floor(boss.contactDamage * dmgMult * mods.enemyDmgMult);
        this.enemies.push(boss);
        this.activeBoss = boss;
        this.rollBossModifiers(boss);

        // Switch to boss music
        GameAudio.startBossMusic();

        // Boss intro banner
        this.waveBannerTimer = 3.0;
        this.waveBannerText = `☠ ${BOSS_NAMES.endboss} APPROACHES ☠`;
        this.camera.shake();
        GameAudio.sfxExplosion();
    },

    startNextWave() {
        const mods = modeModifiers();
        // Any event from the previous wave ends before the new one begins.
        this.endEvent();
        this.wave++;
        this.waveKills = 0;
        this.waveKillsRequired = Math.max(5, Math.floor((WAVE_BASE_KILLS + (this.wave - 1) * WAVE_KILLS_GROWTH) * mods.waveKillsMult));
        this.spawnCooldown = Math.max(WAVE_SPAWN_CD_MIN, WAVE_BASE_SPAWN_CD * Math.pow(WAVE_SPAWN_CD_DECAY, this.wave - 1) * mods.spawnCdMult);
        if (this.expEarlyPacing === "softstart" && this.timePlayed < 60) {
            this.spawnCooldown *= 1.16;
        }
        this.spawnTimer = 0; // spawn immediately
        this.waveActive = true;

        // Roll a run event for this wave, if the wave is eligible.
        let eventDef = null;
        if (this.isEventWave(this.wave)) {
            eventDef = this.pickEventDef();
        }
        if (eventDef) {
            this.startEvent(eventDef);
            // Events may raise or lower the kill target.
            const evKillMult = this.eventMult("killTargetMult");
            if (evKillMult !== 1) {
                this.waveKillsRequired = Math.max(5, Math.floor(this.waveKillsRequired * evKillMult));
            }
            // Ambush rewrites the spawn cadence entirely.
            if (eventDef.id === "ambush") {
                this.ambushTimer = CFG.events.ambush.burstInterval;
            }
        }

        // Switch music when biome changes
        GameAudio.startMusic(this.currentBiomeIndex());

        // Animated wave banner
        this.waveBannerTimer = 2.0;
        this.waveBannerText = this.isBossWave(this.wave)
            ? `⚠ BOSS WAVE ${this.wave} ⚠`
            : `WAVE ${this.wave}`;

        GameAudio.sfxWaveStart();

        // Spawn boss on milestone waves
        if (this.isBossWave(this.wave)) {
            const bossType = (this.wave === 10 || this.wave === 20) ? "bigboss" : "miniboss";
            const mods = modeModifiers();
            const hpMult = Math.pow(WAVE_HP_SCALE, this.wave - 1);
            const spdMult = Math.pow(WAVE_SPEED_SCALE, this.wave - 1);
            const dmgMult = Math.pow(WAVE_DAMAGE_SCALE, this.wave - 1);
            // Spawn boss outside camera view (top edge)
            const bx = clamp(this.player.x + randRange(-200, 200), 100, WORLD_W - 100);
            const by = clamp(this.camera.y - 120, 100, WORLD_H - 100);
            const boss = new Enemy(bx, by,
                Math.floor(ENEMY_BASE_HP * hpMult * mods.enemyHpMult),
                ENEMY_BASE_SPEED * spdMult * this.enemySpeedMult * mods.enemySpdMult,
                undefined, bossType);
            if (bossType === "bigboss") {
                boss.displayName = getBigBossNameForWave(this.wave);
            }
            // Hand-tuned boss HP (see bossHpForWave) - keeps milestone bosses
            // beatable instead of letting the wave curve run away with them.
            const bossHp = Math.floor(this.bossHpForWave(this.wave) * mods.enemyHpMult);
            boss.maxHp = bossHp;
            boss.hp = bossHp;
            boss.contactDamage = Math.floor(boss.contactDamage * dmgMult * mods.enemyDmgMult);
            this.enemies.push(boss);
            this.activeBoss = boss;
            this.rollBossModifiers(boss);
        }
    },

    spawnWaveEnemy() {
        // Ambush takes over spawning entirely - it releases packs instead.
        if (this.activeEvent && this.activeEvent.id === "ambush") return;
        const enemy = this.createWaveEnemy();
        if (enemy) this.enemies.push(enemy);
    },

    /**
     * Build one wave enemy with all wave scaling, event modifiers, elite rolls
     * and optional shard-cache / bounty tagging applied. Returns null when the
     * enemy cap is reached. Shared by normal spawning and the ambush event.
     */
    createWaveEnemy(spawnPos) {
        // Cap total enemy count to prevent frame drops on mobile
        if (this.enemies.length >= dynamicCap(MAX_ENEMIES)) return null;
        const mods = modeModifiers();
        const hpMult = Math.pow(WAVE_HP_SCALE, this.wave - 1);
        const spdMult = Math.pow(WAVE_SPEED_SCALE, this.wave - 1);
        const dmgMult = Math.pow(WAVE_DAMAGE_SCALE, this.wave - 1);

        // Determine enemy type mix based on wave
        const typePool = ["normal"];
        if (this.wave >= 3) typePool.push("speedy");
        if (this.wave >= 5) typePool.push("tank");
        if (this.wave >= 7) typePool.push("ranged");
        if (this.wave >= 9) typePool.push("exploder");
        if (this.wave >= 12) typePool.push("phaser");
        if (this.wave >= 14) typePool.push("splitter");
        if (this.wave >= 16) typePool.push("warden");

        const specialChance = Math.min(0.9, (0.1 + this.wave * 0.04) * mods.specialChanceMult);

        // Spawn position: caller-supplied (ambush) or outside the camera view.
        let ex, ey;
        if (spawnPos) {
            ex = spawnPos.x;
            ey = spawnPos.y;
        } else {
            const edge = randInt(0, 3);
            const margin = 80;
            switch (edge) {
                case 0: // top
                    ex = randRange(this.camera.x - margin, this.camera.x + CANVAS_W + margin);
                    ey = this.camera.y - margin;
                    break;
                case 1: // bottom
                    ex = randRange(this.camera.x - margin, this.camera.x + CANVAS_W + margin);
                    ey = this.camera.y + CANVAS_H + margin;
                    break;
                case 2: // left
                    ex = this.camera.x - margin;
                    ey = randRange(this.camera.y - margin, this.camera.y + CANVAS_H + margin);
                    break;
                default: // right
                    ex = this.camera.x + CANVAS_W + margin;
                    ey = randRange(this.camera.y - margin, this.camera.y + CANVAS_H + margin);
                    break;
            }
        }
        ex = clamp(ex, 0, WORLD_W);
        ey = clamp(ey, 0, WORLD_H);

        // Event modifiers fold into the base scaling.
        const evHpMult = this.eventMult("enemyHpMult");
        const evSpdMult = this.eventMult("enemySpeedMult");
        const evDmgMult = this.eventMult("enemyDmgMult");
        const evXpMult = this.eventMult("xpMult");

        const hp = Math.floor(ENEMY_BASE_HP * hpMult * mods.enemyHpMult * evHpMult);
        const spd = ENEMY_BASE_SPEED * spdMult * this.enemySpeedMult * this.earlyPacingMultiplier() * mods.enemySpdMult * evSpdMult;

        // Choose type
        let type = "normal";
        if (typePool.length > 1 && Math.random() < specialChance) {
            type = randPick(typePool.slice(1));
        }

        const enemy = new Enemy(ex, ey, hp, spd, undefined, type);
        enemy.contactDamage = Math.floor(enemy.contactDamage * dmgMult * mods.enemyDmgMult * evDmgMult);
        if (evXpMult !== 1) enemy.xpMult = (enemy.xpMult || 1) * evXpMult;

        // Elite roll (forced during an elite wave).
        const forceElite = this.eventForceElite();
        if (forceElite || this.rollElite()) {
            this.applyElite(enemy);
            // A forced elite wave makes every enemy count, but does not stack
            // the bounty/cache tags on top of an already-tagged enemy.
        }

        // Shard cache: tag one carrier for the run of the event.
        if (this.eventShardCachePending && !this.eventShardCarrier &&
            Math.random() < CFG.events.shardCache.carrierChance) {
            enemy.carriesShardCache = true;
            this.eventShardCarrier = enemy;
        }

        return enemy;
    },

    /** Elite chance for the current wave, 0 when elites are not yet active. */
    rollElite() {
        if (!ELITES_ENABLED) return false;
        if (this.wave < ELITE_START_WAVE) return false;
        const c = CFG.elites;
        const p = Math.min(c.maxChance, c.baseChance + (this.wave - c.startWave) * c.chancePerWave);
        return Math.random() < p;
    },

    /** Promote an enemy to elite: stat buffs, a marker and better rewards. */
    applyElite(enemy) {
        const c = CFG.elites;
        enemy.isElite = true;
        enemy.maxHp = Math.floor(enemy.maxHp * c.hpMult);
        enemy.hp = enemy.maxHp;
        enemy.baseSpeed *= c.speedMult;
        enemy.speed = enemy.baseSpeed;
        enemy.contactDamage = Math.floor(enemy.contactDamage * c.dmgMult);
        enemy.xpMult = (enemy.xpMult || 1) * c.xpMult;
        enemy.eliteShardChance = c.shardDropChance;
        enemy.eliteShardAmount = c.shardDropAmount;
        return enemy;
    },

    /** Ambush event: dump a pack of enemies in from one direction. */
    spawnAmbushPack() {
        const dir = this.ambushDir || (this.ambushDir = randPick([
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
        ]));
        const size = CFG.events.ambush.packSize;
        for (let i = 0; i < size; i++) {
            // Spread the pack along the edge perpendicular to the arrival vector.
            const spread = randRange(-260, 260);
            const px = this.camera.x + CANVAS_W / 2 + (dir.x !== 0 ? dir.x * (CANVAS_W / 2 + 90) : spread);
            const py = this.camera.y + CANVAS_H / 2 + (dir.y !== 0 ? dir.y * (CANVAS_H / 2 + 90) : spread);
            const enemy = this.createWaveEnemy({ x: px, y: py });
            if (!enemy) break;
            this.enemies.push(enemy);
        }
        this.camera.shake(3, 0.1);
    },

    /** Bounty hunt event: spawn one heavily buffed, clearly marked elite. */
    spawnBountyTarget() {
        const c = CFG.events.hunt;
        const near = this.findSpawnPointOutsideView();
        const enemy = this.createWaveEnemy(near);
        if (!enemy) return;
        this.applyElite(enemy);
        enemy.maxHp = Math.floor(enemy.maxHp * c.eliteHpMult);
        enemy.hp = enemy.maxHp;
        enemy.baseSpeed *= c.eliteSpeedMult;
        enemy.speed = enemy.baseSpeed;
        enemy.isBounty = true;
        this.bountyTarget = enemy;
        this.enemies.push(enemy);
        this.triggerEventToast("Bounty is in the arena!", "#ff66dd", 1.8);
    },

    /** A point just outside the visible camera rect, clamped to the world. */
    findSpawnPointOutsideView() {
        const margin = 90;
        const edge = randInt(0, 3);
        let x, y;
        switch (edge) {
            case 0: x = randRange(this.camera.x - margin, this.camera.x + CANVAS_W + margin); y = this.camera.y - margin; break;
            case 1: x = randRange(this.camera.x - margin, this.camera.x + CANVAS_W + margin); y = this.camera.y + CANVAS_H + margin; break;
            case 2: x = this.camera.x - margin; y = randRange(this.camera.y - margin, this.camera.y + CANVAS_H + margin); break;
            default: x = this.camera.x + CANVAS_W + margin; y = randRange(this.camera.y - margin, this.camera.y + CANVAS_H + margin); break;
        }
        return { x: clamp(x, 0, WORLD_W), y: clamp(y, 0, WORLD_H) };
    },


    onEnemyKilled(enemy) {
        this.killCount++;
        this.waveKills++;

        if (enemy.type === "miniboss" || enemy.type === "bigboss" || enemy.type === "endboss") {
            this.runBossesDefeated++;
        }

        // Kill combo tracking
        this.comboCount++;
        this.comboTimer = COMBO_TIMEOUT;
        if (this.comboCount > this.bestCombo) this.bestCombo = this.comboCount;
        const comboMilestone = this.comboCount === 5 || this.comboCount === 10 || this.comboCount === 25 || (this.comboCount > 25 && this.comboCount % 25 === 0);
        if (comboMilestone && this.comboSfxCooldown <= 0) {
            GameAudio.sfxComboMilestone(this.comboCount);
            this.comboSfxCooldown = 0.55;
            this.triggerEventFlash("#66ddff", 0.18);
            this.triggerEventToast(`${this.comboCount}x COMBO!`, "#66ddff", 0.9);
        }

        // Type-specific death effects
        const particleCount = isMobile ? 4 : 12;
        const deathColor = enemy.color || COLOR.enemyA;
        this.spawnParticles(enemy.x, enemy.y, deathColor, particleCount);
        if (enemy.isElite) {
            // Elites pop with an extra ring so the promotion is visible on death.
            this.spawnParticles(enemy.x, enemy.y, "#ffd166", isMobile ? 3 : 10);
        }
        if (enemy.type === "tank") {
            this.spawnParticles(enemy.x, enemy.y, "#226622", isMobile ? 2 : 6);
        } else if (enemy.type === "miniboss" || enemy.type === "bigboss") {
            this.spawnParticles(enemy.x, enemy.y, "#ffd700", isMobile ? 6 : 20);
            this.spawnParticles(enemy.x, enemy.y, "#ffffff", isMobile ? 3 : 10);
            GameAudio.sfxBossDefeat(enemy.type);
            this.camera.shake(6, 0.16);
            this.triggerEventFlash("#ffd166", 0.24);
            this.triggerEventToast(`${getBossDisplayName(enemy)} defeated!`, "#ffd166", 1.2);
        } else if (enemy.type === "endboss") {
            // Endboss death: massive explosion of particles
            this.spawnParticles(enemy.x, enemy.y, "#ff00ff", isMobile ? 10 : 30);
            this.spawnParticles(enemy.x, enemy.y, "#ffffff", isMobile ? 8 : 25);
            this.spawnParticles(enemy.x, enemy.y, "#ffd700", isMobile ? 6 : 20);
            GameAudio.sfxBossDefeat(enemy.type);
            this.camera.shake();
            GameAudio.sfxExplosion();
            this.triggerEventFlash("#ff55cc", 0.32);
            this.triggerEventToast("FINAL BOSS SLAIN!", "#ff66dd", 1.5);
            // Trigger victory!
            this.endbossActive = false;
            this.activeBoss = null;
            // Small delay before victory screen
            this.pendingVictory = true;
            this.waveActive = false;
            this.waveRestTimer = 1.5 * modeModifiers().waveRestMult;
        }

        const mods = modeModifiers();
        if (this.xpOrbs.length < dynamicCap(MAX_XP_ORBS)) {
            // XP per kill grows both linearly (with the wave) and exponentially
            // (CFG.balance.xpPerWaveGrowth), so upgrade income keeps pace with
            // exponentially growing enemy HP. Without the exponential term the
            // level curve fell behind and the build never came together.
            const xpWaveGrowth = Math.pow((CFG.balance && CFG.balance.xpPerWaveGrowth) || 1, this.wave - 1);
            const xpAmt = Math.floor((XP_BASE_AMOUNT + this.wave * 2) * xpWaveGrowth * (enemy.xpMult || 1) * mods.xpGainMult * this.player.xpGainMult);
            this.xpOrbs.push(new XPOrb(enemy.x, enemy.y, xpAmt));
        }
        GameAudio.sfxEnemyDeath();

        // ── Event rewards ──
        // Shard cache: the tagged carrier pays out when it dies, however it dies.
        if (enemy.carriesShardCache) {
            this.grantEventShards(CFG.events.shardCache.shardReward);
            this.eventShardCarrier = null;
            this.spawnParticles(enemy.x, enemy.y, "#c38bff", isMobile ? 5 : 16);
            this.triggerEventToast(`Shard Cache +${CFG.events.shardCache.shardReward}`, "#c38bff", 1.6);
        }
        // Bounty target slain.
        if (enemy.isBounty) {
            this.grantEventShards(CFG.events.hunt.shardReward);
            this.bountyTarget = null;
            this.triggerEventToast(`Bounty claimed +${CFG.events.hunt.shardReward}`, "#ff66dd", 1.6);
            this.triggerEventFlash("#ff66dd", 0.2);
        }
        // Regular elite shard drop.
        if (enemy.isElite && !enemy.isBounty && typeof enemy.eliteShardChance === "number" &&
            Math.random() < enemy.eliteShardChance) {
            this.grantEventShards(enemy.eliteShardAmount || 1);
        }
        // Splitter: breaks into two smaller, weaker copies that do not split again.
        if (enemy.type === "splitter" && !enemy.isSplitChild) {
            this.spawnSplitChildren(enemy);
        }

        // Vampiric enchantment: heal on kill.
        if (this.player && this.player.alive && this.player.perKillHeal > 0) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.perKillHeal);
        }

        // Boss kill rewards: grant instantly on miniboss/bigboss death.
        if (enemy.type === "miniboss" || enemy.type === "bigboss") {
            this.pendingBonusUpgrade = false;
            this.pendingBossType = null;
            this.triggerUpgrade(true, enemy.type);
        }
    },

    /** Bank shards earned from run events; cashed in when the run finalises. */
    grantEventShards(amount) {
        if (!amount || amount <= 0) return;
        // Fortune enchantment boosts the payout.
        const mult = (this.player && this.player.shardPayoutMult) || 1;
        const total = Math.floor(amount * mult);
        this.eventShardsEarned = (this.eventShardsEarned || 0) + total;
        // Small flat heal per payout so the late waves are not pure attrition.
        const heal = (CFG.balance && CFG.balance.eventHealAmount) || 0;
        if (heal > 0 && this.player && this.player.alive) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
        }
    },

    /** Splitter death: spawn two half-strength children that cannot split again. */
    spawnSplitChildren(enemy) {
        const count = 2;
        for (let i = 0; i < count; i++) {
            if (this.enemies.length >= dynamicCap(MAX_ENEMIES)) break;
            const angle = (Math.PI * 2 / count) * i + randRange(-0.4, 0.4);
            const cx = enemy.x + Math.cos(angle) * 26;
            const cy = enemy.y + Math.sin(angle) * 26;
            const child = new Enemy(cx, cy, enemy.maxHp * 0.32, enemy.baseSpeed * 1.25, undefined, "splitter");
            child.isSplitChild = true;
            child.radius = Math.max(8, enemy.radius * 0.62);
            child.contactDamage = Math.max(1, Math.floor(enemy.contactDamage * 0.6));
            child.xpMult = (enemy.xpMult || 1) * 0.4;
            this.enemies.push(child);
            this.spawnParticles(cx, cy, child.color || COLOR.enemyA, isMobile ? 2 : 6);
        }
    },

    /** Shard payout of the current run. `won` = final boss cleared. */
    computeShardGain(won) {
        const base = Math.floor(this.killCount * 0.45 + this.wave * 3 + (won ? 35 : 0));
        const eventBonus = this.eventShardsEarned || 0;
        return Math.max(5, Math.floor(base * this.shardRewardMult) + eventBonus);
    },

    finalizeRun(won) {
        this.lastRunGameMode = Settings.gameMode;
        this.lastRunChallengeMode = currentChallengeMode().id;
        this.lastRunChallengeLabel = currentChallengeMode().label;
        const gained = this.computeShardGain(won);
        Progression.addShards(gained);
        const dailyResult = Progression.registerRun(this.killCount, this.wave, this.timePlayed);
        this.lastRunShardGain = gained;
        this.lastDailyReward = dailyResult.dailyReward;
    },

    // ────── SPAWNERS ──────

    spawnBullet(x, y, angle, damage, piercing, sizeMultiplier, isCrit, lifetime) {
        this.bullets.push(new Projectile(x, y, angle, damage, piercing, sizeMultiplier, isCrit, false, lifetime));
        this.runShotsFired++;
        GameAudio.sfxShoot();
    },

    spawnParticles(x, y, color, count) {
        const room = dynamicCap(MAX_PARTICLES) - this.particles.length;
        const n = Math.min(count, room);
        for (let i = 0; i < n; i++) {
            const p = this.particlePool.length > 0
                ? this.particlePool.pop().reset(x, y, color)
                : new Particle(x, y, color);
            this.particles.push(p);
        }
    },

    spawnDamageNumber(x, y, amount, color, isCrit) {
        if (this.damageNumbers.length < MAX_DAMAGE_NUMBERS) {
            const dn = this.damageNumberPool.length > 0
                ? this.damageNumberPool.pop().reset(x, y, amount, color, isCrit)
                : new DamageNumber(x, y, amount, color, isCrit);
            this.damageNumbers.push(dn);
        }
    },

    findNearestEnemy(x, y, maxRange) {
        let nearest = null;
        let bestDistSq = maxRange !== undefined ? maxRange * maxRange : Infinity;

        let candidates = this.enemies;
        if (maxRange !== undefined && Number.isFinite(maxRange)) {
            const nearby = gridQuery(x, y, maxRange + COLLISION_QUERY_BUFFER);
            if (nearby.length > 0) candidates = nearby;
        }

        for (let i = 0; i < candidates.length; i++) {
            const e = candidates[i];
            if (!e || !e.alive) continue;
            const dx = e.x - x;
            const dy = e.y - y;
            const dSq = dx * dx + dy * dy;
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                nearest = e;
            }
        }
        return nearest;
    },

    // ────── UPGRADE SCREEN ──────

    triggerUpgrade(isBonusWave = false, bossType = null) {
        // A second level-up can arrive while the upgrade screen is already open
        // (multi-level XP orb, or several orbs in one frame). Queue it instead of
        // silently dropping the upgrade.
        if (this.state === STATE.UPGRADE_SCREEN) {
            this.upgradeQueue.push({ isBonusWave, bossType });
            return;
        }

        // Pick upgrade choices: 4 for bigboss kill, 3 otherwise
        const numChoices = (isBonusWave && bossType === "bigboss") ? 4 : UPGRADE_CHOICES;
        const pool = [...UPGRADES].filter((up) => {
            if ((up.id === "execute1" || up.id === "execute2") && this.player.executeThreshold >= UPGRADE_TUNING.executeCap) {
                return false;
            }
            return true;
        });
        this.upgradeChoices = pickUpgradeChoicesByRarity(pool, numChoices, {
            wave: this.wave,
            isBonusWave,
            bossType,
        });

        if (this.upgradeChoices.length < numChoices) {
            const fallbackPool = shuffle([...pool]).filter((up) => !this.upgradeChoices.includes(up));
            this.upgradeChoices.push(...fallbackPool.slice(0, numChoices - this.upgradeChoices.length));
        }
        this.upgradeIsBonusWave = isBonusWave;
        this.state = STATE.UPGRADE_SCREEN;
        this.levelUpFlashTimer = 0.3;
        GameAudio.sfxLevelUp();
    },

    updateUpgrade() {
        // Selection via keyboard (1-N based on number of choices)
        for (let i = 0; i < this.upgradeChoices.length; i++) {
            if (Input.just(`Digit${i + 1}`)) {
                this.applyUpgrade(i);
                return;
            }
        }
    },

    applyUpgrade(index) {
        const up = this.upgradeChoices[index];
        if (!up) return;
        up.apply(this.player);
        this.runUpgradesTaken++;
        if (up.cat === "stat") {
            const c = this.player.upgradeCounts;
            c[up.id] = (c[up.id] || 0) + 1;
        }
        GameAudio.sfxUpgradeSelect();

        // Chain straight into the next queued level-up (if any), otherwise resume.
        const next = this.upgradeQueue.shift();
        this.state = STATE.GAMEPLAY;
        if (next) {
            this.triggerUpgrade(next.isBonusWave, next.bossType);
        }
    },

    updatePaused() {
        if (Input.just("Escape") || Input.just("KeyP") || TouchControls.pauseTapped) {
            this.state = STATE.GAMEPLAY;
        }
    },

    triggerEventFlash(color, duration = 0.26) {
        this.eventFlashColor = color || "rgba(255,255,255,0.22)";
        this.eventFlashTimer = Math.max(this.eventFlashTimer, duration);
    },

    triggerEventToast(text, color = COLOR.accent, duration = 1.1) {
        this.eventToastText = text || "";
        this.eventToastColor = color || COLOR.accent;
        this.eventToastTimer = Math.max(this.eventToastTimer, duration);
    },

    drawUpgradeOverlay() {
        const layoutMode = getViewportLayoutMode();
        const compactLayout = layoutMode === "compact";
        const narrowLayout = layoutMode === "narrow";

        // Dim overlay with gradient
        const overlayGrad = ctx.createRadialGradient(CANVAS_W / 2, 250, 100, CANVAS_W / 2, 250, CANVAS_W);
        overlayGrad.addColorStop(0, "rgba(0,0,20,0.5)");
        overlayGrad.addColorStop(1, "rgba(0,0,0,0.75)");
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Title with glow
        const titleText = this.upgradeIsBonusWave ? "🏆 BOSS DEFEATED! FREE UPGRADE!" : "LEVEL UP!";
        const titleColor = this.upgradeIsBonusWave ? "#ffd700" : COLOR.accent;
        ctx.fillStyle = titleColor;
        ctx.font = compactLayout ? "bold 28px 'Segoe UI', Arial, sans-serif" : (narrowLayout ? "bold 31px 'Segoe UI', Arial, sans-serif" : "bold 34px 'Segoe UI', Arial, sans-serif");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = titleColor;
        ctx.shadowBlur = 12;
        ctx.fillText(titleText, CANVAS_W / 2, compactLayout ? 100 : 115);
        ctx.shadowBlur = 0;

        ctx.fillStyle = COLOR.textDim;
        ctx.font = compactLayout ? "13px 'Segoe UI', Arial, sans-serif" : "15px 'Segoe UI', Arial, sans-serif";
        const numKeys = this.upgradeChoices.length;
        ctx.fillText(isMobile ? "Choose an upgrade (tap to select)" : `Choose an upgrade (click or press 1-${numKeys})`, CANVAS_W / 2, compactLayout ? 130 : 150);

        // Player level badge
        ctx.fillStyle = "rgba(51,204,255,0.15)";
        const badgeW = compactLayout ? 88 : 100;
        const badgeH = compactLayout ? 26 : 30;
        const badgeY = compactLayout ? 138 : 160;
        drawRoundRect(CANVAS_W / 2 - badgeW / 2, badgeY, badgeW, badgeH, 15);
        ctx.fill();
        ctx.fillStyle = COLOR.accent;
        ctx.font = compactLayout ? "bold 12px 'Segoe UI', Arial, sans-serif" : "bold 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`LV ${this.player.level}`, CANVAS_W / 2, badgeY + badgeH / 2 + 1);

        const cardW = compactLayout ? 168 : (narrowLayout ? 188 : 210);
        const cardH = compactLayout ? 178 : (narrowLayout ? 186 : 194);
        const gap = compactLayout ? 12 : 20;
        const rowGap = compactLayout ? 12 : 16;
        const availableW = CANVAS_W - (compactLayout ? 40 : 64);
        let cols = Math.max(1, Math.min(this.upgradeChoices.length, Math.floor((availableW + gap) / (cardW + gap))));
        if (compactLayout && this.upgradeChoices.length > 2) cols = Math.min(cols, 2);
        if (narrowLayout && this.upgradeChoices.length > 3) cols = Math.min(cols, 3);
        const gridW = cols * cardW + (cols - 1) * gap;
        const startX = CANVAS_W / 2 - gridW / 2;
        const startY = compactLayout ? 176 : 210;

        for (let i = 0; i < this.upgradeChoices.length; i++) {
            const up = this.upgradeChoices[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * (cardW + gap);
            const cy = startY + row * (cardH + rowGap);
            const hovered = Mouse.inRect(cx, cy, cardW, cardH);
            const isWeapon = up.cat === "weapon";
            const rarity = upgradeRarity(up);
            const rarityLabel = rarity.toUpperCase();
            const rarityColor = upgradeRarityColor(rarity);
            const pulse = 0.5 + 0.5 * Math.sin(frameNow * 0.01 + i * 0.6);
            const rarityGlow = rarity === "epic"
                ? `rgba(195,139,255,${0.18 + pulse * 0.14})`
                : (rarity === "rare" ? `rgba(102,221,255,${0.15 + pulse * 0.12})` : "rgba(0,0,0,0)");
            const lift = hovered ? (6 + Math.sin(frameNow * 0.018) * 2) : 0;
            const drawY = cy - lift;

            ctx.save();
            ctx.translate(cx + cardW / 2, drawY + cardH / 2);
            const scale = hovered ? 1.03 : 1;
            ctx.scale(scale, scale);
            const cardX = -cardW / 2;
            const cardY = -cardH / 2;

            // Card background with hover lift effect
            drawRoundRect(cardX, cardY, cardW, cardH, 12);
            if (hovered) {
                ctx.fillStyle = isWeapon ? "rgba(255,204,0,0.15)" : "rgba(51,204,255,0.18)";
            } else {
                ctx.fillStyle = "rgba(8,10,30,0.92)";
            }
            ctx.fill();

            if (rarity !== "common") {
                ctx.shadowColor = rarityGlow;
                ctx.shadowBlur = 18;
            }
            // Card border
            ctx.strokeStyle = hovered
                ? (isWeapon ? "#ffcc66" : COLOR.accent)
                : (rarity !== "common" ? rarityColor : "rgba(60,70,100,0.6)");
            ctx.lineWidth = hovered ? 2.5 : 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Category tag
            const tagY = cardY + 14;
            const tagLabel = isWeapon ? "WEAPON" : "STAT";
            const tagColor = isWeapon ? "#ffcc66" : "#66ddff";
            ctx.fillStyle = tagColor;
            ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(tagLabel, 0, tagY);

            // Icon
            ctx.font = compactLayout ? "32px 'Segoe UI', Arial, sans-serif" : "40px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.text;
            ctx.fillText(up.icon, 0, compactLayout ? cardY + 50 : cardY + 58);

            // Name
            ctx.font = compactLayout ? "bold 12px 'Segoe UI', Arial, sans-serif" : "bold 14px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = hovered ? COLOR.accent : COLOR.text;
            ctx.fillText(up.name, 0, compactLayout ? cardY + 80 : cardY + 90, cardW - 20);

            // Rarity
            ctx.font = compactLayout ? "bold 10px 'Segoe UI', Arial, sans-serif" : "bold 11px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = rarityColor;
            ctx.fillText(rarityLabel, 0, compactLayout ? cardY + 96 : cardY + 108);

            // Description (always visible)
            const descText = upgradeDescriptionText(up, this.player);
            const descLines = splitTextLines(descText, compactLayout ? 23 : 28);
            ctx.font = compactLayout ? "10px 'Segoe UI', Arial, sans-serif" : "11px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = COLOR.textDim;
            const maxDescLines = compactLayout ? 1 : 2;
            for (let li = 0; li < Math.min(maxDescLines, descLines.length); li++) {
                const descY = compactLayout ? (cardY + 112 + li * 12) : (cardY + 126 + li * 13);
                ctx.fillText(descLines[li], 0, descY, cardW - 18);
            }

            // Current count if already taken
            const taken = this.player.upgradeCounts[up.id] || 0;
            if (taken > 0) {
                ctx.font = compactLayout ? "10px 'Segoe UI', Arial, sans-serif" : "11px 'Segoe UI', Arial, sans-serif";
                ctx.fillStyle = "#66ff99";
                ctx.fillText(`(owned ×${taken})`, 0, cardY + cardH - 34);
            }

            // Number hint
            ctx.font = compactLayout ? "11px 'Segoe UI', Arial, sans-serif" : "12px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = hovered ? COLOR.accent : COLOR.textDim;
            ctx.fillText(isMobile ? "Tap" : `Press ${i + 1}`, 0, cardY + cardH - 16);

            ctx.restore();

            if (hovered && Mouse.clicked) {
                this.applyUpgrade(i);
                return;
            }
        }
    },

    // ────── SETTINGS ──────

    updateSettings() {
        if (Input.just("Escape")) {
            this.setState(STATE.START_MENU);
        }
    },

    abandonRun() {
        this.commitLossIfNeeded();
        GameAudio.stopMusic();
        CrazyGamesSDK.gameplayStop();
        this.setState(STATE.START_MENU);
    },

    drawSettings() {
        ctx.fillStyle = COLOR.panel;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const isPausedMidRun = this.state === STATE.PAUSED;

        // ── Compute total content height first, then center vertically ──
        const bw = 280, bh = 44;
        const bx = CANVAS_W / 2 - bw / 2;
        const btnGap = 8;   // gap between buttons
        const sectionGap = isPausedMidRun ? 18 : 30;
        const lineGap = isPausedMidRun ? 17 : 22;
        const controlLines = isMobile ? 4 : 4;
        const hasCacheBtn = isPausedMidRun && APP_CONFIG.monetization;

        // Calculate total height of all elements
        let totalH = 40;   // title
        totalH += 12;      // gap after title
        totalH += (bh + btnGap) * 3; // 3 toggle buttons
        if (hasCacheBtn) totalH += bh + btnGap + 20; // cache button + hint
        totalH += sectionGap; // gap before controls
        totalH += 20 + (lineGap + 4) * controlLines; // controls header + lines
        if (!isMobile) totalH += lineGap; // layout note
        totalH += sectionGap; // gap before back
        totalH += bh; // back button
        if (isPausedMidRun) totalH += bh + btnGap + 8; // abandon button

        let y = Math.max(30, Math.floor((CANVAS_H - totalH) / 2));

        // ── Title ──
        ctx.fillStyle = COLOR.accent;
        ctx.font = "bold 36px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isPausedMidRun ? "⏸  PAUSED" : "⚙  SETTINGS", CANVAS_W / 2, y + 30);
        y += 52;

        // ── Run stats panel (right side, independent of button column) ──
        if (isPausedMidRun) {
            const statsW = 220;
            const statsH = 160;
            const statsX = CANVAS_W - statsW - 30;
            const statsY = Math.max(30, Math.floor((CANVAS_H - statsH) / 2));

            drawRoundRect(statsX, statsY, statsW, statsH, 8);
            ctx.fillStyle = "rgba(8, 8, 24, 0.92)";
            ctx.fill();
            ctx.strokeStyle = COLOR.accent;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = COLOR.accent;
            ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("RUN STATS", statsX + statsW / 2, statsY + 20);

            ctx.fillStyle = COLOR.text;
            ctx.font = "13px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            const sl = statsX + 14;
            ctx.fillText(`Wave: ${this.wave}`, sl, statsY + 44);
            ctx.fillText(`Kills: ${this.waveKills}/${this.waveKillsRequired}`, sl, statsY + 64);
            ctx.fillText(`Total kills: ${this.killCount}`, sl, statsY + 84);
            ctx.fillText(`Level: ${this.player.level}`, sl, statsY + 104);
            ctx.fillText(`HP: ${Math.max(0, Math.ceil(this.player.hp))}/${this.player.maxHp}`, sl, statsY + 124);
            ctx.fillText(`Time: ${formatTime(this.timePlayed)}`, sl, statsY + 144);
        }

        // ── Toggle buttons (centered column) ──
        const soundHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton(
            `Sound: ${Settings.soundEnabled ? "ON" : "OFF"}`,
            bx, y, bw, bh, soundHover
        )) {
            Settings.soundEnabled = !Settings.soundEnabled;
            GameAudio.setSfxEnabled(Settings.soundEnabled);
        }
        y += bh + btnGap;

        const musicHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton(
            `Music: ${Settings.musicEnabled ? "ON" : "OFF"}`,
            bx, y, bw, bh, musicHover
        )) {
            Settings.musicEnabled = !Settings.musicEnabled;
            GameAudio.setMusicEnabled(Settings.musicEnabled);
        }
        y += bh + btnGap;

        const shakeHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton(
            `Screen Shake: ${Settings.shakeEnabled ? "ON" : "OFF"}`,
            bx, y, bw, bh, shakeHover
        )) {
            Settings.shakeEnabled = !Settings.shakeEnabled;
        }
        y += bh + btnGap;

        // Optional rewarded shard cache once per run
        if (hasCacheBtn) {
            const cacheHover = Mouse.inRect(bx, y, bw, bh);
            const cacheLabel = this.shardCacheClaimedThisRun
                ? "✅ SHARD CACHE CLAIMED"
                : (this.shardCacheLoading ? "⏳ LOADING AD..." : "🎁 WATCH AD: SHARD CACHE");
            if (drawButton(cacheLabel, bx, y, bw, bh, cacheHover)
                && !this.shardCacheClaimedThisRun && !this.shardCacheLoading) {
                void this.claimRunShardCache();
            }
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "11px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("+20 base shards, scales with wave. Once per run.", CANVAS_W / 2, y + bh + 12);
            y += bh + 20;
        }

        // ── Controls info section ──
        y += sectionGap;
        ctx.fillStyle = COLOR.text;
        ctx.font = isPausedMidRun ? "bold 14px 'Segoe UI', Arial, sans-serif" : "bold 16px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        if (isMobile) {
            ctx.fillText("Controls (Touch)", CANVAS_W / 2, y);
            ctx.font = "13px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = COLOR.textDim;
            y += lineGap + 4;
            ctx.fillText("Left side — Virtual joystick to move", CANVAS_W / 2, y);
            y += lineGap;
            ctx.fillText("Auto-aim — Targets nearest enemy", CANVAS_W / 2, y);
            y += lineGap;
            ctx.fillText("Tap upgrade cards to select", CANVAS_W / 2, y);
            y += lineGap;
            ctx.fillText("⏸ Pause button — Settings", CANVAS_W / 2, y);
        } else {
            ctx.fillText("Controls", CANVAS_W / 2, y);
            ctx.font = "13px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = COLOR.textDim;
            y += lineGap + 4;
            ctx.fillText("WASD / ZQSD / Arrow Keys — Move", CANVAS_W / 2, y);
            y += lineGap;
            ctx.fillText(Settings.gameMode === "hard"
                ? "Manual aim — Move mouse to aim"
                : "Auto-aim — Targets nearest enemy", CANVAS_W / 2, y);
            y += lineGap;
            ctx.fillText("1 / 2 / 3 — Select upgrade", CANVAS_W / 2, y);
            y += lineGap;
            ctx.fillText(isPausedMidRun ? "ESC — Resume" : "ESC — Back", CANVAS_W / 2, y);
            y += lineGap;
            ctx.font = "11px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("Layout-agnostic: works on QWERTY, AZERTY, QWERTZ, etc.", CANVAS_W / 2, y);
        }

        // A/B experiment info (developer-only)
        y += lineGap;
        if (SHOW_DEV_INFO) {
            ctx.font = "11px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = COLOR.textDim;
            const exp = Experiments.all();
            ctx.fillText(`A/B: pacing=${exp.earlyPacing}, gameOver=${exp.gameOverFlow}, adCopy=${exp.rewardedCopy}`, CANVAS_W / 2, y);
        }

        // ── Back button ──
        y += sectionGap;
        const backHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton(isPausedMidRun ? "▶ RESUME" : "← BACK", bx, y, bw, bh, backHover)) {
            this.setState(isPausedMidRun ? STATE.GAMEPLAY : STATE.START_MENU, !isPausedMidRun);
        }

        // ── Abandon run button ──
        if (isPausedMidRun) {
            y += bh + btnGap + 8;
            const abandonHover = Mouse.inRect(bx, y, bw, bh);
            if (drawButton("⏹  ABANDON RUN", bx, y, bw, bh, abandonHover)) {
                this.abandonRun();
            }
        }
    },

    // ────── GAME OVER ──────

    updateGameOver() {
        if (Input.just("Enter")) {
            this.commitLossIfNeeded();
            this.startGame();
        }
    },

    drawGameOverOverlay() {
        // Improved overlay gradient
        const goGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 50, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W);
        goGrad.addColorStop(0, "rgba(30,0,0,0.65)");
        goGrad.addColorStop(1, "rgba(0,0,0,0.82)");
        ctx.fillStyle = goGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // ── Fixed top-anchored layout so text and buttons never overlap ──
        // Title band: y = 68
        ctx.shadowColor = COLOR.danger;
        ctx.shadowBlur = 16;
        ctx.fillStyle = COLOR.danger;
        ctx.font = "bold 48px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", CANVAS_W / 2, 68);
        ctx.shadowBlur = 0;

        // New high score indicator: y = 106
        if (this.lastHighScoreRank > 0) {
            const pulse = 0.7 + 0.3 * Math.sin(frameNow * 0.005);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 26px 'Segoe UI', Arial, sans-serif";
            if (this.lastHighScoreRank === 1) {
                ctx.fillText("🏆 NEW HIGH SCORE! 🏆", CANVAS_W / 2, 106);
            } else {
                ctx.fillText(`🎖️ TOP ${this.lastHighScoreRank} SCORE! 🎖️`, CANVAS_W / 2, 106);
            }
            ctx.globalAlpha = 1;
        }

        // Stats block: y = 148 … 264 (each line 22–26 px apart, no overlap)
        ctx.fillStyle = COLOR.text;
        ctx.font = "20px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Wave ${this.wave}  •  ☠ ${this.killCount} kills`, CANVAS_W / 2, 148);

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "16px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Mode: ${this.lastRunGameMode.toUpperCase()}  •  Challenge: ${this.lastRunChallengeLabel}`,
            CANVAS_W / 2, 174);   // 26 px below previous line (was only 9 px → overlap fixed)
        const timeSurvivedText = `Time survived: ${formatTime(this.timePlayed)}`;
        const comboSuffix = this.bestCombo >= 3 ? `  •  Best combo: ${this.bestCombo}x` : "";
        ctx.fillText(timeSurvivedText + comboSuffix, CANVAS_W / 2, 198);
        // When a revive is still available the run is not finalised yet – show the
        // payout it is currently worth instead of a misleading "+0".
        const shardsShown = this.runFinalized ? this.lastRunShardGain : this.computeShardGain(false);
        ctx.fillText(`Shards earned: +${shardsShown}${this.lastDailyReward > 0 ? `  •  Daily bonus +${this.lastDailyReward}` : ""}`,
            CANVAS_W / 2, 220);

        const accuracy = this.runShotsFired > 0
            ? Math.round((this.runShotsHit / this.runShotsFired) * 100)
            : 0;
        ctx.fillText(`Summary: Accuracy ${accuracy}%  •  Upgrades ${this.runUpgradesTaken}  •  Bosses ${this.runBossesDefeated}`,
            CANVAS_W / 2, 242);

        // Best score comparison
        const best = HighScores.getBest();
        if (best && this.lastHighScoreRank !== 1) {
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "14px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(`Best: Wave ${best.wave}  •  ☠${best.kills}  •  ${formatTime(best.time)}`, CANVAS_W / 2, 264);
        }

        // ── Buttons: start at y = 292, well below the text block ──
        const bw = 220, bh = 48;
        const bx = CANVAS_W / 2 - bw / 2;
        const btnStride = bh + 8;  // 56 px per button slot

        const hasReviveArea = APP_CONFIG.monetization && !this.revivedThisRun;

        // Determine which slot each action occupies (2 slots without revive, 3 with)
        const slot1Y = 292;
        const slot2Y = slot1Y + btnStride;   // 348
        const slot3Y = slot2Y + btnStride;   // 404  (menu when revive is present)

        let reviveSlotY, restartSlotY, menuBtnY;
        if (hasReviveArea) {
            if (this.expGameOverFlow === "restartFirst") {
                restartSlotY = slot1Y;
                reviveSlotY  = slot2Y;
            } else {
                reviveSlotY  = slot1Y;
                restartSlotY = slot2Y;
            }
            menuBtnY = slot3Y;
        } else {
            restartSlotY = slot1Y;
            menuBtnY     = slot2Y;
            reviveSlotY  = null;
        }

        const reviveLabel = this.reviveInProgress
            ? "⏳  LOADING AD..."
            : (this.expRewardedCopy === "urgency" ? "🎁  REVIVE NOW (AD)" : "🎁  REVIVE (AD)");
        const reviveInfoLabel = this.expRewardedCopy === "urgency"
            ? "One revive only - keep your run alive"
            : "One revive per run";

        // Rewarded revive (one-time)
        if (hasReviveArea && this.challengeAllowsRevive) {
            const reviveHover = Mouse.inRect(bx, reviveSlotY, bw, bh);
            if (drawButton(reviveLabel, bx, reviveSlotY, bw, bh, reviveHover) && !this.reviveInProgress) {
                void this.tryRewardedRevive();
            }
        } else if (hasReviveArea && !this.challengeAllowsRevive) {
            // Show disabled-revive notice in the revive slot (no button, just text)
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Revive disabled by challenge mode", CANVAS_W / 2, reviveSlotY + bh / 2);
        }

        // Restart
        const restartHover = Mouse.inRect(bx, restartSlotY, bw, bh);
        if (drawButton("↻  RESTART", bx, restartSlotY, bw, bh, restartHover)) {
            this.commitLossIfNeeded();
            this.startGame();
        }

        // Menu
        const menuHover = Mouse.inRect(bx, menuBtnY, bw, bh);
        if (drawButton("🏠  MAIN MENU", bx, menuBtnY, bw, bh, menuHover)) {
            this.commitLossIfNeeded();
            this.setState(STATE.START_MENU);
        }

        // Revive info label — shown below all buttons so it never overlaps them
        if (hasReviveArea && this.challengeAllowsRevive) {
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(reviveInfoLabel, CANVAS_W / 2, menuBtnY + bh + 14);
        }

        // ── Local High Scores (per-mode) ──
        const tableTopY = menuBtnY + bh + (hasReviveArea ? 34 : 22);
        const scores = HighScores.getAll();
        if (scores.length > 0) {
            const tableX = CANVAS_W / 2;
            ctx.fillStyle = COLOR.accent;
            ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`── ${gameModeLabel()} SCORES ──`, tableX, tableTopY);

            ctx.font = "13px 'Segoe UI', Arial, sans-serif";
            for (let i = 0; i < scores.length; i++) {
                const s = scores[i];
                const ty = tableTopY + 22 + i * 20;
                const isNew = s.id === HighScores.getLastSubmittedId();
                const wonFlag = HighScores.isWinningRun(s) ? "🏆 " : "";
                ctx.fillStyle = isNew ? "#ffd700" : (i === 0 ? COLOR.accent : COLOR.textDim);
                ctx.textAlign = "center";
                ctx.fillText(
                    `${i + 1}. ${wonFlag}Wave ${s.wave}  •  ☠${s.kills}  •  ${formatTime(s.time)}${isNew ? "  ← YOU" : ""}`,
                    tableX, ty
                );
            }
        }

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "14px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isMobile ? "Tap RESTART to play again" : "Press ENTER to restart", CANVAS_W / 2, CANVAS_H - 40);
    },

    // ────── VICTORY ──────

    onVictory() {
        if (this.runFinalized) return;
        this.state = STATE.VICTORY;
        GameAudio.stopMusic();
        GameAudio.sfxNewHighScore();
        CrazyGamesSDK.happyTime();
        CrazyGamesSDK.gameplayStop();
        const runContext = this.getRunContext();
        this.lastHighScoreRank = HighScores.submit(this.wave, this.killCount, this.timePlayed, true, runContext);
        const prestigeResult = Progression.applyPrestigeFromFinalBoss();
        this.lastPrestigeGain = prestigeResult.gain;
        this.lastPrestigeTotal = prestigeResult.total;
        this.lastRunShardGain = 0;
        this.lastDailyReward = 0;
        CrazyGamesSDK.submitScore(this.wave, this.killCount, this.timePlayed, true, runContext);
        this.runFinalized = true;
    },

    updateVictory() {
        if (Input.just("Enter")) {
            this.startGame();
        }
    },

    drawVictory() {
        ctx.fillStyle = COLOR.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Twinkling stars background
        for (let i = 0; i < 60; i++) {
            const sx = (i * 137 + frameNow * 0.02) % CANVAS_W;
            const sy = (i * 211 + frameNow * 0.015) % CANVAS_H;
            const alpha = 0.3 + 0.3 * Math.sin(frameNow * 0.01 + i);
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,215,0,${alpha})`;
            ctx.fill();
        }

        // ── Fixed top-anchored layout so text never overlaps buttons ──
        // Title: y = 68
        const pulse = 0.85 + 0.15 * Math.sin(frameNow * 0.006);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 56px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🏆 YOU WIN! 🏆", CANVAS_W / 2, 68);
        ctx.globalAlpha = 1;

        // Stats block: y = 126 … 280, 20-28 px per line (no overlap)
        ctx.fillStyle = COLOR.text;
        ctx.font = "22px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`${BOSS_NAMES.endboss} has been vanquished!`, CANVAS_W / 2, 126);

        ctx.fillStyle = COLOR.accent;
        ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`⏱ Time: ${formatTime(this.timePlayed)}  •  ☠ ${this.killCount} kills`, CANVAS_W / 2, 154);

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "15px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Mode: ${this.lastRunGameMode.toUpperCase()}  •  Challenge: ${this.lastRunChallengeLabel}`,
            CANVAS_W / 2, 178);
        ctx.fillText("Leaderboard rank is decided by fastest completion time", CANVAS_W / 2, 198);
        ctx.fillText(`Prestige gained: +${this.lastPrestigeGain}  •  Total Prestige: ${this.lastPrestigeTotal}`,
            CANVAS_W / 2, 218);
        ctx.fillText(`Prestige reset applied: Shards ${PRESTIGE_RESET_SHARDS ? "reset" : "kept"}  •  Meta ${PRESTIGE_RESET_META ? "reset" : "kept"}`,
            CANVAS_W / 2, 238);
        const victoryNextPrestige = getNextPrestigeSkinPreview(Progression.getSkinCatalog(), this.lastPrestigeTotal);
        ctx.fillText(
            victoryNextPrestige
                ? `Next prestige reward: ${victoryNextPrestige.name} at Prestige ${victoryNextPrestige.requirement}`
                : "Prestige track complete",
            CANVAS_W / 2,
            258
        );

        const accuracy = this.runShotsFired > 0
            ? Math.round((this.runShotsHit / this.runShotsFired) * 100)
            : 0;
        ctx.fillText(`Summary: Accuracy ${accuracy}%  •  Upgrades ${this.runUpgradesTaken}  •  Bosses ${this.runBossesDefeated}`,
            CANVAS_W / 2, 278);

        // ── Buttons: start at y = 306, after the text block ends at ~286 ──
        const bw = 220, bh = 48;
        const bx = CANVAS_W / 2 - bw / 2;

        const restartY = 306;
        const restartHover = Mouse.inRect(bx, restartY, bw, bh);
        if (drawButton("↻  PLAY AGAIN", bx, restartY, bw, bh, restartHover)) {
            this.startGame();
        }

        const menuY = restartY + bh + 8;   // 362
        const menuHover = Mouse.inRect(bx, menuY, bw, bh);
        if (drawButton("🏠  MAIN MENU", bx, menuY, bw, bh, menuHover)) {
            this.setState(STATE.START_MENU);
        }

        // Best scores
        const scores = HighScores.getAll();
        if (scores.length > 0) {
            const tableX = CANVAS_W / 2;
            const tableY = menuY + bh + 22;  // 432
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`── ${gameModeLabel()} SCORES ──`, tableX, tableY);

            ctx.font = "13px 'Segoe UI', Arial, sans-serif";
            for (let i = 0; i < scores.length; i++) {
                const s = scores[i];
                const ty = tableY + 22 + i * 20;
                const isNew = s.id === HighScores.getLastSubmittedId();
                const wonFlag = HighScores.isWinningRun(s) ? "🏆 " : "";
                ctx.fillStyle = isNew ? "#ffd700" : (i === 0 ? COLOR.accent : COLOR.textDim);
                ctx.fillText(
                    `${i + 1}. ${wonFlag}Wave ${s.wave}  •  ☠${s.kills}  •  ${formatTime(s.time)}${isNew ? "  ← YOU" : ""}`,
                    tableX, ty
                );
            }
        }

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "14px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isMobile ? "Tap PLAY AGAIN to restart" : "Press ENTER to restart", CANVAS_W / 2, CANVAS_H - 40);
    },
};

// ─────────────────────────────────────────────
// §18  MAIN LOOP  (requestAnimationFrame + delta-time)
// ─────────────────────────────────────────────

let lastTime = 0;

function mainLoop(timestamp) {
    requestAnimationFrame(mainLoop);

    if (document.hidden) {
        lastTime = timestamp;
        return;
    }

    // Cache performance.now() for use by all entities this frame
    frameNow = timestamp;

    // Delta time in seconds, capped to avoid large jumps
    const rawDt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    const dt = Math.min(rawDt, MAX_DT);

    game.update(dt);
    game.draw();

    // Flush input at end of frame
    Input.flush();
    Mouse.flush();
    TouchControls.flush();
}

// ────── BOOT ──────
async function bootGame() {
    try {
        BOOT_DIAGNOSTICS.env = await loadEnvConfig();
    } catch (e) {
        console.warn("[Boot] Failed loading .env config, continuing", e);
        BOOT_DIAGNOSTICS.env = { ok: false, source: "default" };
    }

    Experiments.load();
    try {
        await CrazyGamesSDK.init();
    } catch (e) {
        console.warn("[Boot] CrazyGames init failed, continuing in standalone mode", e);
    }

    try { CrazyGamesSDK.loadingStart(); } catch (e) { /* ignore */ }

    try {
        try {
            BOOT_DIAGNOSTICS.changelogs = await loadChangelogs();
        } catch (e) {
            console.warn("[Boot] Failed loading changelogs, continuing", e);
            GAME_VERSION = "unknown";
            BOOT_DIAGNOSTICS.changelogs = { ok: false, source: "error", entries: 0, version: GAME_VERSION };
        }

        try {
            BOOT_DIAGNOSTICS.skinShop = await loadSkinShopConfig();
        } catch (e) {
            console.warn("[Boot] Failed loading skin shop config, continuing", e);
            BOOT_DIAGNOSTICS.skinShop = {
                ok: false,
                source: "error",
                skins: SKIN_SHOP_CONFIG.skins.length,
                featured: SKIN_SHOP_CONFIG.featuredIds.length,
            };
        }

        try {
            await Progression.init();
            // First-time players get a small stash so the loot system is
            // reachable without grinding shards first.
            Progression.ensureStarterShards();
            BOOT_DIAGNOSTICS.progression = { ok: true };
        } catch (e) {
            console.warn("[Boot] Failed loading progression, continuing", e);
            BOOT_DIAGNOSTICS.progression = { ok: false };
        }

        validateRuntimeConfiguration();
        logBootDiagnostics();

        game.init();
    } finally {
        try { CrazyGamesSDK.loadingStop(); } catch (e) { /* ignore */ }
    }

    lastTime = performance.now();
    requestAnimationFrame(mainLoop);
}

bootGame().catch((e) => {
    console.error("[Boot] Unhandled boot error, falling back", e);
    try {
        if (!game.player) game.init();
    } catch (inner) {
        console.error("[Boot] Fallback init failed", inner);
    }
    lastTime = performance.now();
    requestAnimationFrame(mainLoop);
});

