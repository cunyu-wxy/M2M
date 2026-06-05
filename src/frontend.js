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
      --bg: #f7f8fa;
      --surface: #ffffff;
      --surface-2: #eef3f7;
      --text: #18212c;
      --muted: #647385;
      --line: #d9e0e8;
      --accent: #0f766e;
      --accent-strong: #115e59;
      --danger: #b42318;
      --warning: #9a5b00;
      --ok: #15803d;
      --shadow: 0 12px 30px rgba(21, 31, 44, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      letter-spacing: 0;
    }

    button, input {
      font: inherit;
      letter-spacing: 0;
    }

    .app {
      width: min(1120px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 48px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 52px;
      margin-bottom: 22px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .mark {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: var(--text);
      color: #fff;
      font-weight: 800;
    }

    h1 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 750;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 13px;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: 18px;
      align-items: start;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
    }

    .main-panel {
      min-height: 620px;
      padding: 22px;
    }

    .side-panel {
      padding: 18px;
      position: sticky;
      top: 18px;
    }

    .stepper {
      display: grid;
      gap: 10px;
    }

    .step {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 10px;
      align-items: start;
      min-height: 42px;
      color: var(--muted);
    }

    .step-dot {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--surface);
      font-size: 12px;
      font-weight: 750;
    }

    .step.active .step-dot {
      border-color: var(--accent);
      background: #dff5ef;
      color: var(--accent-strong);
    }

    .step.done .step-dot {
      border-color: var(--ok);
      background: #e6f7ec;
      color: var(--ok);
    }

    .step-title {
      margin: 0;
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
    }

    .step-note {
      margin: 3px 0 0;
      font-size: 12px;
    }

    .view {
      display: none;
    }

    .view.active {
      display: block;
    }

    .entry {
      display: grid;
      gap: 18px;
      max-width: 740px;
    }

    .entry h2, .workspace h2 {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
    }

    .entry-copy {
      margin: 0;
      color: var(--muted);
      line-height: 1.7;
      max-width: 680px;
    }

    .input-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      margin-top: 4px;
    }

    input[type="url"], input[type="text"] {
      min-width: 0;
      height: 46px;
      border-radius: 8px;
      border: 1px solid var(--line);
      padding: 0 14px;
      background: #fff;
      color: var(--text);
      outline: none;
    }

    input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.13);
    }

    .button {
      min-height: 42px;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 0 16px;
      background: var(--accent);
      color: #fff;
      font-weight: 720;
      cursor: pointer;
      white-space: nowrap;
    }

    .button:hover {
      background: var(--accent-strong);
    }

    .button:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }

    .button.secondary {
      background: #fff;
      border-color: var(--line);
      color: var(--text);
    }

    .button.secondary:hover {
      border-color: #b8c4d1;
      background: var(--surface-2);
    }

    .workspace {
      display: grid;
      gap: 18px;
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
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--surface-2);
      border: 1px solid var(--line);
    }

    .progress-bar {
      width: 0%;
      height: 100%;
      background: var(--accent);
      transition: width 220ms ease;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fff;
      min-height: 76px;
    }

    .metric-label {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 12px;
    }

    .metric-value {
      margin: 0;
      font-size: 22px;
      font-weight: 780;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .table-wrap {
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
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
      background: #f8fafc;
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
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
      max-height: 180px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fbfcfd;
      font-size: 13px;
      color: var(--muted);
    }

    .log-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      min-height: 18px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      padding: 0 9px;
      background: var(--surface-2);
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge.ok {
      background: #e6f7ec;
      color: var(--ok);
    }

    .badge.fail {
      background: #fdecea;
      color: var(--danger);
    }

    .badge.warn {
      background: #fff3d8;
      color: var(--warning);
    }

    .modal {
      position: fixed;
      inset: 0;
      display: none;
      place-items: center;
      padding: 18px;
      background: rgba(24, 33, 44, 0.36);
      z-index: 20;
    }

    .modal.active {
      display: grid;
    }

    .dialog {
      width: min(520px, 100%);
      border-radius: 8px;
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: 0 22px 60px rgba(21, 31, 44, 0.22);
      padding: 20px;
    }

    .dialog h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }

    .dialog p {
      margin: 0 0 16px;
      color: var(--muted);
      line-height: 1.6;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    @media (max-width: 860px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .side-panel {
        position: static;
      }

      .input-row {
        grid-template-columns: 1fr;
      }

      .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 520px) {
      .app {
        width: min(100vw - 20px, 1120px);
        padding-top: 16px;
      }

      .main-panel, .side-panel {
        padding: 14px;
      }

      .topbar {
        align-items: flex-start;
      }

      .entry h2, .workspace h2 {
        font-size: 23px;
      }

      .metrics {
        grid-template-columns: 1fr;
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
            <h2>输入网易云歌单链接</h2>
            <p class="entry-copy">支持网易云分享短链和 music.163.com 歌单链接。解析完成后会展示歌名、歌手、专辑和后续导入状态。</p>
            <div class="input-row">
              <input id="playlistUrl" type="url" required placeholder="https://163cn.tv/8kPnBRH" autocomplete="off">
              <button class="button" type="submit">下一步</button>
            </div>
          </form>
        </div>

        <div class="view" id="viewParse">
          <section class="workspace">
            <div>
              <h2>解析歌单</h2>
              <div class="status-line">
                <span id="parseStatus">准备解析链接</span>
                <span id="parsePercent">0%</span>
              </div>
            </div>
            <div class="progress-shell"><div class="progress-bar" id="parseBar"></div></div>
            <div class="metrics">
              <div class="metric"><p class="metric-label">歌单曲目</p><p class="metric-value" id="metricTotal">0</p></div>
              <div class="metric"><p class="metric-label">已解析</p><p class="metric-value" id="metricParsed">0</p></div>
              <div class="metric"><p class="metric-label">缺失详情</p><p class="metric-value" id="metricMissing">0</p></div>
              <div class="metric"><p class="metric-label">歌单</p><p class="metric-value" id="metricPlaylist">-</p></div>
            </div>
            <div class="log" id="parseLog"></div>
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
            <div>
              <h2>载入 Apple Music</h2>
              <div class="status-line">
                <span id="importStatus">等待授权</span>
                <span id="importPercent">0%</span>
              </div>
            </div>
            <div class="progress-shell"><div class="progress-bar" id="importBar"></div></div>
            <div class="metrics">
              <div class="metric"><p class="metric-label">总进度</p><p class="metric-value" id="importTotal">0</p></div>
              <div class="metric"><p class="metric-label">匹配成功</p><p class="metric-value" id="importMatched">0</p></div>
              <div class="metric"><p class="metric-label">载入成功</p><p class="metric-value" id="importSucceeded">0</p></div>
              <div class="metric"><p class="metric-label">失败</p><p class="metric-value" id="importFailed">0</p></div>
            </div>
            <div class="log" id="importLog"></div>
            <div class="toolbar">
              <button class="button secondary" id="returnToParsed" type="button">返回歌单</button>
            </div>
          </section>
        </div>
      </section>

      <aside class="panel side-panel">
        <div class="stepper">
          <div class="step active" data-step="input"><div class="step-dot">1</div><div><p class="step-title">输入链接</p><p class="step-note">网易云歌单 URL</p></div></div>
          <div class="step" data-step="parse"><div class="step-dot">2</div><div><p class="step-title">解析歌单</p><p class="step-note">后端实时返回进度</p></div></div>
          <div class="step" data-step="auth"><div class="step-dot">3</div><div><p class="step-title">连接 Apple</p><p class="step-note">MusicKit 授权</p></div></div>
          <div class="step" data-step="import"><div class="step-dot">4</div><div><p class="step-title">载入歌单</p><p class="step-note">匹配、创建、添加</p></div></div>
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
    const state = {
      playlistUrl: "",
      parsed: null,
      developerToken: null,
      musicUserToken: null,
      importRows: [],
      parseStartedAt: 0
    };

    const elements = {
      appStatus: document.getElementById("appStatus"),
      views: {
        input: document.getElementById("viewInput"),
        parse: document.getElementById("viewParse"),
        import: document.getElementById("viewImport")
      },
      playlistForm: document.getElementById("playlistForm"),
      playlistUrl: document.getElementById("playlistUrl"),
      parseStatus: document.getElementById("parseStatus"),
      parsePercent: document.getElementById("parsePercent"),
      parseBar: document.getElementById("parseBar"),
      metricTotal: document.getElementById("metricTotal"),
      metricParsed: document.getElementById("metricParsed"),
      metricMissing: document.getElementById("metricMissing"),
      metricPlaylist: document.getElementById("metricPlaylist"),
      parseLog: document.getElementById("parseLog"),
      afterParseActions: document.getElementById("afterParseActions"),
      trackTableWrap: document.getElementById("trackTableWrap"),
      trackTable: document.getElementById("trackTable"),
      connectApple: document.getElementById("connectApple"),
      downloadJson: document.getElementById("downloadJson"),
      backToInput: document.getElementById("backToInput"),
      importStatus: document.getElementById("importStatus"),
      importPercent: document.getElementById("importPercent"),
      importBar: document.getElementById("importBar"),
      importTotal: document.getElementById("importTotal"),
      importMatched: document.getElementById("importMatched"),
      importSucceeded: document.getElementById("importSucceeded"),
      importFailed: document.getElementById("importFailed"),
      importLog: document.getElementById("importLog"),
      returnToParsed: document.getElementById("returnToParsed"),
      modal: document.getElementById("modal"),
      modalTitle: document.getElementById("modalTitle"),
      modalMessage: document.getElementById("modalMessage"),
      modalClose: document.getElementById("modalClose")
    };

    elements.playlistForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const url = elements.playlistUrl.value.trim();
      if (!url) return;
      parsePlaylist(url);
    });

    elements.connectApple.addEventListener("click", () => connectAppleMusic());
    elements.downloadJson.addEventListener("click", () => downloadParsedJson());
    elements.backToInput.addEventListener("click", () => resetToInput());
    elements.returnToParsed.addEventListener("click", () => showView("parse"));
    elements.modalClose.addEventListener("click", () => elements.modal.classList.remove("active"));

    function showView(name) {
      for (const [key, view] of Object.entries(elements.views)) {
        view.classList.toggle("active", key === name);
      }
      updateSteps(name);
    }

    function updateSteps(view) {
      const order = view === "input" ? ["input"] : view === "parse" ? ["input", "parse"] : ["input", "parse", "auth", "import"];
      document.querySelectorAll(".step").forEach((step) => {
        const key = step.dataset.step;
        const active = key === order[order.length - 1];
        const done = order.includes(key) && !active;
        step.classList.toggle("active", active);
        step.classList.toggle("done", done);
      });
    }

    function resetToInput() {
      state.parsed = null;
      elements.parseLog.innerHTML = "";
      elements.trackTable.innerHTML = "";
      elements.afterParseActions.hidden = true;
      elements.trackTableWrap.hidden = true;
      setParseProgress(0, "准备解析链接");
      showView("input");
      elements.appStatus.textContent = "等待链接";
      elements.appStatus.className = "badge";
    }

    function parsePlaylist(url) {
      state.playlistUrl = url;
      state.parseStartedAt = Date.now();
      state.parsed = null;
      elements.parseLog.innerHTML = "";
      elements.trackTable.innerHTML = "";
      elements.afterParseActions.hidden = true;
      elements.trackTableWrap.hidden = true;
      elements.metricTotal.textContent = "0";
      elements.metricParsed.textContent = "0";
      elements.metricMissing.textContent = "0";
      elements.metricPlaylist.textContent = "-";
      elements.appStatus.textContent = "解析中";
      elements.appStatus.className = "badge warn";
      setParseProgress(4, "提交解析任务");
      addLog(elements.parseLog, "已提交网易云链接");
      showView("parse");

      const streamUrl = "/netease/playlist/stream?url=" + encodeURIComponent(url);
      const eventSource = new EventSource(streamUrl);

      eventSource.addEventListener("progress", (event) => {
        handleParseProgress(JSON.parse(event.data));
      });

      eventSource.addEventListener("done", (event) => {
        eventSource.close();
        const result = JSON.parse(event.data);
        state.parsed = result;
        renderTracks(result.tracks);
        elements.afterParseActions.hidden = false;
        elements.trackTableWrap.hidden = false;
        elements.metricMissing.textContent = String(result.missingCount);
        elements.metricParsed.textContent = String(result.extractedCount);
        setParseProgress(100, "解析完成");
        elements.appStatus.textContent = "解析完成";
        elements.appStatus.className = "badge ok";
        addLog(elements.parseLog, "解析完成，共 " + result.extractedCount + " 首");
      });

      eventSource.addEventListener("app-error", (event) => {
        eventSource.close();
        const message = event.data ? JSON.parse(event.data).message : "解析连接中断，请稍后重试。";
        elements.appStatus.textContent = "解析失败";
        elements.appStatus.className = "badge fail";
        showError("解析失败", message);
      });

      eventSource.onerror = () => {
        eventSource.close();
        elements.appStatus.textContent = "解析失败";
        elements.appStatus.className = "badge fail";
        showError("解析失败", "解析连接中断，请稍后重试。");
      };
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
    }

    function setParseProgress(percent, text) {
      elements.parseBar.style.width = percent + "%";
      elements.parsePercent.textContent = percent + "%";
      elements.parseStatus.textContent = text;
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

      try {
        elements.appStatus.textContent = "连接 Apple";
        elements.appStatus.className = "badge warn";
        showView("import");
        setImportProgress(0, "准备 Apple Music 授权");
        resetImportMetrics();
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
        await importToAppleMusic(music, state.parsed);
      } catch (error) {
        elements.appStatus.textContent = "Apple 失败";
        elements.appStatus.className = "badge fail";
        showError("Apple Music 连接失败", error.message || "无法连接 Apple Music。");
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

    async function importToAppleMusic(music, parsed) {
      const tracks = parsed.tracks.filter((track) => !track.missing);
      const storefront = music.storefrontId || "us";
      const rows = [];
      let matched = 0;
      let failed = 0;
      let searched = 0;

      elements.importTotal.textContent = String(tracks.length);

      for (const track of tracks) {
        setImportProgress(8 + Math.round((searched / Math.max(tracks.length, 1)) * 62), "匹配歌曲 " + searched + "/" + tracks.length);
        const match = await findAppleSong(music, storefront, track);
        searched += 1;
        if (match) {
          matched += 1;
          rows.push({ source: track, apple: match, status: "matched" });
          setTrackStatus(track.id, "已匹配", "ok");
        } else {
          failed += 1;
          rows.push({ source: track, apple: null, status: "not_found" });
          setTrackStatus(track.id, "未找到", "fail");
        }
        elements.importMatched.textContent = String(matched);
        elements.importFailed.textContent = String(failed);
        if (searched % 10 === 0 || searched === tracks.length) {
          addLog(elements.importLog, "已匹配 " + searched + "/" + tracks.length + "，成功 " + matched + " 首");
        }
        await wait(90);
      }

      const matchedRows = rows.filter((row) => row.apple);
      if (!matchedRows.length) {
        setImportProgress(100, "没有可载入曲目");
        throw new Error("没有匹配到可载入 Apple Music 的歌曲。");
      }

      setImportProgress(72, "创建 Apple Music 歌单");
      const playlistId = await createApplePlaylist(parsed.playlist.name, state.developerToken, state.musicUserToken);
      addLog(elements.importLog, "Apple Music 歌单已创建");

      setImportProgress(78, "载入匹配歌曲");
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

    async function findAppleSong(music, storefront, track) {
      const queries = buildSearchQueries(track);
      let best = null;

      for (const query of queries) {
        const results = await music.api.search(query, { types: "songs", limit: 5, storefront });
        const candidates = results && results.songs && Array.isArray(results.songs.data) ? results.songs.data : [];
        for (const candidate of candidates) {
          const score = scoreCandidate(track, candidate);
          if (!best || score > best.score) {
            best = { ...candidate, score };
          }
        }
        if (best && best.score >= 0.78) break;
      }

      return best && best.score >= 0.55 ? best : null;
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
            name: "M2M - " + name,
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
        const chunk = rows.slice(index, index + chunkSize);
        try {
          await addAppleTrackChunk(playlistId, chunk, developerToken, musicUserToken);
          processed += chunk.length;
          succeeded += chunk.length;
          for (const row of chunk) setTrackStatus(row.source.id, "已载入", "ok");
        } catch {
          for (const row of chunk) {
            try {
              await addAppleTrackChunk(playlistId, [row], developerToken, musicUserToken);
              succeeded += 1;
              setTrackStatus(row.source.id, "已载入", "ok");
            } catch {
              failed += 1;
              setTrackStatus(row.source.id, "载入失败", "fail");
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
      elements.importTotal.textContent = "0";
      elements.importMatched.textContent = "0";
      elements.importSucceeded.textContent = "0";
      elements.importFailed.textContent = "0";
      setImportProgress(0, "等待授权");
    }

    function setImportProgress(percent, text) {
      elements.importBar.style.width = percent + "%";
      elements.importPercent.textContent = percent + "%";
      elements.importStatus.textContent = text;
    }

    function setTrackStatus(trackId, label, type) {
      const badge = document.querySelector("[data-import-status='" + trackId + "']");
      if (!badge) return;
      badge.textContent = label;
      badge.className = "badge " + type;
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
