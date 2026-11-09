// RogueWave soundtrack, rendered offline with the Web Audio API.
// Each track is a function that schedules notes on a shared set of synth
// voices. The result is a seamless loop: the reverb and delay tail of the last
// bar is folded back onto the first bar.
(() => {
    "use strict";
    const SR = 44100;
    const status = { phase: "idle", error: null, stats: null };

    const SEMI = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
    /** "A4" -> 440 */
    function hz(name) {
        const m = /^([A-G]#?)(-?\d)$/.exec(name);
        if (!m) throw new Error("bad note " + name);
        const midi = SEMI[m[1]] + (Number(m[2]) + 1) * 12;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // ─────────────────────────────────────────────
    // Synth rig
    // ─────────────────────────────────────────────
    function rig(ac, bpm) {
        const S16 = 60 / bpm / 4;

        // Master: rumble filter -> soft clip -> glue compressor.
        const master = ac.createGain();
        master.gain.value = 0.55;
        const rumble = ac.createBiquadFilter();
        rumble.type = "highpass"; rumble.frequency.value = 28;
        const clip = ac.createWaveShaper();
        const curve = new Float32Array(2049);
        for (let i = 0; i < curve.length; i++) {
            const x = (i / (curve.length - 1)) * 2 - 1;
            curve[i] = Math.tanh(1.2 * x) / Math.tanh(1.2);
        }
        clip.curve = curve; clip.oversample = "4x";
        const glue = ac.createDynamicsCompressor();
        glue.threshold.value = -9; glue.knee.value = 8; glue.ratio.value = 2.5;
        glue.attack.value = 0.01; glue.release.value = 0.2;
        const air = ac.createBiquadFilter();
        air.type = "highshelf"; air.frequency.value = 5500; air.gain.value = 3.5;
        master.connect(rumble).connect(air).connect(clip).connect(glue).connect(ac.destination);

        // Reverb: generated impulse response, darker towards the end.
        const irLen = Math.floor(SR * 2.8);
        const ir = ac.createBuffer(2, irLen, SR);
        for (let c = 0; c < 2; c++) {
            const d = ir.getChannelData(c);
            let lp = 0;
            for (let i = 0; i < irLen; i++) {
                const t = i / irLen;
                const white = Math.random() * 2 - 1;
                const k = 0.55 - 0.45 * t;                 // one-pole lowpass closes over time
                lp += k * (white - lp);
                d[i] = lp * Math.pow(1 - t, 2.4) * (i < 400 ? i / 400 : 1);
            }
        }
        const reverb = ac.createConvolver(); reverb.buffer = ir;
        const reverbIn = ac.createGain();
        const reverbHp = ac.createBiquadFilter(); reverbHp.type = "highpass"; reverbHp.frequency.value = 260;
        const reverbOut = ac.createGain(); reverbOut.gain.value = 0.55;
        reverbIn.connect(reverbHp).connect(reverb).connect(reverbOut).connect(master);

        // Ping-pong delay, dotted eighth.
        const delayIn = ac.createGain();
        const dL = ac.createDelay(2), dR = ac.createDelay(2);
        dL.delayTime.value = S16 * 3; dR.delayTime.value = S16 * 3;
        const fb1 = ac.createGain(), fb2 = ac.createGain();
        fb1.gain.value = 0.42; fb2.gain.value = 0.42;
        const dLp = ac.createBiquadFilter(); dLp.type = "lowpass"; dLp.frequency.value = 3200;
        const panL = ac.createStereoPanner(), panR = ac.createStereoPanner();
        panL.pan.value = -0.7; panR.pan.value = 0.7;
        const delayOut = ac.createGain(); delayOut.gain.value = 0.5;
        delayIn.connect(dL);
        dL.connect(panL).connect(delayOut);
        dL.connect(dLp).connect(fb1).connect(dR);
        dR.connect(panR).connect(delayOut);
        dR.connect(fb2).connect(dL);
        delayOut.connect(master);

        // Buses. Everything except the drums ducks under the kick.
        function bus(level, pan = 0) {
            const g = ac.createGain(); g.gain.value = level;
            const duck = ac.createGain(); duck.gain.setValueAtTime(1, 0);
            const p = ac.createStereoPanner(); p.pan.value = pan;
            g.connect(duck).connect(p).connect(master);
            return { in: g, duck, pan: p };
        }
        const B = {
            drums: bus(1.0), bass: bus(0.6), pad: bus(0.8), arp: bus(1.25), lead: bus(1.3), fx: bus(0.9),
            acid: bus(0.3), stab: bus(0.8),
        };
        const arpFilter = ac.createBiquadFilter();
        arpFilter.type = "lowpass"; arpFilter.Q.value = 5; arpFilter.frequency.setValueAtTime(900, 0);
        arpFilter.connect(B.arp.in);
        const padFilter = ac.createBiquadFilter();
        padFilter.type = "lowpass"; padFilter.Q.value = 0.8; padFilter.frequency.setValueAtTime(1200, 0);
        padFilter.connect(B.pad.in);

        function send(node, rev, del) {
            if (rev > 0) { const g = ac.createGain(); g.gain.value = rev; node.connect(g).connect(reverbIn); }
            if (del > 0) { const g = ac.createGain(); g.gain.value = del; node.connect(g).connect(delayIn); }
        }
        send(B.arp.pan, 0.22, 0.38);
        send(B.pad.pan, 0.45, 0);
        send(B.lead.pan, 0.3, 0.34);
        send(B.fx.pan, 0.5, 0.2);
        send(B.acid.pan, 0.1, 0.2);
        send(B.stab.pan, 0.4, 0.3);

        // Per-track tunables. The defaults are the "Neon District" sound.
        const tune = { kickStart: 170, kickEnd: 46, kickLen: 0.34, leadBright: 3400, leadVib: 0.007 };

        // Every instrument is one continuous voice that is retuned and re-triggered
        // through parameter automation, like a tracker channel. A node per note
        // would mean thousands of nodes and minutes of render time.
        const noise = ac.createBuffer(1, SR * 2, SR);
        { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
        function noiseLoop() {
            const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
            s.start(0, Math.random() * 1.5);
            return s;
        }
        function noiseSrc(t, dur) {
            const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
            s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
            return s;
        }
        function voiceOsc(type, detune = 0) {
            const o = ac.createOscillator(); o.type = type; o.detune.value = detune;
            o.frequency.setValueAtTime(110, 0); o.start(0);
            return o;
        }
        function gate() {
            const g = ac.createGain(); g.gain.setValueAtTime(0, 0);
            return g;
        }
        /** Attack, hold, release on a gain parameter. Ends exactly at t + dur. */
        function shape(param, t, dur, peak, a, r) {
            const rel = Math.min(r, dur * 0.6);
            const att = Math.min(a, dur * 0.3);
            param.setValueAtTime(0, t);
            param.linearRampToValueAtTime(peak, t + att);
            param.setValueAtTime(peak, t + dur - rel);
            param.linearRampToValueAtTime(0, t + dur);
        }
        /** Percussive hit: instant on, exponential decay, silent again at t + dur. */
        function hit(param, t, dur, peak) {
            param.setValueAtTime(peak, t);
            param.exponentialRampToValueAtTime(0.001, t + dur * 0.96);
            param.setValueAtTime(0, t + dur);
        }

        // ── Drums ──
        const kickOsc = voiceOsc("sine");
        const kickGate = gate();
        kickOsc.connect(kickGate).connect(B.drums.in);
        const clickHp = ac.createBiquadFilter(); clickHp.type = "highpass"; clickHp.frequency.value = 2500;
        const clickGate = gate();
        noiseLoop().connect(clickHp).connect(clickGate).connect(B.drums.in);
        function kick(t, vel = 1, len = tune.kickLen) {
            kickOsc.frequency.setValueAtTime(tune.kickStart, t);
            kickOsc.frequency.exponentialRampToValueAtTime(tune.kickEnd, t + Math.min(0.1, len * 0.4));
            kickGate.gain.setValueAtTime(0, t);
            kickGate.gain.linearRampToValueAtTime(0.95 * vel, t + 0.003);
            kickGate.gain.exponentialRampToValueAtTime(0.001, t + len);
            kickGate.gain.setValueAtTime(0, t + len + 0.01);
            hit(clickGate.gain, t, 0.02, 0.22 * vel);
            // Sidechain: the rest of the mix makes room for the kick.
            for (const [b, depth] of [[B.bass, 0.18], [B.pad, 0.4], [B.arp, 0.55], [B.lead, 0.8],
                [B.acid, 0.4], [B.stab, 0.6]]) {
                b.duck.gain.setValueAtTime(depth, t);
                b.duck.gain.linearRampToValueAtTime(1, t + Math.min(0.24, len * 0.7));
            }
        }

        const snBp = ac.createBiquadFilter(); snBp.type = "bandpass"; snBp.frequency.value = 1900; snBp.Q.value = 0.6;
        const snHp = ac.createBiquadFilter(); snHp.type = "highpass"; snHp.frequency.value = 350;
        const snGate = gate();
        noiseLoop().connect(snBp).connect(snHp).connect(snGate);
        snGate.connect(B.drums.in);
        const snareVerb = ac.createGain(); snareVerb.gain.value = 0.5;
        snGate.connect(snareVerb).connect(reverbIn);
        const snTone = voiceOsc("triangle");
        const snToneGate = gate();
        snTone.connect(snToneGate).connect(B.drums.in);
        function snare(t, vel = 1, dur = 0.2) {
            hit(snGate.gain, t, dur, 0.75 * vel);
            snTone.frequency.setValueAtTime(215, t);
            snTone.frequency.exponentialRampToValueAtTime(150, t + 0.09);
            hit(snToneGate.gain, t, Math.min(dur, 0.12), 0.4 * vel);
        }

        const hatPan = ac.createStereoPanner(); hatPan.pan.value = 0.25; hatPan.connect(B.drums.in);
        const hatHp = ac.createBiquadFilter(); hatHp.type = "highpass"; hatHp.frequency.value = 7800;
        const hatGate = gate(), openGate = gate();
        noiseLoop().connect(hatHp);
        hatHp.connect(hatGate).connect(hatPan);
        hatHp.connect(openGate).connect(hatPan);
        function hat(t, vel = 1, open = false) {
            if (open) hit(openGate.gain, t, 0.22, 0.3 * vel);
            else hit(hatGate.gain, t, 0.045, 0.34 * vel);
        }

        // One-off effects are rare enough to get their own nodes.
        function impact(t) {
            const n = noiseSrc(t, 2.0);
            const hpf = ac.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = 3200;
            const g = ac.createGain();
            g.gain.setValueAtTime(0.26, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
            n.connect(hpf).connect(g).connect(B.fx.in);
            const o = ac.createOscillator(); o.type = "sine";
            o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.7);
            const og = ac.createGain();
            og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
            o.connect(og).connect(B.drums.in); o.start(t); o.stop(t + 1);
        }
        function riser(t, dur) {
            const n = noiseSrc(t, dur);
            const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.6;
            bp.frequency.setValueAtTime(350, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
            const g = ac.createGain();
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + dur);
            g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
            n.connect(bp).connect(g).connect(B.fx.in);
        }

        // ── Bass: saw + square an octave up through a plucked filter, plus a sine sub ──
        const bSaw = voiceOsc("sawtooth"), bSq = voiceOsc("square", 6), bSub = voiceOsc("sine");
        const bSqLevel = ac.createGain(); bSqLevel.gain.value = 0.3;
        const bFilter = ac.createBiquadFilter(); bFilter.type = "lowpass"; bFilter.Q.value = 5;
        bFilter.frequency.setValueAtTime(300, 0);
        const bSynthLevel = ac.createGain(); bSynthLevel.gain.value = 0.34;
        const bSubLevel = ac.createGain(); bSubLevel.gain.value = 0.22;
        const bGate = gate();
        bSaw.connect(bFilter); bSq.connect(bSqLevel).connect(bFilter);
        const bDrive = ac.createWaveShaper();
        bFilter.connect(bDrive).connect(bSynthLevel).connect(bGate);
        bSub.connect(bSubLevel).connect(bGate);
        bGate.connect(B.bass.in);
        function bass(t, freq, dur, vel = 1, bright = 1) {
            bSaw.frequency.setValueAtTime(freq, t);
            bSq.frequency.setValueAtTime(freq * 2, t);
            bSub.frequency.setValueAtTime(freq, t);
            bFilter.frequency.setValueAtTime(260 + 1500 * vel * bright, t);
            bFilter.frequency.exponentialRampToValueAtTime(240, t + Math.min(dur * 0.9, 0.16));
            shape(bGate.gain, t, dur, vel, 0.004, 0.03);
        }

        // ── Arp: bright pluck through the shared, automated filter. Three channels:
        //    left, right and an octave echo. ──
        function arpChannel(pan) {
            const o1 = voiceOsc("sawtooth", -6), o2 = voiceOsc("square", 6);
            const o2g = ac.createGain(); o2g.gain.value = 0.5;
            const g = gate();
            const p = ac.createStereoPanner(); p.pan.value = pan;
            o1.connect(g); o2.connect(o2g).connect(g);
            g.connect(p).connect(arpFilter);
            return { o1, o2, g };
        }
        const arpCh = { l: arpChannel(-0.35), r: arpChannel(0.35), hi: arpChannel(0) };
        function arp(t, freq, dur, vel = 1, channel = "l") {
            const c = arpCh[channel];
            c.o1.frequency.setValueAtTime(freq, t);
            c.o2.frequency.setValueAtTime(freq, t);
            c.g.gain.setValueAtTime(0, t);
            c.g.gain.linearRampToValueAtTime(0.17 * vel, t + 0.003);
            c.g.gain.setValueAtTime(0.17 * vel, t + dur * 0.3);
            c.g.gain.linearRampToValueAtTime(0, t + dur);
        }

        // ── Pad: three detuned saws per note, slow attack. Two alternating groups
        //    so one chord can fade while the next one swells. ──
        const padGroups = [0, 1].map(() => {
            const g = gate();
            const oscs = [];
            for (let n = 0; n < 4; n++) {
                [-9, 0, 9].forEach((det, k) => {
                    const o = voiceOsc("sawtooth", det);
                    const p = ac.createStereoPanner(); p.pan.value = [-0.6, 0, 0.6][k];
                    o.connect(p).connect(g);
                    oscs.push({ o, n });
                });
            }
            g.connect(padFilter);
            return { g, oscs };
        });
        let padTurn = 0;
        function pad(t, freqs, dur, level = 1) {
            const grp = padGroups[padTurn++ % 2];
            for (const { o, n } of grp.oscs) o.frequency.setValueAtTime(freqs[n % freqs.length], t);
            const peak = 0.05 * level;
            grp.g.gain.setValueAtTime(0, t);
            grp.g.gain.linearRampToValueAtTime(peak, t + 0.5);
            grp.g.gain.setValueAtTime(peak, t + dur - 0.1);
            grp.g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
        }

        // ── Lead: saw over a square an octave down, late vibrato ──
        const lSaw = voiceOsc("sawtooth", 5), lSq = voiceOsc("square", -5);
        const lSqLevel = ac.createGain(); lSqLevel.gain.value = 0.45;
        const lFilter = ac.createBiquadFilter(); lFilter.type = "lowpass"; lFilter.Q.value = 2.5;
        lFilter.frequency.setValueAtTime(2000, 0);
        const lGate = gate();
        const lfo = voiceOsc("sine"); lfo.frequency.setValueAtTime(5.6, 0);
        const lfoDepth = gate();
        lfo.connect(lfoDepth); lfoDepth.connect(lSaw.frequency);
        lSaw.connect(lFilter); lSq.connect(lSqLevel).connect(lFilter);
        lFilter.connect(lGate).connect(B.lead.in);
        function lead(t, freq, dur, vel = 1) {
            lSaw.frequency.setValueAtTime(freq, t);
            lSq.frequency.setValueAtTime(freq / 2, t);
            lFilter.frequency.setValueAtTime(900, t);
            lFilter.frequency.exponentialRampToValueAtTime(tune.leadBright, t + 0.03);
            lFilter.frequency.exponentialRampToValueAtTime(tune.leadBright * 0.59, t + Math.max(0.1, dur * 0.6));
            shape(lGate.gain, t, dur, 0.2 * vel, 0.012, 0.1);
            lfoDepth.gain.setValueAtTime(0, t);
            if (dur > 0.45) {
                lfoDepth.gain.setValueAtTime(0, t + 0.18);
                lfoDepth.gain.linearRampToValueAtTime(freq * tune.leadVib, t + 0.4);
                lfoDepth.gain.setValueAtTime(0, t + dur);
            }
        }

        // ── Acid line: resonant saw with accents and slides ──
        const aOsc = voiceOsc("sawtooth");
        const aFilter = ac.createBiquadFilter(); aFilter.type = "lowpass"; aFilter.Q.value = 13;
        aFilter.frequency.setValueAtTime(400, 0);
        const aDrive = ac.createWaveShaper();
        {
            const c = new Float32Array(1025);
            for (let i = 0; i < c.length; i++) c[i] = Math.tanh(2.2 * (i / 512 - 1));
            aDrive.curve = c;
        }
        const aGate = gate();
        aOsc.connect(aFilter).connect(aGate).connect(aDrive).connect(B.acid.in);
        /** `glide` keeps the previous note sounding and bends into this one. */
        function acid(t, freq, dur, cut, accent = false, glide = false) {
            if (glide) aOsc.frequency.setTargetAtTime(freq, t, 0.018);
            else aOsc.frequency.setValueAtTime(freq, t);
            const top = Math.min(9000, cut * (accent ? 5.5 : 3));
            aFilter.frequency.setValueAtTime(top, t);
            aFilter.frequency.exponentialRampToValueAtTime(
                Math.max(120, cut), t + Math.min(dur * 0.9, S16 * 0.92, accent ? 0.2 : 0.11));
            if (!glide) shape(aGate.gain, t, dur, accent ? 0.5 : 0.36, 0.003, 0.02);
        }

        // ── Stab: short filtered chord hit ──
        const stOscs = [];
        const stFilter = ac.createBiquadFilter(); stFilter.type = "lowpass"; stFilter.Q.value = 3;
        stFilter.frequency.setValueAtTime(800, 0);
        const stGate = gate();
        for (let n = 0; n < 4; n++) {
            for (const det of [-11, 11]) {
                const o = voiceOsc("sawtooth", det);
                const p = ac.createStereoPanner(); p.pan.value = det < 0 ? -0.5 : 0.5;
                o.connect(p).connect(stFilter);
                stOscs.push({ o, n });
            }
        }
        stFilter.connect(stGate).connect(B.stab.in);
        function stab(t, freqs, dur, vel = 1, bright = 1) {
            for (const { o, n } of stOscs) o.frequency.setValueAtTime(freqs[n % freqs.length], t);
            stFilter.frequency.setValueAtTime(Math.min(9000, 4200 * bright), t);
            stFilter.frequency.exponentialRampToValueAtTime(500, t + dur * 0.95);
            shape(stGate.gain, t, dur, 0.1 * vel, 0.004, dur * 0.5);
        }

        // ── Clap: three quick noise bursts and a tail ──
        const clBp = ac.createBiquadFilter(); clBp.type = "bandpass"; clBp.frequency.value = 1300; clBp.Q.value = 1.1;
        const clGate = gate();
        noiseLoop().connect(clBp).connect(clGate);
        clGate.connect(B.drums.in);
        const clVerb = ac.createGain(); clVerb.gain.value = 0.45;
        clGate.connect(clVerb).connect(reverbIn);
        function clap(t, vel = 1) {
            const g = clGate.gain, p = 0.55 * vel;
            g.setValueAtTime(p, t); g.exponentialRampToValueAtTime(p * 0.25, t + 0.011);
            g.setValueAtTime(p, t + 0.012); g.exponentialRampToValueAtTime(p * 0.25, t + 0.023);
            g.setValueAtTime(p, t + 0.024); g.exponentialRampToValueAtTime(0.001, t + 0.16);
            g.setValueAtTime(0, t + 0.17);
        }

        // Nodes a track may retune to get its own sound. The defaults are the
        // "Neon District" sound.
        const n = {
            B, master, air, glue, reverbOut, delayOut, dL, dR, fb1, fb2,
            lSaw, lSq, lSqLevel, lFilter, bFilter, bDrive, bSynthLevel, bSubLevel, arpCh, aFilter, aOsc, snBp, hatHp,
        };

        return {
            S16, BAR: S16 * 16, kick, snare, hat, clap, impact, riser, bass, arp, pad, lead, acid, stab,
            arpFilter, padFilter, tune, n,
        };
    }

    // ─────────────────────────────────────────────
    // Track 1: "Neon District", A minor, 110 BPM, 44 bars
    // ─────────────────────────────────────────────
    const CH = {
        Am: { root: "A1", pad: ["A3", "C4", "E4", "G4"], arp: ["A4", "C5", "E5", "A5"] },
        F:  { root: "F1", pad: ["F3", "A3", "C4", "E4"], arp: ["A4", "C5", "F5", "A5"] },
        C:  { root: "C2", pad: ["G3", "C4", "E4", "G4"], arp: ["G4", "C5", "E5", "G5"] },
        G:  { root: "G1", pad: ["G3", "B3", "D4", "G4"], arp: ["G4", "B4", "D5", "G5"] },
        Dm: { root: "D2", pad: ["A3", "C4", "D4", "F4"], arp: ["A4", "D5", "F5", "A5"] },
    };
    const NEON = {
        name: "neon", bpm: 110, bars: 44,
        chords: [
            "Am", "F", "C", "G",                              // 0  intro
            "Am", "F", "C", "G", "Am", "F", "C", "G",         // 4  A1
            "Am", "F", "C", "G", "Am", "F", "C", "G",         // 12 A2 (lead enters)
            "F", "G", "Am", "Am",                             // 20 break
            "Dm", "F", "Am", "G", "Dm", "F", "Am", "G",       // 24 B
            "Am", "F", "C", "G", "Am", "F", "C", "G",         // 32 A3
            "Am", "F", "C", "G",                              // 40 outro
        ],
        // [note, length in sixteenths]; "-" is a rest.
        leadA: [
            [["E5", 6], ["D5", 2], ["C5", 4], ["A4", 4]],
            [["C5", 6], ["D5", 2], ["E5", 8]],
            [["G5", 6], ["E5", 2], ["D5", 4], ["C5", 4]],
            [["D5", 8], ["B4", 4], ["D5", 4]],
            [["E5", 6], ["G5", 2], ["A5", 8]],
            [["A5", 4], ["G5", 4], ["F5", 4], ["E5", 4]],
            [["E5", 6], ["D5", 2], ["C5", 4], ["E5", 4]],
            [["D5", 12], ["-", 4]],
        ],
        leadB: [
            [["F5", 4], ["E5", 2], ["D5", 2], ["A5", 8]],
            [["A5", 6], ["G5", 2], ["F5", 4], ["C5", 4]],
            [["E5", 4], ["A5", 4], ["C6", 6], ["B5", 2]],
            [["B5", 8], ["D5", 4], ["G5", 4]],
            [["D5", 2], ["F5", 2], ["A5", 2], ["D6", 2], ["C6", 8]],
            [["C6", 6], ["A5", 2], ["F5", 8]],
            [["E5", 2], ["A5", 2], ["C6", 2], ["E6", 2], ["D6", 4], ["C6", 4]],
            [["B5", 12], ["-", 4]],
        ],
    };
    const ARP_STEPS = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1];

    function composeNeon(R) {
        const T = NEON;
        const at = (bar, step = 0) => bar * R.BAR + step * R.S16;
        const sec = (bar) => bar < 4 ? "intro" : bar < 12 ? "A1" : bar < 20 ? "A2" : bar < 24 ? "break"
            : bar < 32 ? "B" : bar < 40 ? "A3" : "outro";

        // Filter moves give the track its shape; the outro closes back to the intro value.
        const af = R.arpFilter.frequency, pf = R.padFilter.frequency;
        af.setValueAtTime(650, 0);
        af.exponentialRampToValueAtTime(2000, at(4));
        af.exponentialRampToValueAtTime(3200, at(12));
        af.setValueAtTime(3200, at(20));
        af.exponentialRampToValueAtTime(700, at(22));
        af.exponentialRampToValueAtTime(4200, at(24));
        af.setValueAtTime(4200, at(32));
        af.exponentialRampToValueAtTime(3400, at(40));
        af.exponentialRampToValueAtTime(650, at(44));
        pf.setValueAtTime(900, 0);
        pf.exponentialRampToValueAtTime(1500, at(4));
        pf.setValueAtTime(1500, at(20));
        pf.exponentialRampToValueAtTime(650, at(22));
        pf.exponentialRampToValueAtTime(2200, at(24));
        pf.exponentialRampToValueAtTime(1600, at(32));
        pf.setValueAtTime(1600, at(40));
        pf.exponentialRampToValueAtTime(900, at(44));

        for (let bar = 0; bar < T.bars; bar++) {
            const s = sec(bar);
            const ch = CH[T.chords[bar]];
            const root = hz(ch.root);

            // Pad on every bar.
            R.pad(at(bar), ch.pad.map(hz), R.BAR, s === "intro" || s === "break" ? 0.8 : 1);

            // Arp: sixteenths, an octave up as an echo voice in B and A3.
            if (!(s === "break" && bar >= 22)) {
                for (let i = 0; i < 16; i++) {
                    const n = hz(ch.arp[ARP_STEPS[i]]);
                    const vel = (i % 4 === 0 ? 1 : 0.72) * (s === "intro" || s === "outro" ? 0.85 : 1);
                    R.arp(at(bar, i), n, R.S16 * 1.9, vel, i % 2 ? "r" : "l");
                    if ((s === "B" || s === "A3") && i % 2 === 0) R.arp(at(bar, i), n * 2, R.S16 * 1.8, 0.4, "hi");
                }
            }

            // Bass.
            if (s === "intro") {
                if (bar >= 2) for (let i = 0; i < 16; i += 2) R.bass(at(bar, i), root, R.S16 * 1.9, 0.45, 0.25 + (bar - 2) * 0.2);
            } else if (s === "break") {
                R.bass(at(bar), root, R.BAR * 0.96, 0.4, 0.2);
            } else if (s === "outro" && bar >= 42) {
                for (let i = 0; i < 16; i += 4) R.bass(at(bar, i), root, R.S16 * 3.8, 0.7, 0.3);
            } else {
                for (let i = 0; i < 16; i++) {
                    const up = i % 4 === 2;
                    R.bass(at(bar, i), up ? root * 2 : root, R.S16 * 0.92, [1, 0.72, 0.9, 0.72][i % 4], s === "B" ? 1.15 : 1);
                }
            }

            // Drums.
            const fullKit = s === "A1" || s === "A2" || s === "B" || s === "A3";
            if (fullKit || (s === "outro" && bar < 42)) {
                for (let beat = 0; beat < 4; beat++) R.kick(at(bar, beat * 4));
            }
            if ((s === "A1" && bar >= 8) || s === "A2" || s === "B" || s === "A3") {
                // In fill bars the last backbeat is cut short so the fill hits fit behind it.
                const fillBar = bar === 11 || bar === 19 || bar === 31 || bar === 39;
                R.snare(at(bar, 4)); R.snare(at(bar, 12), 1, fillBar ? R.S16 * 0.95 : 0.2);
            }
            if (fullKit || s === "outro" || (s === "intro" && bar >= 2)) {
                const sixteenths = !(s === "intro" || (s === "A1" && bar < 8) || (s === "outro" && bar >= 42));
                for (let i = 0; i < 16; i += sixteenths ? 1 : 2) {
                    R.hat(at(bar, i), [1, 0.35, 0.62, 0.35][i % 4]);
                }
                if (s === "B" || s === "A3") for (let i = 2; i < 16; i += 4) R.hat(at(bar, i), 0.7, true);
            }
            // Fills at the end of each eight-bar phrase.
            if (bar === 11 || bar === 19 || bar === 31 || bar === 39) {
                for (const [i, v] of [[13, 0.55], [14, 0.7], [15, 0.85]]) R.snare(at(bar, i), v, R.S16 * 0.95);
            }

            // Lead.
            const phrase = s === "A2" ? T.leadA[bar - 12] : s === "B" ? T.leadB[bar - 24]
                : s === "A3" ? T.leadA[bar - 32] : null;
            if (phrase) {
                let step = 0;
                for (const [note, len] of phrase) {
                    if (note !== "-") R.lead(at(bar, step), hz(note), len * R.S16 * 0.94, s === "B" ? 1.05 : 1);
                    step += len;
                }
            }
        }

        // Section markers.
        R.riser(at(3), R.BAR);
        R.impact(at(4));
        R.impact(at(12));
        for (let i = 0; i < 16; i++) R.snare(at(23, i), 0.25 + 0.05 * i, R.S16 * 0.95);   // roll into B
        R.riser(at(22), R.BAR * 2);
        R.impact(at(24));
        R.impact(at(32));
        // The last lead note rings into the outro.
        R.lead(at(40), hz("A4"), R.BAR * 1.9, 0.8);
    }

    const TRACKS = { neon: { def: NEON, compose: composeNeon } };

    // ─────────────────────────────────────────────
    // Render, loop, normalise, save
    // ─────────────────────────────────────────────
    function wav(channels, length) {
        const bytes = new ArrayBuffer(44 + length * 4);
        const v = new DataView(bytes);
        const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        str(0, "RIFF"); v.setUint32(4, 36 + length * 4, true); str(8, "WAVE"); str(12, "fmt ");
        v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
        v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
        str(36, "data"); v.setUint32(40, length * 4, true);
        let o = 44;
        for (let i = 0; i < length; i++) {
            for (let c = 0; c < 2; c++) {
                const x = Math.max(-1, Math.min(1, channels[c][i]));
                v.setInt16(o, Math.round(x * 32767), true); o += 2;
            }
        }
        return bytes;
    }

    async function run(name) {
        status.phase = "rendering " + name; status.error = null; status.stats = null;
        try {
            const tr = TRACKS[name];
            const bar = (60 / tr.def.bpm) * 4;
            const loopLen = Math.round(tr.def.bars * bar * SR);
            const tail = Math.round(5 * SR);
            const ac = new OfflineAudioContext(2, loopLen + tail, SR);
            tr.compose(rig(ac, tr.def.bpm));
            const buf = await ac.startRendering();
            const ch = [buf.getChannelData(0), buf.getChannelData(1)];
            // Fold the tail onto the start so the file loops without a seam.
            for (let c = 0; c < 2; c++) for (let i = 0; i < tail; i++) ch[c][i] += ch[c][loopLen + i];
            let peak = 0, sum = 0;
            for (let c = 0; c < 2; c++) for (let i = 0; i < loopLen; i++) {
                const a = Math.abs(ch[c][i]); if (a > peak) peak = a; sum += a * a;
            }
            const gain = (tr.def.level || 0.89) / peak;
            for (let c = 0; c < 2; c++) for (let i = 0; i < loopLen; i++) ch[c][i] *= gain;
            status.stats = {
                seconds: +(loopLen / SR).toFixed(2), rawPeak: +peak.toFixed(3),
                rmsDb: +(20 * Math.log10(Math.sqrt(sum / (2 * loopLen)) * gain)).toFixed(1),
            };
            status.phase = "saving " + name;
            const r = await fetch(`/__save/music/${name}.wav`, { method: "POST", body: wav(ch, loopLen) });
            if (!r.ok) throw new Error("save failed " + r.status);
            status.phase = "done " + name;
        } catch (e) {
            status.error = String(e && e.message || e);
            status.phase = "failed";
        }
    }

    async function runAll(names) {
        const done = [];
        for (const name of names) {
            await run(name);
            done.push({ name, phase: status.phase, error: status.error, stats: status.stats });
            if (status.error) break;
        }
        status.all = done;
        status.phase = status.error ? "failed" : "all-done";
    }

    window.RWMusic = { run, runAll, status, tracks: TRACKS, hz, CH, NEON, ARP_STEPS };
})();
