/**
 * Weapon balance sim. Load into a running game page (see tools/README or
 * docs/konzept-waffen-tiefe.md), then call from the console:
 *
 *   RWSim.matrix()                      // evolutions and synergies, waves 10/15/20
 *   RWSim.measure({ weapons: { frost: { lv: 5, evo: true } }, stats: { range1: 1 }, wave: 12 }, 60)
 *
 * The bot kites away from nearby enemies and drifts back to the centre. Its
 * build is "about two level-ups per wave" from a fixed cycle of stat cards, so
 * two measurements only differ in what you pass. Level-ups during the run are
 * ignored so the build stays fixed. Kills are counted per second survived.
 */
window.RWSim = (() => {
    const W = { orbit: "orbitShield", lightning: "lightningAura", frost: "frostNova", flame: "flameTrail" };
    const KEYS = { orbit: "bigBullet", lightning: "crit1", frost: "range1", flame: "spd1" };
    const DT = 1 / 60;

    function kite() {
        const p = game.player;
        let ax = 0, ay = 0, n = 0;
        for (const e of game.enemies) {
            if (!e.alive) continue;
            const d = dist(p.x, p.y, e.x, e.y);
            if (d < 220 && d > 1) { const w = (220 - d) / 220; ax += (p.x - e.x) / d * w; ay += (p.y - e.y) / d * w; n++; }
        }
        const cx = WORLD_W / 2 - p.x, cy = WORLD_H / 2 - p.y;
        const cd = Math.hypot(cx, cy) || 1;
        const bias = Math.min(1, cd / 500) * 0.6;
        ax += cx / cd * bias; ay += cy / cd * bias;
        if (n === 0 && cd < 60) return { x: 0, y: 0 };
        const l = Math.hypot(ax, ay) || 1;
        return { x: ax / l, y: ay / l };
    }

    /** Stat picks for a wave, minus the picks reserved for weapons. */
    function baseStats(wave, reserved) {
        const cycle = ["dmg1", "hp1", "rate1", "armor1", "regen1", "multi", "dmg1", "pierce", "spd1", "hp1"];
        const n = Math.max(0, Math.round(wave * 2) - reserved);
        const stats = {};
        for (let i = 0; i < n; i++) { const id = cycle[i % cycle.length]; stats[id] = (stats[id] || 0) + 1; }
        return stats;
    }

    function setup(build) {
        if (GameAudio.stopMusic) GameAudio.stopMusic();
        game.startGame();
        game.starterPick = false;
        game.state = STATE.GAMEPLAY;
        game.tutorialDismissed = true;
        const p = game.player;
        for (const k in W) { p.weapons[W[k]].level = 0; p.weapons[W[k]].evolved = false; }
        for (const k in (build.weapons || {})) {
            p.weapons[W[k]].level = build.weapons[k].lv || 0;
            p.weapons[W[k]].evolved = !!build.weapons[k].evo;
        }
        p.upgradeCounts = {};
        for (const id in (build.stats || {})) {
            const up = UPGRADES.find(u => u.id === id);
            for (let i = 0; i < build.stats[id]; i++) up.apply(p);
            p.upgradeCounts[id] = build.stats[id];
        }
        if (build.wave && build.wave > 1) {
            game.wave = build.wave - 1;
            game.waveActive = false;
            game.waveRestTimer = 0;
        }
        p.x = WORLD_W / 2; p.y = WORLD_H / 2;
        p.hp = p.maxHp;
        p.invTimer = 0;
    }

    function run(seconds) {
        const p = game.player;
        const kills0 = game.killCount;
        let dmgTaken = 0;
        const origTake = p.takeDamage.bind(p);
        const saveMV = Input.moveVector, saveJust = Input.just;
        p.takeDamage = (a) => { const before = p.hp; origTake(a); dmgTaken += Math.max(0, before - p.hp); };
        Input.moveVector = kite;
        Input.just = () => false;
        const steps = Math.floor(seconds / DT);
        let died = false, maxEnemies = 0, maxPatches = 0, maxBolts = 0, alive = 0;
        const t0 = performance.now();
        try {
            for (let i = 0; i < steps; i++) {
                frameNow += DT * 1000;
                game.update(DT);
                alive += DT;
                if (game.state === STATE.UPGRADE_SCREEN) { game.upgradeQueue.length = 0; game.state = STATE.GAMEPLAY; }
                if (game.state === STATE.GAME_OVER) { died = true; break; }
                if (game.state !== STATE.GAMEPLAY) game.state = STATE.GAMEPLAY;
                maxEnemies = Math.max(maxEnemies, game.enemies.length);
                maxPatches = Math.max(maxPatches, game.flamePatches.length);
                maxBolts = Math.max(maxBolts, game.lightningBolts.length);
            }
        } finally { Input.moveVector = saveMV; Input.just = saveJust; p.takeDamage = origTake; }
        const kills = game.killCount - kills0;
        return { kills, alive: +alive.toFixed(1), kps: +(kills / Math.max(1, alive)).toFixed(2), dmgTaken: Math.round(dmgTaken), died,
                 wave: game.wave, hp: Math.round(p.hp), maxHp: p.maxHp, maxEnemies, maxPatches, maxBolts, ms: Math.round(performance.now() - t0) };
    }

    function measure(build, seconds) { setup(build); return run(seconds); }

    /** Average kills per second over `reps` runs; "†n" marks how many runs died. */
    function avg(build, seconds, reps) {
        let kps = 0, died = 0, dmg = 0, fp = 0, bolts = 0;
        for (let i = 0; i < reps; i++) {
            const r = measure(build, seconds);
            kps += r.kps; dmg += r.dmgTaken; fp = Math.max(fp, r.maxPatches); bolts = Math.max(bolts, r.maxBolts);
            if (r.died) died++;
        }
        return { kps: +(kps / reps).toFixed(2), died, dmg: Math.round(dmg / reps), fp, bolts };
    }

    const fmt = (r) => `${r.kps}${r.died ? "†" + r.died : ""}`;

    function matrix(opts = {}) {
        const waves = opts.waves || [10, 15, 20];
        const S = opts.seconds || 60, reps = opts.reps || 3;
        const lines = [];
        for (const wp of ["orbit", "lightning", "frost", "flame"]) {
            const a = [], b = [], extra = [];
            for (const w of waves) {
                const stats = Object.assign(baseStats(w, 6), { [KEYS[wp]]: 1 });
                const r1 = avg({ weapons: { [wp]: { lv: 5 } }, stats, wave: w }, S, reps);
                const r2 = avg({ weapons: { [wp]: { lv: 5, evo: true } }, stats, wave: w }, S, reps);
                a.push(fmt(r1)); b.push(fmt(r2));
                extra.push(`${Math.round((r2.kps / Math.max(0.01, r1.kps) - 1) * 100)}% dmg${r1.dmg}/${r2.dmg}${r2.fp ? " fp" + r2.fp : ""}${r2.bolts ? " b" + r2.bolts : ""}`);
            }
            lines.push(`${wp} lv5: ${a.join("  ")}`);
            lines.push(`${wp} evo: ${b.join("  ")}   [${extra.join(" | ")}]`);
        }
        const pairs = { superconductor: ["frost", "lightning"], thermalShock: ["flame", "frost"], burningOrbit: ["orbit", "flame"] };
        const realSyn = synergyActive;
        for (const id in pairs) {
            const [x, y] = pairs[id];
            const off = [], on = [], delta = [];
            for (const w of waves) {
                const stats = baseStats(w, 6);
                synergyActive = () => false;
                const r1 = avg({ weapons: { [x]: { lv: 3 }, [y]: { lv: 3 } }, stats, wave: w }, S, reps);
                synergyActive = realSyn;
                const r2 = avg({ weapons: { [x]: { lv: 3 }, [y]: { lv: 3 } }, stats, wave: w }, S, reps);
                off.push(fmt(r1)); on.push(fmt(r2)); delta.push(`${Math.round((r2.kps / Math.max(0.01, r1.kps) - 1) * 100)}%`);
            }
            lines.push(`${id} off: ${off.join("  ")}   on: ${on.join("  ")}   [${delta.join(" | ")}]`);
        }
        return lines;
    }

    return { W, KEYS, kite, baseStats, setup, run, measure, avg, matrix };
})();
