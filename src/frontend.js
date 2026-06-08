export function renderAppHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>M2M</title>
  <script src="https://js-cdn.music.apple.com/musickit/v1/musickit.js"></script>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f6f7;
      --surface: #ffffff;
      --surface-2: #f0f2f4;
      --ink: #17191f;
      --text: #2b3038;
      --muted: #69717d;
      --faint: #8b949e;
      --line: #d9dee5;
      --line-strong: #c2c9d2;
      --accent: #d94848;
      --accent-strong: #b83232;
      --accent-soft: #fff0ef;
      --danger: #b42318;
      --warning: #9a6500;
      --ok: #19734d;
      --ok-soft: #e9f7f1;
      --warning-soft: #fff5dc;
      --danger-soft: #fdebea;
      --shadow: 0 18px 44px rgba(23, 25, 31, 0.08);
      --radius: 8px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        linear-gradient(180deg, #ffffff 0, var(--bg) 320px),
        var(--bg);
      color: var(--text);
      letter-spacing: 0;
    }

    button, input {
      font: inherit;
      letter-spacing: 0;
    }

    button {
      -webkit-tap-highlight-color: transparent;
    }

    .app {
      width: min(1180px, calc(100vw - 40px));
      margin: 0 auto;
      padding: 24px 0 46px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 56px;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .mark {
      position: relative;
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: var(--radius);
      background: var(--ink);
      color: #fff;
      font-size: 12px;
      font-weight: 820;
    }

    .mark::after {
      content: "";
      position: absolute;
      right: -4px;
      bottom: 7px;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--accent);
      border: 2px solid #fff;
    }

    h1 {
      margin: 0;
      color: var(--ink);
      font-size: 21px;
      line-height: 1.15;
      font-weight: 780;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 13px;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 324px;
      gap: 22px;
      align-items: start;
    }

    .panel {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .main-panel {
      min-height: 650px;
      padding: 0;
      overflow: hidden;
    }

    .side-panel {
      position: sticky;
      top: 18px;
      display: grid;
      gap: 22px;
      padding: 20px;
      box-shadow: none;
    }

    .view {
      display: none;
      min-height: 650px;
      animation: view-in 180ms ease-out;
    }

    .view.active {
      display: block;
    }

    @keyframes view-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .entry, .queue-view, .workspace {
      display: grid;
      gap: 22px;
      padding: 34px;
    }

    .entry {
      align-content: center;
      min-height: 650px;
      max-width: 840px;
    }

    .workspace {
      align-content: start;
    }

    .eyebrow {
      margin: 0;
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 780;
      text-transform: uppercase;
    }

    .entry h2, .workspace h2, .queue-view h2 {
      margin: 0;
      color: var(--ink);
      font-size: clamp(28px, 4vw, 46px);
      line-height: 1.04;
      font-weight: 820;
      max-width: 720px;
    }

    .workspace h2, .queue-view h2 {
      font-size: clamp(24px, 3vw, 34px);
      line-height: 1.12;
    }

    .entry-copy, .section-copy {
      margin: 0;
      color: var(--muted);
      line-height: 1.75;
      max-width: 720px;
    }

    .input-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      width: min(780px, 100%);
      margin-top: 4px;
    }

    input[type="url"], input[type="text"] {
      min-width: 0;
      height: 48px;
      border-radius: var(--radius);
      border: 1px solid var(--line-strong);
      padding: 0 14px;
      background: #fff;
      color: var(--ink);
      outline: none;
    }

    input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(217, 72, 72, 0.14);
    }

    .button {
      min-height: 42px;
      border: 1px solid transparent;
      border-radius: var(--radius);
      padding: 0 16px;
      background: var(--accent);
      color: #fff;
      font-weight: 760;
      cursor: pointer;
      white-space: nowrap;
      transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .button:hover {
      background: var(--accent-strong);
      transform: translateY(-1px);
    }

    .button:disabled {
      cursor: not-allowed;
      opacity: 0.58;
      transform: none;
    }

    .button.secondary {
      background: #fff;
      border-color: var(--line-strong);
      color: var(--ink);
    }

    .button.secondary:hover {
      border-color: var(--ink);
      background: #fff;
    }

    .help-list {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 16px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      max-width: 840px;
    }

    .help-item {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    .help-title {
      margin: 0;
      color: var(--ink);
      font-size: 13px;
      font-weight: 760;
    }

    .help-copy {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }

    .status-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .status-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 13px;
    }

    .progress-shell {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--surface-2);
    }

    .progress-bar {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: var(--accent);
      transition: width 220ms ease;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
    }

    .metric {
      min-height: 78px;
      padding: 13px 14px;
      border-right: 1px solid var(--line);
    }

    .metric:last-child {
      border-right: 0;
    }

    .metric-label {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 12px;
    }

    .metric-value {
      margin: 0;
      color: var(--ink);
      font-size: 23px;
      line-height: 1;
      font-weight: 820;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .playlist-name-panel {
      display: grid;
      gap: 8px;
      max-width: 620px;
      padding-top: 4px;
    }

    .playlist-name-panel[hidden] {
      display: none;
    }

    .field-label {
      color: var(--ink);
      font-size: 13px;
      font-weight: 760;
    }

    .field-hint {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
    }

    .field-hint.error {
      color: var(--danger);
    }

    .table-wrap {
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
      max-height: 420px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 680px;
      font-size: 13px;
    }

    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f7f8f9;
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .muted {
      color: var(--muted);
    }

    .log {
      display: grid;
      gap: 8px;
      max-height: 178px;
      overflow: auto;
      border-left: 2px solid var(--line-strong);
      padding: 2px 0 2px 13px;
      font-size: 13px;
      color: var(--muted);
    }

    .log-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      min-height: 18px;
    }

    .failed-panel {
      display: grid;
      gap: 12px;
      padding-top: 4px;
    }

    .failed-panel[hidden] {
      display: none;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 999px;
      padding: 0 10px;
      background: var(--surface-2);
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
      white-space: nowrap;
    }

    .badge.ok {
      background: var(--ok-soft);
      color: var(--ok);
    }

    .badge.fail {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .badge.warn {
      background: var(--warning-soft);
      color: var(--warning);
    }

    .stepper {
      display: grid;
      gap: 2px;
    }

    .step {
      display: grid;
      grid-template-columns: 24px 1fr;
      gap: 10px;
      align-items: start;
      min-height: 48px;
      color: var(--muted);
    }

    .step-dot {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      background: #fff;
      font-size: 11px;
      font-weight: 820;
    }

    .step.active .step-dot {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .step.done .step-dot {
      border-color: var(--ok);
      background: var(--ok-soft);
      color: var(--ok);
    }

    .step-title {
      margin: 0;
      color: var(--ink);
      font-size: 14px;
      font-weight: 760;
    }

    .step-note {
      margin: 3px 0 0;
      font-size: 12px;
      line-height: 1.45;
    }

    .side-section {
      display: grid;
      gap: 10px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
    }

    .side-title {
      margin: 0;
      color: var(--ink);
      font-size: 13px;
      font-weight: 780;
    }

    .side-copy {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.65;
    }

    .queue-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--line);
    }

    .queue-cell {
      min-height: 88px;
      padding: 14px;
      background: #fff;
    }

    .queue-label {
      margin: 0 0 7px;
      color: var(--muted);
      font-size: 12px;
    }

    .queue-value {
      margin: 0;
      color: var(--ink);
      font-size: 26px;
      line-height: 1;
      font-weight: 820;
    }

    .queue-note {
      margin: 6px 0 0;
      color: var(--faint);
      font-size: 12px;
    }

    .queue-meter {
      display: grid;
      gap: 8px;
      max-width: 680px;
    }

    .modal {
      position: fixed;
      inset: 0;
      display: none;
      place-items: center;
      padding: 18px;
      background: rgba(23, 25, 31, 0.38);
      z-index: 20;
    }

    .modal.active {
      display: grid;
    }

    .dialog {
      width: min(520px, 100%);
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: 0 24px 64px rgba(23, 25, 31, 0.22);
      padding: 20px;
    }

    .dialog h3 {
      margin: 0 0 8px;
      color: var(--ink);
      font-size: 18px;
    }

    .dialog p {
      margin: 0 0 16px;
      color: var(--muted);
      line-height: 1.65;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    @media (max-width: 940px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .side-panel {
        position: static;
      }

      .entry {
        min-height: 540px;
      }

      .view {
        min-height: 540px;
      }
    }

    @media (max-width: 680px) {
      .app {
        width: min(100vw - 22px, 1180px);
        padding-top: 16px;
      }

      .topbar {
        align-items: flex-start;
      }

      .entry, .queue-view, .workspace {
        padding: 20px;
      }

      .input-row {
        grid-template-columns: 1fr;
      }

      .help-list {
        grid-template-columns: 1fr;
      }

      .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .metric:nth-child(2) {
        border-right: 0;
      }

      .metric:nth-child(-n+2) {
        border-bottom: 1px solid var(--line);
      }

      .queue-grid {
        grid-template-columns: 1fr;
      }

      .status-header {
        display: grid;
      }
    }
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div class="brand">
        <div class="mark">M2M</div>
        <div>
          <h1>M2M</h1>
          <p class="subtitle">网易云歌单迁移到 Apple Music</p>
        </div>
      </div>
      <span class="badge" id="appStatus">等待链接</span>
    </header>

    <div class="layout">
      <section class="panel main-panel">
        <div class="view active" id="viewInput">
          <form class="entry" id="playlistForm">
            <p class="eyebrow">NetEase to Apple Music</p>
            <h2>把公开歌单迁移到你的 Apple Music 资料库。</h2>
            <p class="entry-copy">粘贴网易云分享短链或 music.163.com 歌单链接。解析任务会先进入服务器队列；Apple ID 授权只在浏览器中完成。</p>
            <div class="input-row">
              <input id="playlistUrl" type="url" required placeholder="https://163cn.tv/8kPnBRH" autocomplete="off">
              <button class="button" type="submit">开始迁移</button>
            </div>
            <div class="help-list" aria-label="迁移说明">
              <div class="help-item">
                <p class="help-title">先解析网易云</p>
                <p class="help-copy">读取歌名、歌手、专辑和曲目顺序，完成后可以先检查列表。</p>
              </div>
              <div class="help-item">
                <p class="help-title">再连接 Apple</p>
                <p class="help-copy">浏览器发起 MusicKit 授权，后端不接触你的 Apple ID。</p>
              </div>
              <div class="help-item">
                <p class="help-title">失败可追踪</p>
                <p class="help-copy">未匹配或载入失败的歌曲会列出名称、歌手和原因。</p>
              </div>
            </div>
          </form>
        </div>

        <div class="view" id="viewQueue">
          <section class="queue-view">
            <p class="eyebrow">服务器队列</p>
            <h2>正在等待解析名额。</h2>
            <p class="section-copy">免费 Worker 需要限制同时解析的歌单数量。轮到你后页面会自动开始解析，不需要重复点击。</p>
            <div class="queue-grid">
              <div class="queue-cell">
                <p class="queue-label">当前位置</p>
                <p class="queue-value" id="queuePosition">-</p>
                <p class="queue-note" id="queueAhead">等待队列同步中</p>
              </div>
              <div class="queue-cell">
                <p class="queue-label">预计等待</p>
                <p class="queue-value" id="queueEta">-</p>
                <p class="queue-note">按近期解析耗时估算</p>
              </div>
              <div class="queue-cell">
                <p class="queue-label">前方进度</p>
                <p class="queue-value" id="queueFrontProgress">-</p>
                <p class="queue-note" id="queueActive">活跃任务同步中</p>
              </div>
            </div>
            <div class="queue-meter">
              <div class="status-line">
                <span id="queueStatus">正在加入队列</span>
                <span id="queuePollTime">刚刚</span>
              </div>
              <div class="progress-shell"><div class="progress-bar" id="queueBar"></div></div>
            </div>
            <div class="toolbar">
              <button class="button secondary" id="cancelQueue" type="button">取消排队</button>
            </div>
          </section>
        </div>

        <div class="view" id="viewParse">
          <section class="workspace">
            <div class="status-header">
              <div>
                <p class="eyebrow">解析阶段</p>
                <h2>读取网易云歌单。</h2>
                <p class="section-copy">解析完成后会展示曲目明细，确认无误再连接 Apple Music。</p>
              </div>
              <span class="badge warn" id="parseStageBadge">准备解析</span>
            </div>
            <div>
              <div class="status-line">
                <span id="parseStatus">准备解析链接</span>
                <span id="parsePercent">0%</span>
              </div>
              <div class="progress-shell"><div class="progress-bar" id="parseBar"></div></div>
            </div>
            <div class="metrics">
              <div class="metric"><p class="metric-label">歌单曲目</p><p class="metric-value" id="metricTotal">0</p></div>
              <div class="metric"><p class="metric-label">已解析</p><p class="metric-value" id="metricParsed">0</p></div>
              <div class="metric"><p class="metric-label">缺失详情</p><p class="metric-value" id="metricMissing">0</p></div>
              <div class="metric"><p class="metric-label">歌单</p><p class="metric-value" id="metricPlaylist">-</p></div>
            </div>
            <div class="log" id="parseLog"></div>
            <div class="playlist-name-panel" id="playlistNamePanel" hidden>
              <label class="field-label" for="applePlaylistName">Apple Music 歌单名称</label>
              <input id="applePlaylistName" type="text" maxlength="100" autocomplete="off" placeholder="输入要创建的歌单名">
              <p class="field-hint" id="playlistNameHint">会按这个名称创建 Apple Music 歌单。</p>
            </div>
            <div class="toolbar" id="afterParseActions" hidden>
              <button class="button" id="connectApple" type="button">连接 Apple Music</button>
              <button class="button secondary" id="downloadJson" type="button">下载 JSON</button>
              <button class="button secondary" id="backToInput" type="button">换一个链接</button>
            </div>
            <div class="table-wrap" id="trackTableWrap" hidden>
              <table>
                <thead>
                  <tr><th>#</th><th>歌名</th><th>歌手</th><th>专辑</th><th>Apple Music</th></tr>
                </thead>
                <tbody id="trackTable"></tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="view" id="viewImport">
          <section class="workspace">
            <div class="status-header">
              <div>
                <p class="eyebrow">Apple Music</p>
                <h2>匹配并载入歌单。</h2>
                <p class="section-copy">匹配、创建歌单和添加曲目会实时更新；失败歌曲会在下方保留明细。</p>
              </div>
              <span class="badge warn" id="importStageBadge">等待授权</span>
            </div>
            <div>
              <div class="status-line">
                <span id="importStatus">等待授权</span>
                <span id="importPercent">0%</span>
              </div>
              <div class="progress-shell"><div class="progress-bar" id="importBar"></div></div>
            </div>
            <div class="metrics">
              <div class="metric"><p class="metric-label">总曲目</p><p class="metric-value" id="importTotal">0</p></div>
              <div class="metric"><p class="metric-label">匹配成功</p><p class="metric-value" id="importMatched">0</p></div>
              <div class="metric"><p class="metric-label">载入成功</p><p class="metric-value" id="importSucceeded">0</p></div>
              <div class="metric"><p class="metric-label">失败</p><p class="metric-value" id="importFailed">0</p></div>
            </div>
            <div class="log" id="importLog"></div>
            <section class="failed-panel" id="failedPanel" hidden>
              <div class="status-line">
                <span>失败歌曲</span>
                <span id="failedListCount">0</span>
              </div>
              <div class="table-wrap failed-table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>歌名</th><th>歌手</th><th>原因</th></tr>
                  </thead>
                  <tbody id="failedTrackTable"></tbody>
                </table>
              </div>
            </section>
            <div class="toolbar">
              <button class="button secondary" id="pauseImport" type="button" disabled>暂停</button>
              <button class="button secondary" id="cancelImport" type="button" disabled>停止</button>
              <button class="button secondary" id="returnToParsed" type="button">返回歌单</button>
            </div>
          </section>
        </div>
      </section>

      <aside class="panel side-panel">
        <div class="stepper">
          <div class="step active" data-step="input"><div class="step-dot">1</div><div><p class="step-title">输入链接</p><p class="step-note">粘贴网易云歌单 URL</p></div></div>
          <div class="step" data-step="queue"><div class="step-dot">2</div><div><p class="step-title">服务器排队</p><p class="step-note">保护免费 Worker 解析额度</p></div></div>
          <div class="step" data-step="parse"><div class="step-dot">3</div><div><p class="step-title">解析歌单</p><p class="step-note">实时读取歌名和歌手</p></div></div>
          <div class="step" data-step="auth"><div class="step-dot">4</div><div><p class="step-title">连接 Apple</p><p class="step-note">浏览器内完成授权</p></div></div>
          <div class="step" data-step="import"><div class="step-dot">5</div><div><p class="step-title">载入歌单</p><p class="step-note">显示成功和失败明细</p></div></div>
        </div>

        <div class="side-section">
          <p class="side-title">服务器状态</p>
          <p class="side-copy" id="sideQueueStatus">队列状态会在开始迁移后显示。</p>
          <p class="side-copy"><span id="sideQueueActive">0/0</span> 个解析名额使用中，<span id="sideQueueWaiting">0</span> 个任务等待。</p>
          <p class="side-copy">预计等待：<span id="sideQueueEta">-</span></p>
        </div>

        <div class="side-section">
          <p class="side-title">隐私边界</p>
          <p class="side-copy">后端负责解析公开网易云歌单和提供站点级 Apple Developer Token；你的 Apple ID 授权留在浏览器。</p>
        </div>
      </aside>
    </div>
  </main>

  <div class="modal" id="modal">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <h3 id="modalTitle">错误</h3>
      <p id="modalMessage"></p>
      <div class="dialog-actions">
        <button class="button secondary" id="modalClose" type="button">关闭</button>
      </div>
    </div>
  </div>

  <script>
    const MATCH_CONCURRENCY = 5;
    const SEARCH_RESULT_LIMIT = 5;
    const SEARCH_REQUEST_INTERVAL_MS = 180;
    const SEARCH_MAX_RETRIES = 6;
    const SEARCH_RETRY_BASE_MS = 1200;
    const SEARCH_RETRY_MAX_MS = 15000;
    const PLAYLIST_NAME_MAX_LENGTH = 100;
    const STRONG_MATCH_SCORE = 0.78;
    const FALLBACK_MATCH_SCORE = 0.7;
    const ACCEPT_MATCH_SCORE = 0.55;
    const QUEUE_POLL_MS = 3000;
    const QUEUE_HEARTBEAT_MS = 12000;

    const state = {
      playlistUrl: "",
      parsed: null,
      developerToken: null,
      musicUserToken: null,
      importRows: [],
      importControl: null,
      failedTracks: new Map(),
      rateLimitNoticeAt: 0,
      parseStartedAt: 0,
      parseProgress: 0,
      parseStatusText: "准备解析链接",
      appleConfigured: null,
      queueConfigured: null,
      clientId: getClientId(),
      queue: {
        ticketId: "",
        canceled: false,
        pollTimer: null,
        heartbeatTimer: null
      }
    };

    const elements = {
      appStatus: document.getElementById("appStatus"),
      views: {
        input: document.getElementById("viewInput"),
        queue: document.getElementById("viewQueue"),
        parse: document.getElementById("viewParse"),
        import: document.getElementById("viewImport")
      },
      playlistForm: document.getElementById("playlistForm"),
      playlistUrl: document.getElementById("playlistUrl"),
      queuePosition: document.getElementById("queuePosition"),
      queueAhead: document.getElementById("queueAhead"),
      queueEta: document.getElementById("queueEta"),
      queueFrontProgress: document.getElementById("queueFrontProgress"),
      queueActive: document.getElementById("queueActive"),
      queueStatus: document.getElementById("queueStatus"),
      queuePollTime: document.getElementById("queuePollTime"),
      queueBar: document.getElementById("queueBar"),
      cancelQueue: document.getElementById("cancelQueue"),
      parseStatus: document.getElementById("parseStatus"),
      parsePercent: document.getElementById("parsePercent"),
      parseBar: document.getElementById("parseBar"),
      parseStageBadge: document.getElementById("parseStageBadge"),
      metricTotal: document.getElementById("metricTotal"),
      metricParsed: document.getElementById("metricParsed"),
      metricMissing: document.getElementById("metricMissing"),
      metricPlaylist: document.getElementById("metricPlaylist"),
      parseLog: document.getElementById("parseLog"),
      afterParseActions: document.getElementById("afterParseActions"),
      playlistNamePanel: document.getElementById("playlistNamePanel"),
      applePlaylistName: document.getElementById("applePlaylistName"),
      playlistNameHint: document.getElementById("playlistNameHint"),
      trackTableWrap: document.getElementById("trackTableWrap"),
      trackTable: document.getElementById("trackTable"),
      connectApple: document.getElementById("connectApple"),
      downloadJson: document.getElementById("downloadJson"),
      backToInput: document.getElementById("backToInput"),
      importStatus: document.getElementById("importStatus"),
      importPercent: document.getElementById("importPercent"),
      importBar: document.getElementById("importBar"),
      importStageBadge: document.getElementById("importStageBadge"),
      importTotal: document.getElementById("importTotal"),
      importMatched: document.getElementById("importMatched"),
      importSucceeded: document.getElementById("importSucceeded"),
      importFailed: document.getElementById("importFailed"),
      importLog: document.getElementById("importLog"),
      failedPanel: document.getElementById("failedPanel"),
      failedListCount: document.getElementById("failedListCount"),
      failedTrackTable: document.getElementById("failedTrackTable"),
      pauseImport: document.getElementById("pauseImport"),
      cancelImport: document.getElementById("cancelImport"),
      returnToParsed: document.getElementById("returnToParsed"),
      modal: document.getElementById("modal"),
      modalTitle: document.getElementById("modalTitle"),
      modalMessage: document.getElementById("modalMessage"),
      modalClose: document.getElementById("modalClose"),
      sideQueueStatus: document.getElementById("sideQueueStatus"),
      sideQueueActive: document.getElementById("sideQueueActive"),
      sideQueueWaiting: document.getElementById("sideQueueWaiting"),
      sideQueueEta: document.getElementById("sideQueueEta")
    };

    elements.playlistForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const url = elements.playlistUrl.value.trim();
      if (!url) return;
      parsePlaylist(url);
    });

    elements.connectApple.addEventListener("click", () => connectAppleMusic());
    elements.applePlaylistName.addEventListener("input", () => validatePlaylistNameInput(false));
    elements.downloadJson.addEventListener("click", () => downloadParsedJson());
    elements.backToInput.addEventListener("click", () => resetToInput());
    elements.cancelQueue.addEventListener("click", () => cancelQueue());
    elements.pauseImport.addEventListener("click", () => toggleImportPause());
    elements.cancelImport.addEventListener("click", () => cancelImport());
    elements.returnToParsed.addEventListener("click", () => showView("parse"));
    elements.modalClose.addEventListener("click", () => elements.modal.classList.remove("active"));
    window.addEventListener("beforeunload", () => releaseQueue("page_unload", true));
    refreshHealth();

    function showView(name) {
      for (const [key, view] of Object.entries(elements.views)) {
        view.classList.toggle("active", key === name);
      }
      updateSteps(name);
    }

    function updateSteps(view) {
      const order = view === "input"
        ? ["input"]
        : view === "queue"
          ? ["input", "queue"]
          : view === "parse"
            ? ["input", "queue", "parse"]
            : ["input", "queue", "parse", "auth", "import"];
      document.querySelectorAll(".step").forEach((step) => {
        const key = step.dataset.step;
        const active = key === order[order.length - 1];
        const done = order.includes(key) && !active;
        step.classList.toggle("active", active);
        step.classList.toggle("done", done);
      });
    }

    function resetToInput() {
      releaseQueue("reset");
      state.parsed = null;
      state.parseProgress = 0;
      state.parseStatusText = "准备解析链接";
      elements.parseLog.innerHTML = "";
      elements.trackTable.innerHTML = "";
      elements.afterParseActions.hidden = true;
      elements.playlistNamePanel.hidden = true;
      elements.applePlaylistName.value = "";
      setPlaylistNameHint("会按这个名称创建 Apple Music 歌单。", false);
      elements.trackTableWrap.hidden = true;
      setParseProgress(0, "准备解析链接");
      showView("input");
      elements.appStatus.textContent = "等待链接";
      elements.appStatus.className = "badge";
    }

    async function parsePlaylist(url) {
      state.playlistUrl = url;
      state.parseStartedAt = Date.now();
      state.parsed = null;
      state.parseProgress = 0;
      state.parseStatusText = "等待服务器解析名额";
      elements.parseLog.innerHTML = "";
      elements.trackTable.innerHTML = "";
      elements.afterParseActions.hidden = true;
      elements.playlistNamePanel.hidden = true;
      elements.applePlaylistName.value = "";
      setPlaylistNameHint("会按这个名称创建 Apple Music 歌单。", false);
      elements.trackTableWrap.hidden = true;
      elements.metricTotal.textContent = "0";
      elements.metricParsed.textContent = "0";
      elements.metricMissing.textContent = "0";
      elements.metricPlaylist.textContent = "-";
      elements.appStatus.textContent = "排队中";
      elements.appStatus.className = "badge warn";
      setParseProgress(0, "等待服务器解析名额");
      showView("queue");

      try {
        const queueStatus = await joinQueue();
        updateQueueUi(queueStatus);
        if (queueStatus.status !== "active") {
          await waitForQueueTurn();
        }
        if (state.queue.canceled) {
          return;
        }
        startQueueHeartbeat();
        beginPlaylistStream(url);
      } catch (error) {
        elements.appStatus.textContent = "排队失败";
        elements.appStatus.className = "badge fail";
        showError("服务器队列失败", error.message || "无法加入服务器队列，请稍后重试。");
        resetToInput();
      }
    }

    async function beginPlaylistStream(url) {
      elements.appStatus.textContent = "解析中";
      elements.appStatus.className = "badge warn";
      setParseProgress(4, "提交解析任务");
      heartbeatQueue(4, "提交解析任务");
      addLog(elements.parseLog, "已获得解析名额，开始读取网易云歌单");
      showView("parse");

      let completed = false;
      try {
        const response = await fetch("/netease/playlist/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            ticketId: state.queue.ticketId,
            clientId: state.clientId
          })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload && payload.error ? payload.error.message : "解析请求失败。");
        }

        await readEventStream(response, {
          progress: (event) => handleParseProgress(event),
          done: (result) => {
            completed = true;
            state.parsed = result;
            renderTracks(result.tracks);
            populatePlaylistName(result.playlist && result.playlist.name);
            elements.playlistNamePanel.hidden = false;
            elements.afterParseActions.hidden = false;
            elements.trackTableWrap.hidden = false;
            updateAppleButton();
            elements.metricMissing.textContent = String(result.missingCount);
            elements.metricParsed.textContent = String(result.extractedCount);
            setParseProgress(100, "解析完成");
            elements.appStatus.textContent = "解析完成";
            elements.appStatus.className = "badge ok";
            addLog(elements.parseLog, "解析完成，共 " + result.extractedCount + " 首");
            releaseQueue("parse_complete");
          },
          "app-error": (error) => {
            throw new Error(error && error.message ? error.message : "解析连接中断，请稍后重试。");
          }
        });

        if (!completed) {
          throw new Error("解析连接提前结束，请稍后重试。");
        }
      } catch (error) {
        elements.appStatus.textContent = "解析失败";
        elements.appStatus.className = "badge fail";
        releaseQueue("parse_disconnect");
        showError("解析失败", error.message || "解析连接中断，请稍后重试。");
      }
    }

    async function readEventStream(response, handlers) {
      if (!response.body || !response.body.getReader) {
        throw new Error("当前浏览器不支持流式解析，请更新浏览器后重试。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }

        buffer += decoder.decode(chunk.value, { stream: true });
        buffer = dispatchBufferedEvents(buffer, handlers);
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        dispatchEventBlock(buffer, handlers);
      }
    }

    function dispatchBufferedEvents(buffer, handlers) {
      let remaining = buffer;
      let delimiterIndex = remaining.search(/\\r?\\n\\r?\\n/);

      while (delimiterIndex >= 0) {
        const block = remaining.slice(0, delimiterIndex);
        remaining = remaining.slice(remaining[delimiterIndex] === "\\r" ? delimiterIndex + 4 : delimiterIndex + 2);
        dispatchEventBlock(block, handlers);
        delimiterIndex = remaining.search(/\\r?\\n\\r?\\n/);
      }

      return remaining;
    }

    function dispatchEventBlock(block, handlers) {
      let eventName = "message";
      const dataLines = [];

      for (const line of block.split(/\\r?\\n/)) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (!dataLines.length || !handlers[eventName]) {
        return;
      }

      handlers[eventName](JSON.parse(dataLines.join("\\n")));
    }

    async function joinQueue() {
      clearQueueTimers();
      state.queue.canceled = false;
      state.queue.ticketId = "";
      const queueStatus = await queueRequest("join", {
        clientId: state.clientId,
        statusText: "等待服务器解析名额",
        progress: 0
      });
      state.queue.ticketId = queueStatus.ticketId || "";
      return queueStatus;
    }

    async function waitForQueueTurn() {
      while (!state.queue.canceled) {
        await wait(QUEUE_POLL_MS);
        const queueStatus = await queueRequest("status", {
          clientId: state.clientId,
          ticketId: state.queue.ticketId
        });
        updateQueueUi(queueStatus);

        if (queueStatus.status === "active") {
          return queueStatus;
        }

        if (queueStatus.status === "missing") {
          throw new Error("排队状态已过期，请重新开始。");
        }
      }

      throw new Error("已取消排队。");
    }

    function startQueueHeartbeat() {
      clearQueueTimers();
      state.queue.heartbeatTimer = window.setInterval(() => {
        heartbeatQueue(state.parseProgress, state.parseStatusText);
      }, QUEUE_HEARTBEAT_MS);
    }

    async function heartbeatQueue(progress, statusText) {
      if (!state.queue.ticketId || state.queue.canceled) return;
      try {
        const queueStatus = await queueRequest("heartbeat", {
          clientId: state.clientId,
          ticketId: state.queue.ticketId,
          progress,
          statusText
        });
        updateQueueUi(queueStatus);
      } catch {
        // A missed heartbeat should not interrupt an active SSE parse.
      }
    }

    async function cancelQueue() {
      state.queue.canceled = true;
      await releaseQueue("cancel_queue");
      resetToInput();
    }

    async function releaseQueue(reason, useBeacon = false) {
      clearQueueTimers();
      if (!state.queue.ticketId) return;

      const payload = {
        clientId: state.clientId,
        ticketId: state.queue.ticketId,
        reason
      };
      const ticketId = state.queue.ticketId;
      state.queue.ticketId = "";

      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/queue/leave", blob);
        return;
      }

      try {
        const queueStatus = await queueRequest("leave", payload);
        updateQueueUi({ ...queueStatus, ticketId });
      } catch {
        // Leaving the queue is best-effort; stale entries expire by heartbeat TTL.
      }
    }

    function clearQueueTimers() {
      if (state.queue.pollTimer) {
        window.clearInterval(state.queue.pollTimer);
        state.queue.pollTimer = null;
      }
      if (state.queue.heartbeatTimer) {
        window.clearInterval(state.queue.heartbeatTimer);
        state.queue.heartbeatTimer = null;
      }
    }

    async function queueRequest(action, payload) {
      const response = await fetch("/queue/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const queueStatus = await response.json();
      if (!response.ok || queueStatus.status === "error") {
        const message =
          queueStatus.error && queueStatus.error.message
            ? queueStatus.error.message
            : "服务器队列请求失败。";
        throw new Error(message);
      }
      return queueStatus;
    }

    function updateQueueUi(queueStatus) {
      state.queueConfigured = queueStatus.queueDisabled ? false : state.queueConfigured;
      const activeCount = queueStatus.activeCount || 0;
      const maxActive = queueStatus.maxActive || 0;
      const waitingCount = queueStatus.waitingCount || 0;
      const eta = queueStatus.etaSeconds ? formatDuration(queueStatus.etaSeconds) : "马上";
      const frontProgress = Number.isFinite(queueStatus.frontProgress) ? queueStatus.frontProgress : 0;

      elements.queuePosition.textContent =
        queueStatus.status === "active" ? "已进入" : queueStatus.position ? String(queueStatus.position) : "-";
      elements.queueAhead.textContent =
        queueStatus.status === "active"
          ? "已获得服务器解析名额"
          : "前方还有 " + (queueStatus.ahead || 0) + " 个排队任务";
      elements.queueEta.textContent = queueStatus.status === "active" ? "马上" : eta;
      elements.queueFrontProgress.textContent = frontProgress + "%";
      elements.queueActive.textContent = activeCount + "/" + maxActive + " 个名额使用中";
      elements.queueStatus.textContent =
        queueStatus.status === "active"
          ? "轮到你了，正在启动解析"
          : queueStatus.queueDisabled
            ? "当前部署未启用队列，直接解析"
            : "正在等待服务器解析名额";
      elements.queuePollTime.textContent = "刚刚同步";
      elements.queueBar.style.width = Math.max(0, Math.min(frontProgress, 100)) + "%";
      elements.sideQueueStatus.textContent =
        queueStatus.queueDisabled
          ? "当前部署未启用队列，提交后直接解析。"
          : queueStatus.status === "active"
            ? "当前任务正在使用解析名额。"
            : "当前任务正在等待解析名额。";
      elements.sideQueueActive.textContent = activeCount + "/" + maxActive;
      elements.sideQueueWaiting.textContent = String(waitingCount);
      elements.sideQueueEta.textContent = queueStatus.status === "active" ? "马上" : eta;
    }

    function handleParseProgress(event) {
      if (event.stage === "resolve" && event.status === "running") {
        setParseProgress(8, "解析短链接");
        addLog(elements.parseLog, "正在解析短链接或歌单 ID");
      }
      if (event.stage === "resolve" && event.status === "complete") {
        setParseProgress(18, "已识别歌单 ID " + event.playlistId);
        addLog(elements.parseLog, "歌单 ID：" + event.playlistId);
      }
      if (event.stage === "playlist" && event.status === "running") {
        setParseProgress(26, "读取歌单结构");
        addLog(elements.parseLog, "正在读取歌单曲目 ID");
      }
      if (event.stage === "playlist" && event.status === "complete") {
        elements.metricTotal.textContent = String(event.trackCount || event.requestedTrackCount || 0);
        elements.metricPlaylist.textContent = shortText(event.playlistName || "-", 10);
        setParseProgress(34, "歌单曲目：" + event.requestedTrackCount);
        addLog(elements.parseLog, "歌单：" + event.playlistName + "，曲目 " + event.requestedTrackCount + " 首");
      }
      if (event.stage === "song_details") {
        const total = event.totalCount || 0;
        const fetched = event.fetchedCount || 0;
        elements.metricParsed.textContent = String(fetched);
        const percent = total ? 34 + Math.round((fetched / total) * 62) : 34;
        setParseProgress(Math.min(percent, 96), "读取歌曲详情 " + fetched + "/" + total);
      }
      heartbeatQueue(state.parseProgress, state.parseStatusText);
    }

    function setParseProgress(percent, text) {
      state.parseProgress = percent;
      state.parseStatusText = text;
      elements.parseBar.style.width = percent + "%";
      elements.parsePercent.textContent = percent + "%";
      elements.parseStatus.textContent = text;
      elements.parseStageBadge.textContent = shortText(text, 18);
    }

    function renderTracks(tracks) {
      elements.trackTable.innerHTML = tracks.map((track) => {
        const artists = escapeHtml(track.artists.join(" / "));
        return "<tr data-track-id=\\"" + track.id + "\\">" +
          "<td>" + track.index + "</td>" +
          "<td>" + escapeHtml(track.name || "") + "</td>" +
          "<td>" + artists + "</td>" +
          "<td class=\\"muted\\">" + escapeHtml(track.album || "") + "</td>" +
          "<td><span class=\\"badge\\" data-import-status=\\"" + track.id + "\\">未开始</span></td>" +
        "</tr>";
      }).join("");
    }

    async function connectAppleMusic() {
      if (!state.parsed) return;
      const playlistNameResult = validatePlaylistNameInput(true);
      if (!playlistNameResult.ok) {
        return;
      }

      if (state.appleConfigured === false) {
        showError(
          "Apple Music 待配置",
          "这个公共网站仍需要一个站点级 Apple Music Developer Token。用户 Apple ID 会在浏览器中单独授权，不会交给后端。"
        );
        return;
      }

      try {
        elements.appStatus.textContent = "连接 Apple";
        elements.appStatus.className = "badge warn";
        showView("import");
        setImportProgress(0, "准备 Apple Music 授权");
        resetImportMetrics();
        startImportControl();
        addLog(elements.importLog, "请求 Apple Music Developer Token");

        const tokenResponse = await fetch("/apple/developer-token");
        const tokenPayload = await tokenResponse.json();
        if (!tokenResponse.ok) {
          throw new Error(
            tokenPayload.error
              ? tokenPayload.error.message + " 用户 Apple ID 仍会在浏览器中单独授权。"
              : "站点尚未配置 Apple Music app 凭据。用户 Apple ID 仍会在浏览器中单独授权。"
          );
        }

        state.developerToken = tokenPayload.developerToken;
        configureMusicKit(state.developerToken);
        addLog(elements.importLog, "打开 Apple Music 授权");
        const music = MusicKit.getInstance();
        state.musicUserToken = await music.authorize();

        setImportProgress(8, "Apple Music 已授权");
        addLog(elements.importLog, "授权完成，开始匹配歌曲");
        await importToAppleMusic(music, state.parsed, playlistNameResult.name);
      } catch (error) {
        if (error && error.name === "ImportCanceledError") {
          elements.appStatus.textContent = "已停止";
          elements.appStatus.className = "badge warn";
          setImportProgress(Number.parseInt(elements.importPercent.textContent, 10) || 0, "已停止");
          addLog(elements.importLog, "导入已停止");
        } else {
          elements.appStatus.textContent = "Apple 失败";
          elements.appStatus.className = "badge fail";
          showError("Apple Music 连接失败", error.message || "无法连接 Apple Music。");
        }
      } finally {
        finishImportControl();
      }
    }

    function configureMusicKit(developerToken) {
      if (!window.MusicKit) {
        throw new Error("MusicKit JS 未加载，请刷新页面重试。");
      }

      MusicKit.configure({
        developerToken,
        app: {
          name: "M2M",
          build: "0.1.0"
        }
      });
    }

    async function refreshHealth() {
      try {
        const response = await fetch("/health");
        const payload = await response.json();
        state.appleConfigured = Boolean(payload.appleConfigured);
        state.queueConfigured = Boolean(payload.queueConfigured);
        if (payload.queueConfigured) {
          elements.sideQueueStatus.textContent = "队列已启用，开始迁移后会显示位置和等待时间。";
        } else {
          elements.sideQueueStatus.textContent = "队列未启用，提交后会直接解析。";
        }
        updateAppleButton();
      } catch {
        state.appleConfigured = null;
        state.queueConfigured = null;
      }
    }

    function updateAppleButton() {
      if (!elements.connectApple) return;
      if (state.appleConfigured === false) {
        elements.connectApple.textContent = "Apple Music 待配置";
      } else {
        elements.connectApple.textContent = "连接 Apple Music";
      }
    }

    function populatePlaylistName(sourceName) {
      const safeName = normalizePlaylistName(sourceName || "网易云歌单");
      elements.applePlaylistName.value = safeName || "网易云歌单";
      validatePlaylistNameInput(false);
    }

    function validatePlaylistNameInput(showErrorDialog) {
      const originalName = elements.applePlaylistName.value;
      const normalizedName = normalizePlaylistName(originalName);
      const length = Array.from(normalizedName).length;

      if (originalName !== normalizedName) {
        elements.applePlaylistName.value = normalizedName;
      }

      if (!normalizedName) {
        setPlaylistNameHint("请输入 Apple Music 歌单名称。", true);
        if (showErrorDialog) {
          showError("歌单名称无效", "请输入 Apple Music 歌单名称。");
          elements.applePlaylistName.focus();
        }
        return { ok: false, name: "" };
      }

      if (length > PLAYLIST_NAME_MAX_LENGTH) {
        setPlaylistNameHint("歌单名称不能超过 " + PLAYLIST_NAME_MAX_LENGTH + " 个字符。", true);
        if (showErrorDialog) {
          showError("歌单名称过长", "请把 Apple Music 歌单名称控制在 " + PLAYLIST_NAME_MAX_LENGTH + " 个字符以内。");
          elements.applePlaylistName.focus();
        }
        return { ok: false, name: "" };
      }

      setPlaylistNameHint(length + "/" + PLAYLIST_NAME_MAX_LENGTH + " 个字符；会按这个名称创建 Apple Music 歌单。", false);
      return { ok: true, name: normalizedName };
    }

    function normalizePlaylistName(value) {
      return String(value || "")
        .replace(/[\\u0000-\\u001F\\u007F-\\u009F\\u202A-\\u202E\\u2066-\\u2069]/g, "")
        .replace(/\\s+/g, " ")
        .trim();
    }

    function setPlaylistNameHint(text, isError) {
      elements.playlistNameHint.textContent = text;
      elements.playlistNameHint.classList.toggle("error", isError);
    }

    async function importToAppleMusic(music, parsed, playlistName) {
      const tracks = parsed.tracks.filter((track) => !track.missing);
      const storefront = music.storefrontId || "us";

      elements.importTotal.textContent = String(tracks.length);
      state.rateLimitNoticeAt = 0;
      setImportProgress(8, "稳态匹配歌曲 0/" + tracks.length);

      const matchStartedAt = Date.now();
      const matchResult = await matchAppleSongs(music, storefront, tracks, (progress) => {
        const elapsedSeconds = Math.max((Date.now() - matchStartedAt) / 1000, 0.1);
        const speed = progress.completed / elapsedSeconds;
        const percent = 8 + Math.round((progress.completed / Math.max(tracks.length, 1)) * 62);
        setImportProgress(
          Math.min(percent, 70),
          "匹配歌曲 " + progress.completed + "/" + tracks.length + " · " + speed.toFixed(1) + " 首/秒"
        );
        elements.importMatched.textContent = String(progress.matched);
        elements.importFailed.textContent = String(progress.failed);

        if (progress.completed % 25 === 0 || progress.completed === tracks.length) {
          addLog(
            elements.importLog,
            "已匹配 " + progress.completed + "/" + tracks.length + "，成功 " + progress.matched + " 首，速度 " + speed.toFixed(1) + " 首/秒"
          );
        }
      });

      const rows = matchResult.rows;
      const failed = matchResult.failed;
      const matchedRows = rows.filter((row) => row.apple);
      if (!matchedRows.length) {
        setImportProgress(100, "没有可载入曲目");
        throw new Error("没有匹配到可载入 Apple Music 的歌曲。");
      }

      setImportProgress(72, "创建 Apple Music 歌单");
      await waitForImportTurn();
      const playlistId = await createApplePlaylist(playlistName, state.developerToken, state.musicUserToken);
      addLog(elements.importLog, "Apple Music 歌单已创建：" + playlistName);

      setImportProgress(78, "载入匹配歌曲");
      await waitForImportTurn();
      const importResult = await addTracksToApplePlaylist(
        playlistId,
        matchedRows,
        state.developerToken,
        state.musicUserToken,
        (progress) => {
          elements.importSucceeded.textContent = String(progress.succeeded);
          elements.importFailed.textContent = String(failed + progress.failed);
          const percent = 78 + Math.round((progress.processed / matchedRows.length) * 22);
          setImportProgress(Math.min(percent, 100), "载入歌曲 " + progress.processed + "/" + matchedRows.length);
        }
      );

      state.importRows = rows;
      elements.importSucceeded.textContent = String(importResult.succeeded);
      elements.importFailed.textContent = String(failed + importResult.failed);
      setImportProgress(100, "载入完成");
      elements.appStatus.textContent = "载入完成";
      elements.appStatus.className = "badge ok";
      addLog(elements.importLog, "载入完成，成功 " + importResult.succeeded + " 首，失败 " + (failed + importResult.failed) + " 首");
    }

    async function matchAppleSongs(music, storefront, tracks, onProgress) {
      const rows = new Array(tracks.length);
      const searchCache = new Map();
      const searchLimiter = createSearchLimiter(SEARCH_REQUEST_INTERVAL_MS);
      let nextIndex = 0;
      let completed = 0;
      let matched = 0;
      let failed = 0;

      async function runWorker() {
        while (nextIndex < tracks.length) {
          try {
            await waitForImportTurn();
          } catch (error) {
            if (error && error.name === "ImportCanceledError") {
              return;
            }
            throw error;
          }
          const trackIndex = nextIndex;
          nextIndex += 1;
          const track = tracks[trackIndex];
          let match = null;
          let failureReason = "Apple Music 未找到匹配";

          try {
            match = await findAppleSong(music, storefront, track, searchCache, searchLimiter);
          } catch (error) {
            failureReason = "搜索失败：" + readableError(error);
            console.warn("Apple Music search failed", error);
          }

          if (match) {
            matched += 1;
            rows[trackIndex] = { source: track, apple: match, status: "matched" };
            setTrackStatus(track.id, "已匹配", "ok");
          } else {
            failed += 1;
            rows[trackIndex] = { source: track, apple: null, status: "not_found", reason: failureReason };
            setTrackStatus(track.id, "未找到", "fail");
            recordFailedTrack(track, failureReason);
          }

          completed += 1;
          onProgress({ completed, matched, failed });
        }
      }

      const workerCount = Math.min(MATCH_CONCURRENCY, tracks.length);
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
      if (state.importControl && state.importControl.canceled) {
        throw createImportCanceledError();
      }
      return { rows, matched, failed };
    }

    async function findAppleSong(music, storefront, track, searchCache, searchLimiter) {
      const queries = buildSearchQueries(track);
      let best = null;

      if (!queries.length) {
        return null;
      }

      best = scoreCandidates(track, await searchAppleSongs(music, storefront, queries[0], searchCache, searchLimiter));
      if (best && best.score >= FALLBACK_MATCH_SCORE) {
        return best.score >= ACCEPT_MATCH_SCORE ? best : null;
      }

      const fallbackQueries = queries.slice(1);
      if (fallbackQueries.length) {
        for (const query of fallbackQueries) {
          const candidates = await searchAppleSongs(music, storefront, query, searchCache, searchLimiter);
          const candidateBest = scoreCandidates(track, candidates);
          if (candidateBest && (!best || candidateBest.score > best.score)) {
            best = candidateBest;
          }
          if (best && best.score >= STRONG_MATCH_SCORE) {
            break;
          }
        }
      }

      return best && best.score >= ACCEPT_MATCH_SCORE ? best : null;
    }

    async function searchAppleSongs(music, storefront, query, searchCache, searchLimiter) {
      const cacheKey = storefront + ":" + normalizeText(query);
      if (!searchCache.has(cacheKey)) {
        const searchPromise = searchAppleSongsDirect(storefront, query, searchLimiter).catch((error) => {
          if (isRateLimitError(error)) {
            throw error;
          }
          return searchAppleSongsWithMusicKit(music, storefront, query, searchLimiter);
        }).catch((error) => {
          searchCache.delete(cacheKey);
          throw error;
        });
        searchCache.set(cacheKey, searchPromise);
      }

      return searchCache.get(cacheKey);
    }

    async function searchAppleSongsDirect(storefront, query, searchLimiter) {
      const params = new URLSearchParams({
        term: query,
        types: "songs",
        limit: String(SEARCH_RESULT_LIMIT)
      });

      return runAppleSearchWithRetry("Apple catalog search", searchLimiter, async () => {
        const response = await fetch("https://api.music.apple.com/v1/catalog/" + encodeURIComponent(storefront) + "/search?" + params.toString(), {
          headers: {
            Authorization: "Bearer " + state.developerToken
          }
        });

        if (!response.ok) {
          throw createAppleHttpError("Apple catalog search failed", response);
        }

        const payload = await response.json();
        return payload && payload.results && payload.results.songs && Array.isArray(payload.results.songs.data)
          ? payload.results.songs.data
          : [];
      });
    }

    async function searchAppleSongsWithMusicKit(music, storefront, query, searchLimiter) {
      return runAppleSearchWithRetry("MusicKit search", searchLimiter, async () => {
        const results = await music.api.search(query, {
          types: "songs",
          limit: SEARCH_RESULT_LIMIT,
          storefront
        });
        return results && results.songs && Array.isArray(results.songs.data) ? results.songs.data : [];
      });
    }

    function createSearchLimiter(intervalMs) {
      let nextAt = 0;

      return {
        async waitTurn() {
          await waitForImportTurn();
          const now = Date.now();
          const waitMs = Math.max(0, nextAt - now);
          nextAt = Math.max(nextAt, now) + intervalMs;
          if (waitMs > 0) {
            await waitWithImportControl(waitMs);
          }
        },
        penalize(delayMs) {
          nextAt = Math.max(nextAt, Date.now() + delayMs);
        }
      };
    }

    async function runAppleSearchWithRetry(label, searchLimiter, operation) {
      let lastError = null;

      for (let attempt = 0; attempt <= SEARCH_MAX_RETRIES; attempt += 1) {
        await searchLimiter.waitTurn();

        try {
          return await operation();
        } catch (error) {
          lastError = error;
          if (!shouldRetryAppleSearch(error) || attempt >= SEARCH_MAX_RETRIES) {
            throw error;
          }

          const delayMs = appleSearchRetryDelay(error, attempt);
          searchLimiter.penalize(delayMs);
          noteAppleRateLimit(label, delayMs, getErrorStatus(error));
        }
      }

      throw lastError || new Error("Apple search failed.");
    }

    function createAppleHttpError(message, response) {
      const error = new Error(message + ": " + response.status);
      error.status = response.status;
      error.retryAfterMs = retryAfterMs(response);
      return error;
    }

    function shouldRetryAppleSearch(error) {
      const status = getErrorStatus(error);
      return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
    }

    function isRateLimitError(error) {
      return getErrorStatus(error) === 429;
    }

    function getErrorStatus(error) {
      if (!error) return null;
      if (Number.isFinite(error.status)) return error.status;
      if (Number.isFinite(error.statusCode)) return error.statusCode;
      if (error.response && Number.isFinite(error.response.status)) return error.response.status;
      const match = String(error.message || error).match(/\\b(429|500|502|503|504)\\b/);
      return match ? Number.parseInt(match[1], 10) : null;
    }

    function appleSearchRetryDelay(error, attempt) {
      if (Number.isFinite(error.retryAfterMs) && error.retryAfterMs > 0) {
        return Math.min(error.retryAfterMs, SEARCH_RETRY_MAX_MS);
      }

      const exponentialDelay = SEARCH_RETRY_BASE_MS * Math.pow(1.8, attempt);
      const jitter = Math.floor(Math.random() * 350);
      return Math.min(SEARCH_RETRY_MAX_MS, Math.round(exponentialDelay + jitter));
    }

    function retryAfterMs(response) {
      const header = response.headers.get("Retry-After");
      if (!header) return null;

      const seconds = Number.parseFloat(header);
      if (Number.isFinite(seconds)) {
        return Math.max(0, Math.round(seconds * 1000));
      }

      const retryAt = Date.parse(header);
      return Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : null;
    }

    function noteAppleRateLimit(label, delayMs, status) {
      const now = Date.now();
      if (now - state.rateLimitNoticeAt < 12000) {
        return;
      }

      state.rateLimitNoticeAt = now;
      const reason = status === 429 ? "Apple 搜索限流" : "Apple 搜索暂时不可用";
      addLog(elements.importLog, reason + "，等待 " + formatDuration(Math.ceil(delayMs / 1000)) + " 后继续");
      setImportProgress(
        Number.parseInt(elements.importPercent.textContent, 10) || 0,
        reason + "，自动重试中"
      );
      console.warn(label + " retry after " + delayMs + "ms");
    }

    function scoreCandidates(track, candidates) {
      let best = null;
      for (const candidate of candidates) {
        const score = scoreCandidate(track, candidate);
        if (!best || score > best.score) {
          best = { ...candidate, score };
        }
      }
      return best;
    }

    function buildSearchQueries(track) {
      const firstArtist = track.artists[0] || "";
      const allArtists = track.artists.join(" ");
      return Array.from(new Set([
        track.name + " " + firstArtist,
        track.name + " " + allArtists,
        track.name
      ].map((query) => query.trim()).filter(Boolean)));
    }

    function scoreCandidate(track, candidate) {
      const attributes = candidate.attributes || {};
      const sourceTitle = normalizeText(track.name);
      const candidateTitle = normalizeText(attributes.name);
      const sourceArtists = normalizeText(track.artists.join(" "));
      const candidateArtist = normalizeText(attributes.artistName);
      const sourceAlbum = normalizeText(track.album);
      const candidateAlbum = normalizeText(attributes.albumName);
      let score = 0;

      if (sourceTitle && candidateTitle === sourceTitle) score += 0.48;
      else if (sourceTitle && candidateTitle.includes(sourceTitle)) score += 0.34;
      else score += tokenSimilarity(sourceTitle, candidateTitle) * 0.36;

      if (sourceArtists && candidateArtist.includes(sourceArtists)) score += 0.26;
      else if (sourceArtists && sourceArtists.split(" ").some((part) => part.length > 1 && candidateArtist.includes(part))) score += 0.2;
      else score += tokenSimilarity(sourceArtists, candidateArtist) * 0.22;

      if (track.durationMs && attributes.durationInMillis) {
        const diff = Math.abs(track.durationMs - attributes.durationInMillis);
        if (diff <= 2500) score += 0.16;
        else if (diff <= 7000) score += 0.1;
      }

      if (sourceAlbum && candidateAlbum && (candidateAlbum.includes(sourceAlbum) || sourceAlbum.includes(candidateAlbum))) {
        score += 0.06;
      }

      return score;
    }

    function normalizeText(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/\\([^)]*\\)|\\[[^\\]]*\\]|（[^）]*）/g, " ")
        .replace(/[^\\p{Letter}\\p{Number}]+/gu, " ")
        .replace(/\\s+/g, " ")
        .trim();
    }

    function tokenSimilarity(left, right) {
      const leftTokens = new Set(left.split(" ").filter(Boolean));
      const rightTokens = new Set(right.split(" ").filter(Boolean));
      if (!leftTokens.size || !rightTokens.size) return 0;
      let overlap = 0;
      for (const token of leftTokens) {
        if (rightTokens.has(token)) overlap += 1;
      }
      return overlap / Math.max(leftTokens.size, rightTokens.size);
    }

    async function createApplePlaylist(name, developerToken, musicUserToken) {
      const response = await fetch("https://api.music.apple.com/v1/me/library/playlists", {
        method: "POST",
        headers: appleHeaders(developerToken, musicUserToken),
        body: JSON.stringify({
          attributes: {
            name,
            description: "Imported from NetEase Cloud Music by M2M."
          }
        })
      });

      if (!response.ok) {
        throw new Error("创建 Apple Music 歌单失败：" + response.status);
      }

      const payload = await response.json();
      const playlistId = payload && payload.data && payload.data[0] && payload.data[0].id;
      if (!playlistId) {
        throw new Error("Apple Music 没有返回歌单 ID。");
      }
      return playlistId;
    }

    async function addTracksToApplePlaylist(playlistId, rows, developerToken, musicUserToken, onProgress) {
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      const chunkSize = 50;

      for (let index = 0; index < rows.length; index += chunkSize) {
        await waitForImportTurn();
        const chunk = rows.slice(index, index + chunkSize);
        try {
          await addAppleTrackChunk(playlistId, chunk, developerToken, musicUserToken);
          processed += chunk.length;
          succeeded += chunk.length;
          for (const row of chunk) setTrackStatus(row.source.id, "已载入", "ok");
        } catch {
          for (const row of chunk) {
            await waitForImportTurn();
            try {
              await addAppleTrackChunk(playlistId, [row], developerToken, musicUserToken);
              succeeded += 1;
              setTrackStatus(row.source.id, "已载入", "ok");
            } catch {
              failed += 1;
              setTrackStatus(row.source.id, "载入失败", "fail");
              recordFailedTrack(row.source, "载入 Apple 歌单失败");
            }
            processed += 1;
            onProgress({ processed, succeeded, failed });
            await wait(100);
          }
        }
        onProgress({ processed, succeeded, failed });
        await wait(160);
      }

      return { processed, succeeded, failed };
    }

    async function addAppleTrackChunk(playlistId, rows, developerToken, musicUserToken) {
      const response = await fetch("https://api.music.apple.com/v1/me/library/playlists/" + encodeURIComponent(playlistId) + "/tracks", {
        method: "POST",
        headers: appleHeaders(developerToken, musicUserToken),
        body: JSON.stringify({
          data: rows.map((row) => ({ id: row.apple.id, type: "songs" }))
        })
      });

      if (!response.ok) {
        throw new Error("添加歌曲失败：" + response.status);
      }
    }

    function appleHeaders(developerToken, musicUserToken) {
      return {
        "Authorization": "Bearer " + developerToken,
        "Music-User-Token": musicUserToken,
        "Content-Type": "application/json"
      };
    }

    function resetImportMetrics() {
      elements.importLog.innerHTML = "";
      state.failedTracks = new Map();
      elements.failedTrackTable.innerHTML = "";
      elements.failedListCount.textContent = "0";
      elements.failedPanel.hidden = true;
      elements.importTotal.textContent = "0";
      elements.importMatched.textContent = "0";
      elements.importSucceeded.textContent = "0";
      elements.importFailed.textContent = "0";
      setImportProgress(0, "等待授权");
      updateImportControlButtons();
    }

    function setImportProgress(percent, text) {
      elements.importBar.style.width = percent + "%";
      elements.importPercent.textContent = percent + "%";
      elements.importStatus.textContent = text;
      elements.importStageBadge.textContent = shortText(text, 18);
    }

    function setTrackStatus(trackId, label, type) {
      const badge = document.querySelector("[data-import-status='" + trackId + "']");
      if (!badge) return;
      badge.textContent = label;
      badge.className = "badge " + type;
    }

    function startImportControl() {
      state.importControl = {
        running: true,
        paused: false,
        canceled: false
      };
      updateImportControlButtons();
    }

    function finishImportControl() {
      if (state.importControl) {
        state.importControl.running = false;
        state.importControl.paused = false;
      }
      updateImportControlButtons();
    }

    function toggleImportPause() {
      const control = state.importControl;
      if (!control || !control.running || control.canceled) return;
      control.paused = !control.paused;
      updateImportControlButtons();
      addLog(elements.importLog, control.paused ? "导入已暂停，当前请求完成后停止推进" : "导入已继续");
      if (control.paused) {
        setImportProgress(Number.parseInt(elements.importPercent.textContent, 10) || 0, "已暂停");
      }
    }

    function cancelImport() {
      const control = state.importControl;
      if (!control || !control.running) return;
      control.canceled = true;
      control.paused = false;
      updateImportControlButtons();
      addLog(elements.importLog, "正在停止导入，当前请求完成后退出");
    }

    function updateImportControlButtons() {
      const control = state.importControl;
      const running = Boolean(control && control.running && !control.canceled);
      elements.pauseImport.disabled = !running;
      elements.cancelImport.disabled = !running;
      elements.pauseImport.textContent = control && control.paused ? "继续" : "暂停";
    }

    async function waitForImportTurn() {
      const control = state.importControl;
      if (!control) return;

      while (control.paused && !control.canceled) {
        await wait(200);
      }

      if (control.canceled) {
        throw createImportCanceledError();
      }
    }

    async function waitWithImportControl(milliseconds) {
      const deadline = Date.now() + milliseconds;
      while (Date.now() < deadline) {
        await waitForImportTurn();
        await wait(Math.min(250, Math.max(0, deadline - Date.now())));
      }
      await waitForImportTurn();
    }

    function createImportCanceledError() {
      const error = new Error("导入已停止");
      error.name = "ImportCanceledError";
      return error;
    }

    function recordFailedTrack(track, reason) {
      const key = String(track.id);
      state.failedTracks.set(key, {
        index: track.index,
        name: track.name || "",
        artists: track.artists.join(" / "),
        reason
      });

      renderFailedTracks();
    }

    function renderFailedTracks() {
      const failures = Array.from(state.failedTracks.values()).sort((left, right) => left.index - right.index);
      elements.failedPanel.hidden = failures.length === 0;
      elements.failedListCount.textContent = String(failures.length);
      elements.failedTrackTable.innerHTML = failures.map((track) => {
        return "<tr>" +
          "<td>" + track.index + "</td>" +
          "<td>" + escapeHtml(track.name) + "</td>" +
          "<td>" + escapeHtml(track.artists) + "</td>" +
          "<td class=\\"muted\\">" + escapeHtml(track.reason) + "</td>" +
        "</tr>";
      }).join("");
    }

    function addLog(container, text) {
      const row = document.createElement("div");
      row.className = "log-row";
      const elapsed = state.parseStartedAt ? Math.round((Date.now() - state.parseStartedAt) / 1000) + "s" : "";
      row.innerHTML = "<span>" + escapeHtml(text) + "</span><span>" + elapsed + "</span>";
      container.appendChild(row);
      container.scrollTop = container.scrollHeight;
    }

    function downloadParsedJson() {
      if (!state.parsed) return;
      const blob = new Blob([JSON.stringify(state.parsed, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "m2m-netease-playlist-" + state.parsed.playlist.id + ".json";
      link.click();
      URL.revokeObjectURL(link.href);
    }

    function showError(title, message) {
      elements.modalTitle.textContent = title;
      elements.modalMessage.textContent = message;
      elements.modal.classList.add("active");
    }

    function readableError(error) {
      if (!error) return "未知错误";
      if (getErrorStatus(error) === 429) {
        return "Apple 搜索限流，重试后仍未恢复";
      }
      return error.message || String(error);
    }

    function formatDuration(seconds) {
      const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
      if (safeSeconds < 60) {
        return safeSeconds + " 秒";
      }

      const minutes = Math.floor(safeSeconds / 60);
      const restSeconds = safeSeconds % 60;
      return restSeconds ? minutes + " 分 " + restSeconds + " 秒" : minutes + " 分";
    }

    function getClientId() {
      const storageKey = "m2m-client-id";
      try {
        const existingId = window.sessionStorage.getItem(storageKey);
        if (existingId) {
          return existingId;
        }

        const createdId = createClientId();
        window.sessionStorage.setItem(storageKey, createdId);
        return createdId;
      } catch {
        return createClientId();
      }
    }

    function createClientId() {
      if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
      }

      return "client-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }

    function shortText(text, maxLength) {
      return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function wait(milliseconds) {
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }
  </script>
</body>
</html>`;
}
