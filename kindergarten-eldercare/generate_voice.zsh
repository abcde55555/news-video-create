#!/bin/zsh
set -euo pipefail

voice=zh-CN-YunxiNeural

edge-tts --voice "$voice" --rate=+8% --text '幼儿园改养老院，不是“教室变床位”的奇观。' --write-media voice/s01.edge.mp3
edge-tts --voice "$voice" --rate=+10% --text '而是城市开始把闲置空间，改成社区养老的基础设施。' --write-media voice/s02.edge.mp3
edge-tts --voice "$voice" --rate=+18% --text '二零二五年，老年抚养比百分之二十三点一，首次超过少儿抚养比百分之二十二；一年又少二点一四万所幼儿园。' --write-media voice/s03.edge.mp3
edge-tts --voice "$voice" --rate=+14% --text '一边缺养老床位，一边空出校舍。改，比新建快，也离家更近。' --write-media voice/s04.edge.mp3
edge-tts --voice "$voice" --rate=+16% --text '常州、济南、金华都在试。济南一所三十多年的民办园，后来成了综合养老中心。' --write-media voice/s05.edge.mp3
edge-tts --voice "$voice" --rate=+16% --text '但改造不是刷墙换牌子。消防、无障碍、浴室和送餐动线，都得重做。' --write-media voice/s06.edge.mp3
edge-tts --voice "$voice" --rate=+12% --text '更难的是运营。床位有了，护理的人从哪来？原园长能转岗，年轻人能用陪伴换房租，但这只是补充。' --write-media voice/s07.edge.mp3
edge-tts --voice "$voice" --rate=+8% --text '最后还有决定权。九十多岁的苏大爷把六个子女告上法庭，要求每月给七百元，送他去养老院。' --write-media voice/s08.edge.mp3
edge-tts --voice "$voice" --rate=+10% --text '能不能改，决定空间；谁来照护，决定服务；老人怎么选，决定这件事到底为谁而做。' --write-media voice/s09.edge.mp3
edge-tts --voice "$voice" --rate=+6% --text '所以，“幼改老”不是答案。它只是社区养老体系的第一步。' --write-media voice/s10.edge.mp3

for id in s01 s02 s03 s04 s05 s06 s07 s08 s09 s10; do
  ffmpeg -v error -y -i "voice/${id}.edge.mp3" \
    -af 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse' \
    -ar 48000 -ac 1 "voice/${id}.wav"
done
