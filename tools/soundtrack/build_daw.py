"""Turn the exported stems and notes into LMMS projects and MIDI files.

Input:  out/export/<track>/notes.json and <stem>.wav, written by export.js
Output: <dest>/<slug>/<slug>.mmp   LMMS 1.2 project
        <dest>/<slug>/<slug>.mid   the same notes as a standard MIDI file
        <dest>/<slug>/stems/*.flac the original sound, one file per instrument group

The project references the stems by absolute path, so build straight into the
folder the project will be opened from:

    python build_daw.py "C:/path/to/lmms-projects"

Needs ffmpeg and an LMMS 1.2 installation (the instruments are factory presets).
"""
import copy
import json
import math
import pathlib
import re
import struct
import subprocess
import sys
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).resolve().parent
EXPORT = HERE / "out" / "export"
LMMS_DATA = pathlib.Path("C:/Program Files/LMMS/data")

TRACKS = {  # id: (folder and file name, title)
    "neon": ("neon-district", "Neon District"),
    "acid": ("acid-grid", "Acid Grid"),
    "crimson": ("crimson-core", "Crimson Core"),
    "boss": ("warden", "Warden"),
    "menu": ("standby", "Standby"),
}

STEMS = [  # id, label; the order is the track order in the project
    ("kick", "Kick"), ("snare", "Snare und Clap"), ("hats", "Hi-Hats"), ("bass", "Bass"),
    ("pad", "Akkorde"), ("arp", "Arpeggio"), ("lead", "Melodie"), ("acid", "Acid-Linie"),
    ("stab", "Stabs"), ("fx", "Effekte"),
]

# Parts with notes: id, label, factory preset, GM program (None = drum channel), GM drum note,
# track volume. Pitched presets get base note A4 so every note sounds at its real pitch. The
# volumes were measured in LMMS: with them a part is about as loud as its original stem.
# Clap and hi-hats sit 6 dB lower still, the presets have very sharp peaks that clip.
PARTS = [
    ("kick",     "Kick",        "Kicker/KickPower.xpf",               None, 36, 95),
    ("snare",    "Snare",       "Kicker/SnareLong.xpf",               None, 38, 87),
    ("clap",     "Clap",        "Kicker/Clap.xpf",                    None, 39, 22),
    ("hat",      "Hi-Hat zu",   "Kicker/HihatClosed.xpf",             None, 42, 25),
    ("hat_open", "Hi-Hat offen", "Kicker/HihatOpen.xpf",              None, 46, 31),
    ("bass",     "Bass",        "TripleOscillator/PluckBass.xpf",     38, None, 62),
    ("pad",      "Akkorde",     "TripleOscillator/WarmStack.xpf",     89, None, 19),
    ("arp",      "Arpeggio",    "TripleOscillator/PluckArpeggio.xpf", 81, None, 11),
    ("lead",     "Melodie",     "TripleOscillator/SuperSawLead.xpf",  80, None, 70),
    ("acid",     "Acid-Linie",  "LB302/AcidLead.xpf",                 87, None, 13),
    ("stab",     "Stabs",       "TripleOscillator/Ravemania.xpf",     90, None, 13),
]
OWN_PRESET = ("TripleOscillator/SuperSawLead.xpf", 70)

LMMS_BEAT = 48       # LMMS ticks per quarter note
MIDI_BEAT = 480      # MIDI ticks per quarter note
LMMS_A4 = 57         # LMMS 1.2 key number of A4 (MIDI 69)
PATTERN_BARS = 4     # notes are cut into patterns of this many bars


def midi_pitch(freq):
    return int(round(69 + 12 * math.log2(freq / 440.0)))


def arg(event, index, default):
    """An optional argument of a logged voice call (missing ones arrive as null)."""
    return event[index] if len(event) > index and event[index] is not None else default


def read_notes(track_dir):
    """notes.json -> {part id: [(start beat, length in beats, MIDI pitch, velocity 0..1.5)]}."""
    data = json.loads((track_dir / "notes.json").read_text(encoding="utf-8"))
    beats = lambda seconds: seconds * data["bpm"] / 60.0
    total = data["bars"] * 4
    parts = {p[0]: [] for p in PARTS}
    sixteenth = 0.25
    for ev in data["events"]:
        voice, t = ev[0], ev[1]
        start = beats(t)
        if start < -1e-6 or start >= total - 1e-6:
            continue
        if voice in ("bass", "arp", "lead"):
            parts[voice].append((start, beats(ev[3]), midi_pitch(ev[2]), arg(ev, 4, 1)))
        elif voice in ("pad", "stab"):
            for freq in ev[2]:
                parts[voice].append((start, beats(ev[3]), midi_pitch(freq), arg(ev, 4, 1)))
        elif voice == "acid":
            parts["acid"].append((start, beats(ev[3]), midi_pitch(ev[2]), 1.2 if arg(ev, 5, False) else 0.85))
        elif voice in ("kick", "snare", "clap"):
            parts[voice].append((start, sixteenth, None, arg(ev, 2, 1)))
        elif voice == "hat":
            is_open = bool(arg(ev, 3, False))
            parts["hat_open" if is_open else "hat"].append(
                (start, 2 * sixteenth if is_open else sixteenth, None, arg(ev, 2, 1)))
        # impact and riser are sound effects, they only exist as a stem
    for notes in parts.values():
        notes.sort(key=lambda n: (n[0], n[2] or 0))
    return data, parts


# ── MIDI ─────────────────────────────────────────────────────────────

def varlen(value):
    out = [value & 0x7F]
    value >>= 7
    while value:
        out.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(out))


def midi_track(events):
    """events: [(tick, order, bytes)] -> a complete MTrk chunk."""
    body, last = b"", 0
    for tick, _, payload in sorted(events, key=lambda e: (e[0], e[1])):
        body += varlen(tick - last) + payload
        last = tick
    body += varlen(0) + b"\xff\x2f\x00"
    return b"MTrk" + struct.pack(">I", len(body)) + body


def meta(kind, payload):
    return bytes([0xFF, kind]) + varlen(len(payload)) + payload


def write_midi(path, title, data, parts):
    tempo = int(round(60_000_000 / data["bpm"]))
    chunks = [midi_track([
        (0, 0, meta(0x03, title.encode("ascii", "replace"))),
        (0, 1, meta(0x51, tempo.to_bytes(3, "big"))),
        (0, 2, meta(0x58, bytes([4, 2, 24, 8]))),
    ])]
    drums, channel = [(0, 0, meta(0x03, b"Drums"))], 0
    for pid, label, _, program, drum_note, _ in PARTS:
        notes = parts[pid]
        if not notes:
            continue
        if program is None:
            target, ch = drums, 9
        else:
            ch = channel
            channel += 1
            target = [(0, 0, meta(0x03, label.encode("ascii", "replace"))), (0, 1, bytes([0xC0 | ch, program]))]
        for start, length, pitch, vel in notes:
            on = int(round(start * MIDI_BEAT))
            off = on + max(1, int(round(length * MIDI_BEAT)))
            key = drum_note if pitch is None else pitch
            velocity = max(1, min(127, int(round(96 * vel))))
            target.append((on, 3, bytes([0x90 | ch, key, velocity])))
            target.append((off, 2, bytes([0x80 | ch, key, 0])))  # offs sort before ons on one tick
        if program is not None:
            chunks.append(midi_track(target))
    if len(drums) > 1:
        chunks.append(midi_track(drums))
    path.write_bytes(b"MThd" + struct.pack(">IHHH", 6, 1, len(chunks), MIDI_BEAT) + b"".join(chunks))


# ── LMMS ─────────────────────────────────────────────────────────────

def preset(name, pitched, volume):
    """The <instrumenttrack> of a factory preset."""
    root = ET.parse(LMMS_DATA / "presets" / name).getroot()
    found = root.find("instrumenttracksettings/instrumenttrack")
    if found is None:  # presets from before LMMS 1.0 use another layout
        sys.exit(f"{name}: not a preset this script can read")
    node = copy.deepcopy(found)
    if pitched:
        node.set("basenote", str(LMMS_A4))
    node.set("fxch", "0")
    node.set("vol", str(volume))
    return node


def add_patterns(track, notes, pitched):
    """Cut the notes into patterns of PATTERN_BARS bars; a note stays in the pattern it starts in."""
    span = PATTERN_BARS * 4 * LMMS_BEAT
    patterns = {}
    for start, length, pitch, vel in notes:
        pos = int(round(start * LMMS_BEAT))
        patterns.setdefault(pos // span, []).append((pos % span, length, pitch, vel))
    for index in sorted(patterns):
        pat = ET.SubElement(track, "pattern", {
            "type": "1", "name": "", "pos": str(index * span), "muted": "0", "steps": "16",
        })
        for pos, length, pitch, vel in patterns[index]:
            ET.SubElement(pat, "note", {
                "pos": str(pos),
                "len": str(max(1, int(round(length * LMMS_BEAT)))),
                "key": str(pitch - 12 if pitched else LMMS_A4),
                "vol": str(max(1, min(200, int(round(100 * vel))))),
                "pan": "0",
            })


NOTES_TEXT = """{title} - Arbeitsprojekt zum Umbauen

Oben: "Original"-Spuren. Das ist der Klang aus dem Spiel, eine Datei pro Instrumentengruppe.
Darunter: "Noten"-Spuren, stummgeschaltet. Dieselben Noten zum Bearbeiten, mit LMMS-Instrumenten als Platzhalter.
Ganz unten: "Meine Melodie", leer, fuer deine eigenen Noten.

Eine Spur ersetzen: die Original-Spur stummschalten, die Noten-Spur einschalten, dann Noten und Instrument aendern.
Tempo {bpm} BPM, {bars} Takte, der Loop-Bereich ist auf den ganzen Track gesetzt.
Die Original-Spuren sind ueber ihren Pfad verknuepft: den Ordner "stems" nicht verschieben.
"""


def write_lmms(path, title, data, parts, stems, master_volume):
    total = data["bars"] * 4 * LMMS_BEAT
    root = ET.Element("lmms-project", {"version": "1.0", "creator": "LMMS", "creatorversion": "1.2.2", "type": "song"})
    ET.SubElement(root, "head", {
        "timesig_numerator": "4", "timesig_denominator": "4", "bpm": str(data["bpm"]),
        "mastervol": str(master_volume), "masterpitch": "0",
    })
    song = ET.SubElement(root, "song")
    box = ET.SubElement(song, "trackcontainer", {
        "type": "song", "x": "5", "y": "5", "width": "1100", "height": "620",
        "visible": "1", "maximized": "0", "minimized": "0",
    })

    for label, file in stems:
        track = ET.SubElement(box, "track", {"type": "2", "name": "Original · " + label, "muted": "0", "solo": "0"})
        sample = ET.SubElement(track, "sampletrack", {"vol": "100", "pan": "0"})
        ET.SubElement(sample, "fxchain", {"numofeffects": "0", "enabled": "0"})
        ET.SubElement(track, "sampletco", {"pos": "0", "len": str(total), "muted": "0", "src": file.as_posix()})

    for pid, label, preset_name, program, _, volume in PARTS:
        if not parts[pid]:
            continue
        pitched = program is not None
        track = ET.SubElement(box, "track", {"type": "0", "name": "Noten · " + label, "muted": "1", "solo": "0"})
        track.append(preset(preset_name, pitched, volume))
        add_patterns(track, parts[pid], pitched)

    own = ET.SubElement(box, "track", {"type": "0", "name": "Meine Melodie", "muted": "0", "solo": "0"})
    own.append(preset(OWN_PRESET[0], True, OWN_PRESET[1]))

    mixer = ET.SubElement(song, "fxmixer", {
        "x": "5", "y": "640", "width": "543", "height": "335", "visible": "0", "maximized": "0", "minimized": "0",
    })
    master = ET.SubElement(mixer, "fxchannel", {"num": "0", "name": "Master", "volume": "1", "muted": "0", "soloed": "0"})
    ET.SubElement(master, "fxchain", {"numofeffects": "0", "enabled": "0"})
    notes = ET.SubElement(song, "projectnotes", {
        "x": "720", "y": "60", "width": "520", "height": "330", "visible": "1", "maximized": "0", "minimized": "0",
    })
    notes.text = NOTES_TEXT.format(title=title, bpm=data["bpm"], bars=data["bars"])
    ET.SubElement(song, "timeline", {"lp0pos": "0", "lp1pos": str(total), "lpstate": "1"})
    ET.SubElement(song, "controllers")

    ET.indent(root, space="  ")
    path.write_text('<?xml version="1.0"?>\n<!DOCTYPE lmms-project>\n' + ET.tostring(root, encoding="unicode") + "\n",
                    encoding="utf-8", newline="\n")


def master_volume_for(files):
    """Master volume (percent) that leaves the summed stems 1 dB of headroom."""
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    for f in files:
        cmd += ["-i", str(f)]
    cmd += ["-filter_complex", f"amix=inputs={len(files)}:normalize=0,astats=measure_perchannel=none", "-f", "null", "-"]
    log = subprocess.run(cmd, capture_output=True, text=True).stderr  # astats works on floats, so peaks over 0 dB show
    peak = float(re.search(r"Peak level dB: (-?[\d.]+)", log).group(1))
    return peak, min(100, int(100 * 10 ** ((-1.0 - peak) / 20)))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    dest = pathlib.Path(sys.argv[1]).resolve()
    for tid, (slug, title) in TRACKS.items():
        src = EXPORT / tid
        if not (src / "notes.json").exists():
            print(f"{tid}: no export found, skipped")
            continue
        out = dest / slug
        (out / "stems").mkdir(parents=True, exist_ok=True)
        data, parts = read_notes(src)

        stems = []
        for sid, label in STEMS:
            wav = src / f"{sid}.wav"
            if not wav.exists():
                continue
            flac = out / "stems" / f"{slug}_{sid}.flac"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "flac",
                            "-compression_level", "8", str(flac)], check=True)
            stems.append((label, flac))

        write_midi(out / f"{slug}.mid", title, data, parts)
        peak, master_volume = master_volume_for([f for _, f in stems])
        write_lmms(out / f"{slug}.mmp", title, data, parts, stems, master_volume)
        counts = ", ".join(f"{pid} {len(n)}" for pid, n in parts.items() if n)
        print(f"{slug}: {len(stems)} stems, sum peaks at {peak:.1f} dB, master {master_volume}%; notes: {counts}")


if __name__ == "__main__":
    main()
