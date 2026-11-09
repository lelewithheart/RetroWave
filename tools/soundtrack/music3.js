// RogueWave soundtrack, tracks 6 to 10: a second track for each area and two
// short "danger" loops for low health. Uses the synth rig from music.js and the
// sequencing helpers from music2.js.
(() => {
    "use strict";
    const M = window.RWMusic;
    const { hz, tools, semis, tanhCurve } = M;
    const octaveUp = (notes) => notes.map((n) => n.replace(/\d/, (d) => Number(d) + 1));

    // ─────────────────────────────────────────────
    // Track 6: "Signal Rain" (area 1), A minor, 114 BPM, 40 bars
    // Sibling of "Neon District": same key, a broken beat and a syncopated bass.
    // ─────────────────────────────────────────────
    const SIGNAL = { name: "signal", bpm: 114, bars: 40 };
    const SG_CH = {
        Am: M.CH.Am, F: M.CH.F, C: M.CH.C, G: M.CH.G,
        Em: { root: "E2", pad: ["G3", "B3", "E4", "G4"], arp: ["G4", "B4", "E5", "G5"] },
    };
    const SG_CHORDS = [
        "Am", "Em", "F", "G",                             // 0  intro
        "Am", "Em", "F", "G", "Am", "Em", "F", "G",       // 4  A1
        "Am", "Em", "F", "G", "Am", "Em", "F", "G",       // 12 A2 (lead)
        "F", "F", "G", "G",                               // 20 break
        "F", "G", "Am", "C", "F", "G", "Am", "Am",        // 24 B
        "Am", "Em", "F", "G",                             // 32 A3
        "Am", "Em", "F", "G",                             // 36 outro
    ];
    const SG_LEAD_A = [
        [["A4", 4], ["C5", 2], ["E5", 6], ["D5", 4]],
        [["B4", 6], ["G4", 2], ["E5", 8]],
        [["A4", 4], ["C5", 2], ["F5", 6], ["E5", 4]],
        [["D5", 6], ["B4", 2], ["G4", 4], ["B4", 4]],
        [["A4", 4], ["C5", 2], ["E5", 6], ["G5", 4]],
        [["G5", 6], ["E5", 2], ["B4", 8]],
        [["C5", 2], ["F5", 2], ["A5", 4], ["G5", 4], ["F5", 4]],
        [["D5", 12], ["-", 4]],
    ];
    const SG_LEAD_B = [
        [["F5", 3], ["A5", 3], ["C6", 2], ["A5", 8]],
        [["G5", 3], ["B5", 3], ["D6", 2], ["B5", 8]],
        [["A5", 4], ["E5", 4], ["A5", 2], ["C6", 2], ["E6", 4]],
        [["E6", 6], ["D6", 2], ["C6", 4], ["G5", 4]],
        [["F5", 3], ["A5", 3], ["C6", 2], ["F6", 8]],
        [["G6", 4], ["D6", 4], ["B5", 4], ["G5", 4]],
        [["A5", 2], ["C6", 2], ["E6", 2], ["A6", 2], ["G6", 4], ["E6", 4]],
        [["A5", 12], ["-", 4]],
    ];
    const TRESILLO = [[0, 0, 1], [3, 0, 0.75], [6, 1, 0.85], [8, 0, 1], [11, 0, 0.75], [14, 1, 0.85]];
    const PUMP16 = Array.from({ length: 16 }, (_, i) => [i, i % 4 === 2 ? 1 : 0, [1, 0.72, 0.9, 0.72][i % 4]]);

    function composeSignal(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 150; R.tune.kickEnd = 44; R.tune.kickLen = 0.36;
        R.tune.leadBright = 3000; R.tune.leadVib = 0.006;
        R.n.dR.delayTime.value = R.S16 * 6;
        R.n.reverbOut.gain.value = 0.7;

        const sec = (b) => b < 4 ? "intro" : b < 12 ? "A1" : b < 20 ? "A2" : b < 24 ? "break"
            : b < 32 ? "B" : b < 36 ? "A3" : "outro";

        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(700, 0);
        af.exponentialRampToValueAtTime(1800, at(4));
        af.exponentialRampToValueAtTime(2600, at(12));
        af.setValueAtTime(2600, at(20));
        af.exponentialRampToValueAtTime(900, at(22));
        af.exponentialRampToValueAtTime(3600, at(24));
        af.setValueAtTime(3600, at(32));
        af.exponentialRampToValueAtTime(2400, at(36));
        af.exponentialRampToValueAtTime(700, at(40));
        pf.setValueAtTime(800, 0);
        pf.exponentialRampToValueAtTime(1300, at(4));
        pf.setValueAtTime(1300, at(20));
        pf.exponentialRampToValueAtTime(700, at(22));
        pf.exponentialRampToValueAtTime(2000, at(24));
        pf.exponentialRampToValueAtTime(1400, at(32));
        pf.exponentialRampToValueAtTime(800, at(40));

        for (let bar = 0; bar < SIGNAL.bars; bar++) {
            const s = sec(bar);
            const ch = SG_CH[SG_CHORDS[bar]];
            const root = hz(ch.root);
            const fillBar = bar === 11 || bar === 19 || bar === 31 || bar === 35;
            const groove = s === "A1" || s === "A2" || s === "A3";

            R.pad(at(bar), ch.pad.map(hz), R.BAR, s === "intro" || s === "break" ? 0.85 : 1);

            // Arp: eighths in the quiet parts, sixteenths once the lead is in.
            if (s === "intro" || s === "A1" || s === "outro") T.arp(bar, ch.arp, 0.85, 2);
            else if (s === "break") { if (bar < 22) T.arp(bar, ch.arp, 0.8, 2); }
            else T.arp(bar, ch.arp, 0.8, 1, s === "B");

            // Bass.
            if (s === "intro") {
                if (bar >= 2) T.bassLine(bar, root, [[0, 0, 0.5], [8, 0, 0.45]], 0.3);
            } else if (s === "break") {
                T.bassLine(bar, root, [[0, 0, 0.45]], 0.2);
            } else if (s === "B") {
                T.bassLine(bar, root, PUMP16, 1.1);
            } else if (s === "outro") {
                if (bar < 38) T.bassLine(bar, root, TRESILLO, 0.7);
                else T.bassLine(bar, root, [[0, 0, 0.6], [8, 0, 0.5]], 0.3);
            } else {
                T.bassLine(bar, root, TRESILLO, 0.95);
            }

            // Drums: a broken beat in the A parts, straight in B.
            if (groove) {
                T.kicks(bar, "x.....x...x.....");
                if (bar >= 8) T.snares(bar, fillBar ? "....x.......o.xx" : "....x.......x...");
                T.hats(bar, "x.o.x.o.x.o.x.o.", 0.85);
                if (s !== "A1") T.hats(bar, "..............O.");
            } else if (s === "B") {
                T.kicks(bar, "x...x...x...x...");
                T.snares(bar, fillBar ? "....x.......o.xx" : "....x.......x...");
                T.hats(bar, "x-o-x-o-x-o-x-o-");
                T.hats(bar, "..O...O...O...O.");
            } else if (s === "intro" && bar >= 2) {
                T.hats(bar, "..-...-...-...-.", 0.8);
            } else if (s === "outro" && bar < 38) {
                T.kicks(bar, "x.......x.......", 0.85);
                T.hats(bar, "x...o...x...o...", 0.6);
            }

            // Lead.
            if (s === "A2") T.lead(bar, SG_LEAD_A[bar - 12], 1);
            else if (s === "B") T.lead(bar, SG_LEAD_B[bar - 24], 1.05);
            else if (s === "A3") T.lead(bar, SG_LEAD_A[bar - 28], 1);
        }

        R.riser(at(3), R.BAR);
        R.impact(at(4));
        R.impact(at(12));
        T.roll(23, 0, 0.2, 1);
        R.riser(at(22), R.BAR * 2);
        R.impact(at(24));
        R.impact(at(32));
        R.lead(at(36), hz("A4"), R.BAR * 1.9, 0.75);
    }

    // ─────────────────────────────────────────────
    // Track 7: "Voltage" (area 2), E minor, 128 BPM, 48 bars
    // Four on the floor, an off-beat bass and chord stabs; no acid line.
    // ─────────────────────────────────────────────
    const VOLT = { name: "voltage", bpm: 128, bars: 48 };
    const VT_CH = {
        Em: { root: "E2", pad: ["E3", "B3", "E4", "G4"], stab: ["E4", "G4", "B4", "E5"], arp: ["E5", "G5", "B5", "E6"] },
        C:  { root: "C2", pad: ["C3", "G3", "E4", "G4"], stab: ["E4", "G4", "C5", "E5"], arp: ["E5", "G5", "C6", "E6"] },
        G:  { root: "G1", pad: ["D3", "G3", "B3", "G4"], stab: ["D4", "G4", "B4", "D5"], arp: ["D5", "G5", "B5", "D6"] },
        D:  { root: "D2", pad: ["D3", "A3", "D4", "F#4"], stab: ["D4", "F#4", "A4", "D5"], arp: ["D5", "F#5", "A5", "D6"] },
    };
    const VT_CYCLE = ["Em", "C", "G", "D"];
    const VT_RIFF = [
        [["B5", 2], ["E6", 2], ["B5", 2], ["G5", 2], ["B5", 4], ["E5", 4]],
        [["C6", 2], ["E6", 2], ["C6", 2], ["G5", 2], ["E6", 8]],
        [["D6", 2], ["G6", 2], ["D6", 2], ["B5", 2], ["D6", 4], ["G5", 4]],
        [["F#6", 4], ["D6", 4], ["A5", 6], ["-", 2]],
        [["B5", 2], ["E6", 2], ["G6", 2], ["E6", 2], ["B5", 4], ["G5", 4]],
        [["C6", 3], ["E6", 3], ["G6", 2], ["E6", 8]],
        [["B5", 2], ["D6", 2], ["G6", 2], ["B6", 2], ["A6", 4], ["G6", 4]],
        [["F#6", 8], ["A6", 8]],
    ];
    const OFFBEAT = [[2, 0, 1], [6, 0, 0.9], [10, 0, 1], [14, 1, 0.9]];
    const ROLLING = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15].map((i) => [i, 0, i % 4 === 2 ? 1 : 0.75]);

    function composeVoltage(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 165; R.tune.kickEnd = 48; R.tune.kickLen = 0.28;
        R.tune.leadBright = 3800;
        R.n.bDrive.curve = tanhCurve(1.6); R.n.bDrive.oversample = "2x";
        R.n.lSq.type = "sawtooth"; R.n.lSqLevel.gain.value = 0.5;
        R.n.reverbOut.gain.value = 0.5;
        R.n.B.pad.in.gain.value = 0.6;
        R.n.B.stab.in.gain.value = 1.0;

        const sec = (b) => b < 8 ? "intro" : b < 24 ? "A" : b < 28 ? "break" : b < 44 ? "B" : "outro";
        const chordAt = (b) => {
            const s = sec(b);
            if (s === "A") return VT_CYCLE[(b - 8) % 4];
            if (s === "B") return VT_CYCLE[(b - 28) % 4];
            if (s === "break") return b < 26 ? "C" : "D";
            return "Em";
        };

        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(900, 0);
        af.exponentialRampToValueAtTime(2400, at(8));
        af.exponentialRampToValueAtTime(3200, at(24));
        af.exponentialRampToValueAtTime(1000, at(26));
        af.exponentialRampToValueAtTime(4400, at(28));
        af.setValueAtTime(4400, at(44));
        af.exponentialRampToValueAtTime(900, at(48));
        pf.setValueAtTime(700, 0);
        pf.exponentialRampToValueAtTime(1200, at(8));
        pf.setValueAtTime(1200, at(24));
        pf.exponentialRampToValueAtTime(1900, at(27));
        pf.exponentialRampToValueAtTime(1300, at(28));
        pf.setValueAtTime(1300, at(44));
        pf.exponentialRampToValueAtTime(700, at(48));

        for (let bar = 0; bar < VOLT.bars; bar++) {
            const s = sec(bar);
            const ch = VT_CH[chordAt(bar)];
            const root = hz(ch.root);
            const rel = s === "A" ? bar - 8 : s === "B" ? bar - 28 : 0;
            const fillBar = (s === "A" || s === "B") && rel % 8 === 7;

            R.pad(at(bar), ch.pad.map(hz), R.BAR, s === "break" ? 1.3 : 0.9);

            // Bass: off-beat in A, rolling between the kicks in B.
            if (s === "intro") {
                if (bar >= 4) T.bassLine(bar, root, OFFBEAT, 0.3 + (bar - 4) * 0.12);
            } else if (s === "A") {
                T.bassLine(bar, root, OFFBEAT, 1);
            } else if (s === "B") {
                T.bassLine(bar, root, ROLLING, 1.15);
            } else if (s === "break") {
                T.bassLine(bar, root, [[0, 0, 0.5]], 0.25);
            } else if (bar < 46) {
                T.bassLine(bar, root, OFFBEAT, 0.6);
            }

            // Drums.
            const kit = (s === "intro" && bar >= 4) || s === "A" || s === "B" || (s === "outro" && bar < 46);
            if (kit) T.kicks(bar, "x...x...x...x...");
            if (s === "intro") {
                T.hats(bar, bar < 4 ? "..-...-...-...-." : "x.o.x.o.x.o.x.o.", 0.8);
            } else if (s === "A" || s === "B") {
                T.hats(bar, "x-o-x-o-x-o-x-o-", s === "B" ? 1 : 0.85);
                T.hats(bar, "..O...O...O...O.");
                T.claps(bar, "....x.......x...");
                if (s === "B") T.snares(bar, fillBar ? "....o.......o.xx" : "....o.......o...", 0.8);
                else if (fillBar) T.snares(bar, "............o.xx", 0.8);
            } else if (s === "break") {
                T.hats(bar, "..-...-...-...-.", 0.7);
            } else {
                T.hats(bar, bar < 46 ? "x.o.x.o.x.o.x.o." : "..-...-...-...-.", 0.75);
            }

            // Stabs in a 3-3-4-3-3 rhythm from the second half of A.
            if ((s === "A" && rel >= 8) || s === "B") {
                for (const i of [0, 3, 6, 10, 13]) {
                    R.stab(at(bar, i), ch.stab.map(hz), R.S16 * 1.6, (i === 0 ? 1 : 0.8) * (s === "B" ? 1 : 0.85));
                }
            }

            // Arp: quiet eighths in the intro, sparkle in B.
            if (s === "intro" || s === "outro") T.arp(bar, ch.arp, 0.6, 2);
            else if (s === "break") T.arp(bar, ch.arp, 0.7, 2);
            else if (s === "B") T.arp(bar, ch.arp, 0.5, 1, rel >= 8);

            // Riff: an octave down in A, at pitch in B.
            if (s === "A" && rel >= 8) T.lead(bar, VT_RIFF[rel - 8], 0.95, -12);
            else if (s === "B") T.lead(bar, VT_RIFF[rel % 8], rel >= 8 ? 1 : 0.92, rel >= 8 ? 0 : -12);
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
    // Track 8: "Black Ice" (area 3), D phrygian, 104 BPM, 36 bars
    // Cold and sparse: half-time drums with hat rolls, a long sub, a glassy arp.
    // ─────────────────────────────────────────────
    const ICE = { name: "blackice", bpm: 104, bars: 36 };
    const IC_CH = {
        Dm: { root: "D2", pad: ["A3", "D4", "F4", "A4"], arp: ["D4", "F4", "A4", "D5"] },
        Eb: { root: "D#2", pad: ["A#3", "D#4", "G4", "A#4"], arp: ["D#4", "G4", "A#4", "D#5"] },
        Gm: { root: "G1", pad: ["G3", "A#3", "D4", "G4"], arp: ["D4", "G4", "A#4", "D5"] },
        A:  { root: "A1", pad: ["A3", "C#4", "E4", "A4"], arp: ["C#4", "E4", "A4", "C#5"] },
    };
    const IC_CHORDS = [
        "Dm", "Dm", "Dm", "Dm",                              // 0  intro
        "Dm", "Dm", "Eb", "Dm", "Dm", "Dm", "Gm", "A",       // 4  A
        "Dm", "Dm", "Eb", "Dm", "Dm", "Dm", "Gm", "A",       // 12 A2 (lead)
        "Eb", "Eb", "A", "A",                                // 20 break
        "Dm", "Eb", "Gm", "A", "Dm", "Eb", "Gm", "A",        // 24 B
        "Dm", "Dm", "Dm", "Dm",                              // 32 outro
    ];
    const IC_LEAD_A = [
        [["A4", 6], ["D5", 2], ["F5", 8]],
        [["F5", 4], ["D#5", 4], ["D5", 8]],
        [["D#5", 6], ["G5", 2], ["A#5", 8]],
        [["A5", 8], ["F5", 4], ["D5", 4]],
        [["A4", 6], ["D5", 2], ["F5", 4], ["A5", 4]],
        [["A5", 4], ["G5", 4], ["F5", 4], ["D#5", 4]],
        [["D5", 6], ["G5", 2], ["A#5", 8]],
        [["A5", 4], ["C#5", 4], ["E5", 8]],
    ];
    const IC_LEAD_B = [
        [["D6", 3], ["A5", 3], ["F5", 2], ["A5", 8]],
        [["A#5", 3], ["G5", 3], ["D#5", 2], ["G5", 8]],
        [["G5", 2], ["A#5", 2], ["D6", 4], ["G6", 8]],
        [["E6", 4], ["C#6", 4], ["A5", 8]],
        [["D6", 3], ["F6", 3], ["A6", 2], ["F6", 8]],
        [["D#6", 4], ["A#5", 4], ["G5", 4], ["A#5", 4]],
        [["D6", 2], ["G6", 2], ["A#6", 4], ["A6", 4], ["G6", 4]],
        [["A6", 8], ["E6", 8]],
    ];
    const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14].map((i) => [i, i % 8 === 6 ? 1 : 0, i % 4 === 0 ? 1 : 0.8]);

    function composeIce(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 140; R.tune.kickEnd = 38; R.tune.kickLen = 0.45;
        R.tune.leadBright = 2400; R.tune.leadVib = 0.012;
        R.n.bDrive.curve = tanhCurve(2.5); R.n.bDrive.oversample = "2x";
        R.n.B.bass.in.gain.value = 0.55;
        R.n.reverbOut.gain.value = 0.85;
        R.n.dR.delayTime.value = R.S16 * 4;

        const sec = (b) => b < 4 ? "intro" : b < 12 ? "A" : b < 20 ? "A2" : b < 24 ? "break"
            : b < 32 ? "B" : "outro";

        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(1200, 0);
        af.exponentialRampToValueAtTime(2000, at(4));
        af.setValueAtTime(2000, at(20));
        af.exponentialRampToValueAtTime(1000, at(22));
        af.exponentialRampToValueAtTime(3400, at(24));
        af.setValueAtTime(3400, at(32));
        af.exponentialRampToValueAtTime(1200, at(36));
        pf.setValueAtTime(700, 0);
        pf.exponentialRampToValueAtTime(1100, at(4));
        pf.setValueAtTime(1100, at(20));
        pf.exponentialRampToValueAtTime(1700, at(24));
        pf.exponentialRampToValueAtTime(1100, at(32));
        pf.exponentialRampToValueAtTime(700, at(36));

        for (let bar = 0; bar < ICE.bars; bar++) {
            const s = sec(bar);
            const ch = IC_CH[IC_CHORDS[bar]];
            const root = hz(ch.root);
            const fillBar = bar === 11 || bar === 19 || bar === 31;

            R.pad(at(bar), ch.pad.map(hz), R.BAR, s === "break" ? 1.2 : 1);

            // Bass: a long sub with two pushes in A, eighths in B.
            if (s === "intro") {
                if (bar >= 2) T.bassLine(bar, root, [[0, 0, 0.55]], 0.25);
            } else if (s === "break") {
                T.bassLine(bar, root, [[0, 0, 0.5]], 0.2);
            } else if (s === "B") {
                T.bassLine(bar, root, EIGHTHS, 1.1);
            } else if (s === "outro") {
                T.bassLine(bar, root, bar < 34 ? [[0, 0, 0.8], [10, 0, 0.7]] : [[0, 0, 0.55]], 0.4);
            } else {
                T.bassLine(bar, root, [[0, 0, 1], [7, 0, 0.8], [10, 0, 0.9]], 0.6);
            }

            // Drums: half-time with thirty-second hat rolls, double time in B.
            if (s === "A" || s === "A2") {
                T.kicks(bar, "x......x..x.....");
                T.snares(bar, fillBar ? "........x...o.xx" : "........x.......");
                T.claps(bar, "........x.......", 0.7);
                T.hats(bar, "x.x.x.x.x.x.....", 0.8);
                if (bar % 2 === 1 && !fillBar) {
                    for (let k = 0; k < 8; k++) R.hat(at(bar, 12) + k * R.S16 / 2, 0.35 + 0.07 * k);
                } else if (!fillBar) {
                    T.hats(bar, "............x.o.", 0.8);
                }
            } else if (s === "B") {
                T.kicks(bar, "x..x..x...x..x..");
                T.snares(bar, fillBar ? "....x.......x.xx" : "....x.......x...");
                T.hats(bar, "x-o-x-o-x-o-x-o-");
                T.hats(bar, "..O...O...O...O.");
            } else if (s === "intro" && bar >= 2) {
                T.kicks(bar, "x...............", 0.8);
            } else if (s === "outro" && bar < 34) {
                T.kicks(bar, "x.......x.......", 0.85);
                T.hats(bar, "x...o...x...o...", 0.6);
            }

            // Glassy arp, an octave above the chord.
            if (s === "intro" || s === "break" || s === "outro") T.arp(bar, octaveUp(ch.arp), 0.75, 2);
            else if (s === "B") T.arp(bar, octaveUp(ch.arp), 0.55, 1, true);
            else T.arp(bar, octaveUp(ch.arp), 0.55, 2);

            // Lead.
            if (s === "A2") T.lead(bar, IC_LEAD_A[bar - 12], 1);
            else if (s === "B") T.lead(bar, IC_LEAD_B[bar - 24], 1.05);

            if (s === "B") R.stab(at(bar, 0), ch.pad.map(hz), R.S16 * 4, 0.8, 0.7);
        }

        R.riser(at(3), R.BAR);
        R.impact(at(4));
        R.impact(at(12));
        T.roll(23, 0, 0.2, 1);
        R.riser(at(22), R.BAR * 2);
        R.impact(at(24));
        R.lead(at(32), hz("D5"), R.BAR * 1.9, 0.8);
    }

    // ─────────────────────────────────────────────
    // Track 9: "Redline" (danger), E phrygian, 160 BPM, 24 bars
    // Frantic from the first beat: tritone alarm stabs over a sixteenth bass.
    // ─────────────────────────────────────────────
    const REDLINE = { name: "redline", bpm: 160, bars: 24, level: 0.83 };   // dense, so a little lower peak for the same loudness
    // Semitones above the root for each sixteenth; the flat second keeps it uneasy.
    const RL_BASS = [0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 12, 0, 0, 1, 0, 1];
    const RL_ACID = [0, 12, 0, 13, 0, 12, 0, 10, 0, 12, 0, 13, 0, 15, 13, 12];

    function composeRedline(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 190; R.tune.kickEnd = 52; R.tune.kickLen = 0.24;
        R.tune.leadBright = 4500; R.tune.leadVib = 0.02;
        R.n.bDrive.curve = tanhCurve(2.5); R.n.bDrive.oversample = "2x";
        R.n.dL.delayTime.value = R.S16 * 2; R.n.dR.delayTime.value = R.S16 * 2;
        R.n.reverbOut.gain.value = 0.4;
        R.n.B.pad.in.gain.value = 0.6;
        R.n.B.stab.in.gain.value = 1.1;

        const sec = (b) => b < 8 ? "A" : b < 16 ? "B" : "C";
        R.arpFilter.frequency.setValueAtTime(3800, 0);
        R.padFilter.frequency.setValueAtTime(1500, 0);

        const stabE = ["E4", "A#4", "E5"].map(hz), stabF = ["F4", "B4", "F5"].map(hz);
        for (let bar = 0; bar < REDLINE.bars; bar++) {
            const s = sec(bar);
            const lift = bar % 8 === 7;                 // last bar of each phrase sits a semitone up
            const root = semis(hz("E2"), lift ? 1 : 0);
            const fillBar = bar === 7 || bar === 15;

            R.pad(at(bar), (lift ? ["F3", "C4", "F4", "B4"] : ["E3", "B3", "E4", "F4"]).map(hz), R.BAR, 1);

            const bright = s === "A" ? 0.9 : s === "B" ? 1.1 : 1.3;
            for (let i = 0; i < 16; i++) {
                R.bass(at(bar, i), semis(root, RL_BASS[i]), R.S16 * 0.9, i % 4 === 0 ? 1 : 0.76, bright);
            }

            T.kicks(bar, "x...x...x...x...");
            T.hats(bar, "x-o-x-o-x-o-x-o-");
            T.hats(bar, "..O...O...O...O.");
            if (bar !== 23) T.snares(bar, fillBar ? "....x.......xoxx" : "....x.......x...");
            else T.snares(bar, "....x...........");
            if (s !== "A") T.claps(bar, "....x.......x...", 0.6);

            // Alarm: two tritone chords taking turns, twice as often in C.
            if (s === "C") {
                for (const i of [0, 4, 8, 12]) R.stab(at(bar, i), i % 8 === 0 ? stabE : stabF, R.S16 * 2.5, 1, 1);
            } else {
                R.stab(at(bar, 0), stabE, R.S16 * 3, 1, 0.9);
                R.stab(at(bar, 8), stabF, R.S16 * 3, 0.9, 0.9);
            }

            if (s !== "A") {
                const cut = 600 * Math.pow(2400 / 600, (bar - 8) / 16);
                for (let i = 0; i < 16; i++) {
                    R.acid(at(bar, i), semis(root, RL_ACID[i]), R.S16 * 0.9, cut, i % 4 === 0, false);
                }
                // Siren.
                if (bar >= 22) T.lead(bar, [["E6", 4], ["F6", 4], ["G6", 4], ["G#6", 4]], 0.85);
                else T.lead(bar, s === "B" ? [["B5", 8], ["C6", 8]] : [["E6", 8], ["F6", 8]], 0.85);
            }
            if (s === "C") T.arp(bar, ["E5", "G5", "A#5", "E6"], 0.6, 1, true);
        }

        R.impact(at(0));
        R.riser(at(6), R.BAR * 2);
        R.impact(at(8));
        R.riser(at(14), R.BAR * 2);
        R.impact(at(16));
        R.riser(at(22), R.BAR * 2);
        T.roll(23, 8, 0.4, 1);
    }

    // ─────────────────────────────────────────────
    // Track 10: "Flatline" (danger), C phrygian, 140 BPM, 24 bars
    // Tense rather than fast: a heartbeat kick, a ticking hat, and it keeps building.
    // ─────────────────────────────────────────────
    const FLATLINE = { name: "flatline", bpm: 140, bars: 24 };
    const FL_CH = [
        { root: "C2", pad: ["G3", "C4", "D#4", "G4"], arp: ["C5", "D#5", "G5", "C6"] },      // C minor
        { root: "C#2", pad: ["G#3", "C#4", "F4", "G#4"], arp: ["C#5", "F5", "G#5", "C#6"] },  // D flat, the flat second
    ];
    const FL_ACID = [0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 12, 0, 0, 3, 1, 0];

    function composeFlatline(R) {
        const T = tools(R), at = T.at;
        R.tune.kickStart = 110; R.tune.kickEnd = 38; R.tune.kickLen = 0.3;
        R.tune.leadBright = 3200; R.tune.leadVib = 0.01;
        R.n.reverbOut.gain.value = 0.8;
        R.n.B.pad.in.gain.value = 1.0;

        const sec = (b) => b < 8 ? "A" : b < 16 ? "B" : "C";
        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(1600, 0);
        af.setValueAtTime(1600, at(16));
        af.exponentialRampToValueAtTime(4000, at(23));
        af.exponentialRampToValueAtTime(1600, at(24));
        pf.setValueAtTime(900, 0);
        pf.exponentialRampToValueAtTime(2000, at(23));
        pf.exponentialRampToValueAtTime(900, at(24));

        for (let bar = 0; bar < FLATLINE.bars; bar++) {
            const s = sec(bar);
            const ch = FL_CH[Math.floor(bar / 2) % 2];     // two bars each
            const root = hz(ch.root);

            R.pad(at(bar), ch.pad.map(hz), R.BAR, 1.1);
            T.kicks(bar, "x.o.....x.o.....");                // lub-dub, twice a bar
            T.hats(bar, "o-o-o-o-o-o-o-o-", s === "A" ? 0.5 : 0.65);

            if (bar >= 4) {
                const bright = s === "A" ? 0.3 : s === "B" ? 0.6 : 1.0;
                T.bassLine(bar, root, [0, 2, 4, 6, 8, 10, 12, 14].map((i) => [i, 0, i % 4 === 0 ? 0.85 : 0.7]), bright);
            }
            if (s === "B") {
                T.snares(bar, "........x.......");
                T.claps(bar, "........x.......", 0.7);
            } else if (s === "C" && bar !== 23) {
                T.snares(bar, "....x.......x...");
                T.claps(bar, "....x.......x...", 0.6);
                T.hats(bar, "..O...O...O...O.", 0.8);
            }

            if (s !== "A") {
                const call = bar % 4 < 2
                    ? [["G5", 2], ["-", 2], ["G5", 2], ["-", 2], ["G#5", 8]]
                    : [["G#5", 2], ["-", 2], ["G#5", 2], ["-", 2], ["F5", 8]];
                T.lead(bar, call, s === "C" ? 0.95 : 0.85, s === "C" ? 12 : 0);
            }
            if (s === "C") {
                const cut = 300 * Math.pow(2600 / 300, (bar - 16) / 8);
                for (let i = 0; i < 16; i++) {
                    R.acid(at(bar, i), semis(root, FL_ACID[i]), R.S16 * 0.9, cut, i % 4 === 0, false);
                }
                T.arp(bar, ch.arp, 0.6, 2);
            }
        }

        R.impact(at(0));
        R.riser(at(6), R.BAR * 2);
        R.impact(at(8));
        R.riser(at(14), R.BAR * 2);
        R.impact(at(16));
        R.riser(at(22), R.BAR * 2);
        T.roll(23, 0, 0.2, 0.9);
    }

    M.tracks.signal = { def: SIGNAL, compose: composeSignal };
    M.tracks.voltage = { def: VOLT, compose: composeVoltage };
    M.tracks.blackice = { def: ICE, compose: composeIce };
    M.tracks.redline = { def: REDLINE, compose: composeRedline };
    M.tracks.flatline = { def: FLATLINE, compose: composeFlatline };
})();
