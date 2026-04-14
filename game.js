// ════════════════════════════════════════════════════════════════════════════
// RogueWave – Survivor Roguelite
// A polished, modular HTML5 Canvas game ready for CrazyGames SDK v3.
// All code is in this single file for rapid prototyping.
// ════════════════════════════════════════════════════════════════════════════

"use strict";

// ─────────────────────────────────────────────
// §1  CONSTANTS & CONFIGURATION
// ─────────────────────────────────────────────

const CANVAS_W = 960;
const CANVAS_H = 640;
const TARGET_FPS = 60;
const FIXED_DT = 1 / TARGET_FPS;        // Logical step in seconds
const MAX_DT = 0.1;                      // Cap to avoid spiral of death
let GAME_VERSION = "loading...";
let CHANGELOG_ENTRIES = [];

// Game-state identifiers
const STATE = {
    START_MENU:     "START_MENU",
    CHANGELOGS:     "CHANGELOGS",
    GAMEPLAY:       "GAMEPLAY",
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
const ENEMY_BASE_RADIUS = 14;
const ENEMY_BASE_SPEED = 80;
const ENEMY_BASE_HP = 30;

// Enemy type definitions
const ENEMY_TYPES = {
    normal:   { hpMult: 1,   spdMult: 1,    radius: 14, contactDmg: 10, color: null,      xpMult: 1   },
    tank:     { hpMult: 3.5, spdMult: 0.45, radius: 24, contactDmg: 25, color: "#44bb44", xpMult: 2.5 },
    speedy:   { hpMult: 0.5, spdMult: 2.2,  radius: 10, contactDmg: 8,  color: "#ffdd33", xpMult: 1.2 },
    ranged:   { hpMult: 0.8, spdMult: 0.7,  radius: 13, contactDmg: 6,  color: "#bb55ff", xpMult: 1.8 },
    exploder: { hpMult: 0.9, spdMult: 1.1,  radius: 15, contactDmg: 5,  color: "#ff8800", xpMult: 1.5 },
    miniboss: { hpMult: 12,  spdMult: 0.55, radius: 38, contactDmg: 30, color: "#dd2277", xpMult: 12  },
    bigboss:  { hpMult: 30,  spdMult: 0.35, radius: 56, contactDmg: 50, color: "#cc0000", xpMult: 30  },
};

// XP
const XP_ORB_RADIUS = 6;
const XP_BASE_AMOUNT = 10;
const XP_MAGNET_RANGE = 100;

// Particle
const PARTICLE_LIFETIME = 0.5;

// ── Performance caps ──
const MAX_PARTICLES = 150;
const MAX_ENEMIES = 80;
const MAX_XP_ORBS = 150;
const MAX_FLAME_PATCHES = 50;
const MAX_LIGHTNING_BOLTS = 20;
const PERF_LOW_THRESHOLD = 52;
const PERF_RECOVER_THRESHOLD = 57;
const PERF_SAMPLE_WINDOW = 1.2;
const TUTORIAL_HINT_DURATION = 8;

// Camera
const CAMERA_LERP_SPEED = 5;             // Higher = snappier follow

// Screen-shake
const SHAKE_DURATION = 0.15;
const SHAKE_INTENSITY = 6;

// Wave – infinite spawning, kill-target progression
const WAVE_BASE_KILLS = 10;              // kills needed to complete wave 1
const WAVE_KILLS_GROWTH = 5;             // additional kills required per wave
const WAVE_BASE_SPAWN_CD = 1.5;          // spawn cooldown in seconds (wave 1)
const WAVE_SPAWN_CD_MIN = 0.3;           // minimum spawn cooldown
const WAVE_SPAWN_CD_DECAY = 0.92;        // multiply cooldown by this each wave
const WAVE_HP_SCALE = 1.22;
const WAVE_SPEED_SCALE = 1.07;
const WAVE_DAMAGE_SCALE = 1.10;          // contact damage grows per wave
const WAVE_REST_TIME = 2.5;              // seconds between waves
const WAVE_MAX = 25;                     // completing this wave triggers victory

// Upgrade choices per level-up
const UPGRADE_CHOICES = 3;

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
    exploder:    "#ff8800",
};

const BIOMES = [
    { name: "Neon District", bg: "#101226", grid: "#1a2448", border: "#33ccff" },
    { name: "Acid Grid", bg: "#131b17", grid: "#1d3a2c", border: "#66ff99" },
    { name: "Crimson Core", bg: "#1d1016", grid: "#3a1d28", border: "#ff6688" },
];

const CHALLENGE_MODES = [
    { id: "none", label: "No Challenge", desc: "Standard run" },
    { id: "rush", label: "Rush", desc: "Faster enemies, more shards" },
    { id: "glass", label: "Glass Cannon", desc: "Low HP, high damage" },
];

// ─────────────────────────────────────────────
// §2  CANVAS & CONTEXT SETUP
// ─────────────────────────────────────────────

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

function resizeCanvas() {
    const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
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

/** Shuffle array in-place (Fisher-Yates) */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Format number with K suffix */
function fmtNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(Math.floor(n));
}

/** Format seconds as MM:SS */
function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
            return;
        }
    }

    try {
        const res = await fetch("changelogs.txt", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const entries = parseChangelogText(text);

        if (entries.length > 0) {
            CHANGELOG_ENTRIES = entries;
            GAME_VERSION = entries[0].version;
            return;
        }

        GAME_VERSION = "unknown";
    } catch (err) {
        console.warn("Failed to load changelogs.txt", err);
        CHANGELOG_ENTRIES = [];
        GAME_VERSION = "unknown";
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

/** Cached DOMHighResTimeStamp – updated once per frame in mainLoop from requestAnimationFrame */
let frameNow = 0;

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

const Audio = (() => {
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
    // A simple procedurally generated 8-bar retro melody that loops

    const MUSIC_BPM = 140;
    const BEAT = 60 / MUSIC_BPM;

    // Melody pattern (note frequencies, 0 = rest)
    const melodyBars = [
        [262, 330, 392, 330,  262, 330, 392, 523],
        [440, 392, 330, 262,  330, 392, 440, 392],
        [349, 440, 523, 440,  349, 330, 262, 330],
        [392, 330, 262, 220,  262, 330, 392, 330],
        [262, 330, 392, 523,  440, 392, 330, 392],
        [440, 523, 440, 392,  330, 262, 330, 392],
        [349, 330, 262, 330,  349, 440, 523, 440],
        [392, 330, 262, 220,  196, 220, 262,   0],
    ];
    // Bass pattern
    const bassBars = [
        [131, 0, 131, 0,  165, 0, 165, 0],
        [220, 0, 220, 0,  196, 0, 196, 0],
        [175, 0, 175, 0,  165, 0, 165, 0],
        [196, 0, 196, 0,  131, 0, 131, 0],
        [131, 0, 131, 0,  220, 0, 220, 0],
        [220, 0, 220, 0,  196, 0, 196, 0],
        [175, 0, 175, 0,  220, 0, 220, 0],
        [196, 0, 196, 0,  131, 0, 131, 0],
    ];

    function scheduleMusic() {
        if (!Settings.musicEnabled || !musicPlaying) return;
        const ctx = ensureContext();
        const now = ctx.currentTime;
        const beatLen = BEAT * 0.5; // eighth notes
        const barLen = beatLen * 8;
        const totalLen = barLen * melodyBars.length;

        for (let bar = 0; bar < melodyBars.length; bar++) {
            for (let note = 0; note < 8; note++) {
                const t = now + bar * barLen + note * beatLen;
                // Melody
                const mFreq = melodyBars[bar][note];
                if (mFreq > 0) {
                    playTone(mFreq, "square", beatLen * 0.8, 0.08, musicGain, t);
                }
                // Bass
                const bFreq = bassBars[bar][note];
                if (bFreq > 0) {
                    playTone(bFreq, "triangle", beatLen * 0.9, 0.1, musicGain, t);
                }
            }
            // Simple kick drum on beats 1 and 5
            for (let beat of [0, 4]) {
                const t = now + bar * barLen + beat * beatLen;
                playTone(60, "sine", 0.08, 0.12, musicGain, t);
            }
            // Hi-hat on every other beat
            for (let beat = 0; beat < 8; beat += 2) {
                const t = now + bar * barLen + beat * beatLen + beatLen * 0.5;
                playNoise(0.03, 0.04, musicGain, t);
            }
        }

        // Schedule next loop
        musicTimeout = setTimeout(() => scheduleMusic(), totalLen * 1000 - 100);
    }

    function startMusic() {
        if (musicPlaying) return;
        ensureContext();
        musicPlaying = true;
        scheduleMusic();
    }

    function stopMusic() {
        musicPlaying = false;
        if (musicTimeout) {
            clearTimeout(musicTimeout);
            musicTimeout = null;
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
        sfxGameOver,
        sfxUpgradeSelect,
        sfxExplosion,
        sfxNewHighScore,
        startMusic,
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

    function storageKey(mode) {
        // mode: "easy", "normal", or "hard"
        const m = (mode != null && mode !== "") ? mode : (Settings.gameMode || "normal");
        return `${STORAGE_PREFIX}_${m}`;
    }

    function load(mode) {
        try {
            const raw = localStorage.getItem(storageKey(mode));
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return [];
    }

    function save(scores, mode) {
        try {
            localStorage.setItem(storageKey(mode), JSON.stringify(scores));
        } catch (e) { /* ignore */ }
    }

    /** Submit a score. Returns the rank (1-based) if it's a top score, or 0 if not. */
    let lastSubmittedId = null;

    function submit(wave, kills, timePlayed, won) {
        const scores = load();
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const entry = { id, wave, kills, time: timePlayed, won: !!won };
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
        save(scores);

        // Determine rank (0 if not in top list)
        const rank = scores.findIndex(s => s.id === id);
        return rank >= 0 ? rank + 1 : 0;
    }

    function getLastSubmittedId() { return lastSubmittedId; }

    /** Returns true for a winning run (completed all waves). Also handles legacy entries. */
    function isWinningRun(s) { return s.won || s.wave >= WAVE_MAX; }

    function getAll(mode) {
        return load(mode);
    }

    function getBest(mode) {
        const scores = load(mode);
        return scores.length > 0 ? scores[0] : null;
    }

    return { submit, getAll, getBest, getLastSubmittedId, isWinningRun };
})();

// ─────────────────────────────────────────────
// §3d  PERSISTENT PROGRESSION (meta, skins, daily)
// ─────────────────────────────────────────────

const Progression = (() => {
    const STORAGE_KEY = "roguewave_profile_v2";
    const META_MAX = 8;
    const SKINS = {
        default: { id: "default", name: "Classic Cyan", player: "#33ccff", glow: "rgba(51,204,255,0.25)", cost: 0 },
        surge:   { id: "surge",   name: "Lime Surge",  player: "#66ff99", glow: "rgba(102,255,153,0.25)", cost: 140 },
        ember:   { id: "ember",   name: "Ember Pulse", player: "#ff6688", glow: "rgba(255,102,136,0.25)", cost: 140 },
    };

    let data = {
        shards: 0,
        meta: { hp: 0, dmg: 0, xp: 0 },
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

    function normalize(loaded) {
        const base = cloneData();
        if (!loaded || typeof loaded !== "object") return base;
        base.shards = Number.isFinite(loaded.shards) ? Math.max(0, Math.floor(loaded.shards)) : 0;

        const lm = loaded.meta || {};
        base.meta.hp = clamp(Math.floor(lm.hp || 0), 0, META_MAX);
        base.meta.dmg = clamp(Math.floor(lm.dmg || 0), 0, META_MAX);
        base.meta.xp = clamp(Math.floor(lm.xp || 0), 0, META_MAX);

        const ls = loaded.skins || {};
        const unlocked = Array.isArray(ls.unlocked) ? ls.unlocked.filter(id => !!SKINS[id]) : ["default"];
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

        return base;
    }

    async function init() {
        const raw = await CrazyGamesSDK.loadData(STORAGE_KEY);
        if (raw) {
            try { data = normalize(JSON.parse(raw)); } catch (e) { data = normalize(null); }
        }
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
        return Object.values(SKINS).map(s => ({ ...s, unlocked: unlocked.has(s.id), selected: data.skins.selected === s.id }));
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
        const lvl = metaLevel(type);
        return lvl >= META_MAX ? null : 25 + lvl * 25;
    }

    return {
        init,
        get,
        getDailyView,
        addShards,
        buyMeta,
        metaLevel,
        metaCost,
        getSkinCatalog,
        getSelectedSkin,
        unlockOrSelectSkin,
        applyMetaToPlayer,
        registerRun,
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

    init() {
        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            this.x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
            this.y = (e.clientY - rect.top) * (CANVAS_H / rect.height);
        });
        canvas.addEventListener("mousedown", () => { this.clicked = true; });

        // Touch support – map touches to mouse position & click
        canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            // During gameplay on mobile, only use right-half touches for aiming
            // so joystick touches don't move the aim cursor.
            const rect = canvas.getBoundingClientRect();
            for (const t of e.changedTouches) {
                const cx = (t.clientX - rect.left) * (CANVAS_W / rect.width);
                const cy = (t.clientY - rect.top)  * (CANVAS_H / rect.height);
                if (isMobile && game.state === STATE.GAMEPLAY && cx < CANVAS_W / 2) continue;
                this.x = cx;
                this.y = cy;
                this.clicked = true;
            }
            // Fallback: if no valid touch was found (e.g. all on left side), still mark clicked for menus
            if (!this.clicked && game.state !== STATE.GAMEPLAY) {
                const t = e.changedTouches[0];
                this.x = (t.clientX - rect.left) * (CANVAS_W / rect.width);
                this.y = (t.clientY - rect.top)  * (CANVAS_H / rect.height);
                this.clicked = true;
            }
        }, { passive: false });
        canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            for (const t of e.changedTouches) {
                const cx = (t.clientX - rect.left) * (CANVAS_W / rect.width);
                const cy = (t.clientY - rect.top)  * (CANVAS_H / rect.height);
                if (isMobile && game.state === STATE.GAMEPLAY && cx < CANVAS_W / 2) continue;
                this.x = cx;
                this.y = cy;
            }
        }, { passive: false });
        canvas.addEventListener("touchend", (e) => {
            e.preventDefault();
        }, { passive: false });
    },

    flush() { this.clicked = false; },

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

    // Joystick visual config
    baseRadius: 56,
    stickRadius: 24,
    maxDist: 50,          // max travel from center

    pauseTapped: false,

    getPauseButtonRect() {
        if (isPortraitMobile()) {
            return { x: CANVAS_W - 70, y: 10, w: 60, h: 40 };
        }
        return { x: CANVAS_W - 52, y: 8, w: 44, h: 36 };
    },

    init() {
        if (!isMobile) return;

        canvas.addEventListener("touchstart", (e) => {
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
            }
        }, { passive: false });

        canvas.addEventListener("touchmove", (e) => {
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
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (const t of e.changedTouches) {
                if (this.moveActive && t.identifier === this.moveId) {
                    this.moveActive = false;
                    this.moveId = -1;
                    this.moveDx = 0;
                    this.moveDy = 0;
                }
            }
        };
        canvas.addEventListener("touchend", endTouch, { passive: false });
        canvas.addEventListener("touchcancel", endTouch, { passive: false });
    },

    /** Convert a Touch to canvas-logical coordinates */
    _toCanvas(touch) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (CANVAS_W / rect.width),
            y: (touch.clientY - rect.top)  * (CANVAS_H / rect.height),
        };
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
        const barW = 5, barH = 16;
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
            const intensity = SHAKE_INTENSITY * (this.shakeTimer / SHAKE_DURATION);
            this.shakeOffsetX = randRange(-intensity, intensity);
            this.shakeOffsetY = randRange(-intensity, intensity);
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
    }

    shake() {
        if (!Settings.shakeEnabled) return;
        this.shakeTimer = SHAKE_DURATION;
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
        Progression.applyMetaToPlayer(this);
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
            // Hard mode: manual aim toward mouse cursor
            const worldMouseX = Mouse.x + game.camera.x;
            const worldMouseY = Mouse.y + game.camera.y;
            this.angle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);
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

        // Glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = this.skinGlow;
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const flash = this.invTimer > 0 && Math.floor(this.invTimer * 20) % 2;
        ctx.fillStyle = flash ? "#ffffff" : this.skinColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // Direction indicator
        const tipX = this.x + Math.cos(this.angle) * (this.radius + 8);
        const tipY = this.y + Math.sin(this.angle) * (this.radius + 8);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.bullet;
        ctx.fill();

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
        Audio.sfxPlayerHit();
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }

    addXP(amount) {
        this.xp += amount;
        Audio.sfxXPPickup();
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(this.xpToNext * 1.4);
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

        // Exploder
        this.exploded = false;
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

        if (this.type === "ranged") {
            // Ranged enemies try to maintain distance and shoot
            if (d > 1) {
                let moveFactor = 1;
                if (d < this.preferredDist - 20) moveFactor = -0.7; // back away
                else if (d < this.preferredDist + 20) moveFactor = 0; // hold position
                this.x += (dx / d) * currentSpeed * moveFactor * dt;
                this.y += (dy / d) * currentSpeed * moveFactor * dt;
                // Slight strafe
                const strafe = Math.sin(frameNow * 0.003 + this.x) * 0.5;
                this.x += (-dy / d) * currentSpeed * strafe * dt;
                this.y += (dx / d) * currentSpeed * strafe * dt;
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
        } else {
            // All other types chase the player
            if (d > 1) {
                this.x += (dx / d) * currentSpeed * dt;
                this.y += (dy / d) * currentSpeed * dt;
            }
        }

        // Clamp to world
        this.x = clamp(this.x, this.radius, WORLD_W - this.radius);
        this.y = clamp(this.y, this.radius, WORLD_H - this.radius);

        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.contactTimer = Math.max(0, this.contactTimer - dt);
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

        // HP bar (only if damaged)
        if (this.hp < this.maxHp) {
            const bw = this.radius * 2.5;
            const bh = (this.type === "bigboss") ? 8 : (this.type === "miniboss" ? 6 : 4);
            const bx = this.x - bw / 2;
            const by = this.y - this.radius - 12;
            ctx.fillStyle = COLOR.hpBarBg;
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = this.type === "bigboss" ? "#ff3333" : (this.type === "miniboss" ? "#ff88bb" : COLOR.hpBar);
            ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
            // Boss name label
            if (this.type === "miniboss" || this.type === "bigboss") {
                ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = this.type === "bigboss" ? "#ff3333" : "#ff88bb";
                ctx.fillText(this.type === "bigboss" ? "★ BIG BOSS ★" : "★ MINIBOSS ★", this.x, by - 2);
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 0.1;
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
                Audio.sfxExplosion();
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
        if (d < XP_MAGNET_RANGE + game.xpMagnetBonus) {
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
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.xpOrb;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ─────────────────────────────────────────────
// §12  PARTICLE CLASS
// ─────────────────────────────────────────────

class Particle {
    constructor(x, y, color) {
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
// §13  UPGRADE DEFINITIONS
// ─────────────────────────────────────────────

const UPGRADES = [
    // ── Stat upgrades ──
    { id: "dmg1",   name: "+5 Damage",          icon: "⚔️",  cat: "stat", apply(p) { p.damage += 5; } },
    { id: "dmg2",   name: "+10 Damage",         icon: "🗡️",  cat: "stat", apply(p) { p.damage += 10; } },
    { id: "spd1",   name: "+15% Move Speed",    icon: "👟",  cat: "stat", apply(p) { p.speed *= 1.15; } },
    { id: "spd2",   name: "+25% Move Speed",    icon: "💨",  cat: "stat", apply(p) { p.speed *= 1.25; } },
    { id: "rate1",  name: "+20% Fire Rate",     icon: "🔫",  cat: "stat", apply(p) { p.fireRate *= 0.80; } },
    { id: "rate2",  name: "+35% Fire Rate",     icon: "💥",  cat: "stat", apply(p) { p.fireRate *= 0.65; } },
    { id: "hp1",    name: "+25 Max HP",         icon: "❤️",  cat: "stat", apply(p) { p.maxHp += 25; p.hp = Math.min(p.hp + 25, p.maxHp); } },
    { id: "hp2",    name: "+50 Max HP",         icon: "💖",  cat: "stat", apply(p) { p.maxHp += 50; p.hp = Math.min(p.hp + 50, p.maxHp); } },
    { id: "heal",   name: "Heal 30%",           icon: "🩹",  cat: "stat", apply(p) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); } },
    { id: "magnet", name: "+XP Magnet Range",   icon: "🧲",  cat: "stat", apply()  { game.xpMagnetBonus += 40; } },
    { id: "armor1", name: "+3 Armor",           icon: "🛡️",  cat: "stat", apply(p) { p.armor += 3; },
        desc: "Reduces all damage taken by 3" },
    { id: "armor2", name: "+6 Armor",           icon: "🏰",  cat: "stat", apply(p) { p.armor += 6; },
        desc: "Reduces all damage taken by 6" },
    { id: "regen1", name: "+2 HP/sec Regen",    icon: "💚",  cat: "stat", apply(p) { p.hpRegen += 2; } },
    { id: "regen2", name: "+5 HP/sec Regen",    icon: "🌿",  cat: "stat", apply(p) { p.hpRegen += 5; } },
    { id: "pierce", name: "Piercing +1",          icon: "📌",  cat: "stat", apply(p) { p.piercing += 1; },
        desc(p) { return `Bullets pierce through ${p.piercing + 1} enemies`; } },
    { id: "multi",  name: "+1 Multi-Shot",      icon: "🎯",  cat: "stat", apply(p) { p.multiShot += 1; } },
    { id: "crit1",  name: "+10% Crit Chance",   icon: "🎲",  cat: "stat", apply(p) { p.critChance = Math.min(1, p.critChance + 0.10); } },
    { id: "crit2",  name: "+0.5x Crit Damage",  icon: "💎",  cat: "stat", apply(p) { p.critMult += 0.5; } },
    { id: "bigBullet", name: "+30% Bullet Size", icon: "⭕",  cat: "stat", apply(p) { p.bulletSize *= 1.3; } },
    { id: "range1", name: "+20% Range",        icon: "📡",  cat: "stat", apply(p) { p.range *= 1.20; } },
    { id: "range2", name: "+40% Range",        icon: "🔭",  cat: "stat", apply(p) { p.range *= 1.40; } },
    { id: "xpgain1", name: "+25% XP Gain",    icon: "✨",  cat: "stat", apply(p) { p.xpGainMult *= 1.25; } },
    { id: "xpgain2", name: "+50% XP Gain",    icon: "⭐",  cat: "stat", apply(p) { p.xpGainMult *= 1.50; } },

    // ── Weapon upgrades ──
    { id: "orbit",     name: "Orbit Shield +1",    icon: "🔵", cat: "weapon", apply(p) { p.weapons.orbitShield.level++; } },
    { id: "lightning",  name: "Lightning Aura +1",  icon: "⚡", cat: "weapon", apply(p) { p.weapons.lightningAura.level++; } },
    { id: "frost",     name: "Frost Nova +1",      icon: "❄️",  cat: "weapon", apply(p) { p.weapons.frostNova.level++; } },
    { id: "flame",     name: "Flame Trail +1",     icon: "🔥", cat: "weapon", apply(p) { p.weapons.flameTrail.level++; } },
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
            Audio.setSfxEnabled(false);
            Audio.setMusicEnabled(false);
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
                Audio.setSfxEnabled(false);
                Audio.setMusicEnabled(false);
            } else {
                // Platform requests unmute – restore user's previous preferences
                Settings.soundEnabled = preMuteSoundEnabled;
                Settings.musicEnabled = preMuteMusicEnabled;
                Audio.setSfxEnabled(Settings.soundEnabled);
                Audio.setMusicEnabled(Settings.musicEnabled);
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
        const s = sdk();
        if (!sdkAvailable || !s) return;
        try {
            s.ad.requestAd("midgame", {
                adStarted()  {
                    gameplayStop();
                    Audio.setSfxEnabled(false);
                    Audio.setMusicEnabled(false);
                },
                adFinished() {
                    if (Settings.soundEnabled) Audio.setSfxEnabled(true);
                    if (Settings.musicEnabled) Audio.setMusicEnabled(true);
                    gameplayStart();
                },
                adError() {
                    if (Settings.soundEnabled) Audio.setSfxEnabled(true);
                    if (Settings.musicEnabled) Audio.setMusicEnabled(true);
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
            const s = sdk();
            if (!sdkAvailable || !s) { resolve(false); return; }
            try {
                s.ad.requestAd("rewarded", {
                    adStarted()  {
                        gameplayStop();
                        Audio.setSfxEnabled(false);
                        Audio.setMusicEnabled(false);
                    },
                    adFinished() {
                        if (Settings.soundEnabled) Audio.setSfxEnabled(true);
                        if (Settings.musicEnabled) Audio.setMusicEnabled(true);
                        gameplayStart();
                        resolve(true);
                    },
                    adError() {
                        if (Settings.soundEnabled) Audio.setSfxEnabled(true);
                        if (Settings.musicEnabled) Audio.setMusicEnabled(true);
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
    async function submitScore(wave, kills, timePlayed, won) {
        if (!sdkAvailable || !currentUser) return;
        const s = sdk();
        if (!s) return;
        const score = encodeScore(wave, kills, timePlayed, won);
        try {
            const encryptedScore = await encryptScore(score, LEADERBOARD_ENCRYPTION_KEY);
            await s.user.submitScore({ encryptedScore });
            console.log(`[CrazyGames] Score ${score} submitted to leaderboard`);
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
    challengeMode: "none",      // "none" | "rush" | "glass"
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

/** Draw a stylised button, returns true if clicked */
function drawButton(text, x, y, w, h, hovered) {
    drawRoundRect(x, y, w, h, 8);
    ctx.fillStyle = hovered ? COLOR.accentHover : COLOR.accent;
    ctx.globalAlpha = hovered ? 1 : 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
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

    // Upgrade
    upgradeChoices: [],
    upgradeIsBonusWave: false,
    xpMagnetBonus: 0,

    // Wave event flags
    pendingBonusUpgrade: false,
    pendingBossType: null,
    pendingVictory: false,

    // Stats
    killCount: 0,
    timePlayed: 0,
    lastHighScoreRank: 0,  // rank achieved on last game over (0 = not a high score)
    lastRunShardGain: 0,
    lastDailyReward: 0,

    // Run modifiers
    enemySpeedMult: 1,
    shardRewardMult: 1,
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

    // UX flow state
    tutorialDismissed: false,
    revivedThisRun: false,
    reviveInProgress: false,
    runFinalized: false,

    // Launch experiment variants
    expEarlyPacing: "control",
    expGameOverFlow: "reviveFirst",
    expRewardedCopy: "neutral",

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
        this.player = new Player();
        this.bullets = [];
        this.enemies = [];
        this.xpOrbs = [];
        this.particles = [];
        this.lightningBolts = [];
        this.frostWaves = [];
        this.flamePatches = [];
        this.camera = new Camera();
        this.wave = 0;
        this.waveKills = 0;
        this.waveKillsRequired = 0;
        this.spawnTimer = 0;
        this.spawnCooldown = 0;
        this.waveRestTimer = 1;
        this.waveActive = false;
        this.activeBoss = null;
        this.upgradeChoices = [];
        this.upgradeIsBonusWave = false;
        this.xpMagnetBonus = 0;
        this.pendingBonusUpgrade = false;
        this.pendingBossType = null;
        this.pendingVictory = false;
        this.killCount = 0;
        this.timePlayed = 0;
        this.lastHighScoreRank = 0;
        this.lastRunShardGain = 0;
        this.lastDailyReward = 0;
        this.enemySpeedMult = 1;
        this.shardRewardMult = 1;
        this.adBoosterActive = false;
        this.shardCacheClaimedThisRun = false;
        this.shardCacheLoading = false;
        this.lastMidrollAt = -999;
        this.lastMidrollWave = 0;
        this.fpsEma = TARGET_FPS;
        this.perfSampleTimer = 0;
        this.lowPerf = false;
        this.tutorialDismissed = false;
        this.revivedThisRun = false;
        this.reviveInProgress = false;
        this.runFinalized = false;
        this.expEarlyPacing = Experiments.get("earlyPacing");
        this.expGameOverFlow = Experiments.get("gameOverFlow");
        this.expRewardedCopy = Experiments.get("rewardedCopy");

        if (Settings.challengeMode === "rush") {
            this.enemySpeedMult = 1.18;
            this.shardRewardMult = 1.45;
        } else if (Settings.challengeMode === "glass") {
            this.shardRewardMult = 1.55;
            this.player.maxHp = Math.floor(this.player.maxHp * 0.62);
            this.player.hp = this.player.maxHp;
            this.player.damage = Math.floor(this.player.damage * 1.45);
        }

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

    trackPerformance(dt) {
        const fps = dt > 0 ? 1 / dt : TARGET_FPS;
        this.fpsEma = lerp(this.fpsEma, fps, 0.08);
        this.perfSampleTimer += dt;
        if (this.perfSampleTimer < PERF_SAMPLE_WINDOW) return;
        this.perfSampleTimer = 0;

        if (!this.lowPerf && this.fpsEma < PERF_LOW_THRESHOLD) {
            this.lowPerf = true;
        } else if (this.lowPerf && this.fpsEma > PERF_RECOVER_THRESHOLD) {
            this.lowPerf = false;
        }
    },

    async tryRewardedRevive() {
        if (this.revivedThisRun || this.reviveInProgress) return;
        this.reviveInProgress = true;
        const ok = await CrazyGamesSDK.requestRewarded();
        if (ok && this.state === STATE.GAME_OVER) {
            this.player.alive = true;
            this.player.hp = Math.max(1, Math.floor(this.player.maxHp * 0.45));
            this.player.invTimer = 1.2;
            this.state = STATE.GAMEPLAY;
            this.revivedThisRun = true;
            CrazyGamesSDK.gameplayStart();
            Audio.startMusic();
        }
        this.reviveInProgress = false;
    },

    async requestMenuAdBooster() {
        if (this.adBoosterLoading || this.adBoosterPending) return;
        this.adBoosterLoading = true;
        const ok = await CrazyGamesSDK.requestRewarded();
        if (ok) this.adBoosterPending = true;
        this.adBoosterLoading = false;
    },

    async claimRunShardCache() {
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

    maybeRequestMidroll() {
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

    commitLossIfNeeded() {
        if (this.runFinalized) return;
        this.lastHighScoreRank = HighScores.submit(this.wave, this.killCount, this.timePlayed);
        this.finalizeRun(false);
        if (this.lastHighScoreRank === 1) {
            Audio.sfxNewHighScore();
            CrazyGamesSDK.happyTime();
        }
        CrazyGamesSDK.submitScore(this.wave, this.killCount, this.timePlayed);
        this.runFinalized = true;
    },

    // ────── GAME LOOP ──────

    update(dt) {
        switch (this.state) {
            case STATE.START_MENU:   this.updateStartMenu(dt); break;
            case STATE.CHANGELOGS:   this.updateChangelogs(dt); break;
            case STATE.GAMEPLAY:     this.updateGameplay(dt);  break;
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
            case STATE.GAMEPLAY:     this.drawGameplay();     break;
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
    },

    // ────── START MENU ──────

    updateStartMenu() {
        // "Play" button
        if (Input.just("Enter") || Input.just("Space")) {
            this.startGame();
        }

        const catalog = Progression.getSkinCatalog();
        for (const skin of catalog) {
            if (Input.just(`Digit${catalog.indexOf(skin) + 1}`)) {
                Progression.unlockOrSelectSkin(skin.id);
            }
        }

        if (Input.just("KeyB")) {
            void this.requestMenuAdBooster();
        }
    },

    drawStartMenu() {
        const portrait = isPortraitMobile();
        const compactMobile = portrait;
        const profile = Progression.get();
        const daily = Progression.getDailyView();

        // Atmosphere backdrop for menu readability
        const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
        bgGrad.addColorStop(0, "#0a0f25");
        bgGrad.addColorStop(0.5, "#0d1533");
        bgGrad.addColorStop(1, "#090e1f");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "rgba(80,200,255,0.06)";
        for (let i = 0; i < 6; i++) {
            const y = 70 + i * 95;
            drawRoundRect(40 + i * 12, y, CANVAS_W - 80 - i * 24, 2, 1);
            ctx.fill();
        }

        // Title
        ctx.fillStyle = COLOR.accent;
        ctx.font = compactMobile ? "bold 50px 'Segoe UI', Arial, sans-serif" : "bold 60px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ROGUEWAVE", CANVAS_W / 2, compactMobile ? 92 : 92);

        ctx.fillStyle = COLOR.textDim;
        ctx.font = compactMobile ? "18px 'Segoe UI', Arial, sans-serif" : "20px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("Survivor Roguelite", CANVAS_W / 2, compactMobile ? 126 : 126);

        ctx.font = compactMobile ? "13px 'Segoe UI', Arial, sans-serif" : "14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Version: ${GAME_VERSION}`, CANVAS_W / 2, compactMobile ? 146 : 148);

        const uiTop = compactMobile ? 176 : 182;
        const leftX = compactMobile ? 16 : 22;
        const leftW = compactMobile ? 270 : 248;
        const rightW = compactMobile ? 260 : 248;
        const rightX = compactMobile ? CANVAS_W - rightW - 16 : CANVAS_W - rightW - 22;
        const centerPad = compactMobile ? 0 : 24;
        const centerX = compactMobile ? 0 : leftX + leftW + centerPad;
        const centerW = compactMobile ? CANVAS_W : (rightX - centerPad - centerX);

        // ── Mode selector ──
        const modes = [
            { id: "easy",    label: "😊 EASY",    desc: "Faster XP progression" },
            { id: "normal",  label: "⚔️ NORMAL",   desc: "Auto-aim"              },
            { id: "hard",    label: "💀 HARD",    desc: isMobile ? "Manual aim (touch)" : "Manual aim (mouse)" },
        ];
        const mw = compactMobile ? 260 : 112, mh = compactMobile ? 40 : 46, mgap = compactMobile ? 10 : 8;
        const totalMW = compactMobile ? mw : modes.length * mw + (modes.length - 1) * mgap;
        const mx0 = compactMobile ? (CANVAS_W / 2 - totalMW / 2) : (centerX + (centerW - totalMW) / 2);
        const my = uiTop;

        if (!compactMobile) {
            drawRoundRect(centerX, 166, centerW, 240, 12);
            ctx.fillStyle = "rgba(8, 12, 30, 0.90)";
            ctx.fill();
            ctx.strokeStyle = "rgba(102,204,255,0.35)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = COLOR.textDim;
        ctx.textAlign = "center";
        ctx.fillText("SELECT MODE", CANVAS_W / 2, my - 12);

        for (let i = 0; i < modes.length; i++) {
            const m = modes[i];
            const mbx = compactMobile ? mx0 : mx0 + i * (mw + mgap);
            const mby = compactMobile ? my + i * (mh + mgap) : my;
            const selected = Settings.gameMode === m.id;
            const hov = Mouse.inRect(mbx, mby, mw, mh);

            drawRoundRect(mbx, mby, mw, mh, 8);
            if (selected) {
                ctx.fillStyle = COLOR.accent;
                ctx.globalAlpha = 0.9;
            } else {
                ctx.fillStyle = hov ? "rgba(51,204,255,0.18)" : "rgba(255,255,255,0.06)";
                ctx.globalAlpha = 1;
            }
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = selected ? COLOR.accent : (hov ? COLOR.accentHover : "#334");
            ctx.lineWidth = selected ? 2 : 1.5;
            ctx.stroke();

            ctx.fillStyle = selected ? "#000" : (hov ? COLOR.accentHover : COLOR.text);
            ctx.font = compactMobile ? "bold 13px 'Segoe UI', Arial, sans-serif" : "bold 14px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(m.label, mbx + mw / 2, mby + mh / 2 - (compactMobile ? 2 : 4));
            ctx.font = compactMobile ? "9px 'Segoe UI', Arial, sans-serif" : "10px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = selected ? "#000" : COLOR.textDim;
            ctx.fillText(m.desc, mbx + mw / 2, mby + mh / 2 + (compactMobile ? 10 : 11));

            if (hov && Mouse.clicked) {
                Settings.gameMode = m.id;
            }
        }

        // Challenge selector
        const cY = compactMobile ? my + (modes.length * (mh + mgap)) + 16 : my + 102;
        ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = COLOR.textDim;
        ctx.textAlign = "center";
        ctx.fillText("CHALLENGE", CANVAS_W / 2, cY - 8);
        const cW = compactMobile ? 260 : 112;
        const cH = compactMobile ? 34 : 38;
        const cGap = compactMobile ? 8 : 8;
        const cTotal = compactMobile ? cW : CHALLENGE_MODES.length * cW + (CHALLENGE_MODES.length - 1) * cGap;
        const cStartX = CANVAS_W / 2 - cTotal / 2;
        for (let i = 0; i < CHALLENGE_MODES.length; i++) {
            const cm = CHALLENGE_MODES[i];
            const cx = compactMobile ? cStartX : cStartX + i * (cW + cGap);
            const cy = compactMobile ? cY + i * (cH + 7) : cY;
            const selected = Settings.challengeMode === cm.id;
            const hov = Mouse.inRect(cx, cy, cW, cH);
            drawRoundRect(cx, cy, cW, cH, 8);
            ctx.fillStyle = selected ? "rgba(102,255,153,0.85)" : (hov ? "rgba(102,255,153,0.2)" : "rgba(255,255,255,0.06)");
            ctx.fill();
            ctx.strokeStyle = selected ? "#66ff99" : "#355";
            ctx.lineWidth = selected ? 2 : 1.2;
            ctx.stroke();
            ctx.fillStyle = selected ? "#000" : COLOR.text;
            ctx.font = compactMobile ? "bold 12px 'Segoe UI', Arial, sans-serif" : "bold 13px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(cm.label, cx + cW / 2, cy + cH / 2 - 5);
            ctx.fillStyle = selected ? "#001b10" : COLOR.textDim;
            ctx.font = "10px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(cm.desc, cx + cW / 2, cy + cH / 2 + 8);
            if (hov && Mouse.clicked) Settings.challengeMode = cm.id;
        }

        // Play button
        const bw = compactMobile ? 260 : Math.min(240, centerW - 26), bh = compactMobile ? 46 : 48;
        const bx = compactMobile ? (CANVAS_W / 2 - bw / 2) : (centerX + (centerW - bw) / 2);
        const by = compactMobile ? CANVAS_H / 2 + 188 : 430;
        const hovered = Mouse.inRect(bx, by, bw, bh);
        if (drawButton("▶  PLAY", bx, by, bw, bh, hovered)) {
            this.startGame();
        }

        // Optional rewarded pre-run booster
        const boosterY = compactMobile ? by - 56 : by - 56;
        const boosterHover = Mouse.inRect(bx, boosterY, bw, bh);
        const boosterLabel = this.adBoosterPending
            ? "✅ BOOSTER ARMED"
            : (this.adBoosterLoading ? "⏳ LOADING AD..." : "⚡ WATCH AD: START BOOSTER");
        if (drawButton(boosterLabel, bx, boosterY, bw, bh, boosterHover)
            && !this.adBoosterPending && !this.adBoosterLoading) {
            void this.requestMenuAdBooster();
        }

        // Settings button
        const settingsY = compactMobile ? CANVAS_H / 2 + 244 : 488;
        const sHover = Mouse.inRect(bx, settingsY, bw, bh);
        if (drawButton("⚙  SETTINGS", bx, settingsY, bw, bh, sHover)) {
            this.state = STATE.SETTINGS;
        }

        // Standalone full changelog button (recent-changelog panel removed)
        const logBtnW = bw;
        const logBtnH = bh;
        const logBtnX = bx;
        const logBtnY = compactMobile ? settingsY + 56 : 546;
        const logBtnHover = Mouse.inRect(logBtnX, logBtnY, logBtnW, logBtnH);
        if (drawButton("📜  CHANGELOGS", logBtnX, logBtnY, logBtnW, logBtnH, logBtnHover)) {
            this.state = STATE.CHANGELOGS;
        }

        // Meta progression panel
        const mpX = leftX;
        const mpY = compactMobile ? 42 : 174;
        const mpW = leftW;
        const mpH = compactMobile ? 206 : 432;
        drawRoundRect(mpX, mpY, mpW, mpH, 10);
        ctx.fillStyle = "rgba(8, 10, 22, 0.92)";
        ctx.fill();
        ctx.strokeStyle = "#66ff99";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = "#66ff99";
        ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`◆ SHARDS: ${profile.shards}`, mpX + 12, mpY + 20);

        const metaRows = [
            { key: "hp", label: "Vital Core", bonus: "+10 max HP" },
            { key: "dmg", label: "Pulse Cannon", bonus: "+2 base damage" },
            { key: "xp", label: "Data Magnet", bonus: "+10% XP gain" },
        ];
        for (let i = 0; i < metaRows.length; i++) {
            const row = metaRows[i];
            const ry = mpY + 44 + i * 66;
            const level = Progression.metaLevel(row.key);
            const cost = Progression.metaCost(row.key);
            ctx.textAlign = "left";
            ctx.fillStyle = COLOR.text;
            ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(`${row.label}  Lv.${level}/8`, mpX + 12, ry);
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "11px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(row.bonus, mpX + 12, ry + 16);

            const ubW = 104, ubH = 32;
            const ubX = mpX + mpW - ubW - 10, ubY = ry - 16;
            const hov = Mouse.inRect(ubX, ubY, ubW, ubH);
            drawRoundRect(ubX, ubY, ubW, ubH, 6);
            const locked = cost == null;
            ctx.fillStyle = locked ? "rgba(120,120,120,0.28)" : (hov ? "rgba(102,255,153,0.25)" : "rgba(255,255,255,0.08)");
            ctx.fill();
            ctx.strokeStyle = locked ? "#666" : "#66ff99";
            ctx.lineWidth = 1.1;
            ctx.stroke();
            ctx.fillStyle = locked ? "#aaa" : COLOR.text;
            ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(locked ? "MAX" : `UP ${cost}`, ubX + ubW / 2, ubY + ubH / 2 + 1);
            if (!locked && hov && Mouse.clicked) {
                Progression.buyMeta(row.key);
            }
        }

        // Skin bar
        const skins = Progression.getSkinCatalog();
        ctx.textAlign = "left";
        ctx.fillStyle = COLOR.textDim;
        ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("SKINS", mpX + 12, mpY + mpH - 136);
        const sw = compactMobile ? 74 : 68;
        const sh = compactMobile ? 56 : 66;
        const sGap = compactMobile ? 6 : 5;
        for (let i = 0; i < skins.length; i++) {
            const s = skins[i];
            const sx = mpX + 12 + i * (sw + sGap);
            const skinY = mpY + mpH - 124;
            const hov = Mouse.inRect(sx, skinY, sw, sh);
            drawRoundRect(sx, skinY, sw, sh, 7);
            ctx.fillStyle = s.selected ? "rgba(51,204,255,0.28)" : (hov ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)");
            ctx.fill();
            ctx.strokeStyle = s.selected ? COLOR.accent : "#556";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = s.player;
            ctx.beginPath();
            ctx.arc(sx + 14, skinY + 16, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = COLOR.text;
            ctx.font = compactMobile ? "10px 'Segoe UI', Arial, sans-serif" : "11px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(s.name.split(" ")[0], sx + 26, skinY + 14);
            ctx.fillStyle = s.unlocked ? (s.selected ? COLOR.accent : COLOR.textDim) : "#ffcc66";
            ctx.fillText(s.unlocked ? (s.selected ? "Selected" : "Unlock") : `${s.cost}`, sx + 26, skinY + 31);
            if (hov && Mouse.clicked) {
                Progression.unlockOrSelectSkin(s.id);
            }
        }

        // Daily panel
        const dpW = rightW;
        const dpH = compactMobile ? 90 : 132;
        const dpX = rightX;
        const dpY = compactMobile ? CANVAS_H - dpH - 14 : 174;
        drawRoundRect(dpX, dpY, dpW, dpH, 9);
        ctx.fillStyle = "rgba(16,8,24,0.92)";
        ctx.fill();
        ctx.strokeStyle = "#ffcc66";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "#ffcc66";
        ctx.textAlign = "left";
        ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Daily: ${daily.label}`, dpX + 10, dpY + 20);
        ctx.fillStyle = daily.completed ? "#66ff99" : COLOR.text;
        ctx.font = "12px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`${daily.progress} / ${daily.target}${daily.completed ? "  COMPLETED" : ""}`, dpX + 10, dpY + 42);
        ctx.fillStyle = COLOR.textDim;
        ctx.fillText(`Streak: ${daily.streak} day${daily.streak === 1 ? "" : "s"}`, dpX + 10, dpY + 62);
        ctx.fillText("Complete to earn bonus shards", dpX + 10, dpY + 86);
        drawRoundRect(dpX + 10, dpY + 100, dpW - 20, 10, 5);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fill();
        const dailyPct = clamp(daily.target > 0 ? daily.progress / daily.target : 0, 0, 1);
        drawRoundRect(dpX + 10, dpY + 100, (dpW - 20) * dailyPct, 10, 5);
        ctx.fillStyle = daily.completed ? "#66ff99" : "#ffcc66";
        ctx.fill();

        // High Scores panel (right side) – per-mode
        const scores = HighScores.getAll();
        if (scores.length > 0 && !compactMobile) {
            const panelX = compactMobile ? CANVAS_W / 2 - 130 : rightX;
            const panelY = compactMobile ? logBtnY + logBtnH + 8 : dpY + dpH + 14;
            const panelW = compactMobile ? 260 : rightW;
            const shown = compactMobile ? Math.min(scores.length, 3) : Math.min(scores.length, 4);
            const panelH = compactMobile ? 28 + shown * 22 : 34 + shown * 28;
            drawRoundRect(panelX, panelY, panelW, panelH, 8);
            ctx.fillStyle = COLOR.panel;
            ctx.fill();
            ctx.strokeStyle = COLOR.accent;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = COLOR.accent;
            ctx.font = compactMobile ? "bold 14px 'Segoe UI', Arial, sans-serif" : "bold 15px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`🏆 ${gameModeLabel()} SCORES`, panelX + panelW / 2, panelY + 18);

            ctx.font = compactMobile ? "11px 'Segoe UI', Arial, sans-serif" : "13px 'Segoe UI', Arial, sans-serif";
            for (let i = 0; i < shown; i++) {
                const s = scores[i];
                const ty = panelY + (compactMobile ? 38 + i * 22 : 40 + i * 28);
                ctx.fillStyle = i === 0 ? "#ffd700" : COLOR.text;
                ctx.textAlign = "left";
                ctx.fillText(`${i + 1}.`, panelX + 12, ty);
                ctx.fillText(`W${s.wave}`, panelX + 32, ty);
                ctx.fillStyle = COLOR.textDim;
                ctx.fillText(`☠${s.kills}`, panelX + 80, ty);
                ctx.textAlign = "right";
                ctx.fillText(formatTime(s.time), panelX + panelW - 12, ty);
            }
        }

        // Logged-in user indicator (bottom-left)
        if (CrazyGamesSDK.isAvailable()) {
            const user = CrazyGamesSDK.getUser();
            if (user) {
                ctx.fillStyle = COLOR.textDim;
                ctx.font = "12px 'Segoe UI', Arial, sans-serif";
                ctx.textAlign = "left";
                ctx.fillText(`👤 ${user.username}`, 24, CANVAS_H - 14);
            }
        }

        // Controls hint
        ctx.fillStyle = COLOR.textDim;
        ctx.font = compactMobile ? "12px 'Segoe UI', Arial, sans-serif" : "13px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        if (isMobile) {
            const mobileAimHint = Settings.gameMode === "hard" ? "Touch right side to aim" : "Auto-aim & fire";
            ctx.fillText(`Virtual joystick to move  •  ${mobileAimHint}`, CANVAS_W / 2, compactMobile ? CANVAS_H - 74 : CANVAS_H - 60);
            ctx.fillText("Tap PLAY to start", CANVAS_W / 2, compactMobile ? CANVAS_H - 52 : CANVAS_H - 38);
        } else {
            const aimHint = Settings.gameMode === "hard" ? "Mouse to aim" : "Auto-aim";
            ctx.fillText(`WASD / Arrow Keys to move  •  ${aimHint}`, CANVAS_W / 2, CANVAS_H - 30);
            ctx.fillText("Press ENTER or click PLAY", CANVAS_W / 2, CANVAS_H - 14);
        }
    },

    // ────── CHANGELOGS ──────

    updateChangelogs() {
        if (Input.just("Escape")) {
            this.state = STATE.START_MENU;
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
            this.state = STATE.START_MENU;
        }

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "13px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Press ESC to return", CANVAS_W / 2, CANVAS_H - 92);
    },

    startGame() {
        this.resetGame();
        this.state = STATE.GAMEPLAY;
        Audio.ensureContext();
        Audio.startMusic();
        CrazyGamesSDK.gameplayStart();
    },

    // ────── GAMEPLAY ──────

    updateGameplay(dt) {
        this.timePlayed += dt;
        this.trackPerformance(dt);

        if (!this.tutorialDismissed) {
            const mv = Input.moveVector();
            if (this.timePlayed > TUTORIAL_HINT_DURATION || mv.x !== 0 || mv.y !== 0 || Mouse.clicked || Input.just("Escape")) {
                this.tutorialDismissed = true;
            }
        }

        // Player
        this.player.update(dt);

        // Bullets
        for (const b of this.bullets) b.update(dt);
        compactInPlace(this.bullets, b => b.alive);

        // Enemies
        for (const e of this.enemies) {
            e.update(dt, this.player);

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
                        e.takeDamage(b.damage);
                        this.spawnParticles(e.x, e.y, COLOR.enemyA, isMobile ? 2 : 5);
                        Audio.sfxHit();

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
        for (const o of this.xpOrbs) o.update(dt, this.player);
        compactInPlace(this.xpOrbs, o => o.alive);

        // Particles
        for (const p of this.particles) p.update(dt);
        compactInPlace(this.particles, p => p.alive);

        // Lightning bolts (visual only)
        for (const l of this.lightningBolts) l.life -= dt;
        compactInPlace(this.lightningBolts, l => l.life > 0);

        // Frost waves (visual only)
        for (const f of this.frostWaves) {
            f.life -= dt;
            f.radius = f.maxRadius * (1 - f.life / f.maxLife);
        }
        compactInPlace(this.frostWaves, f => f.life > 0);

        // Flame patches (damage zones)
        for (const fp of this.flamePatches) {
            fp.life -= dt;
            fp.dmgTimer -= dt;
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
        this.camera.update(dt);

        // Wave management
        this.manageWaves(dt);

        // Player death
        if (!this.player.alive) {
            this.state = STATE.GAME_OVER;
            Audio.stopMusic();
            Audio.sfxGameOver();
            if (this.revivedThisRun) {
                this.commitLossIfNeeded();
            }
            CrazyGamesSDK.gameplayStop();
        }

        // Settings shortcut
        if (Input.just("Escape") || TouchControls.pauseTapped) {
            this.state = STATE.SETTINGS;
        }
    },

    drawGameplay() {
        this.camera.applyTransform();

        // Grid background
        this.drawGrid();

        // World border
        ctx.strokeStyle = this.currentBiome().border;
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

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

        // XP orbs
        for (const o of this.xpOrbs) o.draw();

        // Enemies
        for (const e of this.enemies) e.draw();

        // Bullets
        for (const b of this.bullets) b.draw();

        // Player
        this.player.draw();

        // Particles (on top)
        for (const p of this.particles) p.draw();

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

    // ────── HUD ──────

    drawHUD() {
        const p = this.player;
        const portrait = isPortraitMobile();
        const pad = portrait ? 12 : 16;

        // ── HP bar ──
        const hpW = portrait ? 190 : 220, hpH = portrait ? 16 : 18;
        const hpX = pad, hpY = pad;
        drawRoundRect(hpX, hpY, hpW, hpH, 4);
        ctx.fillStyle = COLOR.hpBarBg;
        ctx.fill();
        drawRoundRect(hpX, hpY, hpW * clamp(p.hp / p.maxHp, 0, 1), hpH, 4);
        ctx.fillStyle = COLOR.hpBar;
        ctx.fill();
        ctx.fillStyle = COLOR.text;
        ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
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
        ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`LV ${p.level}`, hpX + hpW + 10, hpY + hpH / 2 + 6);

        // ── Regen indicator (next to XP bar row, below level badge) ──
        if (p.hpRegen > 0) {
            ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "#55dd88";
            ctx.fillText(`💚 +${p.hpRegen}/s`, hpX + hpW + 10, xpY + hpH / 2 + 2);
        }

        // ── Armor indicator ──
        if (p.armor > 0) {
            ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "#88bbff";
            ctx.fillText(`🛡️ ${p.armor} Armor (−${p.armor} dmg taken)`, hpX, xpY + hpH + 16);
        }

        // ── Wave counter (top-center) ──
        ctx.textAlign = "center";
        ctx.fillStyle = COLOR.text;
        ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Wave ${this.wave}`, CANVAS_W / 2, pad + 14);

        // Enemies remaining
        ctx.font = "14px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = COLOR.textDim;
        ctx.fillText(`Kills: ${this.waveKills} / ${this.waveKillsRequired}`, CANVAS_W / 2, pad + 36);

        // ── Kill count (top-right) ──
        ctx.textAlign = "right";
        ctx.fillStyle = COLOR.text;
        ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`☠ ${this.killCount}`, CANVAS_W - pad, pad + 16);

        // ── Time ──
        ctx.font = "14px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = COLOR.textDim;
        ctx.fillText(formatTime(this.timePlayed), CANVAS_W - pad, pad + 38);

        // ── Mode badge (top-right, below time) ──
        if (Settings.gameMode !== "normal") {
            ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = Settings.gameMode === "easy" ? "#55ff88" : COLOR.danger;
            ctx.fillText(Settings.gameMode === "easy" ? "😊 EASY" : "💀 HARD", CANVAS_W - pad, pad + 56);
        }

        // ── Wave incoming message ──
        if (!this.waveActive && this.waveRestTimer > 0 && !this.pendingVictory) {
            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.accent;
            ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(frameNow * 0.005);
            const nextLabel = (this.wave + 1 === WAVE_MAX) ? `⚠️ FINAL WAVE Incoming...`
                : `Wave ${this.wave + 1} Incoming...`;
            ctx.fillText(nextLabel, CANVAS_W / 2, CANVAS_H / 2 - 40);
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
        if (this.activeBoss && this.activeBoss.alive) {
            const isBig = this.activeBoss.type === "bigboss";
            const bw = isBig ? 400 : 300;
            const bh = isBig ? 14 : 10;
            const bx = CANVAS_W / 2 - bw / 2;
            const by = CANVAS_H - pad - 44;
            const label = isBig ? "★ BIG BOSS ★" : "★ MINIBOSS ★";
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
    },

    // ────── WAVE SYSTEM ──────

    manageWaves(dt) {
        if (this.waveActive) {
            // Check if kill target reached
            if (this.waveKills >= this.waveKillsRequired) {
                this.waveActive = false;
                this.waveRestTimer = WAVE_REST_TIME;
                if (this.wave === WAVE_MAX) {
                    this.pendingVictory = true;
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

    startNextWave() {
        this.wave++;
        this.waveKills = 0;
        this.waveKillsRequired = WAVE_BASE_KILLS + (this.wave - 1) * WAVE_KILLS_GROWTH;
        this.spawnCooldown = Math.max(WAVE_SPAWN_CD_MIN, WAVE_BASE_SPAWN_CD * Math.pow(WAVE_SPAWN_CD_DECAY, this.wave - 1));
        if (this.expEarlyPacing === "softstart" && this.timePlayed < 60) {
            this.spawnCooldown *= 1.16;
        }
        this.spawnTimer = 0; // spawn immediately
        this.waveActive = true;
        Audio.sfxWaveStart();

        // Spawn boss on milestone waves
        const isBossWave = this.wave === 5 || this.wave === 10 || this.wave === 15 || this.wave === 20;
        if (isBossWave) {
            const bossType = (this.wave === 10 || this.wave === 20) ? "bigboss" : "miniboss";
            const hpMult = Math.pow(WAVE_HP_SCALE, this.wave - 1);
            const spdMult = Math.pow(WAVE_SPEED_SCALE, this.wave - 1);
            const dmgMult = Math.pow(WAVE_DAMAGE_SCALE, this.wave - 1);
            // Spawn boss outside camera view (top edge)
            const bx = clamp(this.player.x + randRange(-200, 200), 100, WORLD_W - 100);
            const by = clamp(this.camera.y - 120, 100, WORLD_H - 100);
            const boss = new Enemy(bx, by,
                Math.floor(ENEMY_BASE_HP * hpMult),
                ENEMY_BASE_SPEED * spdMult * this.enemySpeedMult,
                undefined, bossType);
            boss.contactDamage = Math.floor(boss.contactDamage * dmgMult);
            this.enemies.push(boss);
            this.activeBoss = boss;
        }
    },

    spawnWaveEnemy() {
        // Cap total enemy count to prevent frame drops on mobile
        if (this.enemies.length >= dynamicCap(MAX_ENEMIES)) return;
        const hpMult = Math.pow(WAVE_HP_SCALE, this.wave - 1);
        const spdMult = Math.pow(WAVE_SPEED_SCALE, this.wave - 1);
        const dmgMult = Math.pow(WAVE_DAMAGE_SCALE, this.wave - 1);

        // Determine enemy type mix based on wave
        const typePool = ["normal"];
        if (this.wave >= 3) typePool.push("speedy");
        if (this.wave >= 5) typePool.push("tank");
        if (this.wave >= 7) typePool.push("ranged");
        if (this.wave >= 9) typePool.push("exploder");

        const specialChance = Math.min(0.7, 0.1 + this.wave * 0.04);

        // Spawn outside camera view
        const edge = randInt(0, 3);
        let ex, ey;
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
        ex = clamp(ex, 0, WORLD_W);
        ey = clamp(ey, 0, WORLD_H);

        const hp = Math.floor(ENEMY_BASE_HP * hpMult);
        const spd = ENEMY_BASE_SPEED * spdMult * this.enemySpeedMult * this.earlyPacingMultiplier();

        // Choose type
        let type = "normal";
        if (typePool.length > 1 && Math.random() < specialChance) {
            type = randPick(typePool.slice(1));
        }

        const enemy = new Enemy(ex, ey, hp, spd, undefined, type);
        enemy.contactDamage = Math.floor(enemy.contactDamage * dmgMult);
        this.enemies.push(enemy);
    },

    onEnemyKilled(enemy) {
        this.killCount++;
        this.waveKills++;
        this.spawnParticles(enemy.x, enemy.y, COLOR.enemyA, isMobile ? 4 : 12);
        const easyBonus = Settings.gameMode === "easy" ? (1 + this.wave * 0.15) : 1;
        if (this.xpOrbs.length < dynamicCap(MAX_XP_ORBS)) {
            const xpAmt = Math.floor((XP_BASE_AMOUNT + this.wave * 2) * (enemy.xpMult || 1) * easyBonus * this.player.xpGainMult);
            this.xpOrbs.push(new XPOrb(enemy.x, enemy.y, xpAmt));
        }
        Audio.sfxEnemyDeath();
        // Boss kill rewards: free upgrade
        if (enemy.type === "miniboss" || enemy.type === "bigboss") {
            this.pendingBonusUpgrade = true;
            this.pendingBossType = enemy.type;
        }
    },

    finalizeRun(won) {
        const baseShards = Math.floor(this.killCount * 0.45 + this.wave * 3 + (won ? 35 : 0));
        const gained = Math.max(5, Math.floor(baseShards * this.shardRewardMult));
        Progression.addShards(gained);
        const dailyResult = Progression.registerRun(this.killCount, this.wave, this.timePlayed);
        this.lastRunShardGain = gained;
        this.lastDailyReward = dailyResult.dailyReward;
    },

    // ────── SPAWNERS ──────

    spawnBullet(x, y, angle, damage, piercing, sizeMultiplier, isCrit, lifetime) {
        this.bullets.push(new Projectile(x, y, angle, damage, piercing, sizeMultiplier, isCrit, false, lifetime));
        Audio.sfxShoot();
    },

    spawnParticles(x, y, color, count) {
        const room = dynamicCap(MAX_PARTICLES) - this.particles.length;
        const n = Math.min(count, room);
        for (let i = 0; i < n; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    },

    findNearestEnemy(x, y, maxRange) {
        let nearest = null;
        let bestDist = maxRange !== undefined ? maxRange : Infinity;
        for (const e of this.enemies) {
            const d = dist(x, y, e.x, e.y);
            if (d < bestDist) {
                bestDist = d;
                nearest = e;
            }
        }
        return nearest;
    },

    // ────── UPGRADE SCREEN ──────

    triggerUpgrade(isBonusWave = false, bossType = null) {
        // Pick upgrade choices: 4 for bigboss kill, 3 otherwise
        const numChoices = (isBonusWave && bossType === "bigboss") ? 4 : UPGRADE_CHOICES;
        const pool = shuffle([...UPGRADES]);
        this.upgradeChoices = pool.slice(0, numChoices);
        this.upgradeIsBonusWave = isBonusWave;
        this.state = STATE.UPGRADE_SCREEN;
        Audio.sfxLevelUp();
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
        if (up) {
            up.apply(this.player);
            if (up.cat === "stat") {
                const c = this.player.upgradeCounts;
                c[up.id] = (c[up.id] || 0) + 1;
            }
            this.state = STATE.GAMEPLAY;
            Audio.sfxUpgradeSelect();
        }
    },

    drawUpgradeOverlay() {
        // Dim overlay
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = this.upgradeIsBonusWave ? "#ffd700" : COLOR.accent;
        ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.upgradeIsBonusWave ? "🏆 BOSS DEFEATED! FREE UPGRADE!" : "LEVEL UP!", CANVAS_W / 2, 120);

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "16px 'Segoe UI', Arial, sans-serif";
        const numKeys = this.upgradeChoices.length;
        ctx.fillText(isMobile ? "Choose an upgrade (tap to select)" : `Choose an upgrade (click or press 1-${numKeys})`, CANVAS_W / 2, 155);

        const cardW = 200, cardH = 140, gap = 30;
        const totalW = this.upgradeChoices.length * cardW + (this.upgradeChoices.length - 1) * gap;
        let startX = CANVAS_W / 2 - totalW / 2;

        for (let i = 0; i < this.upgradeChoices.length; i++) {
            const up = this.upgradeChoices[i];
            const cx = startX + i * (cardW + gap);
            const cy = 200;
            const hovered = Mouse.inRect(cx, cy, cardW, cardH);

            // Card background
            drawRoundRect(cx, cy, cardW, cardH, 10);
            ctx.fillStyle = hovered ? "rgba(51,204,255,0.18)" : COLOR.panel;
            ctx.fill();
            ctx.strokeStyle = hovered ? COLOR.accent : "#334";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Icon
            ctx.font = "36px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.text;
            ctx.fillText(up.icon, cx + cardW / 2, cy + 45);

            // Name
            ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = hovered ? COLOR.accent : COLOR.text;
            ctx.fillText(up.name, cx + cardW / 2, cy + 80);

            // Description (if available)
            if (up.desc) {
                ctx.font = "11px 'Segoe UI', Arial, sans-serif";
                ctx.fillStyle = COLOR.textDim;
                const descText = typeof up.desc === "function" ? up.desc(this.player) : up.desc;
                ctx.fillText(descText, cx + cardW / 2, cy + 98);
            }

            // Number hint
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = COLOR.textDim;
            ctx.fillText(isMobile ? "Tap" : `Press ${i + 1}`, cx + cardW / 2, cy + 125);

            if (hovered && Mouse.clicked) {
                this.applyUpgrade(i);
                return;
            }
        }
    },

    // ────── SETTINGS ──────

    updateSettings() {
        if (Input.just("Escape")) {
            this.state = this.player && this.player.alive && this.wave > 0
                ? STATE.GAMEPLAY : STATE.START_MENU;
        }
    },

    abandonRun() {
        Audio.stopMusic();
        CrazyGamesSDK.gameplayStop();
        this.state = STATE.START_MENU;
    },

    drawSettings() {
        ctx.fillStyle = COLOR.panel;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const isPausedMidRun = !!(this.player && this.player.alive && this.wave > 0);

        ctx.fillStyle = COLOR.accent;
        ctx.font = "bold 36px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚙  SETTINGS", CANVAS_W / 2, 80);

        if (isPausedMidRun) {
            const statsX = CANVAS_W - 280;
            const statsY = 140;
            const statsW = 240;
            const statsH = 170;

            drawRoundRect(statsX, statsY, statsW, statsH, 8);
            ctx.fillStyle = "rgba(8, 8, 24, 0.92)";
            ctx.fill();
            ctx.strokeStyle = COLOR.accent;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = COLOR.accent;
            ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("⏸ RUN STATS", statsX + statsW / 2, statsY + 18);

            ctx.fillStyle = COLOR.text;
            ctx.font = "13px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`Wave: ${this.wave}`, statsX + 12, statsY + 44);
            ctx.fillText(`Wave kills: ${this.waveKills}/${this.waveKillsRequired}`, statsX + 12, statsY + 66);
            ctx.fillText(`Total kills: ${this.killCount}`, statsX + 12, statsY + 88);
            ctx.fillText(`Level: ${this.player.level}`, statsX + 12, statsY + 110);
            ctx.fillText(`HP: ${Math.max(0, Math.ceil(this.player.hp))}/${this.player.maxHp}`, statsX + 12, statsY + 132);
            ctx.fillText(`Time: ${formatTime(this.timePlayed)}`, statsX + 12, statsY + 154);
        }

        const bw = 280, bh = 44, bx = CANVAS_W / 2 - bw / 2;
        let y = 140;

        // Sound toggle
        const soundHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton(
            `Sound: ${Settings.soundEnabled ? "ON" : "OFF"}`,
            bx, y, bw, bh, soundHover
        )) {
            Settings.soundEnabled = !Settings.soundEnabled;
            Audio.setSfxEnabled(Settings.soundEnabled);
        }

        y += 60;
        // Music toggle
        const musicHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton(
            `Music: ${Settings.musicEnabled ? "ON" : "OFF"}`,
            bx, y, bw, bh, musicHover
        )) {
            Settings.musicEnabled = !Settings.musicEnabled;
            Audio.setMusicEnabled(Settings.musicEnabled);
        }

        y += 60;
        // Screen shake toggle
        const shakeHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton(
            `Screen Shake: ${Settings.shakeEnabled ? "ON" : "OFF"}`,
            bx, y, bw, bh, shakeHover
        )) {
            Settings.shakeEnabled = !Settings.shakeEnabled;
        }

        // Optional rewarded shard cache once per run
        if (isPausedMidRun) {
            y += 60;
            const cacheHover = Mouse.inRect(bx, y, bw, bh);
            const cacheLabel = this.shardCacheClaimedThisRun
                ? "✅ SHARD CACHE CLAIMED"
                : (this.shardCacheLoading ? "⏳ LOADING AD..." : "🎁 WATCH AD: SHARD CACHE");
            if (drawButton(cacheLabel, bx, y, bw, bh, cacheHover)
                && !this.shardCacheClaimedThisRun && !this.shardCacheLoading) {
                void this.claimRunShardCache();
            }

            ctx.fillStyle = COLOR.textDim;
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("+20 base shards, scales with wave. Optional and once per run.", CANVAS_W / 2, y + 58);
        }

        y += 80;
        // Key layout info
        ctx.fillStyle = COLOR.text;
        ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
        if (isMobile) {
            ctx.fillText("Controls (Touch)", CANVAS_W / 2, y);

            ctx.font = "15px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = COLOR.textDim;
            y += 30;
            ctx.fillText("Left side — Virtual joystick to move", CANVAS_W / 2, y);
            y += 24;
            ctx.fillText("Auto-aim — Targets nearest enemy", CANVAS_W / 2, y);
            y += 24;
            ctx.fillText("Tap upgrade cards to select", CANVAS_W / 2, y);
            y += 24;
            ctx.fillText("⏸ Pause button — Settings", CANVAS_W / 2, y);
        } else {
            ctx.fillText("Controls (Layout-agnostic)", CANVAS_W / 2, y);

            ctx.font = "15px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = COLOR.textDim;
            y += 30;
            ctx.fillText("WASD / ZQSD / Arrow Keys — Move", CANVAS_W / 2, y);
            y += 24;
            ctx.fillText(Settings.gameMode === "hard"
                ? "Manual aim — Move mouse to aim"
                : "Auto-aim — Targets nearest enemy", CANVAS_W / 2, y);
            y += 24;
            ctx.fillText("1 / 2 / 3 — Select upgrade", CANVAS_W / 2, y);
            y += 24;
            ctx.fillText("ESC — Settings / Back", CANVAS_W / 2, y);
        }

        y += 50;
        ctx.font = "13px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = COLOR.textDim;
        if (!isMobile) {
            ctx.fillText("Uses event.code: works on QWERTY, AZERTY, QWERTZ, etc.", CANVAS_W / 2, y);
        }

        y += 24;
        ctx.font = "12px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = COLOR.textDim;
        const exp = Experiments.all();
        ctx.fillText(`A/B: pacing=${exp.earlyPacing}, gameOver=${exp.gameOverFlow}, adCopy=${exp.rewardedCopy}`, CANVAS_W / 2, y);

        // Back button
        y += 50;
        const backHover = Mouse.inRect(bx, y, bw, bh);
        if (drawButton("← BACK", bx, y, bw, bh, backHover)) {
            this.state = this.player && this.player.alive && this.wave > 0
                ? STATE.GAMEPLAY : STATE.START_MENU;
        }

        // Abandon current run and return to main menu
        if (isPausedMidRun) {
            y += 52;
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
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = COLOR.danger;
        ctx.font = "bold 48px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 110);

        // New high score indicator
        if (this.lastHighScoreRank > 0) {
            const pulse = 0.7 + 0.3 * Math.sin(frameNow * 0.005);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 26px 'Segoe UI', Arial, sans-serif";
            if (this.lastHighScoreRank === 1) {
                ctx.fillText("🏆 NEW HIGH SCORE! 🏆", CANVAS_W / 2, CANVAS_H / 2 - 72);
            } else {
                ctx.fillText(`🎖️ TOP ${this.lastHighScoreRank} SCORE! 🎖️`, CANVAS_W / 2, CANVAS_H / 2 - 72);
            }
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = COLOR.text;
        ctx.font = "20px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Wave ${this.wave}  •  ☠ ${this.killCount} kills`, CANVAS_W / 2, CANVAS_H / 2 - 45);

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "16px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Time survived: ${formatTime(this.timePlayed)}`, CANVAS_W / 2, CANVAS_H / 2 - 18);
        ctx.fillText(`Shards earned: +${this.lastRunShardGain}${this.lastDailyReward > 0 ? `  •  Daily bonus +${this.lastDailyReward}` : ""}`,
            CANVAS_W / 2, CANVAS_H / 2 + 6);

        // Best score comparison
        const best = HighScores.getBest();
        if (best && this.lastHighScoreRank !== 1) {
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "14px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(`Best: Wave ${best.wave}  •  ☠${best.kills}  •  ${formatTime(best.time)}`, CANVAS_W / 2, CANVAS_H / 2 + 26);
        }

        const bw = 220, bh = 48;
        const bx = CANVAS_W / 2 - bw / 2;
        const reviveLabel = this.reviveInProgress
            ? "⏳  LOADING AD..."
            : (this.expRewardedCopy === "urgency" ? "🎁  REVIVE NOW (AD)" : "🎁  REVIVE (AD)");
        const reviveInfoLabel = this.expRewardedCopy === "urgency"
            ? "One revive only - keep your run alive"
            : "One revive per run";

        const reviveY = this.expGameOverFlow === "restartFirst" ? CANVAS_H / 2 + 84 : CANVAS_H / 2 + 26;
        const restartY = this.expGameOverFlow === "restartFirst" ? CANVAS_H / 2 + 26 : CANVAS_H / 2 + 100;

        // Rewarded revive (one-time)
        if (!this.revivedThisRun) {
            const reviveHover = Mouse.inRect(bx, reviveY, bw, bh);
            if (drawButton(reviveLabel, bx, reviveY, bw, bh, reviveHover) && !this.reviveInProgress) {
                void this.tryRewardedRevive();
            }
            ctx.fillStyle = COLOR.textDim;
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(reviveInfoLabel, CANVAS_W / 2, reviveY + 64);
        }

        // Restart
        const effectiveRestartY = this.revivedThisRun ? CANVAS_H / 2 + 26 : restartY;
        const restartHover = Mouse.inRect(bx, effectiveRestartY, bw, bh);
        if (drawButton("↻  RESTART", bx, effectiveRestartY, bw, bh, restartHover)) {
            this.commitLossIfNeeded();
            this.startGame();
        }

        // Menu
        const menuY = effectiveRestartY + 58;
        const menuHover = Mouse.inRect(bx, menuY, bw, bh);
        if (drawButton("🏠  MAIN MENU", bx, menuY, bw, bh, menuHover)) {
            this.commitLossIfNeeded();
            this.state = STATE.START_MENU;
        }

        // ── Local High Scores (per-mode) ──
        const scores = HighScores.getAll();
        if (scores.length > 0) {
            const tableX = CANVAS_W / 2;
            const tableY = menuY + 66;
            ctx.fillStyle = COLOR.accent;
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
        this.state = STATE.VICTORY;
        Audio.stopMusic();
        Audio.sfxNewHighScore();
        CrazyGamesSDK.happyTime();
        CrazyGamesSDK.gameplayStop();
        this.lastHighScoreRank = HighScores.submit(this.wave, this.killCount, this.timePlayed, true);
        this.finalizeRun(true);
        CrazyGamesSDK.submitScore(this.wave, this.killCount, this.timePlayed, true);
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

        const pulse = 0.85 + 0.15 * Math.sin(frameNow * 0.006);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 56px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🏆 YOU WIN! 🏆", CANVAS_W / 2, CANVAS_H / 2 - 110);
        ctx.globalAlpha = 1;

        ctx.fillStyle = COLOR.text;
        ctx.font = "22px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Completed all ${WAVE_MAX} waves!`, CANVAS_W / 2, CANVAS_H / 2 - 60);

        ctx.fillStyle = COLOR.accent;
        ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`⏱ Time: ${formatTime(this.timePlayed)}  •  ☠ ${this.killCount} kills`, CANVAS_W / 2, CANVAS_H / 2 - 28);

        ctx.fillStyle = COLOR.textDim;
        ctx.font = "15px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("Leaderboard rank is decided by fastest completion time", CANVAS_W / 2, CANVAS_H / 2 + 2);
        ctx.fillText(`Shards earned: +${this.lastRunShardGain}${this.lastDailyReward > 0 ? `  •  Daily bonus +${this.lastDailyReward}` : ""}`,
            CANVAS_W / 2, CANVAS_H / 2 + 24);

        const bw = 220, bh = 48;
        const bx = CANVAS_W / 2 - bw / 2;

        const restartY = CANVAS_H / 2 + 30;
        const restartHover = Mouse.inRect(bx, restartY, bw, bh);
        if (drawButton("↻  PLAY AGAIN", bx, restartY, bw, bh, restartHover)) {
            this.startGame();
        }

        const menuY = restartY + 58;
        const menuHover = Mouse.inRect(bx, menuY, bw, bh);
        if (drawButton("🏠  MAIN MENU", bx, menuY, bw, bh, menuHover)) {
            this.state = STATE.START_MENU;
        }

        // Best scores
        const scores = HighScores.getAll();
        if (scores.length > 0) {
            const tableX = CANVAS_W / 2;
            const tableY = menuY + 66;
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
    Experiments.load();
    try {
        await CrazyGamesSDK.init();
    } catch (e) {
        console.warn("[Boot] CrazyGames init failed, continuing in standalone mode", e);
    }

    try { CrazyGamesSDK.loadingStart(); } catch (e) { /* ignore */ }

    try {
        try {
            await loadChangelogs();
        } catch (e) {
            console.warn("[Boot] Failed loading changelogs, continuing", e);
            GAME_VERSION = "unknown";
        }

        try {
            await Progression.init();
        } catch (e) {
            console.warn("[Boot] Failed loading progression, continuing", e);
        }

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

