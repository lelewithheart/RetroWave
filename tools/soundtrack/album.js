// Album versions of the loop tracks: the loop played twice with a real ending,
// and a two-bar lead-in for the tracks that start at full power.
// Driven from the console: RWAlbum.runAll(["neon", "signal", ...])
(() => {
    "use strict";

    const { rig, wav, SR, tracks, tools } = window.RWMusic;
    const VOICES = ["kick", "snare", "hat", "clap", "impact", "riser", "bass", "arp", "pad", "lead", "acid", "stab"];
    // Tracks without an intro or outro of their own.
    const HARD = { boss: { intro: false }, redline: { intro: true }, flatline: { intro: true } };
    const PASSES = 2;
    const TAIL = 6;      // seconds of reverb and delay after the last note
    const status = { phase: "idle", error: null, all: [] };

    /** An AudioParam stand-in that shifts every automation call by `offset` seconds. */
    function shifted(param, offset) {
        return {
            get value() { return param.value; },
            set value(v) { param.value = v; },
            setValueAtTime: (v, t) => param.setValueAtTime(v, t + offset),
            linearRampToValueAtTime: (v, t) => param.linearRampToValueAtTime(v, t + offset),
            exponentialRampToValueAtTime: (v, t) => param.exponentialRampToValueAtTime(v, t + offset),
            setTargetAtTime: (v, t, tc) => param.setTargetAtTime(v, t + offset, tc),
            cancelScheduledValues: (t) => param.cancelScheduledValues(t + offset),
        };
    }

    /** The rig as the track sees it, but everything it schedules lands `offset` seconds later. */
    function later(R, offset) {
        const R2 = Object.create(R);
        for (const v of VOICES) R2[v] = (t, ...args) => R[v](t + offset, ...args);
        R2.arpFilter = { frequency: shifted(R.arpFilter.frequency, offset) };
        R2.padFilter = { frequency: shifted(R.padFilter.frequency, offset) };
        return R2;
    }

    async function run(name) {
        status.phase = "rendering " + name;
        const tr = tracks[name];
        const bar = 240 / tr.def.bpm;
        const loop = tr.def.bars * bar;
        const hard = HARD[name];
        const lead = hard && hard.intro ? 2 * bar : 0;
        const total = lead + PASSES * loop;
        const ac = new OfflineAudioContext(2, Math.round((total + TAIL) * SR), SR);
        const R = rig(ac, tr.def.bpm);

        if (lead) {
            // Lead-in: a riser, quiet eighth hats and a snare roll into the first beat.
            const T = tools(R);
            R.impact(0);
            R.kick(0);
            R.riser(0, lead);
            T.hats(0, "x.o.x.o.x.o.x.o.", 0.5);
            T.hats(1, "x.o.x.o.x.o.x.o.", 0.7);
            T.roll(1, 0, 0.2, 1);
        }
        for (let pass = 0; pass < PASSES; pass++) tr.compose(later(R, lead + pass * loop));
        if (hard) {
            // These end at full power, so close with one last hit.
            R.impact(total);
            R.kick(total, 1, 0.5);
        }

        const buf = await ac.startRendering();
        const ch = [buf.getChannelData(0), buf.getChannelData(1)];
        const len = buf.length;
        let peak = 0;
        for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(ch[c][i]));
        const gain = (tr.def.level || 0.89) / peak;
        for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) ch[c][i] *= gain;
        status.phase = "saving " + name;
        const r = await fetch(`/__save/album/${name}.wav`, { method: "POST", body: wav(ch, len) });
        if (!r.ok) throw new Error("save failed " + r.status);
        return { name, seconds: +(len / SR).toFixed(1), rawPeak: +peak.toFixed(3) };
    }

    async function runAll(names) {
        status.error = null; status.all = [];
        try {
            for (const name of names) status.all.push(await run(name));
            status.phase = "all-done";
        } catch (e) {
            status.error = String(e && e.message || e);
            status.phase = "failed";
        }
    }

    window.RWAlbum = { run, runAll, status };
})();
