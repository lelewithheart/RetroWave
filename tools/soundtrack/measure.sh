#!/usr/bin/env bash
# Measures a rendered track: loudness, frequency balance, level per section.
# Usage: measure.sh <wav> <bpm> "name:startBar:bars ..."
set -e
f="$1"; bpm="$2"; sections="$3"
dir=$(dirname "$f"); base=$(basename "$f" .wav)
ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary:" | grep -E "I:|LRA:|Peak:"
echo "== bands (RMS dB)"
for b in "sub<80:lowpass=f=80" "bass80-250:highpass=f=80,lowpass=f=250" "lowmid250-1k:highpass=f=250,lowpass=f=1000" \
         "mid1k-4k:highpass=f=1000,lowpass=f=4000" "high4k-10k:highpass=f=4000,lowpass=f=10000" "air>10k:highpass=f=10000"; do
  n=${b%%:*}; flt=${b#*:}
  r=$(ffmpeg -hide_banner -nostats -i "$f" -af "$flt,astats=metadata=0:measure_overall=RMS_level:measure_perchannel=none" -f null - 2>&1 | grep "RMS level" | tail -1 | awk '{print $NF}')
  printf "  %-14s %s\n" "$n" "$r"
done
echo "== sections (peak dB / RMS dB)"
bar=$(python -c "print(240/$bpm)")
for s in $sections; do
  IFS=: read n st len <<< "$s"
  ss=$(python -c "print($st*$bar)"); du=$(python -c "print($len*$bar)")
  r=$(ffmpeg -hide_banner -nostats -ss "$ss" -t "$du" -i "$f" -af "astats=metadata=0:measure_overall=RMS_level+Peak_level:measure_perchannel=none" -f null - 2>&1 | grep -E "RMS level|Peak level" | awk '{print $NF}' | tr '\n' ' ')
  printf "  %-8s %s\n" "$n" "$r"
done
ffmpeg -v error -y -i "$f" -lavfi "showspectrumpic=s=1400x500:legend=1:scale=log:fscale=log:stop=16000" "$dir/$base-spec.png"
