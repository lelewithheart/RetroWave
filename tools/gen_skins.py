"""
Generate the missing RogueWave player-skin sprites.

Style is matched to the two existing assets (rainbow.png, SpidermanSkin.png):
  * pixel-art, 128x128, RGBA, transparent outside the disc
  * flat colours, no gradients
  * 1px-crisp dark outline around the disc
  * disc fills the canvas (touches the edges)

Rendering contract from game.js:
  * the sprite is clipped to a circle and drawn at radius*2 (player) or
    2*radius (shop icons), so the artwork must be a centred disc.
  * prestige tiers get a ring + star + letter glyph so the real asset
    matches the procedural fallback that is drawn when art is missing.
"""

from PIL import Image, ImageDraw

SIZE = 128
SS = 4                     # supersample factor for smooth-but-crisp edges
OUTLINE = (10, 12, 22, 255)  # matches the dark outline of the existing assets


def hex_rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(rgb, f):
    """Multiply brightness by f, clamped."""
    return tuple(max(0, min(255, int(c * f))) for c in rgb[:3]) + (255,)


def new_canvas():
    return Image.new("RGBA", (SIZE * SS, SIZE * SS), (0, 0, 0, 0))


def disc_mask(inset=0):
    """Antialiased circular mask covering the canvas (optionally inset)."""
    m = Image.new("L", (SIZE * SS, SIZE * SS), 0)
    d = ImageDraw.Draw(m)
    pad = int(inset * SS)
    d.ellipse([pad, pad, SIZE * SS - 1 - pad, SIZE * SS - 1 - pad], fill=255)
    return m


def downsample(img):
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def finish(img, outline_color=OUTLINE):
    """Downsample, then stamp a crisp 1px outline on the disc edge."""
    out = downsample(img)
    d = ImageDraw.Draw(out)
    # 1px outline hugging the disc edge, matching the existing sprites.
    d.ellipse([0, 0, SIZE - 1, SIZE - 1], outline=outline_color, width=1)
    return out


def radial_disc(base, inner_factor=0.55):
    """Flat disc with a subtle darker rim - the house style of the set."""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, SIZE * SS - 1, SIZE * SS - 1], fill=base)
    # darker inner ring for a bit of depth
    rim = int(SIZE * SS * 0.045)
    d.ellipse(
        [rim, rim, SIZE * SS - 1 - rim, SIZE * SS - 1 - rim],
        outline=shade(base, inner_factor),
        width=int(SIZE * SS * 0.035),
    )
    img.putalpha(disc_mask())
    return img


# --------------------------------------------------------------------------
# Simple element skins
# --------------------------------------------------------------------------

def skin_classic_cyan():
    """default - Classic Cyan. Plain cyan disc, the baseline look."""
    return radial_disc(hex_rgba("#33ccff"), 0.6)


def skin_lime_surge():
    """surge - Lime Surge. Lime disc with upward chevron bolts."""
    base = hex_rgba("#66ff99")
    img = radial_disc(base, 0.6)
    d = ImageDraw.Draw(img)
    w = SIZE * SS
    dark = shade(base, 0.45)
    # three stacked chevrons, pixel-blocky
    for i, y in enumerate((0.34, 0.50, 0.66)):
        cy = y * w
        h = w * 0.075
        span = w * (0.30 - i * 0.02)
        cx = w / 2
        d.polygon(
            [(cx - span, cy + h), (cx, cy - h * 0.6), (cx + span, cy + h),
             (cx + span * 0.55, cy + h), (cx, cy + h * 0.1), (cx - span * 0.55, cy + h)],
            fill=dark,
        )
    img.putalpha(disc_mask())
    return img


def skin_ember_pulse():
    """ember - Ember Pulse. Hot pink disc with a glowing ember core and cinders."""
    base = hex_rgba("#ff6688")
    img = new_canvas()
    d = ImageDraw.Draw(img)
    w = SIZE * SS
    cx = cy = w / 2

    # base disc
    d.ellipse([0, 0, w - 1, w - 1], fill=base)

    # dark rim so the hot core reads
    d.ellipse([0, 0, w - 1, w - 1],
              outline=shade(base, 0.5), width=max(1, int(w * 0.022)))

    # rising heat plume: warm blobs climbing from the bottom
    warm = [(255, 180, 90, 255), (255, 214, 130, 255), (255, 244, 205, 255)]
    blobs = [
        (0.50, 0.66, 0.20, warm[0]),
        (0.50, 0.54, 0.14, warm[1]),
        (0.50, 0.44, 0.09, warm[2]),
        (0.62, 0.36, 0.045, warm[1]),
        (0.38, 0.34, 0.04, warm[1]),
    ]
    for bx, by, br, col in blobs:
        rr = w * br
        d.ellipse([cx + (bx - 0.5) * w - rr, cy + (by - 0.5) * w - rr,
                   cx + (bx - 0.5) * w + rr, cy + (by - 0.5) * w + rr], fill=col)

    # flying cinders
    sp = w * 0.028
    for dx, dy in ((-0.30, -0.10), (0.28, 0.05), (-0.20, 0.30), (0.24, 0.28),
                   (0.02, -0.34)):
        sx, sy = cx + dx * w, cy + dy * w
        d.ellipse([sx - sp, sy - sp, sx + sp, sy + sp], fill=warm[2])

    img.putalpha(disc_mask())
    return img


def skin_nova_gold():
    """nova - Nova Gold. Gold disc with a 4-point star burst."""
    base = hex_rgba("#ffd166")
    img = radial_disc(base, 0.6)
    d = ImageDraw.Draw(img)
    w = SIZE * SS
    cx = cy = w / 2
    gold_dark = (180, 120, 20, 255)
    white = (255, 250, 225, 255)
    # 4-point star
    long_r = w * 0.42
    short_r = w * 0.11
    pts = []
    for i in range(8):
        a = -1.5708 + i * (3.14159 / 4)
        r = long_r if i % 2 == 0 else short_r
        import math
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    d.polygon(pts, fill=white)
    d.polygon(pts, outline=gold_dark, width=max(1, int(w * 0.012)))
    # small centre dot
    cr = w * 0.075
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=gold_dark)
    img.putalpha(disc_mask())
    return img


# --------------------------------------------------------------------------
# Prestige tiers - mirror the in-game fallback (ring + star + letter)
# --------------------------------------------------------------------------

PRESTIGE = {
    # id: (disc colour, glyph)
    "prestige_bronze":   ("#d4a574", "B"),
    "prestige_silver":   ("#c0c0c0", "S"),
    "prestige_gold":     ("#ffd700", "G"),
    "prestige_diamond":  ("#b9f1ff", "D"),
    "prestige_platinum": ("#e5e4e2", "P"),
    "prestige_emerald":  ("#50c878", "E"),
}


def pentagram(cx, cy, r):
    """5-point star polygon points, matching the canvas fallback maths."""
    import math
    pts = []
    for i in range(5):
        a = -math.pi / 2 + i * (2 * math.pi / 5)
        p = r if i % 2 == 0 else r * 0.45
        pts.append((cx + math.cos(a) * p, cy + math.sin(a) * p))
    return pts


def skin_prestige(disc_hex, glyph):
    base = hex_rgba(disc_hex)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    w = SIZE * SS
    cx = cy = w / 2

    # Base disc in the tier colour - matches the canvas fallback which fills
    # with skin.player before drawing the emblem on top.
    d.ellipse([0, 0, w - 1, w - 1], fill=base)

    # outer + inner ring, mirroring the procedural fallback proportions
    outer = w * 0.5 - w * 0.014
    d.ellipse([cx - outer, cy - outer, cx + outer, cy + outer],
              outline=shade(base, 0.62), width=max(2, int(w * 0.024)))
    inner = w * 0.5 - w * 0.052
    d.ellipse([cx - inner, cy - inner, cx + inner, cy + inner],
              outline=shade(base, 1.25), width=max(1, int(w * 0.012)))

    # star behind the glyph (white, semi-opaque - same as the fallback)
    star_r = w * 0.34 * 1.35
    d.polygon(pentagram(cx, cy, star_r), fill=(255, 255, 255, 205))

    # glyph, dark on the white star so it always reads
    try:
        from PIL import ImageFont
        font = None
        # Bold face, sized generously - the icon is drawn as small as ~40px in
        # the shop grid, so the letter needs to stay legible when scaled down.
        for cand in (
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ):
            try:
                font = ImageFont.truetype(cand, int(w * 0.56))
                break
            except OSError:
                continue
        if font is not None:
            bb = d.textbbox((0, 0), glyph, font=font, stroke_width=int(w * 0.02))
            tx = cx - (bb[2] - bb[0]) / 2 - bb[0]
            ty = cy - (bb[3] - bb[1]) / 2 - bb[1]
            d.text((tx, ty), glyph, font=font, fill=(10, 14, 26, 255),
                   stroke_width=int(w * 0.02), stroke_fill=(255, 255, 255, 255))
    except Exception:
        pass

    return img


def main():
    import os
    # Repo root is one level up from tools/.
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "assets", "playerskins")
    os.makedirs(out_dir, exist_ok=True)

    made = []

    def save(name, img):
        path = os.path.join(out_dir, name + ".png")
        finish(img).save(path)
        made.append(path)

    save("default", skin_classic_cyan())
    save("surge", skin_lime_surge())
    save("ember", skin_ember_pulse())
    save("nova", skin_nova_gold())
    for pid, (_, glyph) in PRESTIGE.items():
        save(pid, skin_prestige(PRESTIGE[pid][0], glyph))

    for p in made:
        im = Image.open(p)
        print(f"wrote {os.path.basename(p):26s} {im.size} {im.mode} "
              f"{os.path.getsize(p)} bytes")


if __name__ == "__main__":
    main()
