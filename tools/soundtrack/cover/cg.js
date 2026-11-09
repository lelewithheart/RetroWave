// Store covers for CrazyGames, drawn in the game's own visual language: a
// neon grid, the ship, a swarm with eyes and a lot of bullets.
// ?size=landscape (1920x1080) | portrait (800x1200) | square (800x800)
(() => {
    "use strict";
    const SIZES = { landscape: [1920, 1080], portrait: [800, 1200], square: [800, 800] };
    const size = new URLSearchParams(location.search).get("size") || "landscape";
    const [W, H] = SIZES[size] || SIZES.landscape;
    const canvas = document.getElementById("cover");
    canvas.width = W; canvas.height = H;
    canvas.style.width = Math.round(W / 2) + "px"; canvas.style.height = Math.round(H / 2) + "px";
    const ctx = canvas.getContext("2d");
    const TAU = Math.PI * 2;
    const FONT = "Bahnschrift, 'Segoe UI', Arial, sans-serif";
    const CYAN = "#33ccff", WHITE = "#f2fbff";
    // The scene scales with the shorter side so all three covers feel alike.
    const U = Math.min(W, H) / 800;

    let seed = 11;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const between = (a, b) => a + (b - a) * rnd();

    function background() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#05061a");
        g.addColorStop(0.6, "#10123f");
        g.addColorStop(1, "#1a0a30");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 260; i++) {
            ctx.fillStyle = `rgba(200,235,255,${0.12 + rnd() * 0.5})`;
            ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, (0.6 + rnd() * 1.6) * U, 0, TAU); ctx.fill();
        }
        // Floor grid with a horizon.
        const horizon = H * (size === "portrait" ? 0.78 : 0.72);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, horizon, W, H - horizon); ctx.clip();
        const glow = ctx.createLinearGradient(0, horizon, 0, H);
        glow.addColorStop(0, "rgba(51,204,255,0.28)");
        glow.addColorStop(1, "rgba(51,204,255,0)");
        ctx.fillStyle = glow; ctx.fillRect(0, horizon, W, H - horizon);
        ctx.strokeStyle = "rgba(51,204,255,0.5)"; ctx.lineWidth = 2 * U;
        ctx.shadowColor = CYAN; ctx.shadowBlur = 12 * U;
        for (let i = -16; i <= 16; i++) {
            ctx.beginPath(); ctx.moveTo(W / 2 + i * 30 * U, horizon); ctx.lineTo(W / 2 + i * 260 * U, H + 100); ctx.stroke();
        }
        for (let k = 1; k <= 8; k++) {
            const y = horizon + (H - horizon) * Math.pow(k / 8, 2);
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = CYAN; ctx.lineWidth = 3 * U; ctx.shadowColor = CYAN; ctx.shadowBlur = 30 * U;
        ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke();
        ctx.restore();
        // The game's faint world grid above the horizon.
        ctx.strokeStyle = "rgba(90,140,255,0.08)"; ctx.lineWidth = 1 * U;
        for (let x = 0; x < W; x += 60 * U) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, horizon); ctx.stroke(); }
        for (let y = 0; y < horizon; y += 60 * U) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    function eyes(x, y, r, look, angry) {
        const cl = Math.cos(look), sl = Math.sin(look), er = r * 0.22;
        for (const k of [-1, 1]) {
            const ex = x + cl * r * 0.22 - sl * r * 0.36 * k, ey = y + sl * r * 0.22 + cl * r * 0.36 * k;
            ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
            ctx.fillStyle = "#0b0b18"; ctx.beginPath(); ctx.arc(ex + cl * er * 0.4, ey + sl * er * 0.4, er * 0.5, 0, TAU); ctx.fill();
            if (angry) {
                ctx.strokeStyle = "#0b0b18"; ctx.lineWidth = Math.max(1.5, r * 0.12);
                const bx = x + cl * (r * 0.22 + er * 0.9) - sl * r * 0.36 * k, by = y + sl * (r * 0.22 + er * 0.9) + cl * r * 0.36 * k;
                ctx.beginPath();
                ctx.moveTo(bx - sl * er * 1.1 * k + cl * er * 0.3, by + cl * er * 1.1 * k + sl * er * 0.3);
                ctx.lineTo(bx + sl * er * 0.2 * k, by - cl * er * 0.2 * k);
                ctx.stroke();
            }
        }
    }

    function enemy(x, y, r, kind, look) {
        const color = { hex: "#44bb44", diamond: "#ffdd33", circle: "#ff4466", orange: "#ff7744", tri: "#bb55ff" }[kind];
        ctx.save();
        ctx.shadowColor = color; ctx.shadowBlur = 18 * U;
        ctx.fillStyle = color;
        ctx.beginPath();
        if (kind === "hex") {
            for (let k = 0; k < 6; k++) {
                const a = (TAU / 6) * k - Math.PI / 6;
                k ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            }
        } else if (kind === "diamond") {
            ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
        } else if (kind === "tri") {
            for (let k = 0; k < 3; k++) {
                const a = look + (TAU / 3) * k;
                k ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            }
        } else {
            ctx.arc(x, y, r, 0, TAU);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = Math.max(1.5, r * 0.08);
        ctx.strokeStyle = kind === "hex" ? "#226622" : "#000000";
        ctx.stroke();
        eyes(x, y, r, look, kind === "hex");
        ctx.restore();
    }

    function ship(x, y, r, aim) {
        ctx.save();
        // Range ring and glow.
        ctx.strokeStyle = "rgba(51,204,255,0.18)"; ctx.lineWidth = 2 * U; ctx.setLineDash([10 * U, 10 * U]);
        ctx.beginPath(); ctx.arc(x, y, r * 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, "rgba(51,204,255,0.45)"); g.addColorStop(1, "rgba(51,204,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
        // Hull.
        ctx.translate(x, y); ctx.rotate(aim);
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, r * 0.42); ctx.lineTo(-r * 2.3, 0); ctx.lineTo(-r * 0.55, -r * 0.42); ctx.closePath();
        ctx.fillStyle = "rgba(255,204,51,0.9)"; ctx.shadowColor = "#ffcc33"; ctx.shadowBlur = 30 * U; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(r * 1.55, 0); ctx.lineTo(-r * 0.95, r * 1.3); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r * 0.95, -r * 1.3); ctx.closePath();
        ctx.fillStyle = CYAN; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
        ctx.lineWidth = 2.5 * U; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.stroke();
        ctx.rotate(-aim); ctx.translate(-x, -y);
        // Core.
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = CYAN; ctx.shadowColor = CYAN; ctx.shadowBlur = 40 * U; ctx.fill(); ctx.shadowBlur = 0;
        ctx.lineWidth = 3 * U; ctx.strokeStyle = "#ffffff"; ctx.stroke();
        ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, TAU); ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fill();
        // Barrel.
        const ca = Math.cos(aim), sa = Math.sin(aim), reach = r * 1.7;
        const tx = x + ca * reach, ty = y + sa * reach;
        ctx.beginPath();
        ctx.moveTo(tx + ca * r * 0.45, ty + sa * r * 0.45);
        ctx.lineTo(tx - ca * r * 0.3 - sa * r * 0.45, ty - sa * r * 0.3 + ca * r * 0.45);
        ctx.lineTo(tx - ca * r * 0.08, ty - sa * r * 0.08);
        ctx.lineTo(tx - ca * r * 0.3 + sa * r * 0.45, ty - sa * r * 0.3 - ca * r * 0.45);
        ctx.closePath(); ctx.fillStyle = "#ffee55"; ctx.fill();
        // Orbit shield orbs.
        for (let i = 0; i < 3; i++) {
            const a = aim + 0.9 + (TAU / 3) * i;
            const ox = x + Math.cos(a) * r * 3.1, oy = y + Math.sin(a) * r * 3.1;
            ctx.beginPath(); ctx.arc(ox, oy, r * 0.42, 0, TAU);
            ctx.fillStyle = CYAN; ctx.globalAlpha = 0.85; ctx.shadowColor = CYAN; ctx.shadowBlur = 20 * U; ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.lineWidth = 2 * U; ctx.strokeStyle = "#ffffff"; ctx.stroke();
        }
        ctx.restore();
    }

    function bullet(x, y, a, len) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(a);
        ctx.shadowColor = "#ffee55"; ctx.shadowBlur = 16 * U;
        const g = ctx.createLinearGradient(-len, 0, 0, 0);
        g.addColorStop(0, "rgba(255,238,85,0)"); g.addColorStop(1, "rgba(255,238,85,0.95)");
        ctx.fillStyle = g;
        ctx.fillRect(-len, -3 * U, len, 6 * U);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(0, 0, 4 * U, 0, TAU); ctx.fill();
        ctx.restore();
    }

    function burst(x, y, r, color) {
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 3 * U; ctx.globalAlpha = 0.8;
        ctx.shadowColor = color; ctx.shadowBlur = 20 * U;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.fillStyle = color;
        for (let i = 0; i < 10; i++) {
            const a = rnd() * TAU, d = r * (0.6 + rnd() * 0.9);
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (2 + rnd() * 4) * U, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }

    function text(str, x, y, px, color, spacing, weight, glow) {
        ctx.save();
        ctx.font = `${weight} ${px}px ${FONT}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.letterSpacing = spacing + "px";
        ctx.shadowColor = glow; ctx.shadowBlur = px * 0.4;
        ctx.fillStyle = color;
        ctx.fillText(str, x + spacing / 2, y);
        ctx.restore();
    }

    function draw() {
        background();
        const portrait = size === "portrait";
        const px = W * (portrait ? 0.42 : size === "square" ? 0.4 : 0.36);
        const py = H * (portrait ? 0.56 : 0.56);
        const pr = (portrait ? 36 : size === "square" ? 40 : 46) * U;
        const aim = -0.35;

        // The swarm: dense on the right, thinning towards the ship.
        const kinds = ["circle", "circle", "orange", "hex", "diamond", "circle", "tri", "hex", "diamond"];
        const placed = [];
        for (let i = 0; i < (portrait ? 40 : 54); i++) {
            let x, y, r, tries = 0;
            do {
                const side = rnd();
                if (side < 0.62) { x = between(W * 0.55, W * 1.02); y = between(H * 0.08, H * 0.7); }
                else if (side < 0.82) { x = between(-W * 0.02, W * 0.3); y = between(H * 0.62, H * 0.74); }
                else { x = between(-W * 0.02, W * 1.02); y = between(H * 0.3, H * 0.72); }
                r = between(11, 30) * U;
                tries++;
                // Keep the title band clear.
                var inTitle = y < H * (portrait ? 0.46 : size === "square" ? 0.33 : 0.4) && Math.abs(x - W / 2) < W * 0.42;
            } while (tries < 20 && (inTitle || Math.hypot(x - px, y - py) < pr * 4.2 || placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.r + r) * 1.15)));
            placed.push({ x, y, r, kind: kinds[i % kinds.length] });
        }
        placed.sort((a, b) => a.r - b.r);
        for (const e of placed) enemy(e.x, e.y, e.r, e.kind, Math.atan2(py - e.y, px - e.x));

        // Bullets streaming from the ship, bursts where they land.
        for (let i = 0; i < 9; i++) {
            const a = aim + between(-0.12, 0.12) + (i % 3 - 1) * 0.12;
            const d = pr * (2.4 + i * 1.35);
            bullet(px + Math.cos(a) * d, py + Math.sin(a) * d, a, between(30, 60) * U);
        }
        for (const e of placed.slice(-6).filter((e) => e.x > px)) if (rnd() < 0.6) burst(e.x, e.y, e.r * 1.6, "#ffee55");
        burst(W * 0.62, H * 0.42, 40 * U, "#ff4466");

        ship(px, py, pr, aim);

        // Title and tagline.
        if (portrait) {
            text("ROGUE", W / 2, H * 0.17, 150 * U, WHITE, 10 * U, "700", CYAN);
            text("WAVE", W / 2, H * 0.3, 150 * U, WHITE, 10 * U, "700", CYAN);
            text("SURVIVOR ROGUELITE", W / 2, H * 0.4, 36 * U, CYAN, 12 * U, "600", CYAN);
        } else if (size === "square") {
            text("ROGUEWAVE", W / 2, H * 0.17, 118 * U, WHITE, 8 * U, "700", CYAN);
            text("SURVIVOR ROGUELITE", W / 2, H * 0.27, 32 * U, CYAN, 10 * U, "600", CYAN);
        } else {
            text("ROGUEWAVE", W / 2, H * 0.19, 190 * U, WHITE, 12 * U, "700", CYAN);
            text("SURVIVOR ROGUELITE", W / 2, H * 0.33, 46 * U, CYAN, 16 * U, "600", CYAN);
        }
        // Vignette.
        const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
        v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
        window.RWCover.ready = true;
    }

    async function save(name) {
        const blob = await (await fetch(canvas.toDataURL("image/png"))).blob();
        const r = await fetch("/__save/cover/" + name, { method: "POST", body: blob });
        return r.status;
    }

    window.RWCover = { draw, save, ready: false, size };
    draw();
})();
