"""Put the album together: numbered, tagged MP3 and WAV files plus a track list.

    python album_tag.py <dest> [<main song wav> [<main song title> [<bonus wav> <bonus title>]]]

A bonus track, if given, goes last.

Reads the album versions from out/album/<id>.wav (written by album.js). The
main song, if given, becomes track 1 as it is (already mastered).
"""
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ALBUM = "RogueWave (Original Soundtrack)"
ARTIST = "Glitchwerk"
YEAR = "2026"

# id (file in out/album), title, note for the track list, gain in dB
# (the menu track is mastered quieter for the game; on the album it comes up to the rest)
ORDER = [
    ("menu",     "Standby",        "Menu", 3.0),
    ("neon",     "Neon District",  "Area 1", 0.0),
    ("signal",   "Signal Rain",    "Area 1", 0.0),
    ("acid",     "Acid Grid",      "Area 2", 0.0),
    ("voltage",  "Voltage",        "Area 2", 0.0),
    ("crimson",  "Crimson Core",   "Area 3", 0.0),
    ("blackice", "Black Ice",      "Area 3", 0.0),
    ("flatline", "Flatline",       "Low health", 0.0),
    ("redline",  "Redline",        "Low health", 0.0),
    ("boss",     "Warden",         "Boss", 0.0),
]


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout
    return float(out)


def main():
    dest = pathlib.Path(sys.argv[1]).resolve()
    main_song = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else None
    main_title = sys.argv[3] if len(sys.argv) > 3 else (main_song.stem.split(" - ")[0] if main_song else None)
    bonus = (pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]) if len(sys.argv) > 5 else None
    (dest / "mp3").mkdir(parents=True, exist_ok=True)
    (dest / "wav").mkdir(parents=True, exist_ok=True)

    items = []
    if main_song:
        items.append((main_song, main_title, "Main theme", False, None))
    for tid, title, note, gain in ORDER:
        src = HERE / "out" / "album" / f"{tid}.wav"
        if src.exists():
            items.append((src, title, note, True, gain))
        else:
            print(f"{tid}: no album version found, skipped")
    if bonus:
        items.append((bonus[0], bonus[1], "Bonus", False, None))

    lines = [f"{ALBUM} - {ARTIST}", ""]
    total = 0.0
    for n, (src, title, note, ai, gain) in enumerate(items, start=1):
        # Album versions: leave one second of the reverb tail's silence, not six.
        filters = [] if gain is None else ["-af", f"volume={gain}dB,areverse,silenceremove=start_periods=1:start_threshold=-70dB:start_silence=1,areverse"]
        safe = re.sub(r'[\\/:*?"<>|]', "", title)
        base = f"{n:02d} {safe}"
        tags = ["-metadata", f"title={title}", "-metadata", f"artist={ARTIST}", "-metadata", f"album={ALBUM}",
                "-metadata", f"album_artist={ARTIST}", "-metadata", f"track={n}/{len(items)}",
                "-metadata", f"date={YEAR}", "-metadata", "genre=Electronic"]
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), *filters, *tags, "-id3v2_version", "3",
                        "-c:a", "libmp3lame", "-b:a", "320k", str(dest / "mp3" / f"{base}.mp3")], check=True)
        # WAV keeps the source's bit depth; album versions are 16 bit, the master 24 bit.
        wav_out = dest / "wav" / f"{base}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), *filters, *tags,
                        "-c:a", "copy" if gain is None else "pcm_s16le", str(wav_out)], check=True)
        secs = duration(wav_out)
        total += secs
        lines.append(f"{n:02d}  {title:16s} {int(secs // 60)}:{int(secs % 60):02d}   {note}")
        print(lines[-1])
    lines += ["", f"Total {int(total // 60)}:{int(total % 60):02d}"]
    (dest / "TRACKLIST.txt").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"total {int(total // 60)}:{int(total % 60):02d}")


if __name__ == "__main__":
    main()
