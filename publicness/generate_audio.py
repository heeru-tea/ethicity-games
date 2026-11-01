"""Generate original, copyright-free pixel-game BGM and SFX as real MP3 files.

Run: python3 generate_audio.py
Requires: Python standard library and ffmpeg (for MP3 encoding).
"""
from __future__ import annotations

from array import array
import math
from pathlib import Path
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
SAMPLE_RATE = 22050


def wave_shape(phase: float, shape: str = "triangle") -> float:
    cycle = phase - math.floor(phase)
    if shape == "square":
        return 1.0 if cycle < 0.5 else -1.0
    if shape == "sine":
        return math.sin(2 * math.pi * cycle)
    return 4 * abs(cycle - 0.5) - 1


def note(buffer: list[float], freq: float, start: float, duration: float,
         amp: float = .20, shape: str = "triangle", slide: float = 0.0):
    if not freq:
        return
    first = int(start * SAMPLE_RATE)
    length = min(int(duration * SAMPLE_RATE), len(buffer) - first)
    phase = 0.0
    for i in range(max(0, length)):
        t = i / SAMPLE_RATE
        phase += (freq + slide * t / max(duration, 0.01)) / SAMPLE_RATE
        attack = min(1.0, t / .018)
        release = min(1.0, max(0.0, (duration - t) / .08))
        buffer[first + i] += wave_shape(phase, shape) * amp * attack * release


def output_mp3(name: str, samples: list[float]):
    peak = max((abs(x) for x in samples), default=1.0)
    gain = min(1.0, .84 / max(peak, .001))
    pcm = array("h", (int(max(-1.0, min(1.0, x * gain)) * 32767) for x in samples))
    with tempfile.TemporaryDirectory(prefix="park-audio-") as td:
        source = Path(td) / "source.wav"
        with wave.open(str(source), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(pcm.tobytes())
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
            "-codec:a", "libmp3lame", "-q:a", "4", str(OUT / name)
        ], check=True)


def make_bgm():
    # 8 bars, calm original D-major pentatonic melody. Loop duration ~21.82 s.
    seconds_per_beat = 60 / 88
    beat = seconds_per_beat / 2
    melody = [294,370,440,0,370,330,294,0,247,294,370,440,494,440,370,0]
    roots = [147,123,165,147]
    bars = 4
    length = bars * len(melody) * beat
    out = [0.0] * int((length + .02) * SAMPLE_RATE)
    for bar in range(bars):
        for i, freq in enumerate(melody):
            start = (bar * len(melody) + i) * beat
            note(out, freq, start, beat * .79, .27, "triangle")
            if i % 4 == 0:
                note(out, roots[(bar + i // 4) % len(roots)], start, beat * 3.8, .17, "sine")
            if i % 2 == 0:
                note(out, 988, start, beat * .12, .018, "sine")
    output_mp3("park-theme.mp3", out)


def make_sfx():
    patterns = {
        "dialogue.mp3": [(660, 0, .09, .26, "sine", 0), (880, .09, .1, .23, "sine", 0)],
        "collect.mp3": [(523, 0, .12, .34, "square", 0), (659, .13, .12, .34, "square", 0), (784, .26, .28, .35, "triangle", 0)],
        "portal.mp3": [(330, 0, .4, .3, "triangle", 700), (550, .12, .48, .28, "sine", 340)],
        "select.mp3": [(523, 0, .15, .30, "triangle", 0)],
        "error.mp3": [(280, 0, .32, .3, "square", -100)],
        "success.mp3": [(392, 0, .17, .3, "triangle", 0), (523, .18, .17, .3, "triangle", 0), (659, .36, .3, .33, "triangle", 0)],
        "complete.mp3": [(392, 0, .21, .31, "triangle", 0), (494, .22, .21, .31, "triangle", 0), (587, .44, .22, .31, "triangle", 0), (784, .67, .5, .32, "triangle", 0)]
    }
    for filename, parts in patterns.items():
        length = max(t + duration for _, t, duration, *_ in parts) + .08
        samples = [0.0] * int(length * SAMPLE_RATE)
        for freq, start, duration, amp, shape, slide in parts:
            note(samples, freq, start, duration, amp, shape, slide)
        output_mp3(filename, samples)


if __name__ == "__main__":
    make_bgm()
    make_sfx()
    print("Generated", len(list(OUT.glob("*.mp3"))), "original audio files in", OUT)
