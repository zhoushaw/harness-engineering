import "./style.css";

type SceneId = "codex" | "jev-compact" | "jev-web";
type Mode = "hard" | "summary";

type Scene = {
  id: SceneId;
  number: string;
  eyebrow: string;
  title: string;
  short: string;
  description: string;
  steps: string[];
  narrations: string[];
  before: number;
  after: number;
  accent: string;
};

const scenes: Scene[] = [
  {
    id: "codex",
    number: "01",
    eyebrow: "CONTEXT WINDOW",
    title: "上下文压缩",
    short: "窗口切换 vs 摘要桥接",
    description:
      "当工作记录逼近上下文上限，Harness 需要决定如何把“继续任务所需的状态”交给下一窗口。",
    steps: ["原始上下文", "触发阈值", "整理交接", "继续执行"],
    narrations: [
      "用户目标、推理、工具调用与输出逐渐占满当前窗口。",
      "Harness 检测到 token 预算接近上限，开始准备跨窗口交接。",
      "先保存任务状态，再切换窗口；旧窗口内容不会自动进入新窗口。",
      "新窗口读取简短 checkpoint，需要细节时通过 history 定位旧记录。",
    ],
    before: 100,
    after: 18,
    accent: "mint",
  },
  {
    id: "jev-compact",
    number: "02",
    eyebrow: "TOOL HISTORY",
    title: "Jev · 工具记录筛选",
    short: "保留证据，清走噪声",
    description:
      "对成对的 tool call / result 判断后续任务价值：保留关键证据、缩短次要输出、移除过时记录。",
    steps: ["完整记录", "相关性评分", "三种处置", "紧凑上下文"],
    narrations: [
      "工具历史往往比用户消息更大：目录列表、命令日志和搜索结果反复累积。",
      "Jev 依据当前目标给每组 tool call + result 一个保留价值判断。",
      "重要证据原样保留；次要输出截短；无关的调用与结果一起移除。",
      "下一轮仍能看见精确错误和路径，低价值工具输出不再占用窗口。",
    ],
    before: 100,
    after: 34,
    accent: "violet",
  },
  {
    id: "jev-web",
    number: "03",
    eyebrow: "SEARCH → FETCH",
    title: "Jev · 网页证据过滤",
    short: "只让相关段落进入上下文",
    description:
      "搜索给出候选网址；Harness 抓取网页后按问题评估段落，只把可追溯的相关证据送回 Agent。",
    steps: ["搜索目标", "筛选网址", "抓取并分段", "证据入窗"],
    narrations: [
      "Agent 的问题是明确的，但搜索结果和整页网页包含大量导航与旁支信息。",
      "先对搜索结果做相关性判断，优先访问有希望回答问题的网址。",
      "Harness 抓取页面并分段，再让 Jev 判断各段是否帮助回答原问题。",
      "保留相关段落、标题和来源链接；低置信度结果交给更强模型复核。",
    ],
    before: 100,
    after: 22,
    accent: "orange",
  },
];

const sources: Record<SceneId, { label: string; url: string }[]> = {
  codex: [
    {
      label: "OpenAI API · Compaction",
      url: "https://developers.openai.com/api/docs/guides/compaction",
    },
    {
      label: "Codex · 模型配置",
      url: "https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json",
    },
    {
      label: "Codex · 本地压缩实现",
      url: "https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs",
    },
  ],
  "jev-compact": [
    {
      label: "fast-jev-compaction · 源项目",
      url: "https://github.com/tamaratran/fast-jev-compaction",
    },
    { label: "Jev API · 决策类型", url: "https://www.jevai.org/docs" },
  ],
  "jev-web": [
    { label: "Jev API · score / choice", url: "https://www.jevai.org/docs" },
    {
      label: "psearch · Jev 引导搜索实例",
      url: "https://github.com/komikat/psearch",
    },
  ],
};

let current: SceneId = "codex";
let mode: Mode = "hard";
let step = 0;
let playing = false;
let timer: number | undefined;

const app = document.querySelector<HTMLDivElement>("#app")!;

function icon(name: string, size = 18) {
  const paths: Record<string, string> = {
    play: '<path d="m7 4 12 8-12 8V4Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 4v16M17 4v16"/>',
    arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    next: '<path d="m9 18 6-6-6-6"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    close: '<path d="M5 5 19 19M19 5 5 19"/>',
    reset: '<path d="M4 12a8 8 0 1 0 3-6M4 4v5h5"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function codexVisual() {
  const isHard = mode === "hard";
  return `<div class="diagram diagram-codex ${isHard ? "is-hard" : "is-summary"}">
    <div class="diagram-heading"><span>INPUT / 当前窗口</span><span>TRANSFER / 交接策略</span><span>OUTPUT / 新窗口</span></div>
    <div class="three-column">
      <div class="flow-panel input-panel">
        <div class="panel-label"><span class="panel-dot"></span> CURRENT CONTEXT <span class="panel-size">~100k tokens</span></div>
        <div class="history-stack">
          <div class="history-row core"><span class="row-icon">U</span><span>用户目标与约束</span><small>4k</small></div>
          <div class="history-row"><span class="row-icon">A</span><span>推理与计划</span><small>12k</small></div>
          <div class="history-row tool"><span class="row-icon">T</span><span>工具调用 × 18</span><small>26k</small></div>
          <div class="history-row tool"><span class="row-icon">R</span><span>工具输出 × 18</span><small>48k</small></div>
          <div class="history-row core"><span class="row-icon">U</span><span>最新用户指令</span><small>10k</small></div>
        </div>
        <div class="window-meter"><div></div></div>
        <div class="panel-foot">窗口容量接近上限 <strong>92%</strong></div>
      </div>
      <div class="process-panel">
        <div class="process-badge">${isHard ? "NEW CONTEXT" : "COMPACTION"}</div>
        <div class="process-orbit"><span class="orbit-ring"></span><span class="process-symbol">${isHard ? "↗" : "≋"}</span></div>
        <div class="process-title">${isHard ? "保存 checkpoint" : "生成压缩桥接"}</div>
        <p>${isHard ? "notes / history 提供可恢复线索" : "提炼目标、进度与关键结论"}</p>
        <div class="process-arrow">${icon("arrow", 22)}</div>
      </div>
      <div class="flow-panel output-panel">
        <div class="panel-label"><span class="panel-dot"></span> NEXT CONTEXT <span class="panel-size">${isHard ? "~18k" : "~27k"} tokens</span></div>
        <div class="result-placeholder">等待交接<span class="blink-cursor">_</span></div>
        <div class="result-stack">
          ${
            isHard
              ? `<div class="result-row kept"><span class="result-icon">✓</span><div><strong>任务 checkpoint</strong><small>目标 · 已完成 · 下一步</small></div></div>
          <div class="result-row kept"><span class="result-icon">↗</span><div><strong>history 引用</strong><small>需要时按 ID 找回细节</small></div></div>
          <div class="result-row faded"><span class="result-icon">—</span><div><strong>旧窗口全文</strong><small>不会自动带入</small></div></div>`
              : `<div class="result-row kept"><span class="result-icon">≋</span><div><strong>压缩摘要</strong><small>目标 · 决策 · 关键状态</small></div></div>
          <div class="result-row kept"><span class="result-icon">U</span><div><strong>近期用户消息</strong><small>保留最新指令</small></div></div>
          <div class="result-row faded"><span class="result-icon">—</span><div><strong>冗长旧记录</strong><small>由摘要替代</small></div></div>`
          }
        </div>
        <div class="output-foot">可继续工作 <span>${icon("check", 15)}</span></div>
      </div>
    </div>
    <div class="diagram-bottom"><span class="signal-dot"></span><span>${isHard ? "实验性新窗口路径 · 按模型和配置启用" : "本地文本摘要的概念示意 · API 也支持 opaque compaction item"}</span></div>
  </div>`;
}

function jevCompactVisual() {
  return `<div class="diagram diagram-jev">
    <div class="diagram-heading"><span>TOOL HISTORY / 待判断</span><span>JEV / 相关性</span><span>NEXT CONTEXT / 处置</span></div>
    <div class="jev-grid">
      <div class="tool-list">
        <div class="panel-label"><span class="panel-dot"></span> PAIRED CALL + RESULT</div>
        <div class="tool-item keep"><div class="tool-head"><span>01</span><strong>test: payment.spec</strong><em>关键失败</em></div><code>Expected 200, received 403<br>at auth.ts:84</code></div>
        <div class="tool-item trim"><div class="tool-head"><span>02</span><strong>rg "auth" src/</strong><em>次要线索</em></div><code>63 matches across 12 files<br>… 61 more lines</code></div>
        <div class="tool-item drop"><div class="tool-head"><span>03</span><strong>ls -la node_modules</strong><em>过时噪声</em></div><code>1124 package entries<br>… 1122 more lines</code></div>
      </div>
      <div class="score-column"><div class="jev-core"><div class="jev-core-inner">JEV</div><span>DECISION LAYER</span></div><div class="score-item keep">0.97 <span>KEEP</span></div><div class="score-item trim">0.68 <span>TRIM</span></div><div class="score-item drop">0.08 <span>DROP</span></div></div>
      <div class="decision-list"><div class="panel-label"><span class="panel-dot"></span> COMPACTED HISTORY</div>
        <div class="decision-item keep"><span class="decision-mark">${icon("check", 15)}</span><div><strong>保留原文</strong><small>精确错误与文件位置仍可见</small><code>403 · auth.ts:84</code></div></div>
        <div class="decision-item trim"><span class="decision-mark">···</span><div><strong>截短输出</strong><small>保留调用和少量摘要行</small><code>rg "auth" → 63 matches</code></div></div>
        <div class="decision-item drop"><span class="decision-mark">${icon("close", 14)}</span><div><strong>成对移除</strong><small>call 与 result 一起退出窗口</small></div></div>
      </div>
    </div>
    <div class="diagram-bottom"><span class="signal-dot"></span><span>评分与 token 数均为示意；真实阈值由 Harness 策略决定</span></div>
  </div>`;
}

function jevWebVisual() {
  return `<div class="diagram diagram-web">
    <div class="diagram-heading"><span>QUERY / 问题</span><span>SEARCH + FETCH / 过滤</span><span>CONTEXT / 证据</span></div>
    <div class="web-grid">
      <div class="query-panel"><div class="query-label">AGENT QUESTION <span class="tiny-star">✦</span></div><div class="query-text">“Codex 的上下文压缩，<br>会保留哪些信息？”</div><div class="query-tags"><span>Codex</span><span>compaction</span><span>retained state</span></div><div class="query-beam"></div></div>
      <div class="web-middle"><div class="search-bar"><span>⌕</span> web.search <small>3 results</small></div><div class="web-result relevant"><div><strong>OpenAI · Compaction guide</strong><small>developers.openai.com</small></div><span>0.96</span></div><div class="web-result irrelevant"><div><strong>社交媒体讨论串</strong><small>example.social</small></div><span>0.21</span></div><div class="web-result relevant second"><div><strong>Codex source · compact.rs</strong><small>github.com/openai/codex</small></div><span>0.91</span></div><div class="fetch-arrow">FETCH → SPLIT → SCORE</div><div class="page-sections"><div class="page-section irrelevant">导航 / 页脚 / 推荐阅读</div><div class="page-section relevant">“compaction item carries forward key prior state…”</div><div class="page-section irrelevant">不相关产品更新与链接列表</div></div></div>
      <div class="evidence-panel"><div class="panel-label"><span class="panel-dot"></span> EVIDENCE PACK</div><div class="evidence-empty">等待相关证据<span class="blink-cursor">_</span></div><div class="evidence-content"><div class="evidence-icon">↗</div><strong>相关段落 + 来源</strong><p>压缩项携带继续执行所需的关键状态；本地策略可能另外保留近期用户消息。</p><span>01 · developers.openai.com</span><span>02 · github.com/openai/codex</span></div></div>
    </div>
    <div class="diagram-bottom"><span class="signal-dot"></span><span>搜索、抓取和分段由 Harness 执行；Jev 只负责相关性判断</span></div>
  </div>`;
}

function render() {
  const scene = scenes.find((s) => s.id === current)!;
  const actualAfter =
    current === "codex" && mode === "summary" ? 27 : scene.after;
  app.innerHTML = `<div class="site-shell">
    <header class="topbar"><a class="brand" href="#top" aria-label="Harness Atlas 首页"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span>HARNESS<span class="brand-light"> / ATLAS</span></span></a><nav class="top-nav"><a href="#patterns">模式图鉴</a><a href="#method">设计方法</a><a href="https://github.com/zhoushaw/harness-engineering" target="_blank" rel="noopener noreferrer">GitHub ${icon("arrow", 14)}</a></nav><span class="edition">INTERACTIVE FIELD GUIDE <b>01—03</b></span></header>
    <main id="top"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-line"></span> AGENT HARNESS DESIGN PATTERNS <span class="eyebrow-index">/ 001</span></div><h1>让上下文<br><span class="accent-script">更聪明地</span>流动。</h1><p>用可交互动画，看懂 Agent Harness 如何压缩历史、筛选证据，并把有限的上下文留给真正重要的下一步。</p><a class="hero-cta" href="#patterns">探索设计模式 <span>${icon("arrow", 18)}</span></a></div><div class="hero-visual" aria-hidden="true"><div class="visual-grid"></div><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><div class="hero-center"><span>CONTEXT</span><strong>→</strong><span>DECISION</span></div><div class="float-card float-a"><span>01</span><b>COMPACT</b><i></i></div><div class="float-card float-b"><span>02</span><b>FILTER</b><i></i></div><div class="float-card float-c"><span>03</span><b>CONTINUE</b><i></i></div><span class="corner-label top-left">FIG. 01 / INFORMATION FLOW</span><span class="corner-label bottom-right">↓ SCROLL TO EXPLORE</span></div></section>
    <section id="patterns" class="patterns-section"><div class="section-intro"><span class="section-kicker">THE PATTERN LIBRARY <b>— 01</b></span><div><h2>三条信息流，<br><em>同一种分析语言。</em></h2><p>点击模式，逐步观察信息进入、判断、离开与保留。绿色代表保留，紫色代表处理，橙色代表待验证。</p></div></div>
      <div class="workbench"><aside class="scene-nav"><div class="aside-title">EXPLORE / 模式</div>${scenes.map((s) => `<button class="scene-tab ${s.id === current ? "active" : ""}" data-scene="${s.id}" aria-current="${s.id === current ? "true" : "false"}"><span class="tab-num">${s.number}</span><span class="tab-main"><strong>${s.title}</strong><small>${s.short}</small></span><span class="tab-arrow">${icon("arrow", 17)}</span></button>`).join("")}<div class="aside-note"><span class="note-icon">✳</span><p>所有演示均可暂停、逐步查看。数值为示意，不代表实测性能。</p></div></aside>
        <article class="scene-content accent-${scene.accent}"><div class="scene-top"><div><span class="scene-eyebrow">${scene.number} / ${scene.eyebrow}</span><h3>${scene.title}</h3><p>${scene.description}</p></div><button class="fullscreen-btn" id="fullscreen" title="全屏查看图解" aria-label="全屏查看图解">${icon("expand", 18)}</button></div>
        ${current === "codex" ? `<div class="mode-switch" role="group" aria-label="上下文压缩模式"><button class="${mode === "hard" ? "selected" : ""}" data-mode="hard">硬切 · 新窗口</button><button class="${mode === "summary" ? "selected" : ""}" data-mode="summary">摘要 · 桥接</button></div>` : ""}
        <div class="visual-stage stage-${step}" id="visual-stage">${current === "codex" ? codexVisual() : current === "jev-compact" ? jevCompactVisual() : jevWebVisual()}</div>
        <div class="playback"><div class="playback-top"><div class="step-indicator"><span class="pulse-dot"></span> STEP <b>0${step + 1}</b><span class="step-divider">/</span> 0${scene.steps.length}<strong>${scene.steps[step]}</strong></div><div class="playback-buttons"><button id="reset" title="重播" aria-label="重播">${icon("reset", 17)}</button><button id="prev" title="上一步" aria-label="上一步" ${step === 0 ? "disabled" : ""}>${icon("back", 18)}</button><button id="play" class="play-button" aria-label="${playing ? "暂停" : "播放"}">${icon(playing ? "pause" : "play", 18)}</button><button id="next" title="下一步" aria-label="下一步" ${step === 3 ? "disabled" : ""}>${icon("next", 18)}</button></div></div><div class="timeline">${scene.steps.map((label, i) => `<button class="timeline-stop ${i <= step ? "reached" : ""} ${i === step ? "current" : ""}" data-step="${i}" aria-label="第 ${i + 1} 步：${label}"><span></span><small>${label}</small></button>`).join("")}</div><p class="narration" aria-live="polite">${current === "codex" && mode === "summary" && step > 1 ? (step === 2 ? "把较早历史整理成摘要桥接，保留近期用户消息；逐字细节可能丢失。" : "新窗口接收摘要与近期用户消息，在更小的上下文中继续执行。") : scene.narrations[step]}</p></div>
        <div class="insight-row"><div class="metric"><span>CONTEXT LOAD <small>示意</small></span><div class="metric-values"><strong>${scene.before}%</strong><span>${icon("arrow", 18)}</span><strong>${actualAfter}%</strong></div><div class="metric-bar"><i style="width:${actualAfter}%"></i></div></div><div class="insight"><span>CORE IDEA</span><p>${current === "codex" ? (mode === "hard" ? "交接的是 checkpoint 和可检索线索。" : "交接的是凝练后的状态，旧内容被改写。") : current === "jev-compact" ? "让决策模型判断哪些工具记录值得继续携带。" : "网页内容进入上下文前，先按问题筛选证据。"}</p></div></div>
        <div class="sources"><span>SOURCES & NOTES</span>${sources[current].map((s) => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label} ↗</a>`).join("")}</div></article></div></section>
      <section id="method" class="method-section"><div class="method-head"><span class="section-kicker">THE METHOD <b>— 02</b></span><h2>每个优化，都能回答三个问题。</h2></div><div class="method-grid"><div class="method-card"><span>01 / SIGNAL</span><h3>信息从哪里来？</h3><p>用户指令、工具输出或搜索网页，都用明确的入口进入流程。</p><div class="method-graphic signal-graphic"><i></i><i></i><i></i><i></i></div></div><div class="method-card"><span>02 / DECISION</span><h3>按什么判断？</h3><p>展示判断依据、阈值与可复核路径，而不是只展示一条神奇的捷径。</p><div class="method-graphic decision-graphic"><i>?</i><i>✓</i><i>×</i></div></div><div class="method-card"><span>03 / EFFECT</span><h3>改变了什么？</h3><p>对比被移除的信息与保留下来的证据，让收益和代价都可见。</p><div class="method-graphic effect-graphic"><i></i><i></i></div></div></div></section>
    </main><footer><div class="footer-brand">HARNESS / ATLAS <span>© 2026</span></div><p>一个持续扩充的 Agent Harness 设计模式图鉴。</p><a href="#top">回到顶部 ↑</a></footer>
  </div>`;
  attachEvents();
}

function clearPlayback() {
  if (timer) window.clearInterval(timer);
  timer = undefined;
  playing = false;
}
function setStep(next: number) {
  step = Math.max(0, Math.min(3, next));
  render();
}
function startPlayback() {
  if (playing) {
    clearPlayback();
    render();
    return;
  }
  if (step === 3) step = 0;
  playing = true;
  render();
  timer = window.setInterval(() => {
    if (step >= 3) {
      clearPlayback();
      render();
      return;
    }
    step++;
    render();
    if (step === 3) {
      clearPlayback();
      render();
    }
  }, 2200);
}
function attachEvents() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-scene]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        clearPlayback();
        current = button.dataset.scene as SceneId;
        step = 0;
        render();
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-mode]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        clearPlayback();
        mode = button.dataset.mode as Mode;
        step = 0;
        render();
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-step]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        clearPlayback();
        setStep(Number(button.dataset.step));
      }),
    );
  document.querySelector("#reset")?.addEventListener("click", () => {
    clearPlayback();
    setStep(0);
  });
  document.querySelector("#prev")?.addEventListener("click", () => {
    clearPlayback();
    setStep(step - 1);
  });
  document.querySelector("#next")?.addEventListener("click", () => {
    clearPlayback();
    setStep(step + 1);
  });
  document.querySelector("#play")?.addEventListener("click", startPlayback);
  document.querySelector("#fullscreen")?.addEventListener("click", async () => {
    const el = document.querySelector<HTMLElement>("#visual-stage");
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  });
}
document.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLElement &&
    ["BUTTON", "A", "INPUT"].includes(event.target.tagName)
  )
    return;
  if (event.key === "ArrowRight") {
    clearPlayback();
    setStep(step + 1);
  }
  if (event.key === "ArrowLeft") {
    clearPlayback();
    setStep(step - 1);
  }
  if (event.code === "Space") {
    event.preventDefault();
    startPlayback();
  }
});
render();
