"""Peak envelope of a WAV file as JSON, for the cover's waveform motif.

    python envelope.py <file.wav> <points> > wave.json
"""
import array
import json
import sys
import wave

path, points = sys.argv[1], int(sys.argv[2])
with wave.open(path, "rb") as w:
    frames = w.getnframes()
    channels = w.getnchannels()
    data = array.array("h")
    data.frombytes(w.readframes(frames))
step = frames // points
out = []
for k in range(points):
    lo, hi = 0, 0
    start = k * step * channels
    for v in data[start:start + step * channels]:
        if v < lo:
            lo = v
        elif v > hi:
            hi = v
    out.append([round(lo / 32768, 3), round(hi / 32768, 3)])
print(json.dumps(out))
