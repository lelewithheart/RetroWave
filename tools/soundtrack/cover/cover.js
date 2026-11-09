// Album cover for the RogueWave soundtrack. The wave in the middle is the real
// peak envelope of "Surge", the game's main theme.
(() => {
    "use strict";
    const W = 3000, H = 3000;
    const canvas = document.getElementById("cover");
    const ctx = canvas.getContext("2d");
    const CYAN = "#33ccff", MAGENTA = "#ff55ff", RED = "#ff4466", WHITE = "#f2fbff";
    const FONT = "Bahnschrift, 'Segoe UI', Arial, sans-serif";

    // Deterministic noise for the stars.
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    function background() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#03030c");
        g.addColorStop(0.55, "#0b0a2c");
        g.addColorStop(1, "#160a2e");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 420; i++) {
            const x = rnd() * W, y = rnd() * H * 0.62, r = 1.5 + rnd() * 3.5;
            ctx.fillStyle = `rgba(200,235,255,${0.15 + rnd() * 0.5})`;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
    }

    /** Perspective floor grid, like the game's menu backdrop. */
    function grid() {
        const horizon = 1960, vanishX = W / 2;
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
        // Horizon line.
        ctx.save();
        ctx.strokeStyle = CYAN; ctx.lineWidth = 6; ctx.shadowColor = CYAN; ctx.shadowBlur = 50;
        ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke();
        ctx.restore();
    }

    function ring(cx, cy, r) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,85,255,0.9)";
        ctx.lineWidth = 14;
        ctx.shadowColor = MAGENTA; ctx.shadowBlur = 90;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    /** The waveform of the main theme, mirrored, as a glowing band. */
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
        // A thin bright core line.
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
        ctx.restore();
    }

    function text(str, x, y, size, color, spacing, weight = "700", glow = color) {
        ctx.save();
        ctx.font = `${weight} ${size}px ${FONT}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.letterSpacing = spacing + "px";
        ctx.shadowColor = glow; ctx.shadowBlur = size * 0.35;
        ctx.fillStyle = color;
        // letterSpacing adds space after the last glyph too; shift half of it back.
        ctx.fillText(str, x + spacing / 2, y);
        ctx.restore();
    }

    function scanlines() {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.10)";
        for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    async function draw() {
        const points = await (await fetch("wave.json")).json();
        background();
        grid();
        ring(W / 2, 1500, 740);
        wave(points, 260, W - 260, 1500, 540);
        text("ROGUEWAVE", W / 2, 470, 330, WHITE, 28, "700", CYAN);
        text("ORIGINAL SOUNDTRACK", W / 2, 680, 92, CYAN, 34, "600");
        text("KELVIK", W / 2, 2560, 120, WHITE, 60, "600", MAGENTA);
        text("SURGE  ·  NEON DISTRICT  ·  ACID GRID  ·  CRIMSON CORE  ·  WARDEN", W / 2, 2720, 46, "rgba(159,233,255,0.75)", 8, "400", "rgba(0,0,0,0)");
        scanlines();
        window.RWCover.ready = true;
    }

    async function save(name) {
        const blob = await (await fetch(canvas.toDataURL("image/png"))).blob();
        const r = await fetch("/__save/cover/" + name, { method: "POST", body: blob });
        return r.status;
    }

    window.RWCover = { draw, save, ready: false };
    draw();
})();
