from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCRIPT = json.loads((ROOT / "script.json").read_text("utf-8"))


def duration(path: Path) -> float:
    return float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nw=1:nk=1",
                str(path),
            ],
            text=True,
        ).strip()
    )


def weight(char: str) -> float:
    if char.isspace():
        return 0.12
    if re.match(r"\d", char):
        return 0.62
    if char in "，。！？；：、“”‘’（）—…":
        return 0.4
    if re.match(r"[A-Za-z]", char):
        return 0.55
    return 1.0


def char_times(text: str, seconds: float) -> list[float]:
    lead = 0.035
    usable = max(0.15, seconds - lead)
    weights = [weight(char) for char in text]
    total = sum(weights)
    elapsed = 0.0
    times: list[float] = []
    for value in weights:
        times.append(lead + usable * elapsed / total)
        elapsed += value
    return times


t = 0.15 + SCRIPT.get("pre", 0.0)
beats = []
for line in SCRIPT["lines"]:
    wav = ROOT / "voice" / f"{line['id']}.wav"
    if not wav.exists():
        raise SystemExit(f"missing voice: {wav}")
    seconds = duration(wav)
    times = char_times(line["text"], seconds)
    beats.append(
        {
            "id": line["id"],
            "text": line["text"],
            "start": round(t, 4),
            "end": round(t + seconds, 4),
            "wav": f"voice/{line['id']}.wav",
            "chars": [
                [char, round(t + stamp, 4)]
                for char, stamp in zip(line["text"], times)
            ],
        }
    )
    t += seconds + line.get("gap", 0.3)

timeline = {
    "fps": 30,
    "duration": round(t + 0.85, 4),
    "pre": SCRIPT.get("pre", 0.0),
    "title": None,
    "beats": beats,
    "inserts": [],
}
(ROOT / "timeline.json").write_text(
    json.dumps(timeline, ensure_ascii=False, indent=1),
    "utf-8",
)

for beat in beats:
    print(f"{beat['id']}  {beat['start']:6.2f}-{beat['end']:6.2f}  {beat['text'][:32]}")
print(f"duration: {timeline['duration']}s")
