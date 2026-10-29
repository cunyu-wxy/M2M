# Changelog

All notable changes to this project are recorded here.

## 2026-10-29

### Security

- Issue browser MusicKit developer tokens separately from backend catalog tokens, with an exact origin claim and a default 30-minute lifetime (maximum one hour).
- Replace anonymous GET issuance with an origin-checked JSON POST. Add persistent, transactional per-IP and global issuance limits through the existing Durable Object, with Retry-After and expiring hashed counters.
- Refresh browser tokens before authorization and library writes, including long imports and manual review pauses. Concurrent refreshes share one request; refresh failures stop writes without marking every song as failed.
- Stop forwarding pre-signed server tokens to browsers. Browser authorization now requires the three Apple signing secrets. Already-issued tokens retain their original expiration; deployment does not revoke Apple keys.

### 更新摘要

- 浏览器 token 绑定站点、默认 30 分钟有效，并与服务端曲库 token 分开；签发接口改为同源 POST，加入每 IP 和全站持久化限流。
- 长时间导入和人工确认后自动更新即将过期的凭据，刷新失败不会造成批量歌曲误判。
- 仅配置长期预签名 token 的部署需补齐三个 Apple 签名配置；旧 token 不会因部署立即失效。

## 2026-10-13

### 更新摘要

- 改善日文、韩文、俄文等外文歌曲匹配：保留源平台别名、规范化 Unicode，使用原语言曲库辅助识别，并以 ISRC 确认用户所在地区的对应录音。默认地区为中国大陆，优先使用实际 Apple Music 账号地区。
- 全站共享 Apple 曲库搜索协调器，合并重复请求、缓存搜索结果，动态调整请求间隔，并在遇到限流时统一退避；复用现有 Durable Object，无需新增绑定。
- 完整遵守 Apple 的 `Retry-After`，持续搜索故障会暂停导入并保留进度，避免把临时故障计为歌曲不存在。
- 加强原版、伴奏、翻唱、现场和重新录制版本检查，保留可信匹配中的 Explicit / E 版本优先策略。
- 减少大歌单页面重复重绘，修复取消任务后旧搜索继续运行的问题，并限制队列代理路径以避免绕过曲库接口校验。
- 修复 Cloudflare Workers 原生 `fetch` 调用上下文及不支持的重定向模式造成的曲库搜索 `503`，补充运行时回归验证；不会向重定向目标转发授权头。

### Validation

- 81 automated tests, including multilingual matching, shared request scheduling, rate-limit recovery, cancellation, request validation, native fetch receiver binding, safe manual redirects, and browser matcher execution after Workers bundling.
- Read-only live catalog checks verified Japanese-to-mainland-China recording identification and corrected vocal/original-version selection. These checks do not imply a guaranteed match rate or fixed throughput.

### Added

- Shared Apple catalog coordination through the existing Durable Object, including bounded caching, concurrent-query deduplication, adaptive request spacing, and global cooldown after rate limits.
- Multilingual matching using source aliases, Unicode normalization, and native-language catalog lookups followed by ISRC resolution in the subscriber's region.

### Fixed

- Removed the 15-second cap on Apple's `Retry-After`; repeated transient catalog errors now pause the import instead of counting songs as missing.
- Prevented instrumental, karaoke, live, and remix versions from silently replacing a different requested version, and strengthened checks against unrelated same-title artists.
- Reduced large-playlist DOM updates by indexing track badges and updating failed rows individually.
- Waited for canceled search workers to finish before allowing another import, and rejected arbitrary paths through the queue proxy.
- Kept the browser matcher self-contained after Wrangler bundling and added a deployment-configuration regression test.
- Bound the native global fetch function to its Workers receiver to prevent catalog searches from failing before reaching Apple.
- Used Workers-supported manual redirects and rejected redirect responses without forwarding developer authorization.

## 2026-06-25

### Fixed

- Updated Apple Music match scoring to prefer explicit versions when candidates are otherwise similar, and to penalize clean, censored, edited, or radio-edit results unless the source title explicitly asks for that version.

## 2026-06-24

### Fixed

- Fixed the Apple Music authorization flow by wrapping `MusicKit.authorize()` with a timeout and a clearer retry message when the authorization callback does not return.
- Relaxed the Worker `Referrer-Policy` from `no-referrer` to `strict-origin-when-cross-origin` so the Apple Music authorization callback can complete more reliably while still avoiding full URL leakage.

Commit: `0069506` (`Fix Apple Music authorization callback`)
