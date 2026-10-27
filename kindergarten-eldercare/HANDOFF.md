阶段：
74 秒 1080p 成片已完成并验证。

目标：
用“空间—照护—选择权”三层结构解释“多地幼儿园改养老院”；核心结论是：幼改老能解决空间从哪来，但解决不了照护从哪来、老人怎么选。

已完成：
- 云希声线锁定，试音与哈希见 `voice/CANDIDATES.md`。
- 10 句正式旁白，成片 74.016 秒。
- 四处无旁白实录留白：空置活动场 2.88s、院落使用 2.48s、消防设施 2.88s、评估区 2.08s。
- 静态数据段保持较快节奏；关键视频完整停留，不再碎切。
- 1080p H.264 + AAC、联系表、封面、导演表和来源文档已输出。
- 完成关键帧、四段实录静帧、镜头运动、黑帧、音频流、响度与人脸检测。

验证结果：
- 成片 74.016 秒，1920×1080，30fps，H.264 + AAC，48kHz 双声道。
- motion_check：完全不动 5.1%，定住超过 2 秒 0 次/分，镜头运动 58.5%，前后层运动 11.4%，层间不一致运动 49.4%，75 分位镜长 2.9 秒，切点 25.969/分钟。
- 响度 -15.3 LUFS，真峰值 -1.2 dBFS。
- blackdetect 无黑帧。
- 自动人脸抽检命中均在设备/标识或背影素材上，无可见正脸。

修改文件：
- `kindergarten-eldercare/script.json`
- `kindergarten-eldercare/timeline.json`
- `kindergarten-eldercare/film.js`
- `kindergarten-eldercare/sfx.json`
- `kindergarten-eldercare/director.md`
- `kindergarten-eldercare/CREDITS.md`
- `kindergarten-eldercare/voice/CANDIDATES.md`
- `kindergarten-eldercare/package.json`

待办：
- 用户审阅 1080p 成片。

风险：
- 新闻视频仅作评论性引用，公开传播前需按平台规则复核授权。

大文件与禁止重读项：
- 1080p：`out/05_幼儿园改养老院_空间照护选择权_1080p.mp4`
- 联系表：`out/05_幼儿园改养老院_空间照护选择权_联系表.jpg`
- 封面：`out/05_幼儿园改养老院_空间照护选择权_封面.jpg`
- 不重新把 `source/` 中完整新闻视频或全部原始帧载入上下文。

下一线程第一条指令：
先读 `HANDOFF.md`、`director.md`、`CREDITS.md`；按用户对 74 秒 1080p 成片的反馈只改对应镜头。
