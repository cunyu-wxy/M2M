# M2M

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020.svg)](https://workers.cloudflare.com/)

M2M is a Cloudflare Workers app for migrating public playlists from Chinese music platforms to Apple Music.

Live demo: https://m2m.xinyu017722.workers.dev/

Changelog: [CHANGELOG.md](CHANGELOG.md)

Languages: [English](#english) | [简体中文](#简体中文)

## English

### Overview

M2M reads a public playlist link, extracts track metadata, lets the user authorize Apple Music in the browser, then creates an Apple Music library playlist and imports matched tracks.

The project is designed as a public web service:

- No account system.
- No server-side storage of Apple ID data.
- User-level Apple Music authorization stays in the browser.
- Server-side parsing is protected by a lightweight queue.
- The app can be deployed on Cloudflare Workers and Durable Objects.

### Supported Sources

| Source | Supported links | Notes |
| --- | --- | --- |
| NetEase Cloud Music | `music.163.com`, `y.music.163.com`, `163cn.tv` | Playlist pages and short links |
| QQ Music | `y.qq.com` | Playlist URLs with `id` or `disstid` |
| Kugou Music | `m.kugou.com/songlist/...`, `www.kugou.com/songlist/...`, `t*.kugou.com` | Some public share pages expose preview tracks only |
| Kuwo Music | `m.kuwo.cn`, `www.kuwo.cn` | Playlist detail pages |

When a source only exposes partial tracks, the API response is marked with `limited: true`.

### Features

- Detects the playlist source automatically.
- Extracts playlist name, cover, creator, track order, title, artists, album, and duration.
- Streams parsing progress with Server-Sent Events.
- Uses a Worker-side queue to protect free-tier resources.
- Shows queue position and estimated wait time in the UI.
- Authorizes Apple Music with MusicKit JS in the browser.
- Creates a new Apple Music playlist with a user-provided name.
- Searches the Apple Music catalog by title, artist, and album.
- Preserves source aliases and normalizes Unicode metadata for multilingual matching.
- Uses Japanese, Korean, or Russian catalogs to identify translated recordings, then resolves their ISRCs in the subscriber's catalog.
- Checks mainland China and Japan for ambiguous Han-only titles and uses album and artist aliases as language hints.
- Coordinates catalog searches globally, shares cached results, and deduplicates concurrent queries.
- Coalesces queued ISRC lookups within the same region and skips soundtrack descriptions that are not song titles.
- Imports matched tracks in batches.
- Shows success count, failure count, total progress, and failed track details.
- Recognizes individual singers in collaboration credits and reports title, artist, duration, and version mismatches separately.
- Offers account-region alternatives for explicit confirmation before creating the playlist; DJ versions and large duration differences are not silently substituted.
- Exports parsed playlist data as JSON.

### How It Works

1. The user opens the web app.
2. The user pastes a supported public playlist URL.
3. The browser joins the Worker-side queue.
4. The Worker parses the playlist and streams progress events.
5. The UI displays parsed tracks for review.
6. The user connects Apple Music.
7. MusicKit JS completes Apple ID authorization in the browser.
8. M2M creates an Apple Music playlist.
9. Tracks are searched, matched, and imported.
10. The UI displays import results and failed tracks.

### Architecture

- `src/index.js`: Cloudflare Worker entry, routing, CORS, API responses, and Apple token endpoint.
- `src/frontend.js`: Browser UI, queue flow, MusicKit integration, matching, and import progress.
- `src/playlist.js`: Multi-platform playlist source detection and parsing.
- `src/netease.js`: NetEase playlist parser.
- `src/apple.js`: Apple Music Developer Token generation.
- `src/matching.js`: Shared multilingual matching and recording/version checks.
- `src/apple-catalog.js`: Public catalog cache, global request scheduling, and Apple rate-limit handling.
- `src/catalog-cache.js`: Bounded SQLite persistence for public catalog results in the existing Durable Object.
- `src/queue.js`: Durable Object queue coordinator.
- `test/*.test.js`: Node.js test suites.

### Privacy Model

M2M does not store user accounts, Apple IDs, Apple Music user tokens, or personal music library data on the server.

The backend only handles:

- Public playlist parsing.
- Temporary queue state.
- Site-level Apple Music Developer Token generation.
- Public Apple Music catalog searches and bounded, expiring memory/SQLite caches of catalog results.

Apple Music user authorization is handled by MusicKit JS in the browser. Requests that modify the user's Apple Music library use the browser-side Music User Token.

Catalog requests contain a region and public track metadata, never a Music User Token. The shared memory cache holds up to 500 queries and 4 MiB of serialized result payloads. The existing SQLite-backed Durable Object also persists up to 10,000 results and 32 MiB of serialized payloads across instance restarts and deployments. Both layers preserve a six-hour TTL for results and five minutes for empty results; errors are never cached. Persistent keys are hashes of region-specific normalized requests, and values contain only public catalog fields, not account identifiers, playlist ownership, or subscriber credentials. Storage errors fall back to memory and upstream lookup. Playlist creation and library writes remain browser-to-Apple requests.

Persistent cache operations have a one-second asynchronous wait deadline; cancelled and older writes cannot overwrite newer results. A failed SQLite store retries initialization after a one-minute cooldown. Cache reads and upstream work share the same 40-operation pending bound, including identical-request deduplication.

### Apple Music Authentication

Apple Music requires two token layers:

- Developer Token: site-level token identifying this web app.
- Music User Token: user-level token created by MusicKit JS after Apple ID authorization.

End users do not need Apple Developer credentials. The deployer must configure the site-level Apple Music API credentials.

Supported Worker configurations:

| Variable | Required | Description |
| --- | --- | --- |
| `APPLE_TEAM_ID` | For automatic signing | Apple Developer Team ID |
| `APPLE_KEY_ID` | For automatic signing | Apple Music API key ID |
| `APPLE_PRIVATE_KEY` | For automatic signing | Apple Music API `.p8` private key content |
| `APPLE_DEVELOPER_TOKEN` | Optional, server only | Pre-signed token for backend catalog queries; never returned to browsers |
| `APPLE_TOKEN_TTL_SECONDS` | Optional | Server token TTL, defaults to `43200` |
| `APPLE_WEB_TOKEN_TTL_SECONDS` | Optional | Browser token TTL, defaults to `1800`, constrained to 300-3600 seconds |
| `PUBLIC_ORIGIN` | Optional | Exact browser origin, e.g. `https://music.example.com`, without a trailing slash; defaults to the Worker request origin |

Browser authorization requires all three signing secrets (`APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`). A deployment with only `APPLE_DEVELOPER_TOKEN` can still query the catalog, but must add the signing secrets to enable browser authorization. Do not commit `.p8`, `.dev.vars`, or any real token to Git.

Browser developer tokens are deliberately visible to MusicKit JS, but are signed separately with an exact `origin` claim and a default 30-minute lifetime. The browser renews them when fewer than two minutes remain, before authorization or each library write, including after long matching/review pauses. Server catalog tokens remain separate. Tokens and subscriber credentials are never included in diagnostics or limiter storage.

Token issuance requires a same-origin JSON POST and the existing `M2M_QUEUE` Durable Object. Missing/foreign origins and cross-site browser requests are rejected. A transactional, persistent limiter allows 12 requests per client IP per 10 minutes and 120 globally per minute, returning `429` and `Retry-After`. It stores at most 500 hashed IP counters; expired counters are pruned and an alarm clears them after inactivity. Raw IP addresses are not stored. Hashed identifiers are pseudonymous, not anonymous. This is an abuse deterrent, not authentication: non-browser clients can forge Origin headers. Cloudflare-side abuse protection may still be needed for a public service.

Previously issued unrestricted tokens are not invalidated by deployment; they remain valid until their original expiration. Revoking the associated MusicKit key invalidates those credentials but also interrupts clients using it. The site does not rotate or revoke developer keys automatically.

### API

#### `GET /playlist`

Parse a supported public playlist URL.

Query parameters:

- `url`: playlist URL.
- `limit`: optional track limit for testing.

Example:

```sh
curl "https://m2m.xinyu017722.workers.dev/playlist?url=https%3A%2F%2F163cn.tv%2F8kPnBRH"
```

Example response:

```json
{
  "sourceUrl": "https://163cn.tv/8kPnBRH",
  "resolvedUrl": "https://music.163.com/playlist?id=486271477",
  "source": {
    "key": "netease",
    "name": "网易云音乐"
  },
  "playlist": {
    "id": 486271477,
    "name": "Playlist name",
    "trackCount": 1501
  },
  "extractedCount": 1501,
  "missingCount": 0,
  "limited": false,
  "tracks": [
    {
      "index": 1,
      "id": 2744403189,
      "name": "Track title",
      "artists": ["Artist name"],
      "album": "Album name",
      "durationMs": 235356
    }
  ]
}
```

#### `POST /playlist`

Parse a playlist URL with a JSON request body.

```json
{
  "url": "https://163cn.tv/8kPnBRH",
  "limit": 50
}
```

#### `POST /playlist/stream`

Streams parser progress with Server-Sent Events. The browser uses this endpoint so playlist URLs and queue tickets are not placed in the request URL.

Events:

- `progress`: parsing progress.
- `done`: final playlist payload.
- `app-error`: normalized error payload.

Legacy aliases are still available:

- `POST /netease/playlist`
- `POST /netease/playlist/stream`

#### `POST /apple/developer-token`

Returns a short-lived, origin-bound Apple Music Developer Token and `expiresAt` for MusicKit JS. Use `Content-Type: application/json`, an empty JSON body, and the site's `Origin`. The browser supplies Origin automatically. GET returns `405`; the limiter must be available. This response uses `Cache-Control: no-store`.

#### `POST /apple/catalog`

Searches public catalog songs or resolves recordings by ISRC through the shared coordinator. Requests accept either `{ "action": "search", "storefront": "cn", "term": "song artist", "limit": 25 }` or `{ "action": "isrc", "storefront": "cn", "isrcs": ["JPWP01671360"] }`. The response contains `data`, `cacheHit`, `cacheSource`, and anonymous numeric `diagnostics`. No subscriber credentials are required or forwarded.

Invalid requests are rejected. Temporary errors include `error.details.retryAfterMs`, and the frontend respects the full delay. After repeated temporary failures, the import pauses without counting the current track as missing.

### Local Development

CI and local verification use Node.js 22; SQLite regression tests use its built-in `node:sqlite` module.

```sh
npm install
npm test
npm run dev
```

The Wrangler configuration sets `keep_names = false` so the shared matcher embedded in the browser remains self-contained after bundling. The bundle regression test checks this using the deployment configuration.

Test the parser locally:

```sh
curl "http://localhost:8787/playlist?url=https%3A%2F%2F163cn.tv%2F8kPnBRH&limit=10"
```

For local Apple Music import testing, create `.dev.vars`:

```sh
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
```

For backend catalog access only, a pre-signed developer token can also be configured:

```sh
APPLE_DEVELOPER_TOKEN=YOUR_PRE_SIGNED_DEVELOPER_TOKEN
```

Generate a pre-signed token:

```sh
npm run --silent apple:token -- \
  --team-id YOUR_APPLE_TEAM_ID \
  --private-key ~/share/AuthKey_<KEY_ID>.p8
```

Inspect token metadata:

```sh
npm run --silent apple:token -- \
  --team-id YOUR_APPLE_TEAM_ID \
  --private-key ~/share/AuthKey_<KEY_ID>.p8 \
  --json
```

### Deployment

#### GitHub Actions

The repository includes `.github/workflows/deploy-worker.yml`.

1. Create a Cloudflare API token with Workers deployment permissions.
2. Find your Cloudflare Account ID.
3. Add GitHub repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Push to `main`, or run the workflow manually.

Configure Apple Music secrets in Cloudflare Workers:

```sh
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_KEY_ID
npx wrangler secret put APPLE_PRIVATE_KEY
```

Optionally configure a separate pre-signed token for backend catalog queries (browser authorization still requires the signing secrets above):

```sh
npx wrangler secret put APPLE_DEVELOPER_TOKEN
```

Check the deployment:

```sh
curl https://m2m.xinyu017722.workers.dev/health
```

`appleConfigured` should be `true`; it checks browser signing credentials and the shared coordinator. `appleCatalogConfigured` separately reports backend catalog credential readiness.

#### Cloudflare Git Integration

You can also connect the GitHub repository `cunyu-wxy/M2M` in the Cloudflare dashboard.

Recommended settings:

- Build command: `npm install && npm test`
- Deploy command: `npx wrangler deploy`
- Worker entry: `src/index.js`

### Worker Limits

Current `wrangler.toml` defaults:

- `PLAYLIST_MAX_TRACKS=2000`
- `NETEASE_MAX_TRACKS=2000`
- `NETEASE_BATCH_SIZE=200`
- `QUEUE_MAX_ACTIVE=2`
- `APPLE_SEARCH_INTERVAL_MS=200`: minimum time between uncached Apple catalog request starts, shared across users. This is M2M's configured protection, not Apple's published quota. A 429 response increases this interval and pauses new starts for the full `Retry-After` period.
- `APPLE_SEARCH_CONCURRENCY=4`: maximum upstream requests in flight, bounded to 1–6. Concurrency hides network latency without increasing the configured start rate.

The existing `M2M_QUEUE` Durable Object also coordinates catalog requests; no additional binding or migration is required. Without that binding, local development uses a per-Worker-instance coordinator, which is not a global production rate limit.

The browser matches up to eight tracks concurrently. Queued ISRC lookups can share one upstream request for up to 25 distinct recording codes in the same region; each caller only receives its requested recordings. If a high-confidence recording is identified but no matching ISRC is returned in the account region, bounded alias searches still check for other original releases. If those also fail, the UI reports that separately from an unconfirmed match. This is not proof of a licensing restriction.

Matching progress shows recent 30-second and overall rates, excluding manual pauses. Logs distinguish recent and cumulative query counts, round-trip average and P95, queue wait, upstream response time, cache source, concurrency, pending work, retries, and search/ISRC region counts. Numeric diagnostics include the Durable Object runtime age, upstream failures/timeouts, and serialized cache entries and bytes; none contain subscriber credentials or other users' search terms. Cache byte counts are not process heap usage or allocated SQLite disk size. Host CPU utilization, CPU core counts, and free system memory are unavailable to the public Worker; actual invocation CPU and isolate memory metrics belong in the administrator's [Cloudflare Metrics and Analytics dashboard](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/), not a public endpoint requiring Cloudflare account credentials.

A temporary 5xx/network failure retries only the affected request rather than stalling every matching worker. Three consecutive upstream failures trigger a two-second shared cooldown and a slower start interval. Rate-limit recovery reduces the interval by 20% after four consecutive successful requests from the current recovery period, never below the configured base interval; older in-flight responses cannot undo a newer cooldown. Cache, timing samples, and logs remain bounded. Tests cover 1,000 cold queries including the period after 400, and a 1,000-query replay after service recreation with no additional upstream calls. These are deterministic simulations, not a guarantee of production throughput.

The import toolbar can download a diagnostic JSON containing only numeric aggregate snapshots, not raw logs, playlist/song names, URLs, or tokens. The download icon is from [Lucide](https://github.com/lucide-icons/lucide); its ISC and inherited Feather MIT notices are retained in the embedded SVG metadata. Server timing fields are approximate wall-clock observations, not CPU measurements; Workers clocks advance on I/O, so synchronous cache work can report zero milliseconds. Cached responses are excluded from upstream/queue averages. If the initial account search has no exact title, one original title-only account query runs before native-region probes; this can avoid unnecessary cross-region requests without weakening artist/version checks, but not every track needs fewer queries.

Chinese-context titles, singer credits, and albums are compared using OpenCC Traditional-to-Simplified conversion without changing the original metadata. Kana, Hangul, and Cyrillic contexts are not treated as Chinese. Authoritative source artist aliases and translated titles are searched in the account region before native-region fallbacks, with at most six distinct target queries and no exhaustive alias combinations. Conversion is local to the browser and its cache is bounded to 1,000 entries; no AI service or additional user data store is involved.

When the correct title and singer are found but only a different version or substantially different duration is available, matching continues for the rest of the playlist. Distinctive same-title candidates with close duration and an unconfirmed cross-script singer credit can also be offered for review; independent album evidence can support ambiguous Han credits. Album and duration alone never automatically identify a different singer. Before any playlist is created, the user can compare source and candidate metadata, confirm a candidate, skip a track, or skip all remaining alternatives. Candidates always come from the account region, and no automatic fallback imports a DJ version in place of an unmarked original.

`npm test` and Wrangler's custom build generate the self-contained browser matcher with `npm run build:matcher`. The ignored `dist/matcher-source.js` includes the dependency's MIT license and Apache-2.0 dictionary notices and needs no third-party script CDN. M2M's own license remains MIT.

Unconfirmed native-region credits may assist a bounded ISRC lookup for review, but those recordings are not treated as verified source matches. Only matching ISRC responses from the account region become candidates; additional version conflicts and missing durations are rejected. Already fetched account recordings are reused, and an established review candidate needs at most one final account title-only check rather than an exhaustive alias search.

Raise these limits only after validating queue behavior, upstream rate limits, and Apple Music import retries.

### Limitations

- Apple Music search may return wrong versions for covers, remixes, same-name tracks, or region-limited songs.
- Apple Music API rate limits can affect large imports.
- Requests cannot bypass Apple's developer-token quota. Cold searches and cross-language fallbacks take longer than cache hits; throughput is not guaranteed.
- Native-language catalog lookups never authorize importing songs unavailable in the subscriber's region. ISRC availability and source metadata quality still limit matches.
- Upstream music platform page structures may change.
- Some Kugou share pages expose preview tracks only.

### Roadmap

- Improve Apple Music match scoring and retry behavior.
- Add richer import pause/resume controls.
- Add more source-specific parsers and fallback strategies.
- Improve large-playlist throughput while respecting upstream limits.

### Contributing

Issues and pull requests are welcome. Useful reports include:

- Playlist links that fail to parse.
- Tracks that match incorrectly in Apple Music.
- Source platform page changes.
- UI or accessibility improvements.

### License

M2M is released under the [MIT License](LICENSE).

## 简体中文

### 项目简介

M2M 是一个部署在 Cloudflare Workers 上的在线歌单迁移工具，用来把中文音乐平台的公开歌单解析出来，并迁移到用户自己的 Apple Music 资料库。

在线体验：https://m2m.xinyu017722.workers.dev/

这个项目按公共服务设计：

- 不做账号系统。
- 后端不保存 Apple ID 数据。
- 用户级 Apple Music 授权留在浏览器内完成。
- 服务端解析任务由轻量队列保护。
- 可以部署在 Cloudflare Workers 和 Durable Objects 上。

### 支持平台

| 平台 | 支持链接 | 说明 |
| --- | --- | --- |
| 网易云音乐 | `music.163.com`、`y.music.163.com`、`163cn.tv` | 支持歌单页和短链接 |
| QQ 音乐 | `y.qq.com` | 支持带 `id` 或 `disstid` 的歌单链接 |
| 酷狗音乐 | `m.kugou.com/songlist/...`、`www.kugou.com/songlist/...`、`t*.kugou.com` | 部分公开分享页只暴露预览曲目 |
| 酷我音乐 | `m.kuwo.cn`、`www.kuwo.cn` | 支持歌单详情页 |

如果来源平台只返回部分曲目，接口会用 `limited: true` 标记。

### 功能特性

- 自动识别歌单来源平台。
- 解析歌单名、封面、创建者、曲目顺序、歌名、歌手、专辑和时长。
- 通过 Server-Sent Events 实时显示解析进度。
- 使用 Worker 侧队列保护免费额度。
- 前端展示排队位置和预计等待时间。
- 通过 MusicKit JS 在浏览器中完成 Apple Music 授权。
- 使用用户输入的名称创建 Apple Music 歌单。
- 按歌名、歌手和专辑在 Apple Music 曲库中搜索匹配。
- 保留源平台别名，规范化全角、重音和组合字符，改善外文歌曲匹配。
- 日文、韩文、俄文歌曲可通过原语言地区曲库辅助识别，再以 ISRC 查找用户所在地区的对应录音。
- 纯汉字歌名可尝试中国区和日区辅助识别，并从专辑及歌手别名中提取语言线索。
- 全站共享搜索缓存和限流协调，合并正在进行的相同查询。
- 合并同地区排队中的 ISRC 查询，过滤影视说明等并非歌名的别名。
- 批量导入匹配成功的歌曲。
- 实时展示成功数、失败数、总进度和失败详情。
- 支持多人署名中的歌手识别，并区分歌名、歌手、时长及版本不一致。
- 创建歌单前可人工确认账号地区的候选；DJ 版及明显时长差异不会被默认替代。
- 支持导出解析后的 JSON 数据。

### 工作流程

1. 用户打开在线页面。
2. 用户粘贴支持平台的公开歌单链接。
3. 浏览器加入 Worker 侧队列。
4. Worker 解析歌单并推送进度事件。
5. 前端展示解析出的曲目列表。
6. 用户连接 Apple Music。
7. MusicKit JS 在浏览器中完成 Apple ID 授权。
8. M2M 创建 Apple Music 歌单。
9. 系统搜索、匹配并导入曲目。
10. 前端展示导入结果和失败曲目。

### 项目结构

- `src/index.js`：Cloudflare Worker 入口、路由、CORS、API 响应和 Apple token 接口。
- `src/frontend.js`：浏览器 UI、队列流程、MusicKit 集成、匹配和导入进度。
- `src/playlist.js`：多平台歌单来源识别和解析。
- `src/netease.js`：网易云歌单解析器。
- `src/apple.js`：Apple Music Developer Token 生成。
- `src/matching.js`：多语言匹配、录音识别与版本检查。
- `src/apple-catalog.js`：公开曲库缓存、共享请求调度与 Apple 限流处理。
- `src/catalog-cache.js`：在现有 Durable Object 中持久化公开曲库结果，并限制容量。
- `src/queue.js`：Durable Object 队列协调器。
- `test/*.test.js`：Node.js 测试。

### 隐私模型

M2M 不会在服务端保存用户账号、Apple ID、Apple Music User Token 或个人资料库数据。

后端只负责：

- 解析公开歌单链接。
- 维护临时排队状态。
- 生成站点级 Apple Music Developer Token。
- 搜索 Apple Music 公开曲库，用有容量限制和有效期的内存/SQLite 缓存复用结果。

用户级 Apple Music 授权由 MusicKit JS 在浏览器内完成。修改用户 Apple Music 资料库的请求使用浏览器中的 Music User Token。

曲库请求仅携带地区和公开歌曲信息，不携带 Music User Token。共享内存缓存最多保留 500 个查询、4 MiB 序列化结果；现有 SQLite Durable Object 额外持久化最多 10000 个查询、32 MiB 序列化结果，实例重启和代码部署后仍可复用。两层缓存均保留结果 6 小时、空结果 5 分钟，不缓存错误；从持久缓存载入时不会延长原来的有效期。持久缓存键为分地区规范化请求的哈希，内容只有公开曲库字段，不保存账号标识、歌单归属或用户授权凭据。存储异常时退回内存缓存及上游查询。创建歌单和写入资料库仍由浏览器直接请求 Apple。

持久缓存操作的异步等待上限为一秒；已取消或较旧的写入不能覆盖较新的结果。SQLite 存储出错后冷却一分钟再尝试初始化。缓存读取与上游任务共同受 40 个待处理操作的上限约束，并合并相同请求。

### Apple Music 授权

Apple Music 需要两层 token：

- Developer Token：站点级 token，用来标识这个网站或应用。
- Music User Token：用户级 token，用户在浏览器中授权 Apple ID 后由 MusicKit JS 生成。

最终用户不需要提供 Apple 开发者账号。部署者需要配置站点级 Apple Music API 凭据。

Worker 支持的配置：

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `APPLE_TEAM_ID` | 自动签发时必需 | Apple Developer Team ID |
| `APPLE_KEY_ID` | 自动签发时必需 | Apple Music API Key ID |
| `APPLE_PRIVATE_KEY` | 自动签发时必需 | Apple Music API `.p8` 私钥内容 |
| `APPLE_DEVELOPER_TOKEN` | 可选，仅服务端 | 后端曲库查询使用的预签名 token，不返回浏览器 |
| `APPLE_TOKEN_TTL_SECONDS` | 可选 | 服务端 token 有效期，默认 `43200` 秒 |
| `APPLE_WEB_TOKEN_TTL_SECONDS` | 可选 | 浏览器 token 有效期，默认 `1800` 秒，限制在 300-3600 秒 |
| `PUBLIC_ORIGIN` | 可选 | 浏览器使用的完整站点来源，如 `https://music.example.com`，不要带末尾斜杠；默认使用 Worker 请求来源 |

浏览器授权需要同时配置 `APPLE_TEAM_ID`、`APPLE_KEY_ID`、`APPLE_PRIVATE_KEY`。仅配置 `APPLE_DEVELOPER_TOKEN` 的部署仍可查询公开曲库，但必须补齐签名配置才能使用浏览器授权。不要把 `.p8`、`.dev.vars` 或真实 token 提交到 Git。

MusicKit JS 必须在浏览器中使用 Developer Token；现在浏览器 token 单独签发，绑定精确的 `origin`，默认 30 分钟有效。授权或每次写入资料库前，剩余有效期不足两分钟时会自动刷新，包括长时间匹配、暂停和人工确认后。后端曲库 token 与浏览器 token 分开，诊断和限流存储不包含 token 或用户凭据。

签发接口要求同源 JSON POST，并复用现有 `M2M_QUEUE` Durable Object。缺失或不匹配的 Origin、跨站浏览器请求会被拒绝。持久化事务限流为每个客户端 IP 每 10 分钟 12 次、全站每分钟 120 次，超限返回 `429` 和 `Retry-After`。最多存储 500 个哈希化 IP 计数器，清理过期记录并通过定时警报清理闲置状态，不保存原始 IP；这些哈希标识属于假名化数据，并非匿名数据。这些措施用于降低滥用，不能替代身份认证，非浏览器脚本仍可伪造 Origin；公共服务仍可能需要 Cloudflare 侧的防滥用措施。

部署不会撤销此前签发的无限制 token，它们会在原有效期结束后失效。撤销对应 MusicKit 密钥可使旧凭据失效，但也会中断使用它们的客户端；网站不会自动轮换或撤销开发者密钥。

### API

#### `GET /playlist`

解析一个支持平台的公开歌单链接。

参数：

- `url`：歌单链接。
- `limit`：可选，限制解析曲目数量，主要用于测试。

示例：

```sh
curl "https://m2m.xinyu017722.workers.dev/playlist?url=https%3A%2F%2F163cn.tv%2F8kPnBRH"
```

返回示例：

```json
{
  "sourceUrl": "https://163cn.tv/8kPnBRH",
  "resolvedUrl": "https://music.163.com/playlist?id=486271477",
  "source": {
    "key": "netease",
    "name": "网易云音乐"
  },
  "playlist": {
    "id": 486271477,
    "name": "歌单名称",
    "trackCount": 1501
  },
  "extractedCount": 1501,
  "missingCount": 0,
  "limited": false,
  "tracks": [
    {
      "index": 1,
      "id": 2744403189,
      "name": "歌曲名",
      "artists": ["歌手名"],
      "album": "专辑名",
      "durationMs": 235356
    }
  ]
}
```

#### `POST /playlist`

使用 JSON 请求体解析歌单链接。

```json
{
  "url": "https://163cn.tv/8kPnBRH",
  "limit": 50
}
```

#### `POST /playlist/stream`

以 Server-Sent Events 形式返回解析进度。浏览器使用这个接口，避免把歌单链接和队列票据放在 URL 中。

事件类型：

- `progress`：解析进度。
- `done`：最终歌单数据。
- `app-error`：标准化错误信息。

兼容接口仍然保留：

- `POST /netease/playlist`
- `POST /netease/playlist/stream`

#### `POST /apple/developer-token`

返回 MusicKit JS 使用的短期、绑定站点的 Developer Token 和 `expiresAt`。请求需使用 `Content-Type: application/json`、空 JSON 请求体和本站 `Origin`（浏览器自动附带）。GET 返回 `405`；共享限流器不可用时不会签发，响应使用 `Cache-Control: no-store`。

#### `POST /apple/catalog`

通过共享协调器搜索公开歌曲，或按 ISRC 查找对应录音。请求体为 `{ "action": "search", "storefront": "cn", "term": "歌名 歌手", "limit": 25 }` 或 `{ "action": "isrc", "storefront": "cn", "isrcs": ["JPWP01671360"] }`，返回 `data`、`cacheHit`、`cacheSource` 及匿名数值 `diagnostics`。无需提供用户授权凭据，也不会向 Apple 转发用户 token。

临时错误会包含 `error.details.retryAfterMs`，前端按完整等待时间重试。多次临时失败后暂停导入，当前曲目不会被计为未找到。

### 本地开发

CI 和本地验证使用 Node.js 22；SQLite 回归测试依赖内置的 `node:sqlite` 模块。

```sh
npm install
npm test
npm run dev
```

Wrangler 配置使用 `keep_names = false`，保证嵌入浏览器的共享匹配器在打包后仍可独立运行；构建回归测试会使用部署配置验证这一点。

本地测试解析接口：

```sh
curl "http://localhost:8787/playlist?url=https%3A%2F%2F163cn.tv%2F8kPnBRH&limit=10"
```

如果要本地测试 Apple Music 导入，创建 `.dev.vars`：

```sh
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
```

仅用于后端曲库查询时，也可以配置预签名 Developer Token：

```sh
APPLE_DEVELOPER_TOKEN=YOUR_PRE_SIGNED_DEVELOPER_TOKEN
```

生成预签名 token：

```sh
npm run --silent apple:token -- \
  --team-id YOUR_APPLE_TEAM_ID \
  --private-key ~/share/AuthKey_<KEY_ID>.p8
```

查看 token 元信息：

```sh
npm run --silent apple:token -- \
  --team-id YOUR_APPLE_TEAM_ID \
  --private-key ~/share/AuthKey_<KEY_ID>.p8 \
  --json
```

### 部署

#### GitHub Actions

仓库包含 `.github/workflows/deploy-worker.yml`。

测试、发布和线上生效是三个独立结果：

| 阶段 | GitHub Actions 直部署 | Cloudflare Git Integration（默认） |
| --- | --- | --- |
| 测试 | Actions `Tests` | Actions `Tests`；Cloudflare 构建也应运行测试 |
| 发布 | Actions `Deploy (GitHub Actions)` | 独立的 `Workers Builds: m2m` commit check；Actions deploy job 显示 skipped |
| 线上生效 | Actions `Verify production SHA and security` | 同一验证 job，等待 Cloudflare 独立发布后核对线上 SHA |

工作流默认 `DEPLOYMENT_MODE=git-integration`，与当前仓库使用的 Cloudflare Git Integration 一致。只选一条生产发布链路，避免同一 push 被重复部署。Actions 整体 success 不替代独立的 Cloudflare 发布检查；被更新的 main 工作流取代而 cancelled 的运行也不代表验证成功。

若选择 Actions 直接发布：

1. 创建具有 Workers 部署权限的 Cloudflare API Token。
2. 找到 Cloudflare Account ID。
3. 在 GitHub 仓库 secrets 中添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 在仓库 **Variables** 中设 `DEPLOYMENT_MODE=actions`，并在 Cloudflare 控制台断开自动 Git 发布。
5. 在仓库 Variables 中设 `PRODUCTION_URL` 为实际生产站点 Origin，例如 `https://music.example.com`。原仓库默认使用 README 中的 workers.dev 地址；fork 必须自行设置。
6. 推送到 `main`，或在 `main` 手动运行 workflow。PR 和其他分支的手动运行只测试。

显式选择 `actions` 后，缺失 Cloudflare secrets 会使 deploy job 失败，不再将跳过发布计为成功。

在 Cloudflare Workers 中配置 Apple Music secrets：

```sh
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_KEY_ID
npx wrangler secret put APPLE_PRIVATE_KEY
```

也可以为后端曲库查询单独配置预签名 token（浏览器授权仍需上述签名配置）：

```sh
npx wrangler secret put APPLE_DEVELOPER_TOKEN
```

检查部署：

```sh
curl https://m2m.xinyu017722.workers.dev/health
```

响应新增版本字段，例如：

```json
{
  "ok": true,
  "version": {
    "gitSha": "9cdb4c2cd97453df8cce33d76ecb205c85f33a4c",
    "workerVersionId": "1be07e54-15ae-4d37-be7e-ba225808cb30"
  },
  "appleConfigured": true,
  "appleCatalogConfigured": true,
  "queueConfigured": true
}
```

上面只是字段示例，不表示旧版本已支持这些字段。`gitSha` 在 Wrangler 自定义构建中从 Cloudflare `WORKERS_CI_COMMIT_SHA`、GitHub `GITHUB_SHA` 或本地 Git HEAD 写入打包代码，不读取运行时可修改的版本变量；已知来源不一致或没有完整 SHA 时构建失败。忽略提交的 `dist/version.js` 每次重新生成，避免复用构建缓存中的旧 SHA。`workerVersionId` 来自 Cloudflare version metadata binding，可与 `Workers Builds: m2m` 中的 Version ID 对照；本地可能为 null。响应仅增加公开版本标识，保持 `Cache-Control: no-store`，不返回环境变量、私钥或 token。

`appleConfigured` 为 `true` 只表示浏览器签名配置和共享协调器绑定齐全；`appleCatalogConfigured` 表示后端曲库凭据齐全。这些标志不实际调用 Apple，不保证密钥有效或上游可用。

按完整 SHA 验证生产站点：

```sh
npm run verify:production -- https://m2m.xinyu017722.workers.dev "$(git rev-parse HEAD)"
```

脚本默认最多检查 30 次，间隔 10 秒，每次请求超时 10 秒。只有生产 `/health` 返回目标 SHA、配置就绪，并且 token 接口对 GET、缺失 Origin、外站 Origin、错误 Content-Type 分别返回 405/403/403/415 时才成功。旧代码、缺少版本字段、重定向、部署失败或等待超时均不能通过。脚本不申请正常 token，不打印远端响应正文，只输出 SHA、Worker Version ID、检查数和验证时间。Actions 的 job summary 保存同样的证据。单次探测不能证明所有边缘节点或渐进发布流量均已切换；本项目应使用完整的 `wrangler deploy` 发布。

#### Cloudflare Git 集成

也可以在 Cloudflare 控制台连接 GitHub 仓库 `cunyu-wxy/M2M`。

推荐配置：

- Build command：`npm install && npm test`
- Deploy command：`npx wrangler deploy`
- Worker entry：`src/index.js`

建议将 Build command 改为 `npm ci && npm test`，并使用 Node.js 22。Deploy command 仍为 `npx wrangler deploy`：`wrangler.toml` 的 `[build]` 会自动生成 SHA，无需更改控制台发布命令。在 GitHub Variables 中设置 `DEPLOYMENT_MODE=git-integration`（也可保留默认）及实际 `PRODUCTION_URL`；无需添加 Cloudflare GitHub secrets。若配置 `PUBLIC_ORIGIN`，生产验证 URL 应使用该 Origin。

Git Integration 独立监听 Git push，**不会等待 Actions 的 Tests job**；Cloudflare Build command 自己执行的 `npm test` 才是这条发布链路的测试门禁。GitHub 的生产验证 job 只观察线上结果，不持有 Cloudflare 或 Apple 密钥，也不执行发布。控制台配置无法由仓库文件自动修改，请核对生产分支为 `main`、构建测试命令及发布命令。`Workers Builds: m2m` success/Version ID 是 Cloudflare 侧发布记录，最终以生产健康检查的 SHA 和安全行为为生效证据。

### Worker 限制

当前 `wrangler.toml` 默认值：

- `PLAYLIST_MAX_TRACKS=2000`
- `NETEASE_MAX_TRACKS=2000`
- `NETEASE_BATCH_SIZE=200`
- `QUEUE_MAX_ACTIVE=2`
- `APPLE_SEARCH_INTERVAL_MS=200`：全站未命中缓存的 Apple 曲库请求最小启动间隔。这是 M2M 的保护配置，不是 Apple 公布的固定配额。收到 429 后增大间隔，并等待完整的 `Retry-After` 时间。
- `APPLE_SEARCH_CONCURRENCY=4`：最多同时进行四个上游请求，可配置范围为 1–6。并发用于覆盖网络等待时间，不会提高配置的请求启动频率。

曲库协调复用现有 `M2M_QUEUE` Durable Object，无需新增绑定或迁移。未配置此绑定时，本地开发只使用单个 Worker 实例内的协调器，不能作为生产环境的全站限流方案。

浏览器最多同时匹配八首歌。同地区排队中的 ISRC 查询可合并为一次上游请求，最多包含 25 个不同录音编码，各调用方只接收自己请求的录音。高置信识别出录音、但在账号地区未查到相同 ISRC 时，仍会进行有限的别名搜索，检查其他原版发行；兜底也失败后才显示区别于普通匹配失败的原因，这不等同于已确认版权缺失。

匹配进度同时显示近 30 秒速度和全程平均速度，扣除手动暂停时间。日志区分近期与累计查询次数、往返平均及 P95、排队等待、上游响应耗时、缓存来源、并发、待处理数量、重试，以及各地区搜索/ISRC 查询计数。匿名数值诊断还包含 Durable Object 运行时长、上游失败及超时次数、缓存条目和序列化字节数，不含用户授权或其他人的搜索词。缓存字节数不等于进程堆内存或 SQLite 实际磁盘占用。公开 Worker 无法读取宿主机 CPU 使用率、核数及系统剩余内存；真实请求 CPU 时间与 isolate 内存请在管理员的 [Cloudflare Metrics and Analytics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/) 中查看，不向网页暴露 Cloudflare 管理凭据。

临时 5xx 或网络错误只让当前请求退避重试，不阻塞全部匹配线程；连续三个上游失败才触发两秒共享冷却并降低请求频率。恢复周期每连续成功四次，将间隔降低 20%，不会低于配置的基础间隔；旧的在途响应不能抵消新的冷却。缓存、耗时采样及日志数量保持有界。测试覆盖第 400 首之后的 1000 次等量冷查询，以及重建服务后重跑 1000 次查询且不新增上游请求；这些是确定性模拟，不保证线上固定吞吐。

导入工具栏可下载诊断 JSON，仅包含数值统计快照，不包含原始日志、歌单名、歌名、URL 或令牌。下载图标来自 [Lucide](https://github.com/lucide-icons/lucide)，嵌入 SVG 元数据保留 ISC 和继承的 Feather MIT 声明。服务端耗时是近似墙钟观测，不是 CPU 时间；Workers 时钟在 I/O 时推进，同步缓存工作可能显示为零毫秒。缓存响应不参与上游及排队耗时均值。首次账号地区查询没有精确歌名时，优先补查一次原歌名，再进行原语言地区检索，有机会减少无效跨区请求；不降低歌手或版本检查，也不保证每首歌都减少查询。

中文上下文的歌名、歌手署名和专辑使用 OpenCC 繁转简后比较，不改动原始元数据；包含日文假名、韩文或西里尔字母的上下文不会被当成中文处理。优先在账号地区搜索源平台提供的歌手别名及译名，再进行原语言地区兜底；目标地区最多六个不同查询，不穷举所有别名组合。转换在浏览器本地完成，缓存最多 1000 项，不使用 AI 服务或新增用户数据存储。

找到同名同歌手、但版本或时长明显不同的候选时，系统继续匹配歌单剩余歌曲。歌名完整对应、时长接近，但跨文字体系的歌手署名无法确认时，也可提供人工候选；独立专辑证据可辅助汉字署名的歧义判断。仅凭专辑和时长一致，不会自动接受不同歌手。创建 Apple 歌单之前，用户可对比源曲目与候选的元数据，确认选中曲目、跳过这首或跳过剩余项。候选仅来自账号地区，未标明 DJ 的原版不会被自动替换成 DJ 版。

`npm test` 和 Wrangler 自定义构建会通过 `npm run build:matcher` 生成自包含的浏览器匹配脚本。忽略提交的 `dist/matcher-source.js` 保留依赖的 MIT 许可和 Apache-2.0 字典声明，不依赖第三方脚本 CDN；M2M 自身仍使用 MIT 协议。

原语言地区署名尚未确认的录音可辅助有限的 ISRC 查询，但不会被当成已验证的源曲目。只有账号地区返回相同 ISRC 的录音才能成为人工候选；额外的版本冲突及缺失时长会被拒绝。复用已经取得的账号地区录音，形成待确认候选后最多再补查一次账号地区的纯歌名，不继续穷举别名。

只有在验证队列行为、上游限流和 Apple Music 导入重试后，才建议提高这些限制。

### 当前限制

- Apple Music 搜索可能因为翻唱、混音、同名曲目或地区版权返回错误版本。
- Apple Music API 限流会影响大歌单导入。
- 无法绕过 Apple 按开发者令牌计算的额度；首次搜索及外文兜底比缓存命中慢，不保证固定每秒匹配数量。
- 原语言地区只辅助识别，最终仍需确认录音在用户地区可用；ISRC 覆盖和源歌曲元数据质量仍会限制匹配效果。
- 上游音乐平台页面结构可能变化。
- 部分酷狗分享页只暴露预览曲目。

### 路线图

- 优化 Apple Music 匹配评分和重试行为。
- 增加更完整的导入暂停和恢复控制。
- 增加更多来源平台的解析器和兜底策略。
- 在尊重上游限制的前提下优化大歌单吞吐。

### 贡献

欢迎提交 issue 和 PR。尤其欢迎：

- 无法解析的歌单链接。
- Apple Music 匹配不准的歌曲样例。
- 来源平台页面结构变化。
- 前端交互和可访问性改进。

### 开源协议

M2M 使用 [MIT License](LICENSE) 开源。

### 社区链接

- [LINUX DO](https://linux.do/)
