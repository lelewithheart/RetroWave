// RogueWave soundtrack, tracks 2 to 5. Uses the synth rig from music.js.
(() => {
    "use strict";
    const M = window.RWMusic;
    const hz = M.hz;
    const semis = (f, n) => f * Math.pow(2, n / 12);
    const tanhCurve = (k) => {
        const c = new Float32Array(1025);
        for (let i = 0; i < c.length; i++) c[i] = Math.tanh(k * (i / 512 - 1)) / Math.tanh(k);
        return c;
    };

    /** Small sequencing helpers bound to one rig. */
    function tools(R) {
        const at = (bar, step = 0) => bar * R.BAR + step * R.S16;
        const VEL = { x: 1, o: 0.65, "-": 0.38, O: 1 };
        // Hits of a 16-step line with the distance to the next hit (in steps).
        function hits(str) {
            const idx = [];
            for (let i = 0; i < 16; i++) if (str[i] !== ".") idx.push(i);
            return idx.map((i, k) => ({ i, ch: str[i], v: VEL[str[i]], gap: (k + 1 < idx.length ? idx[k + 1] : 16) - i }));
        }
        return {
            at,
            kicks(bar, str, scale = 1) {
                for (const h of hits(str)) R.kick(at(bar, h.i), h.v * scale, Math.min(R.tune.kickLen, h.gap * R.S16 * 0.96));
            },
            snares(bar, str, scale = 1) {
                for (const h of hits(str)) R.snare(at(bar, h.i), h.v * scale, Math.min(0.2, h.gap * R.S16 * 0.95));
            },
            hats(bar, str, scale = 1) {
                for (const h of hits(str)) R.hat(at(bar, h.i), h.v * scale * (h.ch === "O" ? 0.7 : 1), h.ch === "O");
            },
            claps(bar, str, scale = 1) {
                for (const h of hits(str)) R.clap(at(bar, h.i), h.v * scale);
            },
            /** Snare roll over one bar that gets louder. */
            roll(bar, from = 0, lo = 0.25, hi = 1) {
                for (let i = from; i < 16; i++) {
                    R.snare(at(bar, i), lo + (hi - lo) * ((i - from) / (15 - from)), R.S16 * 0.95);
                }
            },
            lead(bar, phrase, vel = 1, transpose = 0) {
                let step = 0;
                for (const [note, len] of phrase) {
                    if (note !== "-") R.lead(at(bar, step), semis(hz(note), transpose), len * R.S16 * 0.94, vel);
                    step += len;
                }
            },
            /** Arp over four chord tones. `every` 1 = sixteenths, 2 = eighths. */
            arp(bar, tones, vel = 1, every = 1, hi = false) {
                const f = tones.map(hz);
                for (let i = 0, k = 0; i < 16; i += every, k++) {
                    const n = f[M.ARP_STEPS[every === 1 ? i : k % 16]];
                    R.arp(at(bar, i), n, R.S16 * every * 1.9, (i % 4 === 0 ? 1 : 0.72) * vel, k % 2 ? "r" : "l");
                    if (hi && i % 2 === 0) R.arp(at(bar, i), n * 2, R.S16 * 1.8, 0.4 * vel, "hi");
                }
            },
            /** Bass line from [step, octaveUp, velocity] entries. */
            bassLine(bar, root, steps, bright = 1) {
                steps.forEach(([i, up, v], k) => {
                    const gap = (k + 1 < steps.length ? steps[k + 1][0] : 16) - i;
                    R.bass(at(bar, i), up ? root * 2 : root, gap * R.S16 * 0.94, v, bright);
                });
            },
        };
    }
    const SIXTEENTHS = Array.from({ length: 16 }, (_, i) => [i, i % 4 === 2 ? 1 : 0, [1, 0.72, 0.9, 0.72][i % 4]]);

    // ─────────────────────────────────────────────
    // Track 2: "Acid Grid", E minor, 126 BPM, 48 bars
    // A resonant acid line carries the track; the filter is the melody.
    // ─────────────────────────────────────────────
    const ACID = { name: "acid", bpm: 126, bars: 48 };
    const ACID_CH = {
        0:    { pad: ["E3", "B3", "E4", "G4"], stab: ["E4", "G4", "B4", "E5"], arp: ["E5", "G5", "B5", "E6"] },
        "-4": { pad: ["C3", "G3", "E4", "G4"], stab: ["E4", "G4", "C5", "E5"], arp: ["E5", "G5", "C6", "E6"] },
        "-2": { pad: ["D3", "A3", "D4", "F#4"], stab: ["D4", "F#4", "A4", "D5"], arp: ["D5", "F#5", "A5", "D6"] },
    };
    // [semitones above the root, accent, slide into the next step]
    const AP1 = [[0, 1, 0], [0, 0, 0], [12, 0, 1], [10, 0, 0], [0, 0, 0], [3, 1, 0], [0, 0, 0], [12, 0, 0],
                 [0, 1, 0], [0, 0, 0], [7, 0, 1], [8, 0, 0], [0, 0, 0], [12, 1, 0], [10, 0, 1], [7, 0, 0]];
    const AP2 = [[0, 1, 0], [0, 0, 0], [1, 0, 1], [0, 0, 0], [12, 1, 0], [0, 0, 0], [3, 0, 0], [0, 0, 0],
                 [0, 1, 0], [10, 0, 0], [12, 0, 1], [13, 0, 0], [0, 0, 0], [7, 1, 0], [3, 0, 1], [1, 0, 0]];
    const AP0 = [[0, 1, 0], null, [0, 0, 0], null, [0, 0, 0], null, [12, 0, 0], null,
                 [0, 1, 0], null, [0, 0, 0], null, [3, 0, 0], null, [0, 0, 0], [12, 0, 0]];
    const ACID_LEAD = {
        m1: [["E5", 3], ["G5", 3], ["B5", 2], ["A5", 3], ["G5", 3], ["E5", 2]],
        m2: [["D5", 3], ["E5", 3], ["G5", 2], ["F#5", 4], ["E5", 4]],
        m3: [["E5", 3], ["B5", 3], ["E6", 2], ["D6", 3], ["B5", 3], ["G5", 2]],
        mC: [["E5", 3], ["G5", 3], ["C6", 2], ["B5", 3], ["G5", 3], ["E5", 2]],
        mD: [["F#5", 4], ["A5", 4], ["D6", 6], ["-", 2]],
    };

    function composeAcid(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 160; R.tune.kickEnd = 48; R.tune.kickLen = 0.3;
        R.tune.leadBright = 4200;
        R.n.reverbOut.gain.value = 0.45;
        R.n.B.pad.in.gain.value = 0.55;
        R.n.B.arp.in.gain.value = 1.15;
        R.n.B.stab.in.gain.value = 1.15;

        const sec = (b) => b < 8 ? "intro" : b < 24 ? "A" : b < 28 ? "break" : b < 44 ? "B" : "outro";
        const rootSemi = (b) => {
            const s = sec(b);
            if (s !== "A" && s !== "B") return 0;
            const k = (b - (s === "A" ? 8 : 28)) % 8;
            return k === 6 ? -4 : k === 7 ? -2 : 0;      // E E E E E E C D
        };
        // Base cutoff of the acid filter over the track, in Hz.
        const cutAt = (t) => {
            const b = t / R.BAR;
            if (b < 8) return 180 * Math.pow(420 / 180, b / 8);
            if (b < 16) return 420 * Math.pow(900 / 420, (b - 8) / 8);
            if (b < 24) return 900 + 330 * Math.sin((b - 16) / 8 * Math.PI * 2);
            if (b < 26) return 1200 * Math.pow(300 / 1200, (b - 24) / 2);
            if (b < 28) return 300 * Math.pow(2200 / 300, (b - 26) / 2);
            if (b < 44) return 1800 + 600 * Math.sin((b - 28) / 8 * Math.PI * 2 - Math.PI / 2) + (b - 28) * 25;
            return 1300 * Math.pow(200 / 1300, (b - 44) / 4);
        };
        function acidBar(bar, pat) {
            const root = semis(hz("E2"), rootSemi(bar));
            let glide = false;
            for (let i = 0; i < 16; i++) {
                const st = pat[i];
                if (!st) { glide = false; continue; }
                const t = at(bar, i);
                R.acid(t, semis(root, st[0]), R.S16 * (st[2] ? 1.97 : 0.9), cutAt(t), !!st[1], glide);
                glide = !!st[2];
            }
        }

        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(2600, 0);
        af.setValueAtTime(2600, at(28));
        af.exponentialRampToValueAtTime(4200, at(44));
        af.exponentialRampToValueAtTime(2600, at(48));
        pf.setValueAtTime(700, 0);
        pf.setValueAtTime(700, at(24));
        pf.exponentialRampToValueAtTime(1900, at(27));
        pf.exponentialRampToValueAtTime(1100, at(28));
        pf.setValueAtTime(1100, at(44));
        pf.exponentialRampToValueAtTime(700, at(48));

        for (let bar = 0; bar < ACID.bars; bar++) {
            const s = sec(bar);
            const rs = rootSemi(bar);
            const ch = ACID_CH[rs];
            const rel = s === "A" ? bar - 8 : s === "B" ? bar - 28 : 0;
            const fillBar = (s === "A" || s === "B") && rel % 8 === 7;

            R.pad(at(bar), ch.pad.map(hz), R.BAR, s === "break" ? 1.3 : 0.9);

            // Acid line.
            if (s === "intro") acidBar(bar, bar < 4 ? AP0 : AP1);
            else if (s === "break") acidBar(bar, bar < 26 ? AP0 : AP1);
            else if (s === "outro") acidBar(bar, bar < 46 ? AP1 : AP0);
            else acidBar(bar, rel % 4 === 3 && rs === 0 ? AP2 : AP1);

            // Sub on the off-beats, between the kicks.
            if ((s === "intro" && bar >= 4) || s === "A" || s === "B" || (s === "outro" && bar < 46)) {
                const sub = rs === 0 ? hz("E1") : semis(hz("E2"), rs);
                for (const i of [2, 6, 10, 14]) R.bass(at(bar, i), sub, R.S16 * 1.9, 0.9, 0.22);
            }

            // Drums.
            if ((s === "intro" && bar >= 4) || s === "A" || s === "B" || (s === "outro" && bar < 46)) {
                T.kicks(bar, "x...x...x...x...");
            }
            if (s === "intro") {
                T.hats(bar, bar < 4 ? "..-...-...-...-." : "x.o.x.o.x.o.x.o.", 0.8);
            } else if (s === "A" || s === "B") {
                T.hats(bar, "x-o-x-o-x-o-x-o-", s === "B" ? 1 : 0.85);
                T.hats(bar, "..O...O...O...O.");
                T.claps(bar, "....x.......x...");
                if (s === "B") T.snares(bar, fillBar ? "....o.......o.xx" : "....o.......o...", 0.8);
                else if (fillBar) T.snares(bar, "............o.xx", 0.8);
            } else if (s === "outro") {
                T.hats(bar, bar < 46 ? "x.o.x.o.x.o.x.o." : "..-...-...-...-.", 0.75);
            }

            // Chord stabs from the second half of A.
            if ((s === "A" && rel >= 8) || s === "B") {
                for (const i of [3, 6, 11, 14]) R.stab(at(bar, i), ch.stab.map(hz), R.S16 * 1.8, s === "B" ? 1 : 0.8);
            }

            // Sparkle arp and the riff in B.
            if (s === "B") {
                T.arp(bar, ch.arp, 0.55);
                if (rel >= 4) {
                    const k = rel % 8;
                    const ph = k === 6 ? ACID_LEAD.mC : k === 7 ? ACID_LEAD.mD
                        : k % 2 === 1 ? ACID_LEAD.m2 : (rel >= 12 ? ACID_LEAD.m3 : ACID_LEAD.m1);
                    T.lead(bar, ph, 0.95);
                }
            }
        }

        R.riser(at(7), R.BAR);
        R.impact(at(8));
        R.impact(at(16));
        T.roll(26, 0, 0.15, 0.5);
        T.roll(27, 0, 0.5, 1);
        R.riser(at(26), R.BAR * 2);
        R.impact(at(28));
        R.impact(at(36));
    }

    // ─────────────────────────────────────────────
    // Track 3: "Crimson Core", D minor, 100 BPM, 40 bars
    // Slow, heavy and menacing: half-time drums and a distorted gallop bass.
    // ─────────────────────────────────────────────
    const CRIMSON = { name: "crimson", bpm: 100, bars: 40 };
    const CR_CH = {
        Dm: { root: "D2", pad: ["A3", "D4", "F4", "A4"], arp: ["D4", "F4", "A4", "D5"] },
        Bb: { root: "A#1", pad: ["A#3", "D4", "F4", "A4"], arp: ["D4", "F4", "A#4", "D5"] },
        Gm: { root: "G1", pad: ["G3", "A#3", "D4", "G4"], arp: ["D4", "G4", "A#4", "D5"] },
        A:  { root: "A1", pad: ["A3", "C#4", "E4", "A4"], arp: ["C#4", "E4", "A4", "C#5"] },
    };
    const CR_CHORDS = [
        "Dm", "Dm", "Dm", "Dm",                              // 0  intro
        "Dm", "Dm", "Bb", "A", "Dm", "Dm", "Bb", "A",        // 4  A
        "Dm", "Dm", "Bb", "A", "Dm", "Dm", "Bb", "A",        // 12 A2 (lead)
        "Bb", "Bb", "A", "A",                                // 20 break
        "Dm", "Bb", "Gm", "A", "Dm", "Bb", "Gm", "A",        // 24 B
        "Dm", "Dm", "Bb", "A",                               // 32 A3
        "Dm", "Dm", "Dm", "Dm",                              // 36 outro
    ];
    const CR_LEAD_A = [
        [["D4", 8], ["F4", 4], ["E4", 4]],
        [["A4", 8], ["G4", 4], ["F4", 4]],
        [["F4", 8], ["D4", 4], ["A#4", 4]],
        [["A4", 6], ["G4", 2], ["E4", 4], ["C#4", 4]],
        [["D5", 8], ["A4", 4], ["F4", 4]],
        [["E4", 2], ["F4", 2], ["A4", 4], ["D5", 8]],
        [["D5", 6], ["C5", 2], ["A#4", 8]],
        [["A4", 4], ["C#5", 4], ["E5", 8]],
    ];
    const CR_LEAD_B = [
        [["D5", 3], ["F5", 3], ["A5", 2], ["D6", 8]],
        [["D6", 4], ["A#5", 4], ["F5", 4], ["D5", 4]],
        [["G5", 3], ["A#5", 3], ["D6", 2], ["G5", 8]],
        [["A5", 4], ["C#6", 4], ["E6", 6], ["C#6", 2]],
        [["D6", 6], ["A5", 2], ["F5", 4], ["A5", 4]],
        [["A#5", 6], ["A5", 2], ["F5", 8]],
        [["G5", 2], ["A#5", 2], ["D6", 2], ["G6", 2], ["F6", 4], ["D6", 4]],
        [["E6", 4], ["C#6", 4], ["A5", 8]],
    ];
    const GALLOP = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].map((i) => [i, 0, i % 4 === 0 ? 1 : 0.75]);

    function composeCrimson(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 150; R.tune.kickEnd = 40; R.tune.kickLen = 0.42;
        R.tune.leadBright = 2700; R.tune.leadVib = 0.009;
        R.n.bDrive.curve = tanhCurve(3); R.n.bDrive.oversample = "2x";
        R.n.bFilter.Q.value = 7;
        R.n.B.bass.in.gain.value = 0.5;
        R.n.reverbOut.gain.value = 0.75;
        R.n.lSq.type = "sawtooth"; R.n.lSqLevel.gain.value = 0.6;
        R.n.dL.delayTime.value = R.S16 * 4; R.n.dR.delayTime.value = R.S16 * 4;

        const sec = (b) => b < 4 ? "intro" : b < 12 ? "A" : b < 20 ? "A2" : b < 24 ? "break"
            : b < 32 ? "B" : b < 36 ? "A3" : "outro";

        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(800, 0);
        af.setValueAtTime(800, at(23));
        af.exponentialRampToValueAtTime(2600, at(24));
        af.setValueAtTime(2600, at(32));
        af.exponentialRampToValueAtTime(800, at(36));
        pf.setValueAtTime(750, 0);
        pf.setValueAtTime(750, at(20));
        pf.exponentialRampToValueAtTime(1600, at(24));
        pf.exponentialRampToValueAtTime(1000, at(32));
        pf.exponentialRampToValueAtTime(750, at(40));

        for (let bar = 0; bar < CRIMSON.bars; bar++) {
            const s = sec(bar);
            const ch = CR_CH[CR_CHORDS[bar]];
            const root = hz(ch.root);
            const fillBar = bar === 11 || bar === 19 || bar === 31 || bar === 35;

            R.pad(at(bar), ch.pad.map(hz), R.BAR, s === "break" ? 1.2 : 1);

            // Bass.
            if (s === "intro") {
                T.bassLine(bar, root, [0, 4, 8, 12].map((i) => [i, 0, 0.55]), 0.2 + bar * 0.15);
            } else if (s === "break") {
                T.bassLine(bar, root, [[0, 0, 0.5]], 0.25);
            } else if (s === "B") {
                T.bassLine(bar, root, SIXTEENTHS.map(([i, , v]) => [i, i === 6 || i === 14 ? 1 : 0, v]), 1.2);
            } else if (s === "outro" && bar >= 38) {
                T.bassLine(bar, root, [[0, 0, 0.6], [8, 0, 0.5]], 0.3);
            } else {
                T.bassLine(bar, root, GALLOP, s === "outro" ? 0.7 : 1.05);
            }

            // Drums: half-time in the A parts, full time in B.
            if (s === "intro") {
                if (bar >= 2) T.kicks(bar, "x.......x.......", 0.8);
            } else if (s === "A" || s === "A2" || s === "A3") {
                T.kicks(bar, "x.....x...x.....");
                T.snares(bar, fillBar ? "........x...o.xx" : "........x.......");
                T.claps(bar, "........x.......", 0.7);
                T.hats(bar, "x.o.x.o.x.o.x.o.", 0.8);
            } else if (s === "B") {
                T.kicks(bar, "x.....x.x.....x.");
                T.snares(bar, fillBar ? "....x.......x.xx" : "....x.......x...");
                T.hats(bar, "x-o-x-o-x-o-x-o-");
                T.hats(bar, "..O...O...O...O.");
            } else if (s === "outro" && bar < 38) {
                T.kicks(bar, "x.......x.......", 0.85);
                T.hats(bar, "x...o...x...o...", 0.6);
            }

            // Eerie slow arp in the quiet parts, fast in B.
            if (s === "intro" || s === "break" || s === "outro") T.arp(bar, ch.arp, 0.8, 2);
            else if (s === "B") T.arp(bar, ch.arp.map((n) => n.replace(/\d/, (d) => Number(d) + 1)), 0.6);

            // Lead.
            if (s === "A2") T.lead(bar, CR_LEAD_A[bar - 12], 1);
            else if (s === "B") T.lead(bar, CR_LEAD_B[bar - 24], 1.05);
            else if (s === "A3") T.lead(bar, CR_LEAD_A[bar - 32], 1.05, 12);

            // Brass-like hits.
            if (s === "A3") {
                R.stab(at(bar, 0), ch.pad.map(hz), R.S16 * 3, 1.2, 0.8);
                R.stab(at(bar, 6), ch.pad.map(hz), R.S16 * 3, 1.0, 0.8);
            } else if (s === "B") {
                R.stab(at(bar, 0), ch.pad.map(hz), R.S16 * 4, 0.8, 0.7);
            }
        }

        R.riser(at(3), R.BAR);
        R.impact(at(4));
        R.impact(at(12));
        T.roll(23, 0, 0.2, 1);
        R.riser(at(22), R.BAR * 2);
        R.impact(at(24));
        R.impact(at(32));
        R.lead(at(36), hz("D4"), R.BAR * 1.9, 0.8);
    }

    // ─────────────────────────────────────────────
    // Track 4: "Warden" (boss), C minor, 150 BPM, 32 bars
    // Short, fast and relentless.
    // ─────────────────────────────────────────────
    const BOSS = { name: "boss", bpm: 150, bars: 32 };
    const BO_CH = {
        Cm: { root: "C2", pad: ["G3", "C4", "D#4", "G4"], arp: ["C5", "D#5", "G5", "C6"] },
        Ab: { root: "G#1", pad: ["G#3", "C4", "D#4", "G#4"], arp: ["C5", "D#5", "G#5", "C6"] },
        Fm: { root: "F1", pad: ["F3", "G#3", "C4", "F4"], arp: ["C5", "F5", "G#5", "C6"] },
        G:  { root: "G1", pad: ["G3", "B3", "D4", "G4"], arp: ["B4", "D5", "G5", "B5"] },
    };
    const BO_CYCLE = ["Cm", "Ab", "Fm", "G"];
    const BO_RIFF = [
        [["C5", 2], ["D#5", 2], ["G5", 2], ["C6", 2], ["A#5", 2], ["G5", 2], ["D#5", 2], ["G5", 2]],
        [["G#5", 4], ["C6", 4], ["D#6", 6], ["C6", 2]],
        [["F5", 2], ["G#5", 2], ["C6", 2], ["F6", 2], ["D#6", 2], ["C6", 2], ["G#5", 2], ["C6", 2]],
        [["D6", 4], ["B5", 4], ["G5", 4], ["B5", 2], ["D6", 2]],
        [["C6", 3], ["A#5", 3], ["G5", 2], ["D#5", 3], ["G5", 3], ["C6", 2]],
        [["D#6", 6], ["C6", 2], ["G#5", 8]],
        [["F5", 2], ["G#5", 2], ["C6", 2], ["F6", 2], ["G6", 4], ["F6", 4]],
        [["D6", 8], ["G6", 8]],
    ];
    const BO_BREAK = [[["G5", 16]], [["G#5", 16]], [["F5", 16]], [["G5", 8], ["B5", 8]]];
    const DRIVE16 = Array.from({ length: 16 }, (_, i) => [i, [0, 0, 0, 1, 0, 0, 1, 0][i % 8], i % 4 === 0 ? 1 : 0.76]);

    function composeBoss(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 180; R.tune.kickEnd = 50; R.tune.kickLen = 0.3;
        R.tune.leadBright = 4300;
        R.n.bDrive.curve = tanhCurve(2); R.n.bDrive.oversample = "2x";
        R.n.lSq.type = "sawtooth"; R.n.lSqLevel.gain.value = 0.55;
        R.n.dL.delayTime.value = R.S16 * 2; R.n.dR.delayTime.value = R.S16 * 2;
        R.n.reverbOut.gain.value = 0.45;
        R.n.B.pad.in.gain.value = 0.65;

        const sec = (b) => b < 4 ? "intro" : b < 12 ? "A" : b < 20 ? "B" : b < 24 ? "break" : "D";

        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(800, 0);
        af.exponentialRampToValueAtTime(2800, at(4));
        af.exponentialRampToValueAtTime(3400, at(20));
        af.exponentialRampToValueAtTime(1200, at(22));
        af.exponentialRampToValueAtTime(4600, at(24));
        af.setValueAtTime(4600, at(31));
        af.exponentialRampToValueAtTime(800, at(32));
        pf.setValueAtTime(1000, 0);
        pf.exponentialRampToValueAtTime(1500, at(4));
        pf.setValueAtTime(1500, at(24));
        pf.exponentialRampToValueAtTime(2100, at(28));
        pf.exponentialRampToValueAtTime(1000, at(32));

        for (let bar = 0; bar < BOSS.bars; bar++) {
            const s = sec(bar);
            const ch = BO_CH[BO_CYCLE[bar % 4]];
            const root = hz(ch.root);
            const fillBar = bar === 11 || bar === 19 || bar === 31;

            R.pad(at(bar), ch.pad.map(hz), R.BAR, 1);

            // Bass.
            if (s === "intro") {
                T.bassLine(bar, root, SIXTEENTHS.map(([i, , v]) => [i, 0, v * (0.6 + bar * 0.1)]), 0.15 + bar * 0.25);
            } else if (s === "break") {
                T.bassLine(bar, root, [[0, 0, 0.8], [8, 0, 0.7]], 0.4);
            } else {
                T.bassLine(bar, root, DRIVE16, s === "A" ? 1 : s === "B" ? 1.1 : 1.25);
            }

            // Drums.
            if (s === "intro") {
                T.hats(bar, "x.o.x.o.x.o.x.o.", 0.8);
                if (bar >= 2) T.kicks(bar, "x...x...x...x...");
            } else if (s === "break") {
                T.kicks(bar, "x.........x.....");
                if (bar < 23) T.snares(bar, "........x.......");
                T.hats(bar, "x.o.x.o.x.o.x.o.", 0.8);
            } else {
                T.kicks(bar, "x...x...x...x...");
                T.snares(bar, fillBar ? "....x.......xoxx" : "....x.......x...");
                T.claps(bar, "....x.......x...", 0.6);
                T.hats(bar, "x-o-x-o-x-o-x-o-");
                if (s !== "A") T.hats(bar, "..O...O...O...O.");
            }

            // Arp.
            if (s !== "break") T.arp(bar, ch.arp, s === "intro" ? 0.7 : s === "B" ? 0.6 : 0.75, 1, s === "D");

            // Lead riff.
            if (s === "B") T.lead(bar, BO_RIFF[bar - 12], 1);
            else if (s === "D") T.lead(bar, BO_RIFF[bar - 24], 1.08);
            else if (s === "break") T.lead(bar, BO_BREAK[bar - 20], 0.9);

            // Stabs.
            if (s === "break") {
                R.stab(at(bar, 0), ch.pad.map(hz), R.S16 * 7, 1.2, 0.7);
            } else if (s === "D") {
                for (const i of [0, 6, 11]) R.stab(at(bar, i), ch.pad.map((n) => hz(n) * 2), R.S16 * 2.8, 0.9, 1);
            }
        }

        T.roll(3, 0, 0.2, 1);
        R.riser(at(2), R.BAR * 2);
        R.impact(at(4));
        R.impact(at(12));
        R.impact(at(20));
        T.roll(23, 0, 0.2, 1);
        R.riser(at(22), R.BAR * 2);
        R.impact(at(24));
    }

    // ─────────────────────────────────────────────
    // Track 5: "Standby" (menu), A minor, 90 BPM, 24 bars
    // Calm, and it quotes the melody of "Neon District".
    // ─────────────────────────────────────────────
    const MENU = { name: "menu", bpm: 90, bars: 24, level: 0.6 };

    function composeMenu(R) {
        const T = tools(R), at = T.at;
        const cycle = ["Am", "F", "C", "G"];
        R.tune.kickStart = 120; R.tune.kickEnd = 45; R.tune.kickLen = 0.3;
        R.tune.leadBright = 2600;
        R.n.reverbOut.gain.value = 0.85;
        R.n.B.lead.in.gain.value = 1.0;
        R.n.B.pad.in.gain.value = 1.0;

        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(950, 0);
        af.exponentialRampToValueAtTime(2000, at(8));
        af.exponentialRampToValueAtTime(3200, at(20));
        af.exponentialRampToValueAtTime(950, at(24));
        pf.setValueAtTime(900, 0);
        pf.exponentialRampToValueAtTime(1500, at(16));
        pf.exponentialRampToValueAtTime(900, at(24));

        for (let bar = 0; bar < MENU.bars; bar++) {
            const ch = M.CH[cycle[bar % 4]];
            const root = hz(ch.root);
            R.pad(at(bar), ch.pad.map(hz), R.BAR, 1.2);
            T.arp(bar, ch.arp, bar < 16 ? 0.7 : 0.6, bar < 16 ? 2 : 1);
            if (bar >= 8) T.bassLine(bar, root, [[0, 0, 0.5]], 0.25);
            if (bar >= 8 && bar < 22) {
                T.kicks(bar, "x.........x.....", 0.55);
                T.hats(bar, "..o...-...o...-.", 1);
            }
            if (bar >= 8 && bar < 16) T.lead(bar, M.NEON.leadA[bar - 8], 0.75);
            else if (bar >= 20) T.lead(bar, M.NEON.leadA[bar - 16], 0.7);
        }
    }

    M.tracks.acid = { def: ACID, compose: composeAcid };
    M.tracks.crimson = { def: CRIMSON, compose: composeCrimson };
    M.tracks.boss = { def: BOSS, compose: composeBoss };
    M.tracks.menu = { def: MENU, compose: composeMenu };
})();
