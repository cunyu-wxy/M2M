import { MATCHER_BROWSER_SOURCE } from "../dist/matcher-source.js";

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

    .diagnostic-download {
      width: 42px;
      height: 42px;
      padding: 0;
      font-size: 20px;
    }

    .diagnostic-details {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .diagnostic-details summary { cursor: pointer; }
    .diagnostic-details p { white-space: pre-line; }

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

    .failed-table-wrap table { table-layout: fixed; }
    .failed-table-wrap th:first-child { width: 52px; }
    .failed-table-wrap th:nth-child(2) { width: 27%; }
    .failed-table-wrap th:nth-child(3) { width: 25%; }
    .failed-table-wrap td { overflow-wrap: anywhere; }

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
      grid-auto-rows: max-content;
      align-content: start;
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
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      min-height: 18px;
      line-height: 1.6;
    }

    .failed-panel {
      display: grid;
      gap: 12px;
      padding-top: 4px;
    }

    .failed-panel[hidden] {
      display: none;
    }

    .version-review {
      display: grid;
      gap: 12px;
      border-top: 1px solid var(--line);
      padding-top: 18px;
      min-width: 0;
    }

    .version-review[hidden] { display: none; }
    .version-review h3 { margin: 0; font-size: 17px; }
    .version-review p { margin: 0; overflow-wrap: anywhere; }
    .version-candidates { display: grid; gap: 0; min-width: 0; }
    .version-candidate {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      border-bottom: 1px solid var(--line);
      padding: 14px 0;
      cursor: pointer;
    }
    .version-candidate input { margin: 4px 0 0; accent-color: var(--accent); }
    .version-candidate-copy { display: grid; gap: 6px; min-width: 0; overflow-wrap: anywhere; }
    .version-candidate-title { font-size: 14px; font-weight: 760; }
    .version-candidate a { color: var(--accent-strong); font-size: 13px; width: fit-content; }
    .log-row span:first-child { min-width: 0; overflow-wrap: anywhere; }
    .log-row span:last-child { flex: none; white-space: nowrap; }

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
          <p class="subtitle">中文音乐平台歌单迁移到 Apple Music</p>
        </div>
      </div>
      <span class="badge" id="appStatus">等待链接</span>
    </header>

    <div class="layout">
      <section class="panel main-panel">
        <div class="view active" id="viewInput">
          <form class="entry" id="playlistForm">
            <p class="eyebrow">Playlist to Apple Music</p>
            <h2>把公开歌单迁移到你的 Apple Music 资料库。</h2>
            <p class="entry-copy">粘贴网易云、QQ 音乐、酷狗音乐或酷我音乐的公开歌单链接。解析任务会先进入服务器队列；Apple ID 授权只在浏览器中完成。</p>
            <div class="input-row">
              <input id="playlistUrl" type="url" required placeholder="粘贴歌单分享链接" autocomplete="off">
              <button class="button" type="submit">开始迁移</button>
            </div>
            <div class="help-list" aria-label="迁移说明">
              <div class="help-item">
                <p class="help-title">先解析歌单</p>
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
                <h2>读取音乐平台歌单。</h2>
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
            <section class="version-review" id="versionReviewPanel" hidden aria-labelledby="versionReviewTitle">
              <div class="status-line">
                <h3 id="versionReviewTitle">确认候选曲目</h3>
                <span id="versionReviewPosition"></span>
              </div>
              <p id="versionReviewSource"></p>
              <p class="field-hint" id="versionReviewMetadata"></p>
              <p class="field-hint" id="versionReviewReason"></p>
              <div class="version-candidates" id="versionReviewCandidates"></div>
              <div class="toolbar">
                <button class="button" id="confirmVersion" type="button" disabled>确认选中曲目</button>
                <button class="button secondary" id="skipVersion" type="button">跳过这首</button>
                <button class="button secondary" id="skipAllVersions" type="button">跳过剩余</button>
              </div>
            </section>
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
              <button class="button secondary diagnostic-download" id="downloadDiagnostics" title="下载诊断 JSON" aria-label="下载诊断 JSON" type="button">
                <svg class="lucide lucide-download" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <desc>Lucide download icon. ISC License.
Copyright (c) 2026 Lucide Icons and Contributors
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
Derived from Feather. The MIT License (MIT).
Copyright (c) 2013-present Cole Bemis
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.</desc>
                  <path d="M12 15V3" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </button>
            </div>
            <details class="diagnostic-details">
              <summary>匹配诊断</summary>
              <p id="catalogDiagnosticReadout">-</p>
            </details>
          </section>
        </div>
      </section>

      <aside class="panel side-panel">
        <div class="stepper">
          <div class="step active" data-step="input"><div class="step-dot">1</div><div><p class="step-title">输入链接</p><p class="step-note">粘贴公开歌单 URL</p></div></div>
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
          <p class="side-copy">后端处理公开歌单和曲库查询；Apple ID 授权与资料库写入在浏览器中完成。</p>
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
    const MATCH_CONCURRENCY = 8;
    const SEARCH_RESULT_LIMIT = 25;
    const SEARCH_REQUEST_INTERVAL_MS = 80;
    const SEARCH_MAX_RETRIES = 6;
    const SEARCH_RETRY_BASE_MS = 1200;
    const SEARCH_RETRY_MAX_MS = 15000;
    const PLAYLIST_NAME_MAX_LENGTH = 100;
    const APPLE_AUTH_TIMEOUT_MS = 90000;
    ${MATCHER_BROWSER_SOURCE}
    const songMatcher = M2MSongMatcher.createSongMatcher();
    const QUEUE_POLL_MS = 3000;
    const QUEUE_HEARTBEAT_MS = 12000;

    const state = {
      playlistUrl: "",
      parsed: null,
      developerToken: null,
      developerTokenExpiresAt: 0,
      developerTokenPromise: null,
      musicUserToken: null,
      importRows: [],
      catalogCache: new Map(),
      trackBadges: new Map(),
      failedTrackRows: new Map(),
      importControl: null,
      failedTracks: new Map(),
      matchMeter: null,
      catalogMetrics: null,
      versionReview: null,
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
      catalogDiagnosticReadout: document.getElementById("catalogDiagnosticReadout"),
      downloadDiagnostics: document.getElementById("downloadDiagnostics"),
      failedPanel: document.getElementById("failedPanel"),
      failedListCount: document.getElementById("failedListCount"),
      failedTrackTable: document.getElementById("failedTrackTable"),
      versionReviewPanel: document.getElementById("versionReviewPanel"),
      versionReviewPosition: document.getElementById("versionReviewPosition"),
      versionReviewSource: document.getElementById("versionReviewSource"),
      versionReviewMetadata: document.getElementById("versionReviewMetadata"),
      versionReviewReason: document.getElementById("versionReviewReason"),
      versionReviewCandidates: document.getElementById("versionReviewCandidates"),
      confirmVersion: document.getElementById("confirmVersion"),
      skipVersion: document.getElementById("skipVersion"),
      skipAllVersions: document.getElementById("skipAllVersions"),
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
    elements.downloadDiagnostics.addEventListener("click", () => downloadCatalogDiagnostics());
    elements.backToInput.addEventListener("click", () => resetToInput());
    elements.cancelQueue.addEventListener("click", () => cancelQueue());
    elements.pauseImport.addEventListener("click", () => toggleImportPause());
    elements.cancelImport.addEventListener("click", () => cancelImport());
    elements.confirmVersion.addEventListener("click", () => completeVersionChoice(false));
    elements.skipVersion.addEventListener("click", () => completeVersionChoice(true));
    elements.skipAllVersions.addEventListener("click", () => skipRemainingVersions());
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
      if (state.importControl && state.importControl.running) cancelImport();
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
      addLog(elements.parseLog, "已获得解析名额，开始读取歌单");
      showView("parse");

      let completed = false;
      try {
        const response = await fetch("/playlist/stream", {
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
        addLog(elements.parseLog, "正在解析链接或歌单 ID");
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
        addLog(
          elements.parseLog,
          (event.sourceName || "来源平台") + "歌单：" + event.playlistName + "，解析 " + event.requestedTrackCount + " 首"
        );
        if (event.limited) {
          addLog(elements.parseLog, "当前平台只返回了部分公开曲目，结果已标记为 limited");
        }
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
      state.trackBadges = new Map(Array.from(elements.trackTable.querySelectorAll("[data-import-status]"))
        .map((badge) => [badge.dataset.importStatus, badge]));
    }

    async function connectAppleMusic() {
      if (!state.parsed) return;
      if (state.importControl && state.importControl.running) {
        showView("import");
        return;
      }
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

        await ensureAppleDeveloperToken();
        configureMusicKit(state.developerToken);
        addLog(elements.importLog, "打开 Apple Music 授权");
        const music = MusicKit.getInstance();
        state.musicUserToken = await authorizeAppleMusic(music);

        setImportProgress(8, "Apple Music 已授权");
        elements.appStatus.textContent = "匹配中";
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

    async function ensureAppleDeveloperToken() {
      if (state.developerToken && state.developerTokenExpiresAt * 1000 - Date.now() > 120000) {
        return state.developerToken;
      }
      if (!state.developerTokenPromise) {
        state.developerTokenPromise = (async () => {
          try {
            const response = await fetch("/apple/developer-token", {
              method: "POST", credentials: "same-origin", cache: "no-store",
              headers: { "Content-Type": "application/json" }, body: "{}",
              signal: AbortSignal.timeout(20000)
            });
            const payload = await response.json();
            if (!response.ok) {
              const retrySeconds = Number(response.headers.get("Retry-After"));
              throw new Error(response.status === 429
                ? "Apple 授权凭据请求过于频繁，请在 " + (retrySeconds || 60) + " 秒后重试。"
                : "无法更新 Apple 授权凭据：" + (payload.error?.message || response.status));
            }
            const remaining = payload.expiresAt * 1000 - Date.now();
            if (typeof payload.developerToken !== "string" || !payload.developerToken ||
                !Number.isFinite(payload.expiresAt) || remaining <= 120000 || remaining > 3630000) {
              throw new Error("Apple 授权凭据有效期异常，请检查站点配置。");
            }
            state.developerToken = payload.developerToken;
            state.developerTokenExpiresAt = payload.expiresAt;
            return state.developerToken;
          } catch (error) {
            error.name = "AppleTokenError";
            throw error;
          }
        })().finally(() => { state.developerTokenPromise = null; });
      }
      return state.developerTokenPromise;
    }

    async function authorizeAppleMusic(music) {
      let timeoutId = null;
      const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("Apple Music 授权等待超时。请确认已允许弹窗，授权完成后回到此页面；如果仍无反应，请刷新页面后重试。"));
        }, APPLE_AUTH_TIMEOUT_MS);
      });

      try {
        return await Promise.race([music.authorize(), timeout]);
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      }
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
      const safeName = normalizePlaylistName(sourceName || "导入歌单");
      elements.applePlaylistName.value = safeName || "导入歌单";
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

    function createMatchMeter(now = Date.now) {
      const startedAt = now();
      let pausedAt = null;
      let pausedMs = 0;
      const samples = [{ time: 0, completed: 0 }];
      return {
        pause() { if (pausedAt === null) pausedAt = now(); },
        resume() {
          if (pausedAt !== null) pausedMs += now() - pausedAt;
          pausedAt = null;
        },
        sample(completed) {
          const current = pausedAt === null ? now() : pausedAt;
          const activeMs = Math.max(0, current - startedAt - pausedMs);
          samples.push({ time: activeMs, completed });
          while (samples.length > 2 && samples[1].time <= activeMs - 30000) samples.shift();
          while (samples.length > 512) samples.shift();
          const anchor = samples[0];
          return {
            recentSpeed: (completed - anchor.completed) / Math.max(0.1, (activeMs - anchor.time) / 1000),
            averageSpeed: completed / Math.max(0.1, activeMs / 1000),
            sampleCount: samples.length
          };
        }
      };
    }

    function recordCatalogProgress(completed) {
      const metrics = state.catalogMetrics;
      if (!metrics) return;
      const time = Date.now();
      const count = Number.isFinite(completed) && completed >= 0 ? completed : 0;
      const requests = Number.isFinite(metrics.requests) && metrics.requests >= 0 ? metrics.requests : 0;
      if (!metrics.progressSamples) metrics.progressSamples = [{ time: Number.isFinite(metrics.startedAt) ? metrics.startedAt : time, completed: 0, requests: 0 }];
      const previous = metrics.progressSamples[metrics.progressSamples.length - 1];
      if (previous.completed !== count || previous.requests !== requests) metrics.progressSamples.push({ time, completed: count, requests });
      while (metrics.progressSamples.length > 2 && metrics.progressSamples[1].time <= time - 30000) metrics.progressSamples.shift();
      while (metrics.progressSamples.length > 512) metrics.progressSamples.shift();
      metrics.completed = count;
    }

    async function importToAppleMusic(music, parsed, playlistName) {
      const tracks = parsed.tracks.filter((track) => !track.missing);
      const storefront = music.storefrontId || "cn";

      elements.importTotal.textContent = String(tracks.length);
      state.rateLimitNoticeAt = 0;
      setImportProgress(8, "稳态匹配歌曲 0/" + tracks.length);

      state.matchMeter = createMatchMeter();
      state.catalogMetrics = { requests: 0, cacheHits: 0, localCacheHits: 0, totalRoundTripMs: 0, rateLimited: 0,
        startedAt: Date.now(), targetStorefront: storefront };
      addLog(elements.importLog, "Workers 不提供宿主 CPU / 内存指标；缓存字节仅指序列化缓存大小，不是进程内存。");
      if (state.importControl && state.importControl.paused) state.matchMeter.pause();
      const matchResult = await matchAppleSongs(music, storefront, tracks, (progress) => {
        recordCatalogProgress(progress.completed);
        const speed = state.matchMeter.sample(progress.completed);
        const percent = 8 + Math.round((progress.completed / Math.max(tracks.length, 1)) * 62);
        setImportProgress(
          Math.min(percent, 70),
          "匹配歌曲 " + progress.completed + "/" + tracks.length + " · 近30秒 " + speed.recentSpeed.toFixed(1) + " 首/秒 · 平均 " + speed.averageSpeed.toFixed(1) +
            (progress.pending ? " · 待确认 " + progress.pending : "")
        );
        elements.importMatched.textContent = String(progress.matched);
        elements.importFailed.textContent = String(progress.failed);

        if (progress.completed % 25 === 0 || progress.completed === tracks.length) {
          addLog(
            elements.importLog,
            "已匹配 " + progress.completed + "/" + tracks.length + "，成功 " + progress.matched + "，待确认 " + progress.pending +
              "，近30秒 " + speed.recentSpeed.toFixed(1) + " 首/秒；" + catalogMetricsText(progress.completed)
          );
        }
      });

      const rows = matchResult.rows;
      if (matchResult.pending) await reviewMatchedRows(rows, matchResult);
      const failed = rows.filter((row) => !row.apple).length;
      const matchedRows = rows.filter((row) => row.apple);
      if (!matchedRows.length) {
        setImportProgress(100, "没有可载入曲目");
        throw new Error("没有匹配到可载入 Apple Music 的歌曲。");
      }

      setImportProgress(72, "创建 Apple Music 歌单");
      await waitForImportTurn();
      const playlistId = await createApplePlaylist(
        playlistName,
        state.musicUserToken,
        parsed.source && parsed.source.name
      );
      addLog(elements.importLog, "Apple Music 歌单已创建：" + playlistName);

      setImportProgress(78, "载入匹配歌曲");
      await waitForImportTurn();
      const importResult = await addTracksToApplePlaylist(
        playlistId,
        matchedRows,
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
      const searchCache = state.catalogCache;
      const searchLimiter = createSearchLimiter(SEARCH_REQUEST_INTERVAL_MS);
      let nextIndex = 0;
      let completed = 0;
      let matched = 0;
      let failed = 0;
      let pending = 0;

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
          let matchNotice = null;
          let failureReason = "Apple Music 未找到匹配";

          while (true) {
            try {
              match = await findAppleSong(music, storefront, track, searchCache, searchLimiter, (notice) => {
                matchNotice = notice;
              });
              await waitForImportTurn();
              if (!match && matchNotice) failureReason = unmatchedReason(matchNotice.reason, storefront);
              break;
            } catch (error) {
              if (error && error.name === "ImportCanceledError") throw error;
              if (shouldRetryAppleSearch(error) && error.code !== "apple_credentials_missing") {
                pauseForAppleSearch();
                await waitForImportTurn();
                continue;
              }
              if (getErrorStatus(error) === 401 || getErrorStatus(error) === 403 || error.code === "apple_credentials_missing") {
                if (state.importControl) state.importControl.canceled = true;
                throw error;
              }
              failureReason = "搜索失败：" + readableError(error);
              break;
            }
          }

          if (match) {
            matched += 1;
            rows[trackIndex] = { source: track, apple: match, status: "matched" };
            setTrackStatus(track.id, "已匹配", "ok");
          } else if (matchNotice && Array.isArray(matchNotice.candidates) && matchNotice.candidates.length) {
            pending += 1;
            rows[trackIndex] = { source: track, apple: null, status: "needs_review", reason: failureReason,
              candidates: matchNotice.candidates.slice(0, 3) };
            setTrackStatus(track.id, "待确认", "warn");
          } else {
            failed += 1;
            rows[trackIndex] = { source: track, apple: null, status: "not_found", reason: failureReason };
            setTrackStatus(track.id, "未匹配", "fail");
            recordFailedTrack(track, failureReason);
          }

          completed += 1;
          onProgress({ completed, matched, failed, pending });
        }
      }

      const workerCount = Math.min(MATCH_CONCURRENCY, tracks.length);
      const outcomes = await Promise.allSettled(Array.from({ length: workerCount }, () => runWorker()));
      const rejected = outcomes.find((outcome) => outcome.status === "rejected");
      if (rejected) throw rejected.reason;
      if (state.importControl && state.importControl.canceled) {
        throw createImportCanceledError();
      }
      return { rows, matched, failed, pending };
    }

    function unmatchedReason(reason, storefront) {
      const labels = {
        no_results: "Apple Music 搜索未返回歌曲",
        title_mismatch: "已搜到歌曲，但歌名无法可靠对应",
        artist_mismatch: "已找到候选，但歌手署名无法可靠对应",
        duration_mismatch: "同名同歌手候选的时长差超过 15 秒",
        version_mismatch: "已找到其他版本，需要确认",
        low_confidence: "已找到候选，但匹配可信度不足",
        unconfirmed: "已找到候选，但无法可靠确认"
      };
      return reason === "recording_unavailable" ? "目标地区（" + storefront.toUpperCase() + "）未找到同一录音"
        : labels[reason] || "Apple Music 未找到匹配";
    }

    async function reviewMatchedRows(rows, summary) {
      await waitForImportTurn();
      const pending = rows.filter((row) => row.status === "needs_review");
      if (!pending.length) return;
      return new Promise((resolve, reject) => {
        state.versionReview = { rows: pending, cursor: 0, selectedIndex: -1, summary, resolve, reject };
        if (state.importControl) state.importControl.reviewing = true;
        renderVersionReview();
        updateImportControlButtons();
      });
    }

    function formatTrackDuration(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "-";
      const seconds = Math.floor(milliseconds / 1000);
      return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    }

    function renderVersionReview() {
      const review = state.versionReview;
      if (!review) return;
      const row = review.rows[review.cursor];
      const source = row.source;
      const remaining = review.rows.length - review.cursor;
      review.selectedIndex = -1;
      elements.versionReviewPanel.hidden = false;
      elements.appStatus.textContent = "等待确认";
      elements.versionReviewPosition.textContent = (review.cursor + 1) + "/" + review.rows.length;
      elements.versionReviewSource.textContent = "源歌曲：" + source.name;
      elements.versionReviewMetadata.textContent = (source.artists || []).join(" / ") + " · " +
        (source.album || "专辑未知") + " · " + formatTrackDuration(source.durationMs);
      elements.versionReviewReason.textContent = row.reason;
      elements.confirmVersion.disabled = true;
      elements.skipAllVersions.textContent = "跳过剩余 " + remaining + " 首";
      elements.versionReviewCandidates.replaceChildren(...row.candidates.map((candidate, index) => {
        const attributes = candidate.attributes || {};
        const label = document.createElement("label");
        label.className = "version-candidate";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "versionCandidate";
        input.value = String(index);
        input.addEventListener("change", () => selectVersionCandidate(index));
        const copy = document.createElement("span");
        copy.className = "version-candidate-copy";
        const name = document.createElement("span");
        name.className = "version-candidate-title";
        name.textContent = attributes.name || "歌名未知";
        const metadata = document.createElement("span");
        metadata.className = "field-hint";
        metadata.textContent = (attributes.artistName || "歌手未知") + " · " + (attributes.albumName || "专辑未知") +
          " · " + formatTrackDuration(attributes.durationInMillis);
        const reason = document.createElement("span");
        reason.className = "field-hint";
        const difference = source.durationMs && attributes.durationInMillis
          ? Math.abs(source.durationMs - attributes.durationInMillis) / 1000 : null;
        reason.textContent = unmatchedReason(candidate.confirmationReason, "cn") +
          (difference !== null ? " · 时长差 " + difference.toFixed(1) + " 秒" : "");
        copy.append(name, metadata, reason);
        try {
          const url = new URL(attributes.url);
          if (url.protocol === "https:" && url.hostname === "music.apple.com") {
            const link = document.createElement("a");
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "在 Apple Music 查看";
            copy.appendChild(link);
          }
        } catch {}
        label.append(input, copy);
        return label;
      }));
      setImportProgress(70, "待确认曲目 " + remaining + " 首");
    }

    function selectVersionCandidate(index) {
      const review = state.versionReview;
      if (!review || !Number.isInteger(index) || index < 0 || index >= review.rows[review.cursor].candidates.length) return;
      review.selectedIndex = index;
      elements.confirmVersion.disabled = false;
    }

    function completeVersionChoice(skip, renderNext = true) {
      const review = state.versionReview;
      if (!review || (state.importControl && state.importControl.canceled)) return;
      const row = review.rows[review.cursor];
      if (!skip) {
        const selected = row.candidates[review.selectedIndex];
        if (!selected || typeof selected.id !== "string" || !selected.id || selected.type !== "songs") return;
        row.apple = selected;
        row.confirmed = true;
        row.status = "matched";
        review.summary.matched += 1;
        setTrackStatus(row.source.id, "已确认", "ok");
      } else {
        row.status = "not_found";
        row.reason = "已跳过候选曲目：" + row.reason;
        review.summary.failed += 1;
        recordFailedTrack(row.source, row.reason);
        setTrackStatus(row.source.id, "已跳过", "fail");
      }
      review.summary.pending -= 1;
      elements.importMatched.textContent = String(review.summary.matched);
      elements.importFailed.textContent = String(review.summary.failed);
      review.cursor += 1;
      if (review.cursor < review.rows.length) {
        if (renderNext) renderVersionReview();
      } else {
        state.versionReview = null;
        elements.versionReviewPanel.hidden = true;
        if (state.importControl) state.importControl.reviewing = false;
        updateImportControlButtons();
        review.resolve();
      }
    }

    function skipRemainingVersions() {
      while (state.versionReview) {
        if (state.importControl && state.importControl.canceled) { cancelVersionReview(); return; }
        completeVersionChoice(true, false);
      }
    }

    function cancelVersionReview() {
      const review = state.versionReview;
      if (!review) return;
      state.versionReview = null;
      elements.versionReviewPanel.hidden = true;
      if (state.importControl) state.importControl.reviewing = false;
      review.reject(createImportCanceledError());
    }

    async function findAppleSong(music, storefront, track, searchCache, searchLimiter, onUnmatched) {
      return songMatcher.match(track, {
        storefront,
        onUnmatched,
        search: (region, query) => searchAppleSongs(music, region, query, searchCache, searchLimiter),
        resolveIsrc: (region, isrcs) => cachedAppleCatalog({ action: "isrc", storefront: region, isrcs }, searchCache, searchLimiter)
      });
    }

    async function searchAppleSongs(music, storefront, query, searchCache, searchLimiter) {
      return cachedAppleCatalog({ action: "search", storefront, term: query, limit: SEARCH_RESULT_LIMIT }, searchCache, searchLimiter);
    }

    async function cachedAppleCatalog(payload, searchCache, searchLimiter) {
      const cacheKey = JSON.stringify(payload);
      if (!searchCache.has(cacheKey)) {
        if (searchCache.size >= 1000) searchCache.delete(searchCache.keys().next().value);
        const searchPromise = requestAppleCatalog(payload, searchLimiter).catch((error) => {
          if (searchCache.get(cacheKey) === searchPromise) searchCache.delete(cacheKey);
          throw error;
        });
        searchCache.set(cacheKey, searchPromise);
      } else {
        const existing = searchCache.get(cacheKey);
        searchCache.delete(cacheKey);
        searchCache.set(cacheKey, existing);
        if (state.catalogMetrics) state.catalogMetrics.localCacheHits = catalogMetricNumber(state.catalogMetrics.localCacheHits) + 1;
      }

      return searchCache.get(cacheKey);
    }

    async function requestAppleCatalog(payload, searchLimiter) {
      return runAppleSearchWithRetry("Apple catalog search", searchLimiter, async () => {
        const startedAt = Date.now();
        if (state.catalogMetrics) {
          const metrics = state.catalogMetrics;
          metrics.requests = catalogMetricNumber(metrics.requests) + 1;
          const region = catalogStorefront(payload.storefront);
          if (!metrics.queriesByStorefront) metrics.queriesByStorefront = {};
          metrics.queriesByStorefront[region] = catalogMetricNumber(metrics.queriesByStorefront[region]) + 1;
          const role = typeof metrics.targetStorefront === "string" && payload.storefront === metrics.targetStorefront ? "targetQueries" : "sourceQueries";
          metrics[role] = catalogMetricNumber(metrics[role]) + 1;
          if (payload.action === "search") metrics.searchQueries = catalogMetricNumber(metrics.searchQueries) + 1;
          if (payload.action === "isrc") metrics.isrcQueries = catalogMetricNumber(metrics.isrcQueries) + 1;
        }
        let response;
        let result;
        try {
          response = await fetch("/apple/catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(45000)
          });
          result = await response.json();
        } catch {
          recordCatalogDiagnostics(null, startedAt);
          const error = new Error("Apple catalog connection unavailable");
          error.status = 503;
          throw error;
        }
        recordCatalogDiagnostics(result, startedAt);
        if (!response.ok) {
          if (state.catalogMetrics && response.status === 429) state.catalogMetrics.rateLimited = catalogMetricNumber(state.catalogMetrics.rateLimited) + 1;
          if (state.catalogMetrics && response.status >= 500 && response.status <= 599) state.catalogMetrics.serverErrors = catalogMetricNumber(state.catalogMetrics.serverErrors) + 1;
          const error = createAppleHttpError("Apple catalog search failed", response);
          error.diagnostics = sanitizeCatalogDiagnostics(result && result.diagnostics, result && result.cacheSource);
          error.code = result && result.error && result.error.code;
          if (result && result.error && result.error.details && Number.isFinite(result.error.details.retryAfterMs)) {
            error.retryAfterMs = result.error.details.retryAfterMs;
          }
          throw error;
        }
        return result && Array.isArray(result.data) ? result.data : [];
      });
    }

    function recordCatalogDiagnostics(result, startedAt) {
      const metrics = state.catalogMetrics;
      if (!metrics) return;
      const time = Date.now();
      const roundTripMs = Math.max(0, time - startedAt);
      metrics.totalRoundTripMs = catalogMetricNumber(metrics.totalRoundTripMs) + roundTripMs;
      const latest = sanitizeCatalogDiagnostics(result && result.diagnostics, result && result.cacheSource);
      metrics.latest = latest;
      if (result && result.cacheHit === true) metrics.cacheHits = catalogMetricNumber(metrics.cacheHits) + 1;
      if (latest.cacheSource === "memory") metrics.memoryCacheHits = catalogMetricNumber(metrics.memoryCacheHits) + 1;
      if (latest.cacheSource === "persistent") metrics.persistentCacheHits = catalogMetricNumber(metrics.persistentCacheHits) + 1;
      if (latest.coalesced > 0 || latest.cacheSource === "coalesced") metrics.coalescedResponses = catalogMetricNumber(metrics.coalescedResponses) + 1;
      if (!metrics.requestSamples) metrics.requestSamples = [];
      const cacheTiming = latest.cacheSource === "memory" || latest.cacheSource === "persistent" || (!latest.cacheSource && result && result.cacheHit === true);
      metrics.requestSamples.push({ time, roundTripMs, queueWaitMs: cacheTiming ? undefined : latest.queueWaitMs,
        upstreamMs: cacheTiming ? undefined : latest.upstreamMs, cacheReadMs: latest.cacheReadMs, cacheWriteMs: latest.cacheWriteMs });
      while (metrics.requestSamples.length && metrics.requestSamples[0].time < time - 30000) metrics.requestSamples.shift();
      while (metrics.requestSamples.length > 512) metrics.requestSamples.shift();
    }

    function catalogMetricNumber(value) {
      return Number.isFinite(value) && value >= 0 ? value : 0;
    }

    function catalogStorefront(value) {
      return ["cn", "jp", "kr", "us", "hk", "tw", "gb", "au", "ca", "de", "fr", "sg", "in", "br", "mx"]
        .includes(value) ? value : "other";
    }

    function sanitizeCatalogDiagnostics(diagnostics, cacheSource) {
      const safe = {};
      if (diagnostics && typeof diagnostics === "object") {
        for (const field of ["elapsedMs", "queueWaitMs", "upstreamMs", "cacheReadMs", "cacheWriteMs", "intervalMs", "queueDepth",
          "activeRequests", "cooldownMs", "rateLimitEvents", "concurrencyLimit", "pendingRequests", "pendingLimit",
          "memoryCacheEntries", "memoryCacheBytes", "persistentCacheEntries", "persistentCacheBytes", "upstreamRequests",
          "upstreamFailures", "timeoutEvents", "serverUptimeMs", "persistentCacheErrors", "coalesced"]) {
          const value = diagnostics[field];
          if (Number.isFinite(value) && value >= 0) safe[field] = value;
        }
      }
      const source = cacheSource || (diagnostics && diagnostics.cacheSource);
      if (["memory", "persistent", "upstream", "coalesced"].includes(source)) safe.cacheSource = source;
      return safe;
    }

    function catalogMetricsSnapshot(completed) {
      const metrics = state.catalogMetrics || {};
      const time = Date.now();
      const progress = metrics.progressSamples || [];
      let anchorIndex = 0;
      while (anchorIndex < progress.length - 1 && progress[anchorIndex + 1].time <= time - 30000) anchorIndex += 1;
      const anchor = progress[anchorIndex] || { completed: 0, requests: 0 };
      const snapshot = { completed: catalogMetricNumber(completed), requests: catalogMetricNumber(metrics.requests) };
      snapshot.recentRequests = Math.max(0, snapshot.requests - anchor.requests);
      snapshot.recentSongs = Math.max(0, snapshot.completed - anchor.completed);
      snapshot.recentRequestsPerSong = snapshot.recentSongs ? snapshot.recentRequests / snapshot.recentSongs : 0;
      snapshot.lifetimeRequestsPerSong = snapshot.requests / Math.max(snapshot.completed, 1);
      const samples = (metrics.requestSamples || []).filter(sample => sample.time >= time - 30000).slice(-512);
      for (const [field, prefix] of [["roundTripMs", "roundTrip"], ["queueWaitMs", "queueWait"], ["upstreamMs", "upstream"],
        ["cacheReadMs", "cacheRead"], ["cacheWriteMs", "cacheWrite"]]) {
        const values = samples.map(sample => sample[field]).filter(value => Number.isFinite(value) && value >= 0);
        snapshot[prefix + "Samples"] = values.length;
        snapshot[prefix + "AverageMs"] = values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
        if (prefix === "roundTrip") {
          values.sort((left, right) => left - right);
          snapshot.roundTripP95Ms = values.length ? values[Math.ceil(values.length * 0.95) - 1] : 0;
        }
      }
      for (const field of ["localCacheHits", "memoryCacheHits", "persistentCacheHits", "coalescedResponses", "rateLimited", "serverErrors",
        "retries", "activeRetries", "lastRetryStatus", "lastRetryDelayMs", "sourceQueries", "targetQueries", "searchQueries", "isrcQueries"]) {
        snapshot[field] = catalogMetricNumber(metrics[field]);
      }
      snapshot.sharedCacheHits = catalogMetricNumber(metrics.cacheHits);
      snapshot.queriesByStorefront = {};
      for (const [region, count] of Object.entries(metrics.queriesByStorefront || {})) {
        if (catalogStorefront(region) === region || region === "other") snapshot.queriesByStorefront[region] = catalogMetricNumber(count);
      }
      snapshot.backend = sanitizeCatalogDiagnostics(metrics.latest);
      delete snapshot.backend.cacheSource;
      return snapshot;
    }

    function catalogMetricsText(completed) {
      const metrics = state.catalogMetrics;
      if (!metrics) return "诊断尚未开始";
      recordCatalogProgress(completed);
      const snapshot = catalogMetricsSnapshot(completed);
      if (!metrics.snapshots) metrics.snapshots = [];
      metrics.snapshots.push(snapshot);
      while (metrics.snapshots.length > 512) metrics.snapshots.shift();
      const backend = snapshot.backend;
      const serverValue = field => Number.isFinite(backend[field]) ? String(backend[field]) : "-";
      const latency = prefix => snapshot[prefix + "Samples"] ? snapshot[prefix + "AverageMs"].toFixed(0) + "ms" : "-";
      const p95 = snapshot.roundTripSamples ? snapshot.roundTripP95Ms.toFixed(0) + "ms" : "-";
      const cachePercent = hits => snapshot.requests ? Math.round(hits / snapshot.requests * 100) : 0;
      let text = "近30秒查询 " + snapshot.recentRequestsPerSong.toFixed(1) + " 次/首 · RTT " + latency("roundTrip") + " / p95 " + p95;
      text += " · 队列 " + latency("queueWait") + " / 上游 " + latency("upstream");
      text += " · 缓存 " + cachePercent(snapshot.sharedCacheHits) + "%（持久 " + cachePercent(snapshot.persistentCacheHits) + "%，本地 " + snapshot.localCacheHits + "）";
      text += " · 活跃 " + serverValue("activeRequests") + "/" + serverValue("concurrencyLimit") + " / 排队 " + serverValue("queueDepth");
      text += " · 间隔 " + (Number.isFinite(backend.intervalMs) ? serverValue("intervalMs") + "ms" : "-");
      text += " · 429 " + snapshot.rateLimited + " / 5xx " + snapshot.serverErrors + " / 超时 " + serverValue("timeoutEvents");
      if (typeof elements !== "undefined" && elements.catalogDiagnosticReadout) {
        const details = [
          "近30秒查询 " + snapshot.recentRequestsPerSong.toFixed(1) + " 次/首（" + snapshot.recentRequests + " 次 / " + snapshot.recentSongs + " 首），最多 512 个样本",
          "往返均值 " + latency("roundTrip") + " / p95 " + p95 + "（" + snapshot.roundTripSamples + " 个响应）",
          "非缓存请求排队均值 " + latency("queueWait") + "，上游均值 " + latency("upstream") + "（排队 " + snapshot.queueWaitSamples + " / 上游 " + snapshot.upstreamSamples + " 个样本）",
          "缓存 本地 " + snapshot.localCacheHits + " / 共享 " + snapshot.sharedCacheHits + "（内存 " + snapshot.memoryCacheHits + " / 持久 " + snapshot.persistentCacheHits + " / 合并 " + snapshot.coalescedResponses + "）",
          "缓存读取均值 " + latency("cacheRead") + " / 写入均值 " + latency("cacheWrite") + "（读取 " + snapshot.cacheReadSamples + " / 写入 " + snapshot.cacheWriteSamples + " 个样本）",
          "重试 " + snapshot.retries + " 次 / 等待 " + snapshot.activeRetries + (snapshot.lastRetryStatus ? "，最近 HTTP " + snapshot.lastRetryStatus + " / " + snapshot.lastRetryDelayMs + "ms" : ""),
          "服务端活跃 " + serverValue("activeRequests") + "/" + serverValue("concurrencyLimit") + "，队列 " + serverValue("queueDepth") + "，待处理 " + serverValue("pendingRequests") + "/" + serverValue("pendingLimit"),
          "上游间隔 " + serverValue("intervalMs") + "ms，冷却 " + serverValue("cooldownMs") + "ms，共享限流 " + serverValue("rateLimitEvents") + " / 本次 429 " + snapshot.rateLimited + " / 5xx " + snapshot.serverErrors,
          "上游失败 " + serverValue("upstreamFailures") + " / 超时 " + serverValue("timeoutEvents") + " / 持久缓存错误 " + serverValue("persistentCacheErrors"),
          "序列化缓存 内存 " + serverValue("memoryCacheBytes") + "B / " + serverValue("memoryCacheEntries") + " 条，持久 " + serverValue("persistentCacheBytes") + "B / " + serverValue("persistentCacheEntries") + " 条",
          "服务运行 " + (Number.isFinite(backend.serverUptimeMs) ? (backend.serverUptimeMs / 1000).toFixed(0) + "s" : "-"),
          "来源地区请求 " + snapshot.sourceQueries + " / 目标地区请求 " + snapshot.targetQueries + "，搜索 " + snapshot.searchQueries + " / ISRC " + snapshot.isrcQueries,
          "地区 " + Object.entries(snapshot.queriesByStorefront).map(([region, count]) => region + " " + count).join(" / ")
        ];
        elements.catalogDiagnosticReadout.textContent = details.join("\\n");
      }
      return text;
    }

    function downloadCatalogDiagnostics() {
      const metrics = state.catalogMetrics || {};
      const aggregates = catalogMetricsSnapshot(metrics.completed);
      const fields = Object.keys(aggregates).filter(field => typeof aggregates[field] === "number");
      const logs = (metrics.snapshots || []).slice(-512).map(snapshot => {
        const safe = {};
        for (const field of fields) {
          const value = snapshot[field];
          if (Number.isFinite(value) && value >= 0) safe[field] = value;
        }
        safe.backend = sanitizeCatalogDiagnostics(snapshot.backend);
        delete safe.backend.cacheSource;
        safe.queriesByStorefront = {};
        for (const [region, count] of Object.entries(snapshot.queriesByStorefront || {})) {
          if ((catalogStorefront(region) === region || region === "other") && Number.isFinite(count) && count >= 0) safe.queriesByStorefront[region] = count;
        }
        return safe;
      });
      const blob = new Blob([JSON.stringify({ version: 1, aggregates, logs }, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "m2m-diagnostics.json";
      try { link.click(); } finally { URL.revokeObjectURL(link.href); }
    }

    function pauseForAppleSearch() {
      const control = state.importControl;
      if (!control || control.canceled || control.paused) return;
      control.paused = true;
      if (state.matchMeter) state.matchMeter.pause();
      updateImportControlButtons();
      setImportProgress(Number.parseInt(elements.importPercent.textContent, 10) || 0, "搜索暂时不可用，已暂停");
      addLog(elements.importLog, "搜索重试后仍不可用，已暂停；当前歌曲尚未计入失败");
    }

    function createSearchLimiter(intervalMs) {
      let nextAt = 0;
      let previousTurn = Promise.resolve();

      return {
        async waitTurn() {
          const turn = previousTurn.then(async () => {
            while (true) {
              await waitForImportTurn();
              const waitMs = nextAt - Date.now();
              if (waitMs <= 0) {
                nextAt = Date.now() + intervalMs;
                return;
              }
              await waitWithImportControl(waitMs);
            }
          });
          previousTurn = turn.catch(() => {});
          await turn;
        },
        penalize(delayMs) {
          nextAt = Math.max(nextAt, Date.now() + delayMs);
        }
      };
    }

    async function runAppleSearchWithRetry(label, searchLimiter, operation) {
      let lastError = null;
      const metrics = state.catalogMetrics;
      let waitingForRetry = false;

      try {
        for (let attempt = 0; attempt <= SEARCH_MAX_RETRIES; attempt += 1) {
          await searchLimiter.waitTurn();
          if (waitingForRetry && metrics) metrics.activeRetries = Math.max(0, catalogMetricNumber(metrics.activeRetries) - 1);
          waitingForRetry = false;

          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (!shouldRetryAppleSearch(error) || error.code === "apple_credentials_missing" || attempt >= SEARCH_MAX_RETRIES) {
              throw error;
            }

            const delayMs = appleSearchRetryDelay(error, attempt);
            const status = getErrorStatus(error);
            if (metrics) {
              metrics.retries = catalogMetricNumber(metrics.retries) + 1;
              metrics.activeRetries = catalogMetricNumber(metrics.activeRetries) + 1;
              metrics.lastRetryStatus = status;
              metrics.lastRetryDelayMs = delayMs;
            }
            waitingForRetry = true;
            noteAppleRateLimit(label, delayMs, status);
            if (status === 429) searchLimiter.penalize(delayMs);
            else await waitWithImportControl(delayMs);
          }
        }
      } finally {
        if (waitingForRetry && metrics) metrics.activeRetries = Math.max(0, catalogMetricNumber(metrics.activeRetries) - 1);
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
        return error.retryAfterMs;
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

    async function createApplePlaylist(name, musicUserToken, sourceName) {
      const response = await fetch("https://api.music.apple.com/v1/me/library/playlists", {
        method: "POST",
        headers: await appleHeaders(musicUserToken),
        body: JSON.stringify({
          attributes: {
            name,
            description: "Imported from " + (sourceName || "a music playlist") + " by M2M."
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

    async function addTracksToApplePlaylist(playlistId, rows, musicUserToken, onProgress) {
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      const chunkSize = 50;

      for (let index = 0; index < rows.length; index += chunkSize) {
        await waitForImportTurn();
        const chunk = rows.slice(index, index + chunkSize);
        try {
          await addAppleTrackChunk(playlistId, chunk, musicUserToken);
          processed += chunk.length;
          succeeded += chunk.length;
          for (const row of chunk) setTrackStatus(row.source.id, "已载入", "ok");
        } catch (error) {
          if (error.name === "AppleTokenError") throw error;
          for (const row of chunk) {
            await waitForImportTurn();
            try {
              await addAppleTrackChunk(playlistId, [row], musicUserToken);
              succeeded += 1;
              setTrackStatus(row.source.id, "已载入", "ok");
            } catch (error) {
              if (error.name === "AppleTokenError") throw error;
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

    async function addAppleTrackChunk(playlistId, rows, musicUserToken) {
      const response = await fetch("https://api.music.apple.com/v1/me/library/playlists/" + encodeURIComponent(playlistId) + "/tracks", {
        method: "POST",
        headers: await appleHeaders(musicUserToken),
        body: JSON.stringify({
          data: rows.map((row) => ({ id: row.apple.id, type: "songs" }))
        })
      });

      if (!response.ok) {
        throw new Error("添加歌曲失败：" + response.status);
      }
    }

    async function appleHeaders(musicUserToken) {
      const developerToken = await ensureAppleDeveloperToken();
      return {
        "Authorization": "Bearer " + developerToken,
        "Music-User-Token": musicUserToken,
        "Content-Type": "application/json"
      };
    }

    function resetImportMetrics() {
      elements.importLog.innerHTML = "";
      state.catalogMetrics = null;
      if (elements.catalogDiagnosticReadout) elements.catalogDiagnosticReadout.textContent = "-";
      state.failedTracks = new Map();
      state.failedTrackRows = new Map();
      elements.failedTrackTable.innerHTML = "";
      elements.failedListCount.textContent = "0";
      elements.failedPanel.hidden = true;
      elements.versionReviewPanel.hidden = true;
      elements.versionReviewCandidates.replaceChildren();
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
      const badge = state.trackBadges.get(String(trackId));
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
      cancelVersionReview();
      if (state.importControl) {
        state.importControl.running = false;
        state.importControl.paused = false;
      }
      state.matchMeter = null;
      updateImportControlButtons();
    }

    function toggleImportPause() {
      const control = state.importControl;
      if (!control || !control.running || control.canceled) return;
      control.paused = !control.paused;
      if (state.matchMeter) {
        if (control.paused) state.matchMeter.pause();
        else state.matchMeter.resume();
      }
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
      cancelVersionReview();
      updateImportControlButtons();
      addLog(elements.importLog, "正在停止导入，当前请求完成后退出");
    }

    function updateImportControlButtons() {
      const control = state.importControl;
      const running = Boolean(control && control.running && !control.canceled);
      elements.pauseImport.disabled = !running || Boolean(control && control.reviewing);
      elements.cancelImport.disabled = !running;
      elements.pauseImport.textContent = control && control.paused ? "继续" : "暂停";
      elements.connectApple.textContent = running ? "返回导入进度" : "连接 Apple Music";
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

      renderFailedTracks(key);
    }

    function renderFailedTracks(key) {
      const track = state.failedTracks.get(key);
      if (!track) return;
      elements.failedPanel.hidden = false;
      elements.failedListCount.textContent = String(state.failedTracks.size);
      let row = state.failedTrackRows.get(key);
      if (!row) {
        row = document.createElement("tr");
        state.failedTrackRows.set(key, row);
        elements.failedTrackTable.appendChild(row);
      }
      row.replaceChildren(...[track.index, track.name, track.artists, track.reason].map((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        if (index === 3) cell.className = "muted";
        return cell;
      }));
    }

    function addLog(container, text) {
      const row = document.createElement("div");
      row.className = "log-row";
      const elapsed = state.parseStartedAt ? Math.round((Date.now() - state.parseStartedAt) / 1000) + "s" : "";
      row.innerHTML = "<span>" + escapeHtml(text) + "</span><span>" + elapsed + "</span>";
      container.appendChild(row);
      while (container.children.length > 100) container.firstElementChild.remove();
      if (!state.logScrollScheduled) state.logScrollScheduled = new WeakSet();
      if (!state.logScrollScheduled.has(container)) {
        state.logScrollScheduled.add(container);
        requestAnimationFrame(() => {
          state.logScrollScheduled.delete(container);
          container.scrollTop = container.scrollHeight;
        });
      }
    }

    function downloadParsedJson() {
      if (!state.parsed) return;
      const blob = new Blob([JSON.stringify(state.parsed, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const sourceKey = state.parsed.source && state.parsed.source.key ? state.parsed.source.key : "playlist";
      link.download = "m2m-" + sourceKey + "-playlist-" + state.parsed.playlist.id + ".json";
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
