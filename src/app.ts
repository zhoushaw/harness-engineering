import "./atlas.css";

type StrategyId =
  "context-compaction" | "jev-tool-pruning" | "jev-web-evidence";
type CompactionMode = "summary" | "hard";
type Step = { title: string; detail: string };
type Strategy = {
  id: StrategyId;
  number: string;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  steps: Step[];
  takeaway: string;
  cost: string;
  sources: { label: string; url: string }[];
};

const strategies: Strategy[] = [
  {
    id: "context-compaction",
    number: "01",
    category: "上下文管理",
    title: "上下文压缩",
    subtitle: "当窗口快满时，如何把任务接到下一段？",
    description:
      "跟随一次真实感的 Agent 循环：用户提出任务，模型发出工具调用，结果持续进入上下文，直到触发交接。",
    accent: "mint",
    steps: [
      { title: "任务开始", detail: "当前窗口为空，新的用户任务即将进入。" },
      {
        title: "用户输入",
        detail: "用户目标与约束进入当前上下文，成为后续判断的基准。",
      },
      {
        title: "LLM 调用工具",
        detail: "模型先说明下一步，再发出 tool call；调用本身也进入历史。",
      },
      {
        title: "工具结果返回",
        detail: "工具输出回到模型，错误位置等精确细节占用更多上下文。",
      },
      {
        title: "多轮循环",
        detail: "模型继续分析、调用工具、接收结果；历史不断增长。",
      },
      {
        title: "占用达到 80%",
        detail: "示意阈值被触发。80% 是动画设定，不代表 Codex 的固定阈值。",
      },
      {
        title: "生成摘要",
        detail: "Harness 请求模型提炼目标、关键发现与下一步，形成交接内容。",
      },
      {
        title: "切换窗口",
        detail: "旧窗口内容退出当前上下文；新窗口接收摘要与必要的近期消息。",
      },
      {
        title: "继续执行",
        detail:
          "模型在更小的上下文中继续任务。若遗漏关键细节，后续可能需要重新查询。",
      },
    ],
    takeaway: "压缩的核心是把“下一步需要的状态”带进新窗口，让长任务能继续。",
    cost: "摘要会改写旧记录，文件路径、错误文本或约束可能丢失。需要校验交接内容。",
    sources: [
      {
        label: "OpenAI API · Compaction",
        url: "https://developers.openai.com/api/docs/guides/compaction",
      },
      {
        label: "Codex · compact.rs",
        url: "https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs",
      },
      {
        label: "Codex · models.json",
        url: "https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json",
      },
    ],
  },
  {
    id: "jev-tool-pruning",
    number: "02",
    category: "上下文管理",
    title: "Jev 工具记录筛选",
    subtitle: "工具历史很大，哪些值得继续携带？",
    description:
      "观察 tool call 与 result 怎样成对进入历史，再根据任务相关性被保留、截短或移除。",
    accent: "violet",
    steps: [
      {
        title: "任务目标",
        detail: "Agent 正在修复授权测试；后续判断都围绕这个目标。",
      },
      {
        title: "工具记录累积",
        detail: "测试错误、代码搜索和目录列表陆续进入上下文。",
      },
      { title: "Jev 判断", detail: "决策层对每组调用与结果评估后续价值。" },
      {
        title: "三种处置",
        detail: "关键证据原样保留，次要结果截短，过时噪声成对移除。",
      },
      {
        title: "继续工作",
        detail: "下一轮保有精确错误位置，同时减少低价值输出的占用。",
      },
    ],
    takeaway:
      "只筛工具历史，用户目标与关键证据保持原样；调用与结果必须成对处理。",
    cost: "相关性判断可能误删后来才有用的线索，需设保底规则与可恢复路径。",
    sources: [
      {
        label: "fast-jev-compaction",
        url: "https://github.com/tamaratran/fast-jev-compaction",
      },
      { label: "Jev API", url: "https://www.jevai.org/docs" },
    ],
  },
  {
    id: "jev-web-evidence",
    number: "03",
    category: "检索与证据",
    title: "Jev 网页证据过滤",
    subtitle: "网页很长，让相关段落先通过。",
    description:
      "从搜索网址到抓取网页，再到段落判断，让问题相关的证据带着来源进入上下文。",
    accent: "orange",
    steps: [
      {
        title: "提出问题",
        detail: "Agent 带着具体问题搜索，避免只凭主题词收集整页内容。",
      },
      {
        title: "搜索结果",
        detail: "搜索工具返回多个候选网址，质量与主题各不相同。",
      },
      {
        title: "筛选网址",
        detail: "先判断哪些结果更可能回答问题，再决定抓取顺序。",
      },
      {
        title: "抓取并分段",
        detail: "Harness 访问网页，将正文、导航和旁支信息拆成段落。",
      },
      {
        title: "证据入窗",
        detail:
          "只把相关片段与可追溯网址送给 Agent；不确定项交给更强模型复核。",
      },
    ],
    takeaway: "在网页进入主模型上下文之前，先按原问题筛选证据。",
    cost: "过早过滤可能漏掉反例；保留来源链接和低置信度回退很重要。",
    sources: [
      { label: "Jev API", url: "https://www.jevai.org/docs" },
      { label: "psearch", url: "https://github.com/komikat/psearch" },
    ],
  },
];

const futureGroups = ["工具编排", "记忆与状态", "安全与控制"];
const app = document.querySelector<HTMLDivElement>("#app")!;
let mode: CompactionMode = "summary";
let stepIndex = 0;
let activeStrategy: Strategy | undefined;
let playing = false;
let timer: number | undefined;
let autoStartObserver: IntersectionObserver | undefined;
let interacted = false;

function route(): Strategy | undefined {
  const match = location.hash.match(/^#\/patterns\/([a-z-]+)/);
  return strategies.find((strategy) => strategy.id === match?.[1]);
}

function link(strategy: Strategy) {
  return "#/patterns/" + strategy.id;
}

function brand() {
  return '<span class="brand-symbol"><i></i><i></i><i></i><i></i></span><span>HARNESS <em>/ ATLAS</em></span>';
}

function header(isDetail: boolean) {
  return (
    '<header class="site-header">' +
    '<a class="brand" href="#/" aria-label="Harness Atlas 首页">' +
    brand() +
    "</a>" +
    '<nav class="header-links"><a class="' +
    (!isDetail ? "is-current" : "") +
    '" href="#/">首页</a>' +
    '<a class="' +
    (isDetail ? "is-current" : "") +
    '" href="#/patterns/context-compaction">策略图鉴</a>' +
    '<a href="https://github.com/zhoushaw/harness-engineering" target="_blank" rel="noopener noreferrer">GitHub ↗</a></nav>' +
    '<span class="header-count">FIELD GUIDE <b>003 / ∞</b></span>' +
    (isDetail
      ? '<button class="mobile-menu" type="button" id="menu-toggle" aria-label="打开策略目录">☰</button>'
      : "") +
    "</header>"
  );
}

function homeCard(strategy: Strategy) {
  return (
    '<a class="library-card accent-' +
    strategy.accent +
    '" href="' +
    link(strategy) +
    '">' +
    '<div class="card-top"><span>' +
    strategy.number +
    " / " +
    strategy.category +
    "</span><span>↗</span></div>" +
    '<div class="card-visual"><i></i><i></i><i></i><span>' +
    (strategy.id === "context-compaction" ? "Σ" : "J") +
    "</span></div>" +
    "<h3>" +
    strategy.title +
    "</h3><p>" +
    strategy.subtitle +
    "</p>" +
    '<div class="card-bottom"><span>查看动态演示</span><b>→</b></div></a>'
  );
}

function home() {
  document.title = "Harness Atlas — Agent Harness 设计模式图鉴";
  return (
    header(false) +
    '<main class="home-page">' +
    '<section class="home-hero"><div class="hero-eyebrow"><span></span> AGENT HARNESS DESIGN PATTERNS / 2026</div>' +
    '<div class="hero-grid"><div><h1>把 Agent Harness 的<br><span>关键设计</span>讲清楚。</h1>' +
    "<p>每条策略都有一段可暂停、可回看的信息流。看见输入怎样进入 Agent，Harness 在哪里做决定，以及下一轮究竟保留了什么。</p>" +
    '<a class="primary-link" href="#/patterns/context-compaction">从上下文压缩开始 <strong>↗</strong></a></div>' +
    '<div class="hero-flow" aria-hidden="true"><div class="flow-grid"></div><div class="flow-node node-user">USER <small>目标</small></div><div class="flow-node node-agent">AGENT <small>循环</small></div><div class="flow-node node-harness">HARNESS <small>决策</small></div><div class="flow-node node-next">NEXT <small>继续</small></div><div class="flow-line line-one"></div><div class="flow-line line-two"></div><div class="flow-line line-three"></div><span class="hero-flow-label">FIG. 01 — FOLLOW THE INFORMATION</span></div></div></section>' +
    '<section class="library-section" id="library"><div class="section-heading"><div><span class="overline">PATTERN LIBRARY / 当前已收录</span><h2>按策略找答案</h2></div><p>左侧目录会随模式库增长。先从具体流程入手，再比较它们如何改善上下文和执行表现。</p></div>' +
    '<div class="library-meta"><span>01 — 上下文管理</span><span>02 — 检索与证据</span><span>03 — 持续扩充</span></div>' +
    '<div class="library-grid">' +
    strategies.map(homeCard).join("") +
    "</div>" +
    '<div class="future-strip"><div><span class="overline">COMING NEXT</span><h3>模式库会继续扩展</h3></div><div>' +
    futureGroups
      .map((group) => "<span>" + group + " <b>+</b></span>")
      .join("") +
    "</div></div>" +
    "</section></main>" +
    footer()
  );
}

function sidebar(current: Strategy) {
  const groups = ["上下文管理", "检索与证据"];
  return (
    '<aside class="detail-sidebar" id="detail-sidebar"><a class="back-link" href="#/">← 返回图鉴首页</a>' +
    '<div class="sidebar-title"><span class="overline">EXPLORE</span><strong>策略目录</strong><small>已收录 ' +
    strategies.length +
    " 个模式</small></div>" +
    groups
      .map((group) => {
        const entries = strategies.filter(
          (strategy) => strategy.category === group,
        );
        return (
          '<div class="sidebar-group"><div class="sidebar-group-title">' +
          group +
          "<span>0" +
          entries.length +
          "</span></div>" +
          entries
            .map(
              (strategy) =>
                '<a class="sidebar-item ' +
                (strategy.id === current.id ? "active" : "") +
                '" href="' +
                link(strategy) +
                '"' +
                (strategy.id === current.id ? ' aria-current="page"' : "") +
                '><span class="item-number">' +
                strategy.number +
                "</span><span>" +
                strategy.title +
                "</span><b>→</b></a>",
            )
            .join("") +
          "</div>"
        );
      })
      .join("") +
    '<div class="sidebar-future"><span class="overline">FUTURE CATEGORIES</span>' +
    futureGroups
      .map((group) => "<div>" + group + " <span>待添加</span></div>")
      .join("") +
    "</div>" +
    '<div class="sidebar-note">每段动画都能逐步查看。图中的阈值、比例与评分是教学示意，不是产品基准测试。</div>' +
    "</aside>"
  );
}

function contextBoard() {
  const hard = mode === "hard";
  const payloadName = hard ? "checkpoint" : "压缩摘要";
  return (
    '<div class="board-grid context-grid">' +
    '<section class="board-window old-window"><div class="window-head"><span class="window-light"></span><span>当前上下文</span><small>WINDOW A</small></div>' +
    '<div class="window-feed old-feed"><div class="empty-state">等待用户输入<span>_</span></div>' +
    '<div class="sequence-item message user" data-at="1"><small>USER · 输入</small><p>检查登录失败，修复授权逻辑；保留旧接口兼容。</p></div>' +
    '<div class="sequence-item message agent" data-at="2"><small>LLM · 响应</small><p>我先定位鉴权代码和失败测试。</p></div>' +
    '<div class="sequence-item message tool-call" data-at="2"><small>TOOL CALL</small><code>rg "authorize" src/</code></div>' +
    '<div class="sequence-item message tool-result" data-at="3"><small>TOOL RESULT</small><code>auth.ts:84 · legacy rule conflict</code></div>' +
    '<div class="sequence-item message agent" data-at="4"><small>LLM · 下一轮</small><p>找到了冲突，运行定向测试确认。</p></div>' +
    '<div class="sequence-item message tool-call" data-at="4"><small>TOOL CALL</small><code>npm test -- auth.spec.ts</code></div>' +
    '<div class="sequence-item message tool-result" data-at="4"><small>TOOL RESULT</small><code>1 failed · expected 200, got 403</code></div>' +
    '<div class="sequence-item threshold-event" data-at="5">⚡ 达到演示触发点 · 80%</div>' +
    '<div class="cleared-state">旧消息已移出当前窗口<div>历史不再逐项占用新窗口</div></div></div>' +
    '<div class="window-usage"><div><span>上下文占用</span><strong id="old-usage">0%</strong></div><div class="usage-track"><i id="old-meter"></i></div><small>演示触发点 80%</small></div></section>' +
    '<div class="processor-lane"><div class="lane-line"></div><div class="processor"><span class="processor-top">HARNESS ACTION</span><div class="processor-core">' +
    (hard ? "↗" : "Σ") +
    "</div><strong>" +
    (hard ? "保存任务状态" : "请求摘要压缩") +
    "</strong><small>" +
    (hard ? "写入 notes" : "LLM 提炼历史") +
    '</small></div><div class="processor-result sequence-item" data-at="6"><b>' +
    payloadName +
    '</b><span>目标 · 发现 · 下一步</span></div><div class="moving-packet">' +
    (hard ? "NOTES" : "SUMMARY") +
    " →</div></div>" +
    '<section class="board-window next-window"><div class="window-head"><span class="window-light"></span><span>新上下文</span><small>WINDOW B</small></div><div class="window-feed new-feed"><div class="empty-state">等待交接内容<span>_</span></div>' +
    '<div class="sequence-item payload-card" data-at="7"><small>' +
    (hard ? "CHECKPOINT / NOTES" : "COMPACTED SUMMARY") +
    "</small><strong>" +
    (hard ? "读取任务 checkpoint" : "载入任务摘要") +
    "</strong><p>目标：修复授权逻辑<br>发现：auth.ts:84 存在规则冲突<br>下一步：修改后重跑测试</p></div>" +
    '<div class="sequence-item message agent continuation" data-at="8"><small>LLM · 继续执行</small><p>继续处理 auth.ts 的规则冲突。</p></div></div>' +
    '<div class="window-usage"><div><span>上下文占用</span><strong id="new-usage">0%</strong></div><div class="usage-track"><i id="new-meter"></i></div><small>从精简状态继续</small></div></section></div>'
  );
}

function toolBoard() {
  return (
    '<div class="board-grid generic-grid"><section class="generic-column"><div class="column-head">01 / 工具历史 <span>CALL + RESULT</span></div>' +
    '<div class="goal-card sequence-item" data-at="0">当前目标：修复授权测试的 403 错误</div>' +
    '<div class="tool-pair sequence-item" data-at="1"><small>PAIR A · 测试失败</small><code>npm test → 403 at auth.ts:84</code></div>' +
    '<div class="tool-pair sequence-item" data-at="1"><small>PAIR B · 代码搜索</small><code>rg "auth" → 63 matches</code></div>' +
    '<div class="tool-pair sequence-item low-value" data-at="1"><small>PAIR C · 目录列表</small><code>ls node_modules → 1124 lines</code></div></section>' +
    '<div class="generic-center"><div class="processor"><span class="processor-top">DECISION LAYER</span><div class="processor-core">J</div><strong>Jev 判断价值</strong><small>围绕当前任务评分</small></div>' +
    '<div class="score-stack sequence-item" data-at="2"><span>0.97 <b>KEEP</b></span><span>0.68 <b>TRIM</b></span><span>0.08 <b>DROP</b></span></div><div class="moving-packet">DECIDE →</div></div>' +
    '<section class="generic-column result-column"><div class="column-head">02 / 下一轮上下文 <span>VERBATIM</span></div><div class="empty-state">等待筛选结果<span>_</span></div>' +
    '<div class="decision-card sequence-item" data-at="3"><small>KEEP · 保留原文</small><code>403 at auth.ts:84</code></div>' +
    '<div class="decision-card trim sequence-item" data-at="3"><small>TRIM · 截短结果</small><code>rg "auth" → 63 matches …</code></div>' +
    '<div class="decision-card drop sequence-item" data-at="3"><small>DROP · 成对移除</small><code>目录列表不再进入下一轮</code></div>' +
    '<div class="resume-card sequence-item" data-at="4">Agent 带着精确错误位置继续修复 →</div></section></div>'
  );
}

function webBoard() {
  return (
    '<div class="board-grid generic-grid"><section class="generic-column"><div class="column-head">01 / 搜索 <span>QUERY</span></div><div class="goal-card sequence-item" data-at="0">问题：Codex 压缩后会保留哪些信息？</div>' +
    '<div class="tool-pair sequence-item" data-at="1"><small>SEARCH RESULT A</small><code>OpenAI Compaction guide</code></div>' +
    '<div class="tool-pair sequence-item low-value" data-at="1"><small>SEARCH RESULT B</small><code>社交媒体评论串</code></div>' +
    '<div class="tool-pair sequence-item" data-at="1"><small>SEARCH RESULT C</small><code>Codex compact.rs</code></div>' +
    '<div class="selection-note sequence-item" data-at="2">优先抓取 A / C，跳过 B</div></section>' +
    '<div class="generic-center"><div class="processor"><span class="processor-top">SEARCH → FETCH</span><div class="processor-core">J</div><strong>相关性过滤</strong><small>网址与段落两次判断</small></div><div class="fetch-lines sequence-item" data-at="3"><span>导航 / 页脚 <b>DROP</b></span><span>关键段落 <b>KEEP</b></span><span>推荐阅读 <b>DROP</b></span></div><div class="moving-packet">EVIDENCE →</div></div>' +
    '<section class="generic-column result-column"><div class="column-head">02 / 证据包 <span>SOURCE + TEXT</span></div><div class="empty-state">等待网页证据<span>_</span></div>' +
    '<div class="payload-card sequence-item" data-at="4"><small>RELEVANT EVIDENCE</small><strong>只送入相关段落</strong><p>压缩项携带继续执行所需的关键状态；保留原始来源链接供核对。</p><code>developers.openai.com ↗</code></div><div class="resume-card sequence-item" data-at="4">低置信度结果 → 更强模型复核</div></section></div>'
  );
}

function simulation(strategy: Strategy) {
  const steps = strategy.steps;
  return (
    '<section class="simulation"><div class="simulation-head"><div><span class="overline">INTERACTIVE WALKTHROUGH</span><h2>让流程动起来</h2></div><span class="simulation-note">示意场景 · 无实时模型请求</span></div>' +
    (strategy.id === "context-compaction"
      ? '<div class="mode-control" role="group" aria-label="交接模式"><button data-mode="summary" class="' +
        (mode === "summary" ? "selected" : "") +
        '">摘要压缩</button><button data-mode="hard" class="' +
        (mode === "hard" ? "selected" : "") +
        '">新窗口硬切</button><span>硬切为实验路径 · 80% 为演示阈值</span></div>'
      : "") +
    '<div class="simulation-board accent-' +
    strategy.accent +
    '" id="simulation-board">' +
    '<div class="board-topline"><span><i></i> LIVE TRACE</span><span>' +
    strategy.number +
    " / " +
    strategy.category +
    '</span><span id="board-state">READY</span></div>' +
    (strategy.id === "context-compaction"
      ? contextBoard()
      : strategy.id === "jev-tool-pruning"
        ? toolBoard()
        : webBoard()) +
    '<div class="board-footline"><span>INPUT</span><span>HARNESS DECISION</span><span>CONTINUE</span></div></div>' +
    '<div class="player"><div class="player-main"><div class="player-caption"><span id="step-counter">01 / 0' +
    steps.length +
    '</span><strong id="step-title">' +
    steps[0].title +
    "</strong></div>" +
    '<div class="player-buttons"><button id="restart" aria-label="从头播放" title="从头播放">↺</button><button id="previous" aria-label="上一步" title="上一步">←</button><button class="play-button" id="play-toggle" aria-label="播放">▶ <span>播放演示</span></button><button id="next" aria-label="下一步" title="下一步">→</button></div></div>' +
    '<div class="step-rail" role="group" aria-label="动画步骤">' +
    steps
      .map(
        (item, index) =>
          '<button class="step-point" data-step="' +
          index +
          '" aria-label="第 ' +
          (index + 1) +
          " 步：" +
          item.title +
          '"><span>' +
          String(index + 1).padStart(2, "0") +
          "</span><i></i></button>",
      )
      .join("") +
    "</div>" +
    '<p class="step-explanation" id="step-explanation" aria-live="polite">' +
    steps[0].detail +
    "</p></div></section>"
  );
}

function detail(strategy: Strategy) {
  document.title = strategy.title + " — Harness Atlas";
  const next =
    strategies[(strategies.indexOf(strategy) + 1) % strategies.length];
  return (
    header(true) +
    '<main class="detail-layout">' +
    sidebar(strategy) +
    '<div class="detail-main"><div class="breadcrumb"><a href="#/">模式图鉴</a><span>/</span><span>' +
    strategy.category +
    "</span><span>/</span><strong>" +
    strategy.title +
    "</strong></div>" +
    '<section class="detail-intro accent-' +
    strategy.accent +
    '"><span class="detail-index">PATTERN ' +
    strategy.number +
    " / " +
    strategy.category +
    "</span><h1>" +
    strategy.title +
    '<span class="title-period">.</span></h1><h2>' +
    strategy.subtitle +
    "</h2><p>" +
    strategy.description +
    '</p><div class="intro-tags"><span>' +
    strategy.category +
    '</span><span>动态流程</span><span>可逐步回放</span></div><button class="intro-start" id="start-demo" type="button">播放完整流程 <span>↓</span></button></section>' +
    simulation(strategy) +
    '<section class="analysis-section"><div class="analysis-heading"><span class="overline">WHY IT MATTERS</span><h2>看懂收益，也看见代价。</h2></div><div class="analysis-grid"><div class="analysis-card"><span>01 / 解决什么</span><p>' +
    strategy.takeaway +
    '</p></div><div class="analysis-card"><span>02 / 需要注意</span><p>' +
    strategy.cost +
    "</p></div></div>" +
    '<div class="source-row"><span>资料与实现参考</span>' +
    strategy.sources
      .map(
        (source) =>
          '<a href="' +
          source.url +
          '" target="_blank" rel="noopener noreferrer">' +
          source.label +
          " ↗</a>",
      )
      .join("") +
    "</div></section>" +
    '<a class="next-strategy" href="' +
    link(next) +
    '"><span>下一条策略 <b>0' +
    (strategies.indexOf(next) + 1) +
    " / 03</b></span><strong>" +
    next.title +
    "</strong><i>→</i></a>" +
    "</div></main>" +
    footer()
  );
}

function footer() {
  return '<footer class="site-footer"><span>HARNESS <em>/ ATLAS</em> © 2026</span><p>用动态信息流解释 Agent Harness 的设计模式。</p><a href="https://github.com/zhoushaw/harness-engineering" target="_blank" rel="noopener noreferrer">SOURCE CODE ↗</a></footer>';
}

function stopPlayback() {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
  playing = false;
  updatePlayButton();
}

function updatePlayButton() {
  const button = document.querySelector<HTMLButtonElement>("#play-toggle");
  if (!button) return;
  button.setAttribute("aria-label", playing ? "暂停" : "播放");
  button.innerHTML = playing
    ? "Ⅱ <span>暂停演示</span>"
    : "▶ <span>播放演示</span>";
}

function currentSteps(): Step[] {
  if (!activeStrategy) return [];
  if (activeStrategy.id !== "context-compaction" || mode === "summary")
    return activeStrategy.steps;
  return activeStrategy.steps.map((item, index) =>
    index === 6
      ? {
          title: "保存 checkpoint",
          detail:
            "实验性新窗口路径先把目标、进度和引用写入 notes，而不是生成摘要。",
        }
      : index === 7
        ? {
            title: "切换窗口",
            detail:
              "旧窗口内容退出当前上下文；新窗口读取 checkpoint，需要时再用 history 找回细节。",
          }
        : index === 8
          ? {
              title: "继续执行",
              detail:
                "模型依据 checkpoint 继续任务，并按引用查找必要的旧记录。",
            }
          : item,
  );
}

function setStep(next: number) {
  const steps = currentSteps();
  if (!steps.length) return;
  stepIndex = Math.max(0, Math.min(steps.length - 1, next));
  const board = document.querySelector<HTMLElement>("#simulation-board");
  if (!board) return;
  board.dataset.step = String(stepIndex);
  board.classList.toggle("has-events", stepIndex > 0);
  board.classList.toggle(
    "is-triggered",
    activeStrategy?.id === "context-compaction" && stepIndex >= 5,
  );
  board.classList.toggle(
    "is-processing",
    stepIndex >= (activeStrategy?.id === "context-compaction" ? 6 : 2),
  );
  board.classList.toggle(
    "is-transferred",
    activeStrategy?.id === "context-compaction" && stepIndex >= 7,
  );
  board.classList.toggle(
    "has-result",
    stepIndex >=
      (activeStrategy?.id === "context-compaction"
        ? 7
        : activeStrategy?.id === "jev-tool-pruning"
          ? 3
          : 4),
  );
  board
    .querySelectorAll<HTMLElement>("[data-at]")
    .forEach((item) =>
      item.classList.toggle("shown", Number(item.dataset.at) <= stepIndex),
    );
  const state = document.querySelector<HTMLElement>("#board-state");
  if (state)
    state.textContent =
      stepIndex === 0
        ? "READY"
        : stepIndex === steps.length - 1
          ? "COMPLETE"
          : "RUNNING";
  const counter = document.querySelector<HTMLElement>("#step-counter");
  if (counter)
    counter.textContent =
      String(stepIndex + 1).padStart(2, "0") +
      " / " +
      String(steps.length).padStart(2, "0");
  const title = document.querySelector<HTMLElement>("#step-title");
  if (title) title.textContent = steps[stepIndex].title;
  const explanation = document.querySelector<HTMLElement>("#step-explanation");
  if (explanation) explanation.textContent = steps[stepIndex].detail;
  document
    .querySelectorAll<HTMLButtonElement>(".step-point")
    .forEach((point, index) => {
      point.classList.toggle("current", index === stepIndex);
      point.classList.toggle("completed", index <= stepIndex);
      point.setAttribute("aria-pressed", String(index === stepIndex));
    });
  const previous = document.querySelector<HTMLButtonElement>("#previous");
  const nextButton = document.querySelector<HTMLButtonElement>("#next");
  if (previous) previous.disabled = stepIndex === 0;
  if (nextButton) nextButton.disabled = stepIndex === steps.length - 1;
  if (activeStrategy?.id === "context-compaction") {
    const usage = [0, 12, 24, 46, 68, 80, 80, 0, 0][stepIndex];
    const newUsage = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      mode === "hard" ? 12 : 18,
      mode === "hard" ? 20 : 25,
    ][stepIndex];
    const oldText = document.querySelector("#old-usage");
    const newText = document.querySelector("#new-usage");
    const oldMeter = document.querySelector<HTMLElement>("#old-meter");
    const newMeter = document.querySelector<HTMLElement>("#new-meter");
    if (oldText) oldText.textContent = usage + "%";
    if (newText) newText.textContent = newUsage + "%";
    if (oldMeter) oldMeter.style.width = usage + "%";
    if (newMeter) newMeter.style.width = newUsage + "%";
  }
}

function togglePlayback() {
  if (playing) {
    stopPlayback();
    return;
  }
  if (stepIndex >= currentSteps().length - 1) setStep(0);
  playing = true;
  updatePlayButton();
  timer = window.setInterval(() => {
    if (stepIndex >= currentSteps().length - 1) {
      stopPlayback();
      return;
    }
    setStep(stepIndex + 1);
    if (stepIndex >= currentSteps().length - 1) stopPlayback();
  }, 1750);
}

function attachEvents() {
  document.querySelector("#start-demo")?.addEventListener("click", () => {
    interacted = true;
    autoStartObserver?.disconnect();
    stopPlayback();
    setStep(0);
    togglePlayback();
    document
      .querySelector(".simulation")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document
    .querySelector("#menu-toggle")
    ?.addEventListener("click", () =>
      document.body.classList.toggle("sidebar-open"),
    );
  document
    .querySelectorAll<HTMLAnchorElement>(".sidebar-item")
    .forEach((item) =>
      item.addEventListener("click", () =>
        document.body.classList.remove("sidebar-open"),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-mode]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        interacted = true;
        autoStartObserver?.disconnect();
        stopPlayback();
        mode = button.dataset.mode as CompactionMode;
        if (activeStrategy) render();
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-step]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        interacted = true;
        autoStartObserver?.disconnect();
        stopPlayback();
        setStep(Number(button.dataset.step));
      }),
    );
  document.querySelector("#play-toggle")?.addEventListener("click", () => {
    interacted = true;
    autoStartObserver?.disconnect();
    togglePlayback();
  });
  document.querySelector("#restart")?.addEventListener("click", () => {
    interacted = true;
    autoStartObserver?.disconnect();
    stopPlayback();
    setStep(0);
    togglePlayback();
  });
  document.querySelector("#previous")?.addEventListener("click", () => {
    interacted = true;
    autoStartObserver?.disconnect();
    stopPlayback();
    setStep(stepIndex - 1);
  });
  document.querySelector("#next")?.addEventListener("click", () => {
    interacted = true;
    autoStartObserver?.disconnect();
    stopPlayback();
    setStep(stepIndex + 1);
  });
}

function render() {
  autoStartObserver?.disconnect();
  stopPlayback();
  document.body.classList.remove("sidebar-open");
  activeStrategy = route();
  stepIndex = 0;
  interacted = false;
  app.innerHTML = activeStrategy ? detail(activeStrategy) : home();
  attachEvents();
  if (activeStrategy) {
    setStep(0);
    const board = document.querySelector("#simulation-board");
    if (board && "IntersectionObserver" in window) {
      autoStartObserver = new IntersectionObserver(
        (entries) => {
          if (
            entries.some((entry) => entry.isIntersecting) &&
            !interacted &&
            !playing
          ) {
            autoStartObserver?.disconnect();
            togglePlayback();
          }
        },
        { threshold: 0.55 },
      );
      autoStartObserver.observe(board);
    }
  }
}

window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
});
document.addEventListener("keydown", (event) => {
  if (
    !activeStrategy ||
    (event.target instanceof HTMLElement &&
      ["BUTTON", "A", "INPUT"].includes(event.target.tagName))
  )
    return;
  if (event.key === "ArrowRight") {
    interacted = true;
    autoStartObserver?.disconnect();
    stopPlayback();
    setStep(stepIndex + 1);
  }
  if (event.key === "ArrowLeft") {
    interacted = true;
    autoStartObserver?.disconnect();
    stopPlayback();
    setStep(stepIndex - 1);
  }
  if (event.code === "Space") {
    event.preventDefault();
    interacted = true;
    autoStartObserver?.disconnect();
    togglePlayback();
  }
});
render();
