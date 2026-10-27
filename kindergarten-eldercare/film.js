(async () => {
  const timeline = window.__TIMELINE__ ?? await fetch("timeline.json").then((response) => response.json());
  const S = window.S25;
  const stage = document.querySelector("#stage");
  const beats = Object.fromEntries(timeline.beats.map((beat) => [beat.id, beat]));
  const FPS = timeline.fps || 30;
  const duration = timeline.duration;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => {
    const p = clamp((x - a) / Math.max(0.0001, b - a));
    return p * p * (3 - 2 * p);
  };
  const fade = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));

  function cue(id, needle, offset = 0) {
    const beat = beats[id];
    if (!beat) return 0;
    if (!needle) return beat.start + offset;
    const index = beat.text.indexOf(needle);
    return (beat.chars[Math.max(0, index)]?.[1] ?? beat.start) + offset;
  }

  function cueEnd(id, needle, offset = 0) {
    const beat = beats[id];
    const index = needle ? beat.text.indexOf(needle) : beat.text.length - 1;
    return (beat.chars[Math.max(0, index)]?.[1] ?? beat.end) + offset;
  }

  function fitStage() {
    document.documentElement.style.setProperty(
      "--render-scale",
      String(window.innerWidth / 1920),
    );
  }

  const bRollWindows = [
    { start: beats.s02.end + 0.03, end: beats.s03.start - 0.06, kind: "a" },
    { start: beats.s04.end + 0.03, end: beats.s05.start - 0.06, kind: "b" },
    { start: beats.s06.end + 0.03, end: beats.s07.start - 0.06, kind: "c" },
    { start: beats.s08.end + 0.03, end: beats.s09.start - 0.06, kind: "d" },
  ];

  const segments = [
    { start: 0, end: cue("s02", "而是", -0.08), shot: 1, view: 0 },
    { start: cue("s02", "而是", -0.08), end: beats.s02.end + 0.03, shot: 1, view: 1 },

    { start: beats.s03.start - 0.07, end: cue("s03", "老年", -0.08), shot: 2, view: 0 },
    { start: cue("s03", "老年", -0.08), end: cue("s03", "首次", -0.08), shot: 2, view: 1 },
    { start: cue("s03", "首次", -0.08), end: cue("s03", "2.14", -0.08), shot: 2, view: 2 },
    { start: cue("s03", "2.14", -0.08), end: beats.s04.start - 0.07, shot: 2, view: 3 },

    { start: beats.s04.start - 0.07, end: cue("s04", "改", -0.07), shot: 3, view: 0 },
    { start: cue("s04", "改", -0.07), end: beats.s05.start - 0.07, shot: 3, view: 1 },
    { start: beats.s05.start - 0.07, end: cue("s05", "济南", -0.07), shot: 3, view: 2 },
    { start: cue("s05", "济南", -0.07), end: beats.s06.start - 0.07, shot: 3, view: 3 },

    { start: beats.s06.start - 0.07, end: cue("s06", "消防", -0.07), shot: 4, view: 0 },
    { start: cue("s06", "消防", -0.07), end: cue("s06", "浴室", -0.07), shot: 4, view: 1 },
    { start: cue("s06", "浴室", -0.07), end: cue("s06", "送餐", -0.07), shot: 4, view: 2 },
    { start: cue("s06", "送餐", -0.07), end: beats.s06.end + 0.03, shot: 4, view: 3 },

    { start: beats.s07.start - 0.06, end: cue("s07", "护理", -0.07), shot: 5, view: 0 },
    { start: cue("s07", "护理", -0.07), end: cue("s07", "原园长", -0.07), shot: 5, view: 1 },
    { start: cue("s07", "原园长", -0.07), end: cue("s07", "年轻人", -0.07), shot: 5, view: 2 },
    { start: cue("s07", "年轻人", -0.07), end: beats.s08.start - 0.07, shot: 5, view: 3 },

    { start: beats.s08.start - 0.07, end: cue("s08", "6个", -0.07), shot: 7, view: 0 },
    { start: cue("s08", "6个", -0.07), end: cue("s08", "700", -0.07), shot: 7, view: 1 },
    { start: cue("s08", "700", -0.07), end: beats.s09.start - 0.07, shot: 7, view: 2 },

    { start: beats.s09.start - 0.07, end: cue("s09", "谁来照护", -0.07), shot: 8, view: 0 },
    { start: cue("s09", "谁来照护", -0.07), end: cue("s09", "老人怎么选", -0.07), shot: 8, view: 1 },
    { start: cue("s09", "老人怎么选", -0.07), end: beats.s10.start - 0.07, shot: 8, view: 2 },

    { start: beats.s10.start - 0.07, end: duration, shot: 9, view: 0 },
  ];

  let renderContext = { start: 0, end: duration, shot: 0, view: 0 };

  const clipCounts = {
    aerial: 63,
    courtyard_back: 75,
    empty_beds: 57,
    retrofit_room: 75,
    empty_corridor: 60,
    handrail: 63,
    fire_equipment: 60,
    empty_playground: 60,
    signage: 51,
  };

  function clip(name, t, speed = 1) {
    const count = clipCounts[name];
    const index = 1 + Math.floor(clamp(t * speed, 0, (count - 1) / FPS) * FPS);
    return `assets/clips/${name}/${String(index).padStart(4, "0")}.jpg`;
  }

  function world(tone = "forest", options = {}) {
    const palettes = {
      forest: ["rgba(212,109,79,.12)", "rgba(188,200,108,.08)", "#07100c", "#122119", "#08100d"],
      clay: ["rgba(238,144,110,.14)", "rgba(188,200,108,.05)", "#100c09", "#251811", "#100b09"],
      paper: ["rgba(188,200,108,.12)", "rgba(212,109,79,.06)", "#0c120f", "#1d271f", "#080d0a"],
      sage: ["rgba(125,154,134,.14)", "rgba(243,237,224,.04)", "#07100d", "#16251d", "#07100b"],
    };
    const [a, b, c, d, e] = palettes[tone] ?? palettes.forest;
    const density = options.density ?? 1;
    return `<div class="world" style="background:
      radial-gradient(circle at 78% 22%, ${a}, transparent 33%),
      radial-gradient(circle at 16% 76%, ${b}, transparent 34%),
      linear-gradient(135deg, ${c}, ${d} 52%, ${e})">
      <div style="position:absolute;inset:-4%;opacity:${0.62 * density};
        background-image:
          linear-gradient(rgba(243,237,224,.024) 1px,transparent 1px),
          linear-gradient(90deg,rgba(243,237,224,.022) 1px,transparent 1px);
        background-size:96px 96px;
        transform:perspective(1200px) rotateX(4deg)"></div>
    </div>`;
  }

  function grain() {
    return `<div class="grain"></div><div class="vignette"></div>`;
  }

  function depthField() {
    return `<div style="position:absolute;inset:-120px;overflow:hidden;opacity:.9">
      <div style="position:absolute;left:80px;top:90px;width:1760px;height:900px;border:1px solid rgba(243,237,224,.07)"></div>
      <div style="position:absolute;left:80px;top:290px;right:80px;height:1px;background:rgba(243,237,224,.06)"></div>
      <div style="position:absolute;left:80px;top:690px;right:80px;height:1px;background:rgba(243,237,224,.055)"></div>
      <div style="position:absolute;left:1180px;top:90px;bottom:90px;width:1px;background:rgba(243,237,224,.06)"></div>
      <div style="position:absolute;left:0;top:135px;font-family:var(--num);font-size:500px;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(243,237,224,.085)">0–14</div>
      <div style="position:absolute;right:0;bottom:0;font-family:var(--num);font-size:500px;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(212,109,79,.10)">65+</div>
      <div style="position:absolute;right:165px;top:120px;width:280px;height:280px;border:1px dashed rgba(188,200,108,.13);border-radius:50%"></div>
      <div style="position:absolute;right:245px;top:200px;width:120px;height:120px;border:1px solid rgba(188,200,108,.12);border-radius:50%"></div>
      <div style="position:absolute;left:140px;bottom:140px;width:640px;height:86px;background:repeating-linear-gradient(90deg,rgba(243,237,224,.08) 0 1px,transparent 1px 72px)"></div>
    </div>`;
  }

  function motionField() {
    const ticks = Array.from({ length: 12 }, (_, index) => {
      const y = 110 + index * 70;
      return `<div style="position:absolute;left:0;top:${y}px;width:${index % 3 === 0 ? 110 : 68}px;height:2px;background:rgba(243,237,224,.34)"></div>
        <div style="position:absolute;right:0;top:${y}px;width:${index % 3 === 0 ? 110 : 68}px;height:2px;background:rgba(212,109,79,.27)"></div>`;
    }).join("");
    return `<div style="position:absolute;inset:-80px;overflow:hidden">
      ${ticks}
      <div style="position:absolute;left:22px;top:50px;bottom:50px;width:1px;background:rgba(243,237,224,.3)"></div>
      <div style="position:absolute;right:22px;top:50px;bottom:50px;width:1px;background:rgba(212,109,79,.24)"></div>
      <div style="position:absolute;left:42px;top:36px;font-family:var(--num);font-size:99px;color:rgba(243,237,224,.24)">A</div>
      <div style="position:absolute;right:42px;bottom:17px;font-family:var(--num);font-size:99px;color:rgba(212,109,79,.2)">B</div>
    </div>`;
  }

  function camera(local, base, moves = [], drift = 0.006) {
    return S.camPath(local, { t: 0, ...base }, moves, drift);
  }

  function framing(local, presets, drift = 0.005) {
    const preset = presets[Math.min(renderContext.view, presets.length - 1)];
    const target = preset.to ?? preset.base;
    const segmentLength = Math.max(0.7, renderContext.end - renderContext.start);
    const amp = preset.amp ?? 2.8;
    const seed = {
      ...preset.base,
      s: Math.min(preset.base.s, target.s - 0.018),
    };
    const amplifiedTarget = {
      ...target,
      x: seed.x + (target.x - seed.x) * amp,
      y: seed.y + (target.y - seed.y) * amp,
      s: seed.s + (target.s - seed.s) * 1.25,
    };
    return camera(
      local,
      seed,
      [{
        t: preset.t ?? 0.05,
        d: preset.d ?? Math.min(2.1, segmentLength * 0.8),
        to: amplifiedTarget,
      }],
      Math.max(drift, 0.019),
    );
  }

  function layerPair(fn, t) {
    return [fn(t), fn(t - 1 / FPS)];
  }

  function fgCam(c, strength = 0.58) {
    return {
      x: lerp(960, c.x, strength),
      y: lerp(540, c.y, strength),
      s: lerp(1, c.s, strength),
    };
  }

  function eyebrow(x, y, zh, en = "", opacity = 1, anchor = "left") {
    return `<div class="label" style="left:${x}px;top:${y}px;opacity:${opacity};
      transform:translateX(${anchor === "right" ? "-100%" : anchor === "center" ? "-50%" : "0"});text-align:${anchor}">
      ${zh}${en ? `<span style="display:block;margin-top:7px;font:700 14px 'Avenir Next Condensed';letter-spacing:.22em;color:rgba(243,237,224,.3)">${en}</span>` : ""}
    </div>`;
  }

  function photo(name, x, y, w, h, label = "", local = 0, options = {}) {
    const speed = options.speed ?? 0.72;
    const blur = options.blur ? `filter:blur(${options.blur}px);transform:scale(1.04);` : "";
    return `<div class="frame" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${options.opacity ?? 1};transform:rotate(${options.rotate ?? 0}deg)">
      <img src="${clip(name, local, speed)}" style="${blur}">
      ${label ? `<div class="frame-label">${label}</div>` : ""}
    </div>`;
  }

  function evidence(src, x, y, w, h, opacity = 1, rotate = 0) {
    return `<div class="evidence" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${opacity};transform:rotate(${rotate}deg)">
      <img src="${src}">
    </div>`;
  }

  function subtitleAt(t) {
    for (const beat of timeline.beats) {
      if (t < beat.start - 0.16 || t > beat.end + 0.26) continue;
      const chunks = [];
      let start = 0;
      for (let i = 1; i <= beat.text.length; i += 1) {
        const char = beat.text[i - 1];
        const pause = /[。！？；，]/.test(char);
        if ((pause && i - start >= 7) || i - start >= 20 || i === beat.text.length) {
          chunks.push({
            text: beat.text.slice(start, i),
            from: beat.chars[start]?.[1] ?? beat.start,
            to: null,
          });
          start = i;
        }
      }
      for (let i = 0; i < chunks.length; i += 1) {
        chunks[i].to = chunks[i + 1]?.from ?? beat.end + 0.26;
        if (t >= chunks[i].from - 0.08 && t <= chunks[i].to + 0.03) {
          return `<div class="caption-wrap"><div class="caption">${chunks[i].text}</div></div>`;
        }
      }
    }
    return "";
  }

  function shot1(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 920, y: 525, s: 1.02 }, to: { x: 982, y: 510, s: 1.055 }, d: 0.9, amp: 1.2 },
        { base: { x: 760, y: 505, s: 1.06 }, to: { x: 890, y: 520, s: 1.075 }, d: 0.95, amp: 1.2 },
      ], 0.0038),
      local,
    );
    const intro = 0.8 + smooth(0, 0.32, t) * 0.2;
    const pivot = smooth(cue("s02", "而是", -0.16), cue("s02", "闲置", 0.34), t);
    const bg = `
      ${S.demote(clip("aerial", local, 0.52), { br: 0.24, sat: 0.4, bl: 2.6 })}
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,12,9,.93),rgba(6,12,9,.36) 55%,rgba(6,12,9,.86))"></div>
    `;
    const fg = `
      ${eyebrow(112, 82, "核心判断 · 幼改老", "SPACE / CARE / RIGHTS", 0.92)}
      <div style="position:absolute;left:250px;top:155px;width:1480px;opacity:${intro}">
        <div style="font-size:28px;font-weight:700;letter-spacing:.08em;color:rgba(243,237,224,.58)">幼儿园改养老院</div>
        <div style="margin-top:18px;font-size:82px;font-weight:800;line-height:1.1;white-space:nowrap">不是“教室变床位”的奇观。</div>
        <div style="margin-top:12px;font-size:24px;font-weight:700;color:var(--clay-hot)">也不是装修节目。</div>
      </div>
      <div style="position:absolute;left:280px;top:505px;width:1390px;opacity:${0.34 + pivot * 0.66};transform:translateY(${(1 - pivot) * 24}px)">
        <div style="font-size:78px;font-weight:800;line-height:1.1;color:var(--cream)">是城市开始重算公共空间。</div>
        <div style="display:flex;align-items:center;gap:30px;margin-top:52px">
          <div class="card" style="position:relative;width:390px;height:145px;padding:25px 30px">
            <div class="paper-label" style="color:rgba(243,237,224,.42)">现有存量</div>
            <div style="margin-top:12px;font-size:38px;font-weight:800">闲置校舍</div>
          </div>
          <div style="font-family:var(--num);font-size:90px;color:var(--meadow)">→</div>
          <div class="card" style="position:relative;width:430px;height:145px;padding:25px 30px;border-color:rgba(188,200,108,.5)">
            <div class="paper-label" style="color:rgba(243,237,224,.42)">社区供给</div>
            <div style="margin-top:12px;font-size:38px;font-weight:800;color:var(--meadow-hot)">养老基础设施</div>
          </div>
          <div style="width:330px;font-size:23px;line-height:1.55;color:rgba(243,237,224,.58)">快于新建，<br>也不把老人送出熟悉的生活圈。</div>
        </div>
      </div>
      <div style="position:absolute;left:280px;bottom:205px;display:flex;gap:18px">
        ${["01 空间", "02 照护", "03 选择权"].map((label, index) => `<div style="padding:12px 20px;border:1px solid ${index === 0 ? "rgba(188,200,108,.58)" : "rgba(243,237,224,.18)"};color:${index === 0 ? "var(--meadow-hot)" : "rgba(243,237,224,.38)"};font-size:19px;font-weight:800">${label}</div>`).join("")}
      </div>
      ${photo("empty_playground", 1430, 180, 360, 250, "闲置活动场 · 实录", local, { rotate: 1.1, opacity: 0.88 })}
      <div class="tag" style="left:112px;bottom:154px">先有空间，才有下一步</div>
    `;
    return `${S.L(c, cp, 0.24, world("forest"), { br: 0.9 })}${S.L(c, cp, 0.52, bg, { br: 0.95 })}${S.L(c, cp, 0.36, depthField(), { o: 0.24 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot2(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 930, y: 515, s: 1.03 }, to: { x: 1010, y: 510, s: 1.075 }, d: 0.9 },
        { base: { x: 642, y: 500, s: 1.1 }, to: { x: 690, y: 515, s: 1.07 }, d: 0.85 },
        { base: { x: 1270, y: 490, s: 1.09 }, to: { x: 1210, y: 515, s: 1.06 }, d: 0.9 },
        { base: { x: 960, y: 520, s: 1.03 }, to: { x: 990, y: 500, s: 1.07 }, d: 0.9 },
      ], 0.0042),
      local,
    );
    const dotsIn = smooth(beats.s03.start, beats.s03.start + 0.9, t);
    const kinders = smooth(cue("s03", "2.14", -0.16), cue("s03", "2.14", 0.28), t);
    const elderly = smooth(cue("s03", "老年", -0.16), cue("s03", "23.1", 0.3), t);
    const dots = Array.from({ length: 100 }, (_, index) => {
      const color = index < 23 ? "#d46d4f" : index < 45 ? "#bcc86c" : "rgba(243,237,224,.18)";
      const x = (index % 10) * 40;
      const y = Math.floor(index / 10) * 40;
      return `<div class="grid-dot" style="left:${x}px;top:${y}px;background:${color};opacity:${dotsIn}"></div>`;
    }).join("");
    const bg = `
      ${S.demote(clip("empty_playground", local, 0.7), { br: 0.22, sat: 0.36, bl: 3.2 })}
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(9,15,12,.95),rgba(9,15,12,.45) 54%,rgba(9,15,12,.88))"></div>
    `;
    const fg = `
      ${eyebrow(112, 82, "第一层 · 空间从哪来", "WHERE DOES THE SPACE COME FROM?", 0.92)}
      <div style="position:absolute;left:220px;top:172px;width:460px;height:485px;padding:32px 38px;border:1px solid rgba(243,237,224,.18);background:rgba(8,14,11,.66)">
        <div style="font-size:24px;font-weight:700;color:rgba(243,237,224,.62);letter-spacing:.06em">每 100 名劳动年龄人口</div>
        <div style="position:relative;width:360px;height:360px;margin-top:26px">${dots}</div>
        <div style="position:absolute;left:38px;bottom:20px;display:flex;gap:34px;font-size:17px;color:rgba(243,237,224,.54)">
          <span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--clay);margin-right:8px"></i>老人 23</span>
          <span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--meadow);margin-right:8px"></i>儿童 22</span>
        </div>
      </div>
      <div style="position:absolute;left:720px;top:190px;font-size:30px;font-weight:700;color:rgba(243,237,224,.67)">需求变重，供给端同时出现空位</div>
      <div style="position:absolute;left:690px;top:280px;width:600px;opacity:${elderly}">
        <div style="font-size:22px;color:rgba(243,237,224,.55);letter-spacing:.08em">每 100 名劳动年龄人口</div>
        <div style="display:flex;align-items:flex-end;gap:16px;margin-top:10px">
          <div class="metric clay" style="position:relative;font-size:172px">23.1<span style="font-family:var(--han);font-size:44px">%</span></div>
          <div style="padding-bottom:16px;font-family:var(--num);font-size:65px;color:var(--meadow)">&gt;</div>
          <div class="metric meadow" style="position:relative;font-size:172px">22.0<span style="font-family:var(--han);font-size:44px">%</span></div>
        </div>
        <div style="margin-top:4px;font-size:20px;color:rgba(243,237,224,.55)">老年抚养比 / 少儿抚养比</div>
      </div>
      <div style="position:absolute;left:1370px;top:268px;width:430px;opacity:${kinders}">
        <div class="metric clay" style="position:relative;font-size:190px">−2.14</div>
        <div style="margin-top:2px;font-size:28px;font-weight:800;color:var(--clay-hot)">万所幼儿园</div>
        <div style="margin-top:8px;font-size:19px;color:rgba(243,237,224,.5)">一年减少</div>
      </div>
      ${evidence("assets/docs/yicai_dependency.png", 780, 625, 350, 210, 0.58, 1.1)}
      ${evidence("assets/docs/moe_2025.png", 1190, 625, 470, 250, 0.62, -0.7)}
      <div class="tag" style="left:112px;bottom:154px">2025 年需求端与教育供给端同时变化</div>
    `;
    return `${S.L(c, cp, 0.24, world("paper"), { br: 0.9 })}${S.L(c, cp, 0.54, bg, { br: 0.96 })}${S.L(c, cp, 0.36, depthField(), { o: 0.22 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot3(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 950, y: 520, s: 1.03 }, to: { x: 990, y: 505, s: 1.07 }, d: 0.9, amp: 1.35 },
        { base: { x: 770, y: 505, s: 1.06 }, to: { x: 850, y: 530, s: 1.075 }, d: 0.9, amp: 1.35 },
        { base: { x: 420, y: 510, s: 1.07 }, to: { x: 510, y: 520, s: 1.045 }, d: 0.85, amp: 1.35 },
        { base: { x: 1030, y: 505, s: 1.08 }, to: { x: 970, y: 520, s: 1.045 }, d: 0.85, amp: 1.35 },
      ], 0.0038),
      local,
    );
    const cityIn = smooth(cue("s05", "常州", -0.22), cue("s05", "常州", 0.3), t);
    const fast = smooth(cue("s04", "改", -0.14), cue("s04", "快", 0.28), t);
    const cities = [
      { city: "常州", detail: "首个公办幼儿园闲置校舍转型养老", date: "2025.07.30 签约", color: "#d46d4f" },
      { city: "济南", detail: "30 多年民办园 → 综合养老服务中心", date: "原址转型", color: "#bcc86c" },
      { city: "金华", detail: "25 年老牌幼儿园 → 社区养老院", date: "2023.12 对外试运行", color: "#9fb6a6" },
    ];
    const map = cities.map((item, index) => {
      const x = 180 + index * 560;
      const y = 232 + (index === 1 ? 24 : 0);
      const active = (renderContext.view === 2 && index === 0) || (renderContext.view === 3 && index === 1);
      return `<div class="card" style="left:${x}px;top:${y}px;width:520px;height:520px;opacity:${cityIn * (0.55 + (active ? 0.45 : 0.12))};border-color:${active ? item.color : "rgba(243,237,224,.18)"}">
        <div style="position:absolute;left:0;right:0;top:0;height:255px;overflow:hidden">
          <img src="${clip(index === 0 ? "empty_playground" : index === 1 ? "courtyard_back" : "empty_corridor", local + index * 0.25, 0.58)}" style="width:100%;height:100%;object-fit:cover;filter:brightness(.48) saturate(.55);transform:scale(1.035)">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(8,14,11,.95),rgba(8,14,11,.1))"></div>
        </div>
        <div style="position:absolute;left:34px;top:228px;font-size:70px;font-weight:800;line-height:1;color:${item.color}">${item.city}</div>
        <div style="position:absolute;left:35px;top:320px;width:440px;font-size:29px;font-weight:700;line-height:1.42">${item.detail}</div>
        <div style="position:absolute;left:35px;bottom:31px;font-size:17px;letter-spacing:.08em;color:rgba(243,237,224,.48)">${item.date}</div>
      </div>`;
    }).join("");
    const fg = `
      ${eyebrow(112, 82, "空间账：能不能用，先用事实说话", "THE SPACE EQUATION", 0.92)}
      <div style="position:absolute;left:170px;top:150px;font-size:52px;font-weight:800;opacity:${1 - cityIn}">一边缺床位，一边空出校舍。</div>
      <div style="position:absolute;left:190px;top:278px;display:flex;align-items:stretch;gap:24px;opacity:${1 - cityIn};transform:translateY(${(1 - fast) * 18}px)">
        <div class="card" style="position:relative;width:400px;height:260px;padding:34px 38px">
          <div class="paper-label" style="color:rgba(243,237,224,.42)">供给端</div>
          <div style="margin-top:23px;font-size:56px;font-weight:800">空置校舍</div>
          <div style="margin-top:16px;font-size:20px;line-height:1.5;color:rgba(243,237,224,.55)">地址已经在社区里</div>
        </div>
        <div style="display:grid;place-items:center;width:100px;font-family:var(--num);font-size:95px;color:var(--meadow)">+</div>
        <div class="card" style="position:relative;width:400px;height:260px;padding:34px 38px">
          <div class="paper-label" style="color:rgba(243,237,224,.42)">需求端</div>
          <div style="margin-top:23px;font-size:56px;font-weight:800;color:var(--clay-hot)">养老床位</div>
          <div style="margin-top:16px;font-size:20px;line-height:1.5;color:rgba(243,237,224,.55)">需求就在熟悉生活圈</div>
        </div>
        <div style="display:grid;place-items:center;width:100px;font-family:var(--num);font-size:95px;color:var(--meadow)">=</div>
        <div class="card" style="position:relative;width:430px;height:260px;padding:34px 38px;border-color:rgba(188,200,108,.5)">
          <div class="paper-label" style="color:rgba(243,237,224,.42)">可能的结果</div>
          <div style="margin-top:23px;font-size:50px;font-weight:800;color:var(--meadow-hot)">社区养老设施</div>
          <div style="margin-top:16px;font-size:20px;line-height:1.5;color:rgba(243,237,224,.55)">快，是因为不用从零起楼</div>
        </div>
      </div>
      <div style="position:absolute;left:245px;top:620px;width:1320px;padding:22px 30px;border-left:4px solid var(--clay);background:rgba(7,13,10,.62);font-size:30px;font-weight:700;opacity:${1 - cityIn}">
        近，是因为老人不离开熟悉的社区。<span style="margin-left:24px;color:var(--clay-hot)">但别急着把它当答案。</span>
      </div>
      <div style="position:absolute;left:180px;top:146px;font-size:52px;font-weight:800;opacity:${cityIn}">不是一栋楼的故事，是很多城市同时发生。</div>
      ${map}
      <div class="city-pin" style="left:118px;top:22px;opacity:.55"></div>
      ${photo("signage", 1448, 655, 360, 234, "心理疏导区 / 评估区", local, { rotate: -1.4 })}
      <div class="tag" style="left:112px;bottom:154px">公开报道中的三类改造路径</div>
    `;
    return `${S.L(c, cp, 0.24, world("forest"), { br: 0.9 })}${S.L(c, cp, 0.55, `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,13,10,.2),rgba(7,13,10,.78))"></div>`, { br: 0.9 })}${S.L(c, cp, 0.36, depthField(), { o: 0.23 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot4(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 960, y: 485, s: 1.02 }, to: { x: 990, y: 500, s: 1.06 }, d: 0.85, amp: 1.35 },
        { base: { x: 495, y: 470, s: 1.085 }, to: { x: 540, y: 490, s: 1.055 }, d: 0.8, amp: 1.35 },
        { base: { x: 1260, y: 465, s: 1.09 }, to: { x: 1205, y: 495, s: 1.055 }, d: 0.8, amp: 1.35 },
        { base: { x: 1420, y: 700, s: 1.08 }, to: { x: 1340, y: 670, s: 1.04 }, d: 0.8, amp: 1.35 },
      ], 0.0036),
      local,
    );
    const steps = smooth(cue("s06", "刷墙", -0.14), cue("s06", "消防", 0.28), t);
    const bath = smooth(cue("s06", "消防", -0.14), cue("s06", "浴室", 0.25), t);
    const fire = smooth(cue("s06", "消防", -0.14), cue("s06", "消防", 0.26), t);
    const meal = smooth(cue("s06", "送餐", -0.14), cue("s06", "送餐", 0.3), t);
    const fg = `
      ${eyebrow(112, 82, "第二层 · 照护从哪来", "CARE IS NOT A COAT OF PAINT", 0.92)}
      <div style="position:absolute;left:112px;top:137px;font-size:54px;font-weight:800">刷墙换牌子？这不叫改造。</div>
      <div class="paper" style="left:192px;top:222px;width:1455px;height:585px;padding:35px 42px;transform:rotateX(2.2deg) rotateY(-2.6deg)">
        <div style="position:absolute;left:42px;top:32px;font-size:22px;font-weight:800;letter-spacing:.08em;color:rgba(17,36,26,.52)">适老化改造平面示意 / 非工程图纸</div>
        <div style="position:absolute;left:48px;top:103px;width:1030px;height:410px;border:4px solid #1b2d23;background:
          linear-gradient(90deg,rgba(19,34,26,.09) 1px,transparent 1px),
          linear-gradient(rgba(19,34,26,.08) 1px,transparent 1px);
          background-size:72px 72px">
          <div style="position:absolute;left:0;top:0;width:230px;height:100%;background:rgba(188,200,108,.14);border-right:4px solid #1b2d23">
            <div style="margin:28px 24px;font-size:27px;font-weight:800;color:#26372c">活动室</div>
            <div style="position:absolute;left:22px;bottom:22px;width:180px;height:60px;background:repeating-linear-gradient(90deg,#d46d4f 0 22px,#d46d4f 22px 25px);opacity:${steps};box-shadow:0 10px 0 rgba(212,109,79,.25)"></div>
          </div>
          <div style="position:absolute;left:230px;top:0;width:800px;height:126px;border-bottom:4px solid #1b2d23;background:rgba(243,237,224,.35)">
            <div style="padding:22px 28px;font-size:27px;font-weight:800;color:#26372c">原幼儿园走廊 → 无障碍通道</div>
            <div style="position:absolute;left:34px;right:35px;top:75px;height:4px;background:linear-gradient(90deg,#bcc86c,transparent);opacity:${bath}"></div>
            <div style="position:absolute;right:28px;top:45px;font-family:var(--num);font-size:56px;color:#d46d4f">→</div>
          </div>
          <div style="position:absolute;left:230px;top:126px;width:800px;height:284px;display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#1b2d23">
            <div style="background:#efe9dc;padding:29px">
              <div style="font-size:26px;font-weight:800;color:#203328">浴室 / 浴椅</div>
              <div style="margin-top:17px;font-size:18px;line-height:1.55;color:rgba(20,41,29,.58)">去掉门槛<br>留出轮椅回转空间</div>
            </div>
            <div style="background:#efe9dc;padding:29px">
              <div style="font-size:26px;font-weight:800;color:#203328">老年食堂</div>
              <div style="margin-top:17px;font-size:18px;line-height:1.55;color:rgba(20,41,29,.58)">院内堂食<br>社区送餐</div>
            </div>
          </div>
          <div style="position:absolute;left:24px;bottom:24px;font-size:20px;font-weight:700;color:#9c3f2b;opacity:${steps}">原台阶 / 错层：先整平</div>
        </div>
        <div style="position:absolute;right:46px;top:111px;width:290px">
          <div style="font-size:29px;font-weight:800">四个硬指标</div>
          <div style="margin-top:24px;padding:17px 18px;border-left:5px solid #d46d4f;background:rgba(212,109,79,${0.08 + steps * 0.14});font-size:23px;line-height:1.35">台阶、错层<br><b style="font-size:17px;color:rgba(20,41,29,.48)">整平</b></div>
          <div style="margin-top:13px;padding:17px 18px;border-left:5px solid #bcc86c;background:rgba(188,200,108,${0.08 + bath * 0.17});font-size:23px;line-height:1.35">扶手、浴室<br><b style="font-size:17px;color:rgba(20,41,29,.48)">无障碍</b></div>
          <div style="margin-top:13px;padding:17px 18px;border-left:5px solid #d46d4f;background:rgba(212,109,79,${0.08 + fire * 0.14});font-size:23px;line-height:1.35">消防系统<br><b style="font-size:17px;color:rgba(20,41,29,.48)">按养老机构升级</b></div>
          <div style="margin-top:13px;padding:17px 18px;border-left:5px solid #759081;background:rgba(117,144,129,${0.08 + meal * 0.18});font-size:23px;line-height:1.35">送餐动线<br><b style="font-size:17px;color:rgba(20,41,29,.48)">与照护流线分开</b></div>
        </div>
      </div>
      ${photo("handrail", 236, 654, 356, 176, "扶手 + 消防标识", local, { opacity: bath, rotate: -1.2 })}
      ${photo("fire_equipment", 1515, 654, 300, 176, "消防设施", local, { opacity: fire, rotate: 1.3 })}
      <div class="tag" style="left:112px;bottom:154px">济南案例：扶手、无障碍浴室、消防升级</div>
    `;
    return `${S.L(c, cp, 0.24, world("sage"), { br: 0.9 })}${S.L(c, cp, 0.36, depthField(), { o: 0.23 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot5(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 940, y: 515, s: 1.03 }, to: { x: 990, y: 500, s: 1.07 }, d: 0.9 },
        { base: { x: 620, y: 505, s: 1.07 }, to: { x: 690, y: 520, s: 1.055 }, d: 0.8 },
        { base: { x: 1110, y: 515, s: 1.075 }, to: { x: 1040, y: 530, s: 1.05 }, d: 0.8 },
        { base: { x: 960, y: 660, s: 1.075 }, to: { x: 960, y: 620, s: 1.04 }, d: 0.8 },
      ], 0.0042),
      local,
    );
    const need = smooth(cue("s07", "护理", -0.14), cue("s07", "护理", 0.3), t);
    const role = smooth(cue("s07", "原园长", -0.14), cue("s07", "养老院长", 0.34), t);
    const young = smooth(cue("s07", "年轻人", -0.14), cue("s07", "房租", 0.34), t);
    const partial = smooth(cue("s07", "但这只是补充", -0.12), cueEnd("s07", "。", 0.2), t);
    const fg = `
      ${eyebrow(112, 82, "第二层 · 照护从哪来", "CARE NEEDS PEOPLE, NOT JUST BEDS", 0.92)}
      <div style="position:absolute;left:950px;top:165px;width:810px">
        <div style="font-size:58px;line-height:1.2;font-weight:800;opacity:${need}">床位有了，<br><span style="color:var(--meadow-hot)">护理不会从墙里长出来。</span></div>
        <div style="margin-top:21px;font-size:23px;line-height:1.5;color:rgba(243,237,224,.56)">改建筑只是开门，真正每天发生的是照护。</div>
      </div>
      ${photo("empty_beds", 112, 174, 760, 390, "济南 · 改造后的长托房间", local, { rotate: -0.7 })}
      <div class="card" style="left:112px;top:600px;width:470px;height:195px;padding:25px 30px;border-color:rgba(188,200,108,.45);opacity:${0.5 + role * 0.5}">
        <div class="paper-label" style="color:rgba(243,237,224,.42)">补充一</div>
        <div style="margin-top:14px;font-size:36px;font-weight:800">原园长转岗</div>
        <div style="margin-top:10px;font-size:21px;line-height:1.45;color:rgba(243,237,224,.55)">熟悉社区，但仍需护理培训</div>
      </div>
      <div class="card" style="left:618px;top:600px;width:470px;height:195px;padding:25px 30px;border-color:rgba(212,109,79,.45);opacity:${0.5 + young * 0.5}">
        <div class="paper-label" style="color:rgba(243,237,224,.42)">补充二</div>
        <div style="margin-top:14px;font-size:36px;font-weight:800">年轻人换房租</div>
        <div style="margin-top:10px;font-size:21px;line-height:1.45;color:rgba(243,237,224,.55)">补陪伴，不等于补专业照护</div>
      </div>
      <div class="card" style="left:1124px;top:600px;width:620px;height:195px;padding:25px 30px;border-style:dashed;border-color:rgba(243,237,224,.38);opacity:${0.45 + partial * 0.55}">
        <div class="paper-label" style="color:rgba(243,237,224,.42)">仍然缺的</div>
        <div style="margin-top:14px;font-size:36px;font-weight:800;color:var(--clay-hot)">稳定的人手与运营</div>
        <div style="margin-top:10px;font-size:21px;line-height:1.45;color:rgba(243,237,224,.55)">工资、排班、专业能力、持续投入</div>
      </div>
      <div style="position:absolute;left:950px;top:405px;padding:11px 18px;border:1px solid rgba(212,109,79,.55);color:var(--clay-hot);font-size:20px;font-weight:800;opacity:${partial}">这些是补充，不是整套答案</div>
      <div class="tag" style="left:112px;bottom:154px">齐鲁网 · 济南案例与代际共居报道</div>
    `;
    return `${S.L(c, cp, 0.24, world("forest"), { br: 0.9 })}${S.L(c, cp, 0.36, depthField(), { o: 0.23 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot6(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 950, y: 520, s: 1.03 }, to: { x: 985, y: 500, s: 1.075 }, d: 1.0 },
        { base: { x: 650, y: 500, s: 1.08 }, to: { x: 720, y: 520, s: 1.05 }, d: 0.9 },
      ], 0.0044),
      local,
    );
    const rent = smooth(cue("s08", "房租", -0.16), cue("s08", "房租", 0.25), t);
    const pressure = smooth(cue("s08", "陪伴", -0.12), cue("s08", "房租", 0.3), t);
    const fg = `
      ${eyebrow(112, 82, "年轻人住进养老院，用服务换房租", "INTERGENERATIONAL LIVING", 0.92)}
      <div style="position:absolute;left:112px;top:160px;width:690px">
        <div style="font-size:58px;line-height:1.22;font-weight:800">陪伴是资源，<br>房租也是压力。</div>
        <div style="margin-top:25px;font-size:22px;line-height:1.55;color:rgba(243,237,224,.56)">南宁五象养老服务中心公开招募示例<br>具体时长和减免标准以机构当期规则为准</div>
      </div>
      ${photo("empty_corridor", 880, 142, 878, 396, "养老院走廊 · 代际共居发生在日常生活里", local, { rotate: 0.6 })}
      <div class="card" style="left:126px;top:458px;width:718px;height:250px;padding:34px 40px;border-color:rgba(188,200,108,.48);opacity:${0.56 + rent * 0.44}">
        <div class="paper-label" style="color:rgba(243,237,224,.42)">每月志愿服务</div>
        <div class="metric meadow" style="position:relative;font-size:180px;margin-top:4px">30–50<span style="font-family:var(--han);font-size:46px;margin-left:8px">小时</span></div>
        <div style="position:absolute;right:36px;bottom:34px;font-size:23px;color:rgba(243,237,224,.58)">文化娱乐 / 结对陪伴 / 生活协助</div>
      </div>
      <div style="position:absolute;left:855px;top:548px;width:240px;height:48px">
        <div style="position:absolute;left:0;right:0;top:23px;height:2px;background:linear-gradient(90deg,rgba(188,200,108,.2),rgba(188,200,108,.9),rgba(188,200,108,.2))"></div>
        <div style="position:absolute;right:0;top:8px;font-family:var(--num);font-size:54px;color:var(--meadow)">→</div>
      </div>
      <div class="card" style="left:1094px;top:458px;width:704px;height:250px;padding:34px 40px;border-color:rgba(212,109,79,.48);opacity:${0.5 + rent * 0.5}">
        <div class="paper-label" style="color:rgba(243,237,224,.42)">每月租金减免</div>
        <div class="metric clay" style="position:relative;font-size:180px;margin-top:4px">500–1000<span style="font-family:var(--han);font-size:46px;margin-left:8px">元</span></div>
        <div style="position:absolute;right:36px;bottom:34px;font-size:23px;color:rgba(243,237,224,.58)">30 小时抵 500 / 50 小时抵 1000</div>
      </div>
      <div style="position:absolute;left:358px;top:760px;width:1230px;text-align:center;opacity:${pressure}">
        <div style="font-size:43px;font-weight:800;color:${pressure ? "var(--cream)" : "rgba(243,237,224,.25)"}">时间换租金：一头是年轻人的住房压力，一头是老人需要的陪伴。</div>
      </div>
      <div class="tag" style="left:112px;bottom:154px">新华社 · 2026.10.20 代际共居报道</div>
    `;
    return `${S.L(c, cp, 0.24, world("clay"), { br: 0.9 })}${S.L(c, cp, 0.36, depthField(), { o: 0.23 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot7(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 950, y: 510, s: 1.03 }, to: { x: 980, y: 500, s: 1.07 }, d: 0.9 },
        { base: { x: 650, y: 475, s: 1.09 }, to: { x: 710, y: 500, s: 1.055 }, d: 0.85 },
        { base: { x: 1240, y: 515, s: 1.085 }, to: { x: 1185, y: 520, s: 1.05 }, d: 0.85 },
      ], 0.0036),
      local,
    );
    const age = smooth(cue("s08", "90", -0.14), cue("s08", "90", 0.28), t);
    const children = smooth(cue("s08", "6个", -0.14), cue("s08", "6个", 0.26), t);
    const amount = smooth(cue("s08", "700", -0.14), cue("s08", "700", 0.3), t);
    const bg = `
      ${S.demote(clip("empty_corridor", local, 0.56), { br: 0.19, sat: 0.25, bl: 4.2 })}
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,8,.92),rgba(12,15,11,.6) 50%,rgba(8,10,8,.92))"></div>
      <div class="case-stamp" style="right:104px;top:86px;opacity:.22">民法典<br>赡养</div>
    `;
    const fg = `
      ${eyebrow(112, 82, "最难的一步，不在施工图里", "WHO DECIDES?", 0.92)}
      <div class="paper" style="left:146px;top:176px;width:1628px;height:690px;padding:50px 60px;transform:rotate(-0.45deg)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="paper-label">赡养纠纷 / 公开报道</div>
            <div style="margin-top:14px;font-size:47px;font-weight:800;color:#17271e">重庆 · 苏大爷把 6 名子女告上法庭</div>
          </div>
          <div style="padding:8px 14px;border:1px solid rgba(167,58,41,.45);color:#9c3f2b;font-size:18px;font-weight:800;letter-spacing:.08em">2026.10.25 报道</div>
        </div>
        <div style="position:absolute;left:60px;top:176px;display:grid;grid-template-columns:290px 260px 390px;gap:36px;align-items:end">
          <div>
            <div class="metric clay" style="position:relative;font-size:205px;opacity:${age}">90<span style="font-family:var(--han);font-size:54px">+</span></div>
            <div style="margin-top:4px;font-size:22px;font-weight:800;color:rgba(20,41,29,.52);opacity:${age}">岁 · 苏大爷</div>
          </div>
          <div>
            <div class="metric" style="position:relative;font-size:205px;opacity:${children}">6</div>
            <div style="margin-top:4px;font-size:22px;font-weight:800;color:rgba(20,41,29,.52);opacity:${children}">名子女</div>
          </div>
          <div>
            <div class="metric clay" style="position:relative;font-size:205px;opacity:${amount}">700<span style="font-family:var(--han);font-size:44px">元</span></div>
            <div style="margin-top:4px;font-size:22px;font-weight:800;color:rgba(20,41,29,.52);opacity:${amount}">每人 / 每月</div>
          </div>
        </div>
        <div style="position:absolute;left:60px;top:505px;width:950px;font-size:29px;line-height:1.55;color:#24372c">
          他提出的不是一句“想住养老院”，而是三件事：<br>
          <b>支付赡养费 · 送他去养老院 · 定期探望</b>
        </div>
        <div style="position:absolute;right:64px;top:490px;width:470px;padding:28px 30px;background:rgba(21,36,27,.08);border-left:5px solid #9c3f2b">
          <div style="font-size:18px;font-weight:800;letter-spacing:.12em;color:rgba(20,41,29,.42)">争议表面是费用</div>
          <div style="margin-top:13px;font-size:37px;font-weight:800;line-height:1.25;color:#17271e">真正的问题是：<br>养老方式谁说了算？</div>
        </div>
      </div>
      <div class="tag" style="left:112px;bottom:154px">人民网 / 正义网 · 公开案例报道</div>
    `;
    return `${S.L(c, cp, 0.24, world("clay"), { br: 0.9 })}${S.L(c, cp, 0.54, bg, { br: 0.9 })}${S.L(c, cp, 0.36, depthField(), { o: 0.22 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot8(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 950, y: 510, s: 1.03 }, to: { x: 980, y: 500, s: 1.07 }, d: 0.9 },
        { base: { x: 740, y: 500, s: 1.065 }, to: { x: 820, y: 520, s: 1.05 }, d: 0.75 },
        { base: { x: 1160, y: 505, s: 1.07 }, to: { x: 1080, y: 525, s: 1.045 }, d: 0.8 },
      ], 0.0038),
      local,
    );
    const care = smooth(cue("s09", "谁来照护", -0.14), cue("s09", "谁来照护", 0.28), t);
    const decide = smooth(cue("s09", "老人怎么选", -0.14), cue("s09", "老人怎么选", 0.3), t);
    const fg = `
      ${eyebrow(112, 82, "把结论压缩成三个问题", "SPACE ≠ CARE ≠ CHOICE", 0.92)}
      <div style="position:absolute;left:112px;top:142px;width:1696px;text-align:center;font-size:55px;font-weight:800">空间改造，只是第一道门。</div>
      <div class="card" style="left:118px;top:255px;width:510px;height:390px;padding:34px 38px;border-color:rgba(188,200,108,.58)">
        <div style="font-family:var(--num);font-size:48px;color:var(--meadow)">01 / SPACE</div>
        <div style="margin-top:18px;font-size:55px;font-weight:800;line-height:1.12">能不能改</div>
        <div style="margin-top:22px;font-size:25px;line-height:1.5;color:rgba(243,237,224,.62)">决定空间。<br>空校舍能不能变成社区设施。</div>
        <div style="position:absolute;left:38px;bottom:30px;font-size:18px;letter-spacing:.1em;color:rgba(243,237,224,.35)">已经发生</div>
      </div>
      <div class="card" style="left:704px;top:255px;width:510px;height:390px;padding:34px 38px;border-color:rgba(212,109,79,.58);opacity:${0.58 + care * 0.42}">
        <div style="font-family:var(--num);font-size:48px;color:var(--clay-hot)">02 / CARE</div>
        <div style="margin-top:18px;font-size:55px;font-weight:800;line-height:1.12">谁来照护</div>
        <div style="margin-top:22px;font-size:25px;line-height:1.5;color:rgba(243,237,224,.62)">决定服务。<br>人、钱、培训、排班能不能持续。</div>
        <div style="position:absolute;left:38px;bottom:30px;font-size:18px;letter-spacing:.1em;color:rgba(243,237,224,.35)">决定能不能长期运转</div>
      </div>
      <div class="card" style="left:1290px;top:255px;width:510px;height:390px;padding:34px 38px;border-color:rgba(243,237,224,.38);opacity:${0.58 + decide * 0.42}">
        <div style="font-family:var(--num);font-size:48px;color:var(--cream)">03 / CHOICE</div>
        <div style="margin-top:18px;font-size:55px;font-weight:800;line-height:1.12">老人怎么选</div>
        <div style="margin-top:22px;font-size:25px;line-height:1.5;color:rgba(243,237,224,.62)">决定为谁而做。<br>子女有义务，老人也有选择权。</div>
        <div style="position:absolute;left:38px;bottom:30px;font-size:18px;letter-spacing:.1em;color:rgba(243,237,224,.35)">最后一道关</div>
      </div>
      <div style="position:absolute;left:250px;top:692px;width:1420px;text-align:center;font-size:34px;font-weight:800;color:var(--cream)">
        空间 ≠ 服务 ≠ 选择权。<span style="color:var(--meadow-hot)">改造是开门，不是通关。</span>
      </div>
      <div class="tag" style="left:112px;bottom:154px">三层都成立，才是社区养老</div>
    `;
    return `${S.L(c, cp, 0.24, world("sage"), { br: 0.9 })}${S.L(c, cp, 0.36, depthField(), { o: 0.23 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function shot9(t) {
    const local = t - renderContext.start;
    const [c, cp] = layerPair(
      (tt) => framing(tt, [
        { base: { x: 960, y: 520, s: 1.04 }, to: { x: 990, y: 500, s: 1.085 }, d: 0.9, amp: 1.3 },
        { base: { x: 500, y: 460, s: 1.065 }, to: { x: 990, y: 485, s: 0.985 }, d: 1.5, amp: 1.3 },
      ], 0.0032),
      local,
    );
    const answer = smooth(cue("s10", "不是答案", -0.15), cue("s10", "不是答案", 0.3), t);
    const step = smooth(cue("s10", "第一步", -0.18), cueEnd("s10", "。", 0.25), t);
    const bg = `
      ${S.demote(clip("courtyard_back", local, 0.46), { br: 0.24, sat: 0.4, bl: 2.2 })}
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,12,9,.86),rgba(6,12,9,.35) 48%,rgba(6,12,9,.86))"></div>
    `;
    const fg = `
      ${eyebrow(112, 82, "结论 / 幼改老到底改变了什么", "THE FIRST STEP, NOT THE ANSWER", 0.9)}
      <div style="position:absolute;left:260px;top:180px;width:1000px">
        <div style="font-size:31px;font-weight:700;color:rgba(243,237,224,.58)">所以，“幼改老”</div>
        <div style="margin-top:18px;font-size:118px;font-weight:800;line-height:1.02;opacity:${answer}">不是答案。</div>
      </div>
      <div style="position:absolute;right:170px;top:260px;width:600px;text-align:right;opacity:${step}">
        <div style="font-size:25px;color:rgba(243,237,224,.55)">它解决的是空间入口</div>
        <div style="margin-top:20px;font-size:61px;font-weight:800;color:var(--meadow-hot)">只是第一步</div>
        <div style="margin-top:18px;height:1px;background:linear-gradient(to left,rgba(188,200,108,.75),transparent)"></div>
        <div style="margin-top:23px;font-size:35px;font-weight:700;color:rgba(243,237,224,.72)">再接上照护系统，才走得下去。</div>
      </div>
      <div style="position:absolute;left:270px;top:560px;opacity:${step};display:flex;gap:18px">
        ${["空间", "照护", "选择权"].map((label, index) => `<div style="padding:15px 24px;border:1px solid ${index === 2 ? "rgba(188,200,108,.7)" : "rgba(243,237,224,.2)"};font-size:23px;font-weight:800;color:${index === 2 ? "var(--meadow-hot)" : "rgba(243,237,224,.55)"}">${label}</div>`).join("")}
      </div>
      <div style="position:absolute;left:112px;right:112px;bottom:205px;height:1px;background:rgba(243,237,224,.16)"></div>
      <div class="tag" style="left:112px;bottom:154px">从“能住”走到“能长期照顾”</div>
    `;
    return `${S.L(c, cp, 0.24, world("forest"), { br: 0.9 })}${S.L(c, cp, 0.52, bg, { br: 0.96 })}${S.L(c, cp, 0.36, depthField(), { o: 0.24 })}${S.L(c, cp, 1.16, fg)}${S.L(c, cp, 1.42, motionField(), { o: 0.25 })}${grain()}`;
  }

  function broll(name, local, duration, label, detail) {
    const [c, cp] = layerPair(
      (tt) => S.camPath(
        tt,
        { t: 0, x: 960, y: 540, s: 1.03 },
        [{ t: 0.04, d: Math.max(0.7, duration - 0.08), to: { x: 990, y: 525, s: 1.105 } }],
        0.012,
      ),
      local,
    );
    const image = `<img src="${clip(name, local, 0.82)}" style="position:absolute;left:-2%;top:-2%;width:104%;height:104%;object-fit:cover;filter:brightness(.7) saturate(.72)">`;
    const shade = `<div style="position:absolute;inset:0;background:
      linear-gradient(90deg,rgba(5,10,8,.54),transparent 32%,transparent 72%,rgba(5,10,8,.42)),
      linear-gradient(to top,rgba(5,10,8,.62),transparent 32%)"></div>`;
    const tag = `<div style="position:absolute;left:106px;bottom:128px;padding-left:19px;border-left:3px solid var(--meadow);">
      <div style="font-size:23px;font-weight:800;color:rgba(243,237,224,.9)">${label}</div>
      <div style="margin-top:8px;font-size:17px;letter-spacing:.08em;color:rgba(243,237,224,.48)">${detail}</div>
    </div>`;
    return `${S.L(c, cp, 0.9, `${image}${shade}`)}${S.L(c, cp, 1.08, tag, { mb: false })}${grain()}`;
  }

  function brollA(t, window) {
    const local = t - window.start;
    return broll("empty_playground", local, window.end - window.start, "济南 · 空置幼儿园活动场", "实录 / 改造前");
  }

  function brollB(t, window) {
    const local = t - window.start;
    return broll("courtyard_back", local, window.end - window.start, "改造后的院落", "实录 / 社区使用");
  }

  function brollC(t, window) {
    const local = t - window.start;
    return broll("fire_equipment", local, window.end - window.start, "消防设施升级", "实录 / 改造后");
  }

  function brollD(t, window) {
    const local = t - window.start;
    return broll("signage", local, window.end - window.start, "评估区 / 认知训练", "实录 / 改造后");
  }

  const scenes = [shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot8, shot9];

  function sceneAt(t) {
    const window = bRollWindows.find((item) => t >= item.start && t < item.end);
    if (window) {
      renderContext = { start: window.start, end: window.end, shot: 0, view: 0 };
      return window.kind === "a"
        ? brollA(t, window)
        : window.kind === "b"
          ? brollB(t, window)
          : window.kind === "c"
            ? brollC(t, window)
            : brollD(t, window);
    }
    renderContext = segments.find((segment) => t >= segment.start && t < segment.end)
      ?? segments[segments.length - 1];
    return scenes[renderContext.shot - 1](t);
  }

  async function seek(t) {
    const clamped = Math.max(0, Math.min(duration - 1 / FPS, t));
    stage.innerHTML = `${S.DEFS}${sceneAt(clamped)}${subtitleAt(clamped)}`;
    fitStage();
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(stage.querySelectorAll("img")).map(async (image) => {
        if (!image.complete) {
          await new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          });
        }
        if (image.decode) await image.decode().catch(() => {});
      }),
    );
  }

  window.seek = seek;
  window.ready = (async () => {
    fitStage();
    await document.fonts.ready;
    await seek(0);
  })();
})();
