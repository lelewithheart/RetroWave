// Stems and notes of a track, for reworking it in a DAW.
//
// A stem is the track rendered again with only one group of instruments
// audible. Each stem still runs through the master chain on its own, so the
// stems add up to something close to the full mix, not to the identical file.
// Driven from the console: RWExport.runAll(["neon", "acid", "crimson", "boss", "menu"])
(() => {
    "use strict";

    const { rig, wav, SR, tracks } = window.RWMusic;
    const DRUM_VOICES = ["kick", "snare", "hat", "clap", "impact", "riser"];
    const NOTE_VOICES = ["bass", "arp", "pad", "lead", "acid", "stab"];
    // `keep` lists the drum voices a stem contains; all other drum voices are
    // switched off for that render.
    const STEMS = {
        kick:  { buses: ["drums"], keep: ["kick"] },
        snare: { buses: ["drums"], keep: ["snare", "clap"] },
        hats:  { buses: ["drums"], keep: ["hat"] },
        bass:  { buses: ["bass"] },
        pad:   { buses: ["pad"] },
        arp:   { buses: ["arp"] },
        lead:  { buses: ["lead"] },
        acid:  { buses: ["acid"] },
        stab:  { buses: ["stab"] },
        fx:    { buses: ["fx", "drums"], keep: ["impact", "riser"] },
    };
    const status = { phase: "idle", error: null, done: [] };

    /** Render a track as a seamless loop. `before` and `after` wrap the composing. */
    async function render(tr, before, after) {
        const loopLen = Math.round(tr.def.bars * (240 / tr.def.bpm) * SR);
        const tail = Math.round(5 * SR);
        const ac = new OfflineAudioContext(2, loopLen + tail, SR);
        const R = rig(ac, tr.def.bpm);
        if (before) before(R);
        tr.compose(R);
        if (after) after(R);
        const buf = await ac.startRendering();
        const ch = [buf.getChannelData(0), buf.getChannelData(1)];
        for (let c = 0; c < 2; c++) for (let i = 0; i < tail; i++) ch[c][i] += ch[c][loopLen + i];
        let peak = 0;
        for (let c = 0; c < 2; c++) for (let i = 0; i < loopLen; i++) peak = Math.max(peak, Math.abs(ch[c][i]));
        return { ch, loopLen, peak };
    }

    async function save(path, body) {
        const r = await fetch("/__save/" + path, { method: "POST", body });
        if (!r.ok) throw new Error("save failed " + r.status + " " + path);
    }

    async function run(name) {
        const tr = tracks[name];
        const info = { name, stems: {}, silent: [] };

        // Full mix: gives the level every stem is scaled by, and the notes.
        status.phase = name + ": full mix";
        const events = [];
        const full = await render(tr, (R) => {
            for (const v of [...DRUM_VOICES, ...NOTE_VOICES]) {
                const play = R[v];
                R[v] = (...args) => { events.push([v, ...args]); return play(...args); };
            }
        });
        const gain = (tr.def.level || 0.89) / full.peak;
        await save(`export/${name}/notes.json`, JSON.stringify({
            name, bpm: tr.def.bpm, bars: tr.def.bars, events,
        }));

        for (const [id, def] of Object.entries(STEMS)) {
            status.phase = name + ": " + id;
            const stem = await render(tr, (R) => {
                // Snare and clap feed the reverb directly, past their bus, so drum
                // voices are switched off, not just disconnected. The one exception:
                // outside the drum stems the kick stays, inaudible, to duck the others.
                const keep = def.keep || [];
                for (const v of DRUM_VOICES) {
                    if (keep.includes(v)) continue;
                    if (v === "kick" && !def.buses.includes("drums")) continue;
                    R[v] = () => {};
                }
            }, (R) => {
                for (const [busId, bus] of Object.entries(R.n.B)) {
                    if (!def.buses.includes(busId)) bus.in.disconnect();
                }
            });
            const peak = stem.peak * gain;
            if (peak < 0.002) { info.silent.push(id); continue; }
            for (let c = 0; c < 2; c++) for (let i = 0; i < stem.loopLen; i++) stem.ch[c][i] *= gain;
            await save(`export/${name}/${id}.wav`, wav(stem.ch, stem.loopLen));
            info.stems[id] = +peak.toFixed(3);
        }
        return info;
    }

    async function runAll(names) {
        status.error = null; status.done = [];
        try {
            for (const name of names) status.done.push(await run(name));
            status.phase = "all-done";
        } catch (e) {
            status.error = String(e && e.message || e);
            status.phase = "failed";
        }
    }

    window.RWExport = { run, runAll, status, STEMS };
})();
