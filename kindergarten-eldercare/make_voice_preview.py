from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCRIPT_PATH = ROOT / "script_preview74.json"
SCRIPT = json.loads(SCRIPT_PATH.read_text("utf-8"))
PREVIEW_DIR = ROOT / "voice" / "preview74"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
TARGET_END = 74.0
TAIL = 0.75


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
    t += seconds + line["gap"]

planned_footage = [
    {
        "after": "s02",
        "start": round(beats[1]["end"] + 0.04, 4),
        "end": round(beats[2]["start"] - 0.08, 4),
        "material": "济南空置幼儿园活动场",
    },
    {
        "after": "s04",
        "start": round(beats[3]["end"] + 0.04, 4),
        "end": round(beats[4]["start"] - 0.08, 4),
        "material": "改造后走廊与扶手",
    },
    {
        "after": "s06",
        "start": round(beats[5]["end"] + 0.04, 4),
        "end": round(beats[6]["start"] - 0.08, 4),
        "material": "消防箱、无障碍浴室",
    },
    {
        "after": "s08",
        "start": round(beats[7]["end"] + 0.04, 4),
        "end": round(beats[8]["start"] - 0.08, 4),
        "material": "评估区与认知训练空间",
    },
]

timeline = {
    "fps": 30,
    "duration": round(max(TARGET_END, beats[-1]["end"] + TAIL), 4),
    "pre": SCRIPT.get("pre", 0.0),
    "beats": beats,
    "planned_footage": planned_footage,
}
(ROOT / "timeline_preview74.json").write_text(
    json.dumps(timeline, ensure_ascii=False, indent=1),
    "utf-8",
)

inputs = []
filters = []
mix_labels = []
for index, beat in enumerate(beats):
    inputs.extend(["-i", str(ROOT / beat["wav"])])
    delay = int(round(beat["start"] * 1000))
    filters.append(
        f"[{index}:a]aresample=48000,aformat=channel_layouts=mono,"
        f"adelay={delay}|{delay}[v{index}]"
    )
    mix_labels.append(f"[v{index}]")

filters.append(
    "".join(mix_labels)
    + f"amix=inputs={len(mix_labels)}:normalize=0,"
    + f"apad=whole_dur={timeline['duration']:.3f},"
    + f"atrim=0:{timeline['duration']:.3f},"
    + "loudnorm=I=-14:TP=-1.5:LRA=11[out]"
)

preview_wav = PREVIEW_DIR / "05_配音预览_74s.wav"
subprocess.run(
    [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        *inputs,
        "-filter_complex",
        ";".join(filters),
        "-map",
        "[out]",
        "-ar",
        "48000",
        "-ac",
        "1",
        str(preview_wav),
    ],
    check=True,
)

preview_mp3 = PREVIEW_DIR / "05_配音预览_74s.mp3"
subprocess.run(
    [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-i",
        str(preview_wav),
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        str(preview_mp3),
    ],
    check=True,
)

for beat in beats:
    print(
        f"{beat['id']}  {beat['start']:6.2f}-{beat['end']:6.2f}  "
        f"{beat['text'][:32]}"
    )
for item in planned_footage:
    print(
        f"footage after {item['after']}  "
        f"{item['start']:6.2f}-{item['end']:6.2f}  {item['material']}"
    )
print(f"duration: {timeline['duration']:.3f}s")
print(preview_wav)
print(preview_mp3)
