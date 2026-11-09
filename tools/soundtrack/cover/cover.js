// Album cover for the RogueWave soundtrack. The wave is the real peak envelope
// of "Surge", the game's main theme. Four designs, picked with ?v=grid|minimal|glitch|radial
(() => {
    "use strict";
    const W = 3000, H = 3000;
    const canvas = document.getElementById("cover");
    const ctx = canvas.getContext("2d");
    const CYAN = "#33ccff", MAGENTA = "#ff55ff", RED = "#ff4466", WHITE = "#f2fbff";
    const FONT = "Bahnschrift, 'Segoe UI', Arial, sans-serif";
    const VARIANT = new URLSearchParams(location.search).get("v") || "grid";

    // Deterministic noise.
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    function background(top = "#03030c", mid = "#0b0a2c", bottom = "#160a2e", stars = 420) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, top);
        g.addColorStop(0.55, mid);
        g.addColorStop(1, bottom);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < stars; i++) {
            const x = rnd() * W, y = rnd() * H * 0.62, r = 1.5 + rnd() * 3.5;
            ctx.fillStyle = `rgba(200,235,255,${0.15 + rnd() * 0.5})`;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
    }

    /** Perspective floor grid, like the game's menu backdrop. */
    function grid(horizon = 1960) {
        const vanishX = W / 2;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, horizon, W, H - horizon); ctx.clip();
        const glow = ctx.createLinearGradient(0, horizon, 0, H);
        glow.addColorStop(0, "rgba(51,204,255,0.22)");
        glow.addColorStop(1, "rgba(51,204,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, horizon, W, H - horizon);
        ctx.strokeStyle = "rgba(51,204,255,0.55)";
        ctx.lineWidth = 4;
        ctx.shadowColor = CYAN; ctx.shadowBlur = 24;
        for (let i = -14; i <= 14; i++) {
            ctx.beginPath();
            ctx.moveTo(vanishX + i * 60, horizon);
            ctx.lineTo(vanishX + i * 520, H + 200);
            ctx.stroke();
        }
        for (let k = 1; k <= 11; k++) {
            const y = horizon + (H - horizon) * Math.pow(k / 11, 2.1);
            ctx.lineWidth = 3 + k * 0.6;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = CYAN; ctx.lineWidth = 6; ctx.shadowColor = CYAN; ctx.shadowBlur = 50;
        ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke();
        ctx.restore();
    }

    function ring(cx, cy, r, color = MAGENTA) {
        ctx.save();
        ctx.strokeStyle = color; ctx.globalAlpha = 0.9;
        ctx.lineWidth = 14;
        ctx.shadowColor = color; ctx.shadowBlur = 90;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 4; ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#ffffff"; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    /** The waveform, mirrored, as a glowing band. */
    function wave(points, left, right, cy, amp) {
        const n = points.length;
        const x = (i) => left + (right - left) * (i / (n - 1));
        const path = () => {
            ctx.beginPath();
            ctx.moveTo(x(0), cy);
            for (let i = 0; i < n; i++) ctx.lineTo(x(i), cy - Math.max(0.02, points[i][1]) * amp);
            for (let i = n - 1; i >= 0; i--) ctx.lineTo(x(i), cy - Math.min(-0.02, points[i][0]) * amp);
            ctx.closePath();
        };
        const fill = ctx.createLinearGradient(left, 0, right, 0);
        fill.addColorStop(0, "rgba(51,204,255,0.95)");
        fill.addColorStop(0.5, "rgba(255,85,255,0.95)");
        fill.addColorStop(1, "rgba(255,68,102,0.95)");
        ctx.save();
        ctx.shadowColor = MAGENTA; ctx.shadowBlur = 120;
        ctx.fillStyle = fill;
        path(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        path(); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
        ctx.restore();
    }

    function text(str, x, y, size, color, spacing, weight = "700", glow = color, align = "center") {
        ctx.save();
        ctx.font = `${weight} ${size}px ${FONT}`;
        ctx.textAlign = align; ctx.textBaseline = "middle";
        ctx.letterSpacing = spacing + "px";
        ctx.shadowColor = glow; ctx.shadowBlur = glow === "none" ? 0 : size * 0.35;
        ctx.fillStyle = color;
        ctx.fillText(str, x + (align === "center" ? spacing / 2 : 0), y);
        ctx.restore();
    }

    function scanlines(strength = 0.10, vignette = 0.55) {
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${strength})`;
        for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, `rgba(0,0,0,${vignette})`);
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // ── Design 1: neon grid, ring and the wave (the first draft) ──
    function drawGrid(points) {
        background();
        grid();
        ring(W / 2, 1500, 740);
        wave(points, 260, W - 260, 1500, 540);
        text("ROGUEWAVE", W / 2, 470, 330, WHITE, 28, "700", CYAN);
        text("ORIGINAL SOUNDTRACK", W / 2, 680, 92, CYAN, 34, "600");
        text("KELVIK", W / 2, 2560, 120, WHITE, 60, "600", MAGENTA);
        text("SURGE  ·  NEON DISTRICT  ·  ACID GRID  ·  CRIMSON CORE  ·  WARDEN", W / 2, 2720, 46, "rgba(159,233,255,0.75)", 8, "400", "none");
        scanlines();
    }

    // ── Design 2: minimal. Black, one thin line, light type. ──
    function drawMinimal(points) {
        ctx.fillStyle = "#07070d"; ctx.fillRect(0, 0, W, H);
        const n = points.length, left = 300, right = W - 300, cy = 1560, amp = 620;
        const x = (i) => left + (right - left) * (i / (n - 1));
        ctx.save();
        ctx.lineWidth = 5; ctx.lineJoin = "round";
        ctx.shadowColor = CYAN; ctx.shadowBlur = 40;
        const g = ctx.createLinearGradient(left, 0, right, 0);
        g.addColorStop(0, CYAN); g.addColorStop(1, MAGENTA);
        ctx.strokeStyle = g;
        ctx.beginPath();
        for (let i = 0; i < n; i++) ctx.lineTo(x(i), cy - points[i][1] * amp);
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < n; i++) ctx.lineTo(x(i), cy - points[i][0] * amp);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
        ctx.restore();
        text("ROGUEWAVE", W / 2, 560, 250, WHITE, 90, "300", "none");
        text("ORIGINAL SOUNDTRACK", W / 2, 760, 70, "rgba(159,233,255,0.8)", 40, "400", "none");
        text("KELVIK", W / 2, 2560, 90, "rgba(255,255,255,0.85)", 50, "400", "none");
        text("MMXXVI", W / 2, 2680, 44, "rgba(255,255,255,0.4)", 20, "400", "none");
    }

    // ── Design 3: glitch. Huge stacked type torn into slices, a red bar meter. ──
    function drawGlitch(points) {
        background("#07040f", "#0c0618", "#160612", 0);
        // Circuit-like lines.
        ctx.save();
        ctx.strokeStyle = "rgba(51,204,255,0.12)"; ctx.lineWidth = 3;
        for (let x = 150; x < W; x += 150) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 150; y < H; y += 150) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.restore();

        // Title drawn to a layer, then copied in torn slices with colour split.
        const layer = document.createElement("canvas"); layer.width = W; layer.height = H;
        const lc = layer.getContext("2d");
        lc.font = `700 720px ${FONT}`; lc.textAlign = "center"; lc.textBaseline = "middle";
        lc.letterSpacing = "20px";
        lc.fillStyle = WHITE;
        lc.fillText("ROGUE", W / 2, 900);
        lc.fillText("WAVE", W / 2, 1560);
        // Tinted ghost copies, then the white type in slices.
        const tint = (color, dx) => {
            const t = document.createElement("canvas"); t.width = W; t.height = H;
            const tc = t.getContext("2d");
            tc.drawImage(layer, 0, 0);
            tc.globalCompositeOperation = "source-in";
            tc.fillStyle = color; tc.fillRect(0, 0, W, H);
            ctx.save(); ctx.globalAlpha = 0.8; ctx.globalCompositeOperation = "screen";
            ctx.drawImage(t, dx, 0); ctx.restore();
        };
        tint(RED, -30); tint(CYAN, 30);
        seed = 3;
        for (let y = 500; y < 1900; y += 40) {
            const h = 40;
            const shift = rnd() < 0.3 ? (rnd() - 0.5) * 160 : 0;
            ctx.drawImage(layer, 0, y, W, h, shift, y, W, h);
        }

        // Bar meter from the envelope, red like the danger tracks.
        const bars = 60, left = 300, right = W - 300, base = 2560, bw = (right - left) / bars;
        ctx.save();
        ctx.shadowColor = RED; ctx.shadowBlur = 40;
        for (let b = 0; b < bars; b++) {
            const i = Math.floor(b / bars * points.length);
            const hgt = 30 + Math.abs(points[i][1]) * 300;
            ctx.fillStyle = b % 7 === 6 ? WHITE : RED;
            ctx.fillRect(left + b * bw + 6, base - hgt, bw - 12, hgt);
        }
        ctx.restore();
        text("ORIGINAL SOUNDTRACK", W / 2, 2080, 80, CYAN, 44, "600", "none");
        text("KELVIK", W / 2, 2700, 100, WHITE, 60, "600", "none");
        text("// SURGE DETECTED", W / 2, 2820, 46, RED, 14, "400", "none");
        scanlines(0.18, 0.5);
    }

    // ── Design 4: radial. The wave wrapped around a circle, like a sun. ──
    function drawRadial(points) {
        background("#04030d", "#0a0824", "#1a0830", 500);
        const cx = W / 2, cy = 1420, r = 640;
        const n = points.length;
        // Inner sun.
        const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        sun.addColorStop(0, "rgba(255,85,255,0.55)");
        sun.addColorStop(0.7, "rgba(255,68,102,0.25)");
        sun.addColorStop(1, "rgba(51,204,255,0)");
        ctx.fillStyle = sun;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.lineWidth = 7; ctx.lineCap = "round";
        ctx.shadowBlur = 30;
        for (let i = 0; i < n; i += 2) {
            const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
            const out = r + Math.abs(points[i][1]) * 520 + 10;
            const inn = r - Math.abs(points[i][0]) * 160;
            const hue = i / n;
            const color = hue < 0.5 ? mix(CYAN, MAGENTA, hue * 2) : mix(MAGENTA, RED, (hue - 0.5) * 2);
            ctx.strokeStyle = color; ctx.shadowColor = color;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * inn, cy + Math.sin(a) * inn);
            ctx.lineTo(cx + Math.cos(a) * out, cy + Math.sin(a) * out);
            ctx.stroke();
        }
        ctx.restore();
        ring(cx, cy, r, CYAN);
        text("ROGUE", cx, cy - 110, 300, WHITE, 40, "700", CYAN);
        text("WAVE", cx, cy + 150, 300, WHITE, 40, "700", MAGENTA);
        text("ORIGINAL SOUNDTRACK", W / 2, 2460, 86, CYAN, 36, "600");
        text("KELVIK", W / 2, 2660, 110, WHITE, 60, "600", MAGENTA);
        scanlines(0.08, 0.5);
    }

    function mix(a, b, t) {
        const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
        const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
        return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(",")})`;
    }

    const DESIGNS = { grid: drawGrid, minimal: drawMinimal, glitch: drawGlitch, radial: drawRadial };

    async function draw() {
        const points = await (await fetch("wave.json")).json();
        ctx.clearRect(0, 0, W, H);
        (DESIGNS[VARIANT] || drawGrid)(points);
        window.RWCover.ready = true;
    }

    async function save(name) {
        const blob = await (await fetch(canvas.toDataURL("image/png"))).blob();
        const r = await fetch("/__save/cover/" + name, { method: "POST", body: blob });
        return r.status;
    }

    window.RWCover = { draw, save, ready: false, variant: VARIANT };
    draw();
})();
