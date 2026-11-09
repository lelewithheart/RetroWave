"use strict";
// RogueWave effects, cosmetics, power-ups and the Supporter Cache.
// Loaded before game.js, so everything from game.js is only used inside functions.

const FX = (() => {
    const TAU = Math.PI * 2;
    const CACHE_PUBLIC_KEY = "2R9jCQ_bhDBqmtc5CyvxacyhUgYDVrHaHnABQpxxl8I";
    const CACHE_URL = "https://kelvik.at/roguewave";
    const CACHE_PRICE = "€5.00";
    const CACHE_SKINS = ["solar_crown", "void_reaper", "prism_phantom"];

    // ── Small helpers ──
    function hue(t, sat = 100, light = 62, alpha = 1) {
        return `hsla(${((t % 360) + 360) % 360},${sat}%,${light}%,${alpha})`;
    }
    function now() { return (typeof frameNow === "number" && frameNow) ? frameNow : performance.now(); }

    // ── Cached glow sprites ──
    const glowCache = new Map();
    function glowSprite(color) {
        let s = glowCache.get(color);
        if (s) return s;
        s = document.createElement("canvas");
        s.width = s.height = 64;
        const c = s.getContext("2d");
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, color);
        g.addColorStop(0.35, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.globalAlpha = 0.55;
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
        if (glowCache.size > 60) glowCache.clear();
        glowCache.set(color, s);
        return s;
    }
    /** Additive soft glow. Caller may already be in "lighter" mode. */
    function glow(x, y, size, color, alpha = 1) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * alpha;
        ctx.drawImage(glowSprite(color), x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha = prev;
    }

    // ── World background ──
    const bgCache = new Map();
    let bgIndex = 0, bgPrev = -1, bgFade = 1;

    function buildBackground(index) {
        const biome = BIOMES[index] || BIOMES[0];
        const w = 1240, h = 880;
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const b = c.getContext("2d");
        b.fillStyle = biome.bg;
        b.fillRect(0, 0, w, h);
        // Fixed seed per biome, so a biome always looks the same.
        let seed = 97 + index * 131;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const hues = [[205, 275], [145, 190], [340, 20]][index % 3];
        for (let i = 0; i < 9; i++) {
            const x = rnd() * w, y = rnd() * h, r = 180 + rnd() * 340;
            const g = b.createRadialGradient(x, y, 0, x, y, r);
            const tone = hues[i % 2];
            g.addColorStop(0, `hsla(${tone},85%,${34 + rnd() * 18}%,${0.1 + rnd() * 0.12})`);
            g.addColorStop(1, `hsla(${tone},85%,30%,0)`);
            b.fillStyle = g;
            b.fillRect(0, 0, w, h);
        }
        for (let i = 0; i < 170; i++) {
            b.fillStyle = `rgba(210,225,255,${0.08 + rnd() * 0.3})`;
            const s = rnd() < 0.08 ? 2 : 1;
            b.fillRect(rnd() * w, rnd() * h, s, s);
        }
        return c;
    }
    function backgroundFor(index) {
        let c = bgCache.get(index);
        if (!c) { c = buildBackground(index); bgCache.set(index, c); }
        return c;
    }
    function drawBackground(cam, index, dt) {
        if (index !== bgIndex) { bgPrev = bgIndex; bgIndex = index; bgFade = 0; }
        bgFade = Math.min(1, bgFade + dt * 0.7);
        const px = -(cam.x / Math.max(1, WORLD_W - CANVAS_W)) * 270;
        const py = -(cam.y / Math.max(1, WORLD_H - CANVAS_H)) * 230;
        if (bgFade < 1 && bgPrev >= 0) ctx.drawImage(backgroundFor(bgPrev), px, py);
        ctx.globalAlpha = bgFade;
        ctx.drawImage(backgroundFor(bgIndex), px, py);
        ctx.globalAlpha = 1;
    }

    let vignetteSprite = null;
    function drawVignette() {
        if (!vignetteSprite) {
            vignetteSprite = document.createElement("canvas");
            vignetteSprite.width = 480; vignetteSprite.height = 320;
            const v = vignetteSprite.getContext("2d");
            const g = v.createRadialGradient(240, 160, 130, 240, 160, 300);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(1, "rgba(0,0,6,0.5)");
            v.fillStyle = g;
            v.fillRect(0, 0, 480, 320);
        }
        ctx.drawImage(vignetteSprite, 0, 0, CANVAS_W, CANVAS_H);
    }

    // ── Rings, ghosts, sparks ──
    const rings = [];
    const ghosts = [];

    function ring(x, y, color, maxR, life = 0.34, width = 3) {
        if (rings.length >= 28) rings.shift();
        rings.push({ x, y, color, r: 4, maxR, life, maxLife: life, width });
    }
    function ghost(x, y, radius, color) {
        if (ghosts.length >= 18) ghosts.shift();
        ghosts.push({ x, y, radius, color, life: 0.26, maxLife: 0.26 });
    }
    function updateEffects(dt) {
        for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i];
            r.life -= dt;
            const t = 1 - Math.max(0, r.life) / r.maxLife;
            r.r = r.maxR * (1 - (1 - t) * (1 - t));
            if (r.life <= 0) rings.splice(i, 1);
        }
        for (let i = ghosts.length - 1; i >= 0; i--) {
            ghosts[i].life -= dt;
            if (ghosts[i].life <= 0) ghosts.splice(i, 1);
        }
    }
    function drawGhosts() {
        for (const g of ghosts) {
            const a = clamp(g.life / g.maxLife, 0, 1);
            ctx.globalAlpha = a * 0.34;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.radius * (0.7 + a * 0.3), 0, TAU);
            ctx.fillStyle = g.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    function drawRings() {
        for (const r of rings) {
            ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1) * 0.8;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, TAU);
            ctx.strokeStyle = r.color;
            ctx.lineWidth = r.width;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // ── Vector icons, so menus do not depend on the system's emoji font ──
    function strokeIcon(fn, x, y, s, color, width) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s / 24, s / 24);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width || 2.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        fn();
        ctx.restore();
    }
    const ICONS = {
        locker() { ctx.rect(-8, -5, 16, 14); ctx.moveTo(-4, -5); ctx.arc(0, -5, 4, Math.PI, 0); ctx.moveTo(-8, 1); ctx.lineTo(8, 1); ctx.stroke(); },
        chest() { ctx.rect(-10, -2, 20, 11); ctx.moveTo(-10, -2); ctx.quadraticCurveTo(0, -13, 10, -2); ctx.moveTo(-2, 1); ctx.lineTo(2, 1); ctx.lineTo(2, 4); ctx.lineTo(-2, 4); ctx.closePath(); ctx.stroke(); },
        skins() { ctx.arc(0, 0, 9, 0, TAU); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, 7, 9, 0); ctx.moveTo(0, -9); ctx.quadraticCurveTo(-5, 0, 0, 9); ctx.stroke(); },
        stats() { ctx.moveTo(-8, 9); ctx.lineTo(-8, 2); ctx.moveTo(0, 9); ctx.lineTo(0, -8); ctx.moveTo(8, 9); ctx.lineTo(8, -3); ctx.stroke(); },
        settings() { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); } ctx.moveTo(6, 0); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke(); },
        changelog() { ctx.rect(-7, -9, 14, 18); ctx.moveTo(-3, -4); ctx.lineTo(3, -4); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.moveTo(-3, 4); ctx.lineTo(1, 4); ctx.stroke(); },
        easy() { ctx.moveTo(-9, 9); ctx.quadraticCurveTo(-9, -8, 9, -9); ctx.quadraticCurveTo(9, 8, -9, 9); ctx.moveTo(-9, 9); ctx.lineTo(3, -3); ctx.stroke(); },
        normal() { ctx.moveTo(-9, 9); ctx.lineTo(8, -8); ctx.moveTo(4, -9); ctx.lineTo(9, -9); ctx.lineTo(9, -4); ctx.moveTo(-7, 2); ctx.lineTo(-2, 7); ctx.stroke(); },
        hard() { ctx.arc(0, -2, 8, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(4, 9); ctx.lineTo(-4, 9); ctx.closePath(); ctx.moveTo(-2, -1); ctx.arc(-3, -1, 1, 0, TAU); ctx.moveTo(4, -1); ctx.arc(3, -1, 1, 0, TAU); ctx.stroke(); },
        orbit() { ctx.arc(0, 0, 9, 0, TAU); ctx.moveTo(12, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(9, 0, 3, 0, TAU); ctx.fill(); },
        lightning() { ctx.moveTo(2, -10); ctx.lineTo(-6, 2); ctx.lineTo(0, 2); ctx.lineTo(-2, 10); ctx.lineTo(6, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill(); },
        frost() { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(-Math.cos(a) * 10, -Math.sin(a) * 10); } ctx.stroke(); },
        flame() { ctx.moveTo(0, -10); ctx.quadraticCurveTo(9, 0, 6, 6); ctx.quadraticCurveTo(0, 13, -6, 6); ctx.quadraticCurveTo(-9, 0, 0, -10); ctx.fill(); },
        heart() { ctx.moveTo(0, 8); ctx.bezierCurveTo(-13, -2, -6, -11, 0, -4); ctx.bezierCurveTo(6, -11, 13, -2, 0, 8); ctx.fill(); },
        shield() { ctx.moveTo(0, -10); ctx.lineTo(8, -7); ctx.lineTo(8, 1); ctx.quadraticCurveTo(7, 7, 0, 10); ctx.quadraticCurveTo(-7, 7, -8, 1); ctx.lineTo(-8, -7); ctx.closePath(); ctx.stroke(); },
        magnet() { ctx.arc(0, -1, 8, Math.PI, 0); ctx.lineTo(8, 8); ctx.moveTo(-8, -1); ctx.lineTo(-8, 8); ctx.moveTo(-8, 4); ctx.lineTo(-3, 4); ctx.moveTo(8, 4); ctx.lineTo(3, 4); ctx.moveTo(-3, -1); ctx.arc(0, -1, 3, Math.PI, 0); ctx.lineTo(3, 8); ctx.moveTo(-3, -1); ctx.lineTo(-3, 8); ctx.stroke(); },
        crown() { ctx.moveTo(-10, 7); ctx.lineTo(-10, -5); ctx.lineTo(-4, 1); ctx.lineTo(0, -8); ctx.lineTo(4, 1); ctx.lineTo(10, -5); ctx.lineTo(10, 7); ctx.closePath(); ctx.fill(); },
        lock() { ctx.rect(-7, -1, 14, 10); ctx.moveTo(-4, -1); ctx.lineTo(-4, -4); ctx.arc(0, -4, 4, Math.PI, 0); ctx.lineTo(4, -1); ctx.stroke(); },
    };
    function icon(name, x, y, size, color, width) {
        const fn = ICONS[name];
        if (fn) strokeIcon(fn, x, y, size, color, width);
    }

    // ── Procedural skins ──
    function disc(x, y, r, inner, outer) {
        const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
        g.addColorStop(0, inner);
        g.addColorStop(1, outer);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = g;
        ctx.fill();
    }
    function clipped(x, y, r, fn) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.clip();
        fn();
        ctx.restore();
    }

    const SKINS = {
        hexcore: {
            trail: ["rgba(64,240,214,0.55)"],
            draw(x, y, r, t) {
                disc(x, y, r, "#123f49", "#061a22");
                clipped(x, y, r, () => {
                    const s = r * 0.46;
                    ctx.strokeStyle = "#40f0d6";
                    ctx.lineWidth = Math.max(0.7, r * 0.06);
                    for (let q = -2; q <= 2; q++) for (let w = -2; w <= 2; w++) {
                        const hx = x + (q + w * 0.5) * s * 1.74, hy = y + w * s * 1.5;
                        ctx.globalAlpha = 0.4 + 0.5 * Math.max(0, Math.sin(t * 0.003 - Math.hypot(q, w)));
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            const a = Math.PI / 6 + i / 6 * TAU;
                            ctx.lineTo(hx + Math.cos(a) * s, hy + Math.sin(a) * s);
                        }
                        ctx.closePath();
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                });
            },
        },
        circuit: {
            trail: ["rgba(120,255,120,0.5)"],
            draw(x, y, r, t) {
                disc(x, y, r, "#123a1d", "#04140a");
                clipped(x, y, r, () => {
                    ctx.strokeStyle = "#62ff8a";
                    ctx.fillStyle = "#d8ffe2";
                    ctx.lineWidth = Math.max(0.7, r * 0.07);
                    for (let i = 0; i < 6; i++) {
                        const a = i / 6 * TAU + 0.3;
                        const mid = r * 0.55, ex = Math.cos(a), ey = Math.sin(a);
                        const nx = Math.cos(a + 0.5), ny = Math.sin(a + 0.5);
                        ctx.beginPath();
                        ctx.moveTo(x + ex * r * 0.2, y + ey * r * 0.2);
                        ctx.lineTo(x + ex * mid, y + ey * mid);
                        ctx.lineTo(x + nx * r, y + ny * r);
                        ctx.stroke();
                        const p = (t * 0.0012 + i / 6) % 1;
                        ctx.beginPath();
                        ctx.arc(x + ex * (r * 0.2 + p * (mid - r * 0.2)), y + ey * (r * 0.2 + p * (mid - r * 0.2)), Math.max(0.8, r * 0.09), 0, TAU);
                        ctx.fill();
                    }
                    ctx.beginPath();
                    ctx.arc(x, y, r * 0.22, 0, TAU);
                    ctx.fill();
                });
            },
        },
        magma: {
            trail: ["rgba(255,120,30,0.6)", "rgba(255,190,60,0.5)"],
            draw(x, y, r, t) {
                disc(x, y, r, "#3a1c16", "#120808");
                clipped(x, y, r, () => {
                    const pulse = 0.65 + 0.35 * Math.sin(t * 0.004);
                    ctx.strokeStyle = `rgba(255,${Math.floor(110 + 60 * pulse)},30,1)`;
                    ctx.lineWidth = Math.max(0.9, r * 0.11);
                    ctx.lineJoin = "round";
                    for (let i = 0; i < 5; i++) {
                        let a = i / 5 * TAU + 0.4;
                        let px = x, py = y;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        for (let k = 1; k <= 3; k++) {
                            a += (k % 2 ? 0.45 : -0.55);
                            px = x + Math.cos(a) * r * 0.36 * k;
                            py = y + Math.sin(a) * r * 0.36 * k;
                            ctx.lineTo(px, py);
                        }
                        ctx.stroke();
                    }
                });
            },
        },
        frostbite: {
            trail: ["rgba(160,226,255,0.55)"],
            draw(x, y, r, t) {
                disc(x, y, r, "#cdf3ff", "#2a79b4");
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = Math.max(0.8, r * 0.09);
                ctx.lineCap = "round";
                const spin = t * 0.0006;
                for (let i = 0; i < 6; i++) {
                    const a = spin + i / 6 * TAU;
                    const ex = x + Math.cos(a) * r * 0.82, ey = y + Math.sin(a) * r * 0.82;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(ex, ey);
                    for (const side of [-0.8, 0.8]) {
                        const mx = x + Math.cos(a) * r * 0.52, my = y + Math.sin(a) * r * 0.52;
                        ctx.moveTo(mx, my);
                        ctx.lineTo(mx + Math.cos(a + side) * r * 0.26, my + Math.sin(a + side) * r * 0.26);
                    }
                    ctx.stroke();
                }
            },
        },
        synthwave: {
            trail: ["rgba(255,70,170,0.55)", "rgba(255,170,60,0.5)"],
            draw(x, y, r) {
                clipped(x, y, r, () => {
                    const g = ctx.createLinearGradient(x, y - r, x, y + r);
                    g.addColorStop(0, "#ffd34e");
                    g.addColorStop(0.5, "#ff5a8a");
                    g.addColorStop(1, "#7b2ff7");
                    ctx.fillStyle = g;
                    ctx.fillRect(x - r, y - r, r * 2, r * 2);
                    ctx.fillStyle = "#1a0a33";
                    for (let i = 0; i < 4; i++) {
                        ctx.fillRect(x - r, y + r * (0.05 + i * 0.26), r * 2, Math.max(0.8, r * (0.05 + i * 0.03)));
                    }
                });
            },
        },
        vortex: {
            trail: ["rgba(150,90,255,0.55)"],
            draw(x, y, r, t) {
                disc(x, y, r, "#3a1a78", "#0c0420");
                clipped(x, y, r, () => {
                    ctx.strokeStyle = "#b98cff";
                    ctx.lineWidth = Math.max(0.8, r * 0.1);
                    ctx.lineCap = "round";
                    const spin = t * 0.0024;
                    for (let arm = 0; arm < 3; arm++) {
                        ctx.beginPath();
                        for (let k = 0; k <= 12; k++) {
                            const f = k / 12;
                            const a = spin + arm / 3 * TAU + f * 3.2;
                            ctx.lineTo(x + Math.cos(a) * r * f, y + Math.sin(a) * r * f);
                        }
                        ctx.stroke();
                    }
                });
            },
        },
        solar_crown: {
            supporter: true, bullet: "#ffc23d", ringColor: "#ffd166",
            trail: ["rgba(255,190,60,0.7)", "rgba(255,120,30,0.6)"],
            kill: ["#ffd166", "#ff8a2a"],
            draw(x, y, r, t) {
                ctx.fillStyle = "#ffb52e";
                const spin = t * 0.0009;
                for (let i = 0; i < 12; i++) {
                    const a = spin + i / 12 * TAU;
                    const len = r * (1.34 + 0.2 * Math.sin(t * 0.006 + i * 2));
                    ctx.beginPath();
                    ctx.moveTo(x + Math.cos(a - 0.17) * r * 0.92, y + Math.sin(a - 0.17) * r * 0.92);
                    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
                    ctx.lineTo(x + Math.cos(a + 0.17) * r * 0.92, y + Math.sin(a + 0.17) * r * 0.92);
                    ctx.closePath();
                    ctx.fill();
                }
                disc(x, y, r, "#fff4bd", "#ff8a14");
                clipped(x, y, r, () => {
                    ctx.strokeStyle = "rgba(190,60,0,0.55)";
                    ctx.lineWidth = Math.max(0.7, r * 0.07);
                    ctx.beginPath();
                    ctx.arc(x, y, r * 0.58, 0, TAU);
                    ctx.stroke();
                });
            },
        },
        void_reaper: {
            supporter: true, bullet: "#b56bff", ringColor: "#a855ff",
            trail: ["rgba(120,40,220,0.75)", "rgba(40,10,90,0.75)"],
            kill: ["#a855ff", "#e879f9"],
            draw(x, y, r, t) {
                const spin = t * 0.0032;
                ctx.lineCap = "round";
                for (let i = 0; i < 3; i++) {
                    ctx.strokeStyle = i === 1 ? "#e879f9" : "#8b3dff";
                    ctx.lineWidth = Math.max(1, r * (0.2 - i * 0.04));
                    ctx.globalAlpha = 0.9 - i * 0.2;
                    ctx.beginPath();
                    ctx.arc(x, y, r * (1.08 + i * 0.16), spin * (i % 2 ? -1 : 1) + i, spin * (i % 2 ? -1 : 1) + i + 3.6);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                disc(x, y, r, "#2a0a4f", "#000000");
                ctx.beginPath();
                ctx.arc(x, y, r * 0.5, 0, TAU);
                ctx.fillStyle = "#000000";
                ctx.fill();
                ctx.strokeStyle = "#c78bff";
                ctx.lineWidth = Math.max(0.7, r * 0.06);
                ctx.stroke();
            },
        },
        prism_phantom: {
            supporter: true, bullet: "prism", ringColor: "prism",
            trail: ["prism"],
            kill: ["prism", "prism"],
            draw(x, y, r, t) {
                const base = t * 0.09;
                clipped(x, y, r, () => {
                    for (let i = 0; i < 8; i++) {
                        const a = i / 8 * TAU + t * 0.0007;
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.arc(x, y, r * 1.04, a, a + TAU / 8 + 0.02);
                        ctx.closePath();
                        ctx.fillStyle = hue(base + i * 45, 95, i % 2 ? 62 : 72);
                        ctx.fill();
                    }
                    ctx.fillStyle = "rgba(255,255,255,0.8)";
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const a = i / 4 * TAU + t * 0.0014;
                        const rr = r * 0.46;
                        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
                    }
                    ctx.closePath();
                    ctx.fill();
                });
                ctx.strokeStyle = hue(base, 100, 74, 0.8);
                ctx.lineWidth = Math.max(0.8, r * 0.08);
                ctx.beginPath();
                ctx.arc(x, y, r * 1.2, 0, TAU);
                ctx.stroke();
            },
        },
    };

    function resolveColor(c) { return c === "prism" ? hue(now() * 0.12) : c; }
    function isProcedural(id) { return !!SKINS[id]; }
    function isSupporterSkin(id) { return !!(SKINS[id] && SKINS[id].supporter); }
    /** Draws a procedural skin. Returns false for sprite-based skins. */
    function drawSkin(id, x, y, r) {
        const s = SKINS[id];
        if (!s) return false;
        s.draw(x, y, r, now());
        return true;
    }

    let runSkin = null;
    function setRunSkin(id) { runSkin = SKINS[id] || null; }
    function bulletColor() { return runSkin && runSkin.bullet ? resolveColor(runSkin.bullet) : null; }
    function trailColor(fallback) {
        if (!runSkin || !runSkin.trail) return fallback;
        return resolveColor(randPick(runSkin.trail));
    }
    function trailBoost() { return !!(runSkin && runSkin.supporter); }

    function onKill(enemy) {
        const big = enemy.type === "miniboss" || enemy.type === "bigboss" || enemy.type === "endboss";
        if (game.lowPerf && !big) return;
        ring(enemy.x, enemy.y, enemy.color || COLOR.enemyA, (enemy.radius || 14) * (big ? 6 : 2.6), big ? 0.6 : 0.26, big ? 5 : 2);
        if (runSkin && runSkin.kill) {
            ring(enemy.x, enemy.y, resolveColor(runSkin.kill[0]), (enemy.radius || 14) * 3.2, 0.32, 2.5);
            game.spawnParticles(enemy.x, enemy.y, resolveColor(runSkin.kill[1]), isMobile ? 2 : 5);
        }
    }

    // ── Power-ups ──
    const PICKUPS = {
        magnet: { color: "#55ff88", label: "MAGNET", icon: "magnet" },
        repair: { color: "#ff6688", label: "REPAIR", icon: "heart" },
        emp: { color: "#66ddff", label: "EMP BLAST", icon: "lightning" },
        overdrive: { color: "#ffcc33", label: "OVERDRIVE", icon: "flame" },
    };
    const PICKUP_LIFE = 15;
    const PICKUP_MAX = 3;
    let killsSinceDrop = 0;

    function resetRun() {
        rings.length = 0;
        ghosts.length = 0;
        killsSinceDrop = 0;
        hud.hp = hud.ghost = -1;
        hud.xp = -1;
    }
    function dropPickup(x, y, kind) {
        game.pickups.push({ x, y, kind, life: PICKUP_LIFE, bob: Math.random() * TAU });
    }
    function maybeDrop(enemy) {
        killsSinceDrop++;
        if (game.pickups.length >= PICKUP_MAX) return;
        const boss = enemy.type === "miniboss" || enemy.type === "bigboss";
        const luck = (game.player && game.player.pickupLuck) || 1;
        const need = 38 / luck;
        let chance = 0;
        if (boss) chance = 1;
        else if (enemy.isElite) chance = 0.28 * luck;
        else if (killsSinceDrop >= need) chance = 0.09 * luck;
        if (Math.random() >= chance) return;
        killsSinceDrop = 0;
        const hurt = game.player && game.player.hp < game.player.maxHp * 0.5;
        const pool = hurt ? ["repair", "repair", "magnet", "emp", "overdrive"] : ["magnet", "emp", "overdrive", "repair"];
        dropPickup(enemy.x, enemy.y, boss ? "overdrive" : randPick(pool));
    }
    function collect(p) {
        const def = PICKUPS[p.kind];
        const pl = game.player;
        if (p.kind === "magnet") {
            for (const o of game.xpOrbs) o.magnetised = true;
        } else if (p.kind === "repair") {
            pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.25);
        } else if (p.kind === "emp") {
            ring(pl.x, pl.y, def.color, 620, 0.5, 6);
            for (const e of game.enemies.slice()) {
                if (!e.alive) continue;
                if (Math.abs(e.x - pl.x) > CANVAS_W || Math.abs(e.y - pl.y) > CANVAS_H) continue;
                const big = e.type === "miniboss" || e.type === "bigboss" || e.type === "endboss";
                e.takeDamage(Math.ceil(e.maxHp * (big ? 0.04 : 0.55)));
            }
            game.camera.shake(8, 0.25);
        } else if (p.kind === "overdrive") {
            pl.overdriveT = 7 + (pl.overdriveBonus || 0);
            pl.overdriveMax = pl.overdriveT;
        }
        ring(p.x, p.y, def.color, 80, 0.4, 3);
        game.spawnParticles(p.x, p.y, def.color, isMobile ? 5 : 14);
        game.triggerEventToast(def.label, def.color, 1.1);
        GameAudio.sfxPowerUp();
    }
    function updatePickups(dt) {
        const pl = game.player;
        for (let i = game.pickups.length - 1; i >= 0; i--) {
            const p = game.pickups[i];
            p.life -= dt;
            const d = dist(p.x, p.y, pl.x, pl.y);
            if (d < 130 && d > 1) {
                const pull = (1 - d / 130) * 520 * dt;
                p.x += (pl.x - p.x) / d * pull;
                p.y += (pl.y - p.y) / d * pull;
            }
            if (d < pl.radius + 16) {
                collect(p);
                game.pickups.splice(i, 1);
            } else if (p.life <= 0) {
                game.pickups.splice(i, 1);
            }
        }
    }
    function drawPickups() {
        const t = now();
        for (const p of game.pickups) {
            if (p.life < 4 && Math.floor(t * 0.01) % 2) continue;
            const def = PICKUPS[p.kind];
            const y = p.y + Math.sin(t * 0.004 + p.bob) * 4;
            ctx.globalCompositeOperation = "lighter";
            glow(p.x, y, 74, def.color, 0.8);
            ctx.globalCompositeOperation = "source-over";
            ctx.beginPath();
            ctx.arc(p.x, y, 15, 0, TAU);
            ctx.fillStyle = "rgba(6,10,24,0.92)";
            ctx.fill();
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            icon(def.icon, p.x, y, 18, def.color, 2.4);
        }
    }

    // ── Markers for bosses off-screen ──
    function drawOffscreenMarkers() {
        const cam = game.camera;
        const list = [];
        if (game.activeBoss && game.activeBoss.alive) list.push({ e: game.activeBoss, c: "#ff4d6d" });
        if (game.bountyTarget && game.bountyTarget.alive) list.push({ e: game.bountyTarget, c: "#ff66dd" });
        if (game.eventShardCarrier && game.eventShardCarrier.alive) list.push({ e: game.eventShardCarrier, c: "#c38bff" });
        for (const m of list) {
            const sx = m.e.x - cam.x, sy = m.e.y - cam.y;
            if (sx > 0 && sx < CANVAS_W && sy > 0 && sy < CANVAS_H) continue;
            const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
            const a = Math.atan2(sy - cy, sx - cx);
            const scale = Math.min((CANVAS_W / 2 - 34) / Math.abs(Math.cos(a) || 0.001),
                                   (CANVAS_H / 2 - 34) / Math.abs(Math.sin(a) || 0.001));
            const x = cx + Math.cos(a) * scale, y = cy + Math.sin(a) * scale;
            const pulse = 1 + 0.14 * Math.sin(now() * 0.01);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(a);
            ctx.scale(pulse, pulse);
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.lineTo(-9, -9);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-9, 9);
            ctx.closePath();
            ctx.fillStyle = m.c;
            ctx.fill();
            ctx.restore();
        }
    }

    // ── Dash ring and touch button ──
    function dashButtonRect() {
        return { x: CANVAS_W - 118, y: CANVAS_H - 232, r: 40 };
    }
    function drawDashRing(p) {
        if (p.dashCd <= 0 || p.dashT > 0) return;
        const pct = 1 - clamp(p.dashCd / p.dashCooldown, 0, 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 7, -Math.PI / 2, -Math.PI / 2 + pct * TAU);
        ctx.strokeStyle = "rgba(180,235,255,0.75)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }
    function drawDashButton() {
        const b = dashButtonRect();
        const p = game.player;
        const ready = p.dashCd <= 0;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TAU);
        ctx.fillStyle = ready ? "rgba(102,221,255,0.2)" : "rgba(255,255,255,0.05)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + (1 - clamp(p.dashCd / p.dashCooldown, 0, 1)) * TAU);
        ctx.strokeStyle = ready ? "#66ddff" : "rgba(255,255,255,0.45)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = ready ? "#dff7ff" : "rgba(255,255,255,0.4)";
        ctx.font = uiFont(12, "bold");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("DASH", b.x, b.y);
    }

    // ── Smoothed HUD bars ──
    const hud = { hp: -1, ghost: -1, xp: -1 };
    function hudValues(p) {
        const hpPct = clamp(p.hp / p.maxHp, 0, 1);
        const xpPct = clamp(p.xp / p.xpToNext, 0, 1);
        if (hud.hp < 0) { hud.hp = hud.ghost = hpPct; hud.xp = xpPct; }
        hud.hp = lerp(hud.hp, hpPct, 0.28);
        hud.ghost = hpPct > hud.ghost ? hpPct : lerp(hud.ghost, hpPct, 0.05);
        hud.xp = xpPct < hud.xp ? xpPct : lerp(hud.xp, xpPct, 0.2);
        return hud;
    }

    // ── Menu backdrop ──
    function drawMenuBackdrop() {
        const t = now();
        const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        sky.addColorStop(0, "#070a1e");
        sky.addColorStop(0.55, "#111540");
        sky.addColorStop(1, "#160a2c");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const hy = CANVAS_H * 0.56;
        ctx.globalCompositeOperation = "lighter";
        glow(CANVAS_W / 2, hy, 760, "#2fa8ff", 0.34);
        ctx.globalCompositeOperation = "source-over";

        ctx.strokeStyle = "rgba(90,190,255,0.16)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = -12; i <= 12; i++) {
            ctx.moveTo(CANVAS_W / 2 + i * 34, hy);
            ctx.lineTo(CANVAS_W / 2 + i * 190, CANVAS_H);
        }
        const offset = (t * 0.00035) % 1;
        for (let i = 0; i < 9; i++) {
            const f = (i + offset) / 9;
            const y = hy + f * f * (CANVAS_H - hy);
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_W, y);
        }
        ctx.stroke();

        for (let i = 0; i < 26; i++) {
            const x = (i * 97 + t * (0.006 + (i % 4) * 0.003)) % CANVAS_W;
            const y = (i * 61) % hy;
            ctx.fillStyle = `rgba(170,215,255,${0.14 + 0.2 * Math.abs(Math.sin(t * 0.001 + i))})`;
            ctx.fillRect(x, y, 2, 2);
        }

        // A loose swarm drifting through the sky, each one eyeing the title.
        const shapes = [["hex", "#44bb44"], ["diamond", "#ffdd33"], ["circle", "#ff4466"], ["circle", "#ff7744"]];
        for (let i = 0; i < 14; i++) {
            const [kind, color] = shapes[i % shapes.length];
            const speed = 0.012 + (i % 5) * 0.004;
            const x = ((i * 173 + t * speed) % (CANVAS_W + 120)) - 60;
            const y = 36 + ((i * 131) % (hy - 90)) + Math.sin(t * 0.0008 + i) * 14;
            const r = 9 + (i % 4) * 3;
            const look = Math.atan2(hy * 0.45 - y, CANVAS_W / 2 - x);
            ctx.save();
            ctx.globalAlpha = 0.42 + 0.1 * Math.sin(t * 0.002 + i);
            glow(x, y, r * 3.2, color, 0.5);
            ctx.fillStyle = color;
            ctx.beginPath();
            if (kind === "hex") {
                for (let k = 0; k < 6; k++) {
                    const a = (Math.PI * 2 / 6) * k - Math.PI / 6 + t * 0.0004;
                    k ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
                }
            } else if (kind === "diamond") {
                ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
            } else {
                ctx.arc(x, y, r, 0, TAU);
            }
            ctx.closePath();
            ctx.fill();
            const cl = Math.cos(look), sl = Math.sin(look), er = r * 0.22;
            for (const k of [-1, 1]) {
                const ex = x + cl * r * 0.22 - sl * r * 0.36 * k, ey = y + sl * r * 0.22 + cl * r * 0.36 * k;
                ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
                ctx.fillStyle = "#0b0b18"; ctx.beginPath(); ctx.arc(ex + cl * er * 0.4, ey + sl * er * 0.4, er * 0.5, 0, TAU); ctx.fill();
            }
            ctx.restore();
        }
        // The odd bullet streak crossing the sky.
        for (let i = 0; i < 3; i++) {
            const x = CANVAS_W + 40 - ((t * (0.35 + i * 0.1) + i * 700) % (CANVAS_W + 200));
            const y = 70 + ((i * 211) % (hy - 120));
            ctx.save();
            ctx.globalAlpha = 0.5;
            glow(x + 13, y + 1, 22, "#ffee55", 0.6);
            ctx.fillStyle = "#ffee55";
            ctx.fillRect(x, y, 26, 3);
            ctx.restore();
        }
    }

    // ── Supporter Cache ──
    const cache = { open: false, reveal: 0, message: "", messageColor: "#ff8899", busy: false };

    function cacheAvailable() {
        // Platform builds must not sell anything outside the platform.
        if (window.RW_PLATFORM === "crazygames") return false;
        const where = `${location.hostname} ${document.referrer || ""}`;
        return !/crazygames/i.test(where);
    }
    function owned() { return Progression.isSupporter(); }

    function b64uBytes(text) {
        const b = atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "="));
        return Uint8Array.from(b, (c) => c.charCodeAt(0));
    }
    async function verifyCode(code) {
        const clean = String(code || "").trim().replace(/\s+/g, "");
        const m = /^RW1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(clean);
        if (!m) return { ok: false, reason: "That does not look like a cache code." };
        if (!crypto.subtle) return { ok: false, reason: "This page cannot check codes. Please update your browser." };
        try {
            const key = await crypto.subtle.importKey("raw", b64uBytes(CACHE_PUBLIC_KEY), { name: "Ed25519" }, false, ["verify"]);
            const good = await crypto.subtle.verify({ name: "Ed25519" }, key, b64uBytes(m[2]), new TextEncoder().encode(m[1]));
            if (!good) return { ok: false, reason: "This code is not valid." };
            const payload = JSON.parse(new TextDecoder().decode(b64uBytes(m[1])));
            if (payload.p !== "cache1") return { ok: false, reason: "This code is for a different item." };
            return { ok: true, payload };
        } catch (e) {
            console.warn("[Cache] verify failed", e);
            return { ok: false, reason: "Your browser cannot check this code. Please update it." };
        }
    }

    function closeCodeDialog() {
        const el = document.getElementById("rw-code");
        if (el) el.remove();
        cache.busy = false;
    }
    function openCodeDialog() {
        if (document.getElementById("rw-code")) return;
        cache.busy = true;
        const wrap = document.createElement("form");
        wrap.id = "rw-code";
        wrap.innerHTML = `<label for="rw-code-input">Enter your Supporter Cache code</label>
            <input id="rw-code-input" type="text" autocomplete="off" spellcheck="false" placeholder="RW1-...">
            <p id="rw-code-msg" role="status"></p>
            <div><button type="submit">Redeem</button><button type="button" id="rw-code-cancel">Cancel</button></div>`;
        document.body.appendChild(wrap);
        const input = wrap.querySelector("input");
        const msg = wrap.querySelector("#rw-code-msg");
        wrap.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Escape") closeCodeDialog();
        });
        wrap.addEventListener("keyup", (e) => e.stopPropagation());
        wrap.querySelector("#rw-code-cancel").addEventListener("click", closeCodeDialog);
        wrap.addEventListener("submit", async (e) => {
            e.preventDefault();
            msg.textContent = "Checking...";
            const res = await verifyCode(input.value);
            if (!res.ok) { msg.textContent = res.reason; return; }
            Progression.grantSupporter();
            closeCodeDialog();
            cache.reveal = 0.0001;
            GameAudio.sfxBossDefeat("bigboss");
        });
        input.focus();
    }
    function openShopPage() {
        const w = window.open(CACHE_URL, "_blank", "noopener");
        if (!w) {
            cache.message = "Open kelvik.at/roguewave in your browser.";
            cache.messageColor = "#ffcc66";
        }
    }

    function drawCacheSprite(x, y, scale, openAmount) {
        const t = now();
        ctx.globalCompositeOperation = "lighter";
        glow(x, y, 170 * scale, "#ffb52e", 0.5 + 0.2 * Math.sin(t * 0.004));
        ctx.globalCompositeOperation = "source-over";
        game.drawChestSprite(x, y, scale, "#ffc23d", openAmount);
    }

    function drawCard(cx, cy, w, h) {
        const t = now();
        const hov = Mouse.inRect(cx, cy, w, h);
        const edge = ctx.createLinearGradient(cx, cy, cx + w, cy + h);
        edge.addColorStop(0, "#fff0a8");
        edge.addColorStop(0.5, "#ffb52e");
        edge.addColorStop(1, "#ff5fa2");
        drawRoundRect(cx, cy, w, h, 10);
        ctx.fillStyle = hov ? "rgba(255,190,70,0.16)" : "rgba(255,190,70,0.08)";
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = hov ? 3 : 2;
        ctx.stroke();

        const icx = cx + w / 2;
        drawCacheSprite(icx, cy + 60, 0.82, 0);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffd166";
        ctx.font = uiFont(UI_FONT.sm, "bold");
        ctx.fillText("SUPPORTER CACHE", icx, cy + 118, w - 16);

        const lines = owned()
            ? ["Unlocked. Thank you for", "supporting RogueWave!"]
            : ["3 animated skins with own", "bullets, trails and kill effects."];
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(UI_FONT.xxs);
        lines.forEach((l, i) => ctx.fillText(l, icx, cy + 138 + i * 13, w - 16));

        for (let i = 0; i < CACHE_SKINS.length; i++) {
            drawSkin(CACHE_SKINS[i], icx + (i - 1) * 50, cy + 200, 14);
        }

        ctx.fillStyle = "#ffd166";
        ctx.font = uiFont(UI_FONT.md, "bold");
        ctx.fillText(owned() ? "OWNED" : CACHE_PRICE, icx, cy + h - 66);

        const bx = cx + 12, by = cy + h - 52, bw = w - 24, bh = 36;
        if (drawButton(owned() ? "VIEW" : "DETAILS", bx, by, bw, bh, Mouse.inRect(bx, by, bw, bh), UI_FONT.sm)) {
            cache.open = true;
            cache.message = "";
        }
    }

    function drawModal() {
        if (cache.reveal > 0) return drawReveal();
        if (!cache.open) return;
        const t = now();
        ctx.fillStyle = "rgba(2,4,14,0.86)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        const w = 660, h = 500, x = CANVAS_W / 2 - w / 2, y = CANVAS_H / 2 - h / 2;
        drawRoundRect(x, y, w, h, 16);
        ctx.fillStyle = "#0b0e24";
        ctx.fill();
        ctx.strokeStyle = "#ffc23d";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffd166";
        ctx.font = uiFont(30, "bold");
        ctx.fillText("SUPPORTER CACHE", CANVAS_W / 2, y + 40);
        ctx.fillStyle = COLOR.textDim;
        ctx.font = uiFont(13);
        ctx.fillText("A one-time thank-you pack. Every run stays exactly as hard.", CANVAS_W / 2, y + 68);

        const names = ["Solar Crown", "Void Reaper", "Prism Phantom"];
        const blurbs = ["Gold bullets, ember trail", "Violet bullets, shadow trail", "Shifting rainbow bullets"];
        for (let i = 0; i < 3; i++) {
            const cx = CANVAS_W / 2 + (i - 1) * 206;
            drawRoundRect(cx - 94, y + 92, 188, 176, 12);
            ctx.fillStyle = "rgba(255,255,255,0.045)";
            ctx.fill();
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            glow(cx, y + 150, 150, resolveColor(SKINS[CACHE_SKINS[i]].ringColor), 0.42);
            ctx.restore();
            drawSkin(CACHE_SKINS[i], cx, y + 150, 38 + Math.sin(t * 0.002 + i) * 1.5);
            ctx.textAlign = "center";
            ctx.fillStyle = COLOR.text;
            ctx.font = uiFont(15, "bold");
            ctx.fillText(names[i], cx, y + 222);
            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(11);
            ctx.fillText(blurbs[i], cx, y + 244, 176);
        }

        ctx.fillStyle = COLOR.text;
        ctx.font = uiFont(13);
        ctx.fillText("Includes all 3 skins, their custom kill effects and a Supporter crown in the menu.", CANVAS_W / 2, y + 296, w - 40);
        ctx.fillStyle = "#66ff99";
        ctx.font = uiFont(13, "bold");
        ctx.fillText("Fixed contents. No random drops. No gameplay advantage.", CANVAS_W / 2, y + 320, w - 40);

        if (owned()) {
            ctx.fillStyle = "#ffd166";
            ctx.font = uiFont(22, "bold");
            ctx.fillText("Thank you! All items are in your skin shop.", CANVAS_W / 2, y + 368, w - 40);
        } else {
            ctx.fillStyle = "#ffd166";
            ctx.font = uiFont(26, "bold");
            ctx.fillText(CACHE_PRICE, CANVAS_W / 2, y + 358);
            ctx.fillStyle = COLOR.textDim;
            ctx.font = uiFont(11);
            ctx.fillText("You buy on kelvik.at and get a code by email.", CANVAS_W / 2, y + 382);
        }
        if (cache.message) {
            ctx.fillStyle = cache.messageColor;
            ctx.font = uiFont(12, "bold");
            ctx.fillText(cache.message, CANVAS_W / 2, y + 400, w - 40);
        }

        const by = y + h - 76, bh = 48;
        if (owned()) {
            const bx = CANVAS_W / 2 - 120;
            if (!cache.busy && drawButton("CLOSE", bx, by, 240, bh, Mouse.inRect(bx, by, 240, bh), 18)) cache.open = false;
        } else {
            const bw = 190, gap = 14, x0 = CANVAS_W / 2 - (bw * 3 + gap * 2) / 2;
            const hit = (i) => Mouse.inRect(x0 + i * (bw + gap), by, bw, bh);
            if (drawButton("GET CACHE", x0, by, bw, bh, hit(0), 17) && !cache.busy) openShopPage();
            if (drawButton("ENTER CODE", x0 + bw + gap, by, bw, bh, hit(1), 17) && !cache.busy) openCodeDialog();
            if (drawButton("CLOSE", x0 + 2 * (bw + gap), by, bw, bh, hit(2), 17) && !cache.busy) cache.open = false;
        }
    }

    function drawReveal() {
        const dur = 3.2;
        const t = cache.reveal;
        ctx.fillStyle = "rgba(2,3,12,0.95)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        const cx = CANVAS_W / 2, cy = 230;
        const open = clamp((t - 0.9) / 0.35, 0, 1);
        const rattle = t < 0.9 ? Math.sin(t * 46) * (t * 7) : 0;
        if (open > 0) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(now() * 0.0005);
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < 14; i++) {
                ctx.rotate(TAU / 14);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-34, -440);
                ctx.lineTo(34, -440);
                ctx.closePath();
                ctx.fillStyle = `rgba(255,190,70,${0.06 * open})`;
                ctx.fill();
            }
            ctx.restore();
        }
        drawCacheSprite(cx + rattle, cy, 1.5, open);
        const names = ["Solar Crown", "Void Reaper", "Prism Phantom"];
        for (let i = 0; i < 3; i++) {
            const p = clamp((t - 1.15 - i * 0.28) / 0.45, 0, 1);
            if (p <= 0) continue;
            const e = 1 - (1 - p) * (1 - p);
            const tx = cx + (i - 1) * 250, ty = 450;
            const x = lerp(cx, tx, e), y = lerp(cy, ty, e);
            ctx.globalAlpha = p;
            drawSkin(CACHE_SKINS[i], x, y, 44);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = COLOR.text;
            ctx.font = uiFont(18, "bold");
            ctx.fillText(names[i], x, y + 72);
            ctx.globalAlpha = 1;
        }
        if (t > dur) {
            ctx.fillStyle = "#ffd166";
            ctx.font = uiFont(16, "bold");
            ctx.textAlign = "center";
            ctx.fillText("Click to continue", cx, CANVAS_H - 34);
            if (Mouse.clicked) {
                cache.reveal = 0;
                cache.open = true;
            }
        }
    }

    function updateCache(dt) {
        if (cache.reveal > 0) cache.reveal += dt;
    }
    function modalActive() { return cache.open || cache.reveal > 0; }
    function openCache() { cache.open = true; cache.message = ""; }
    function closeCache() { if (cache.reveal <= 0 && !cache.busy) cache.open = false; }

    return {
        glow, ring, ghost, icon, hue,
        drawBackground, drawVignette, updateEffects, drawGhosts, drawRings,
        drawSkin, isProcedural, isSupporterSkin, setRunSkin, bulletColor, trailColor, trailBoost, onKill,
        maybeDrop, updatePickups, drawPickups, resetRun, drawOffscreenMarkers,
        dashButtonRect, drawDashRing, drawDashButton, hudValues, drawMenuBackdrop,
        cacheAvailable, drawCard, drawModal, updateCache, modalActive, openCache, closeCache, CACHE_SKINS,
    };
})();
