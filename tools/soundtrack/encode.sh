#!/usr/bin/env bash
# Turn the rendered WAV loops (out/music/*.wav) into the game's MP3 files.
#
# Each MP3 is the loop plus one more second of its own start. The game loops
# from 0.5 s to 0.5 s + loop length, which is seamless no matter how much
# silence a browser's MP3 decoder puts in front of the audio.
set -e
here="$(cd "$(dirname "$0")" && pwd)"
dest="$here/../../assets/music"
mkdir -p "$dest"
for pair in neon:neon-district acid:acid-grid crimson:crimson-core boss:warden menu:standby; do
    src="${pair%%:*}"; name="${pair##*:}"
    ffmpeg -v error -y -i "$here/out/music/$src.wav"         -filter_complex "[0:a]asplit[a][b];[b]atrim=0:1.0[h];[a][h]concat=n=2:v=0:a=1[o]"         -map "[o]" -c:a libmp3lame -b:a 160k -ar 44100 "$dest/$name.mp3"
    echo "$name.mp3"
done
