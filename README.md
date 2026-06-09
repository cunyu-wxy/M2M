# M2M

M2M 是一个部署在 Cloudflare Workers 上的在线歌单迁移工具，用来把中文音乐平台的公开歌单解析出来，并迁移到用户自己的 Apple Music 资料库。

在线体验：https://m2m.xinyu017722.workers.dev/

GitHub 仓库：https://github.com/cunyu-wxy/M2M

## 当前支持的平台

- 网易云音乐：`music.163.com`、`y.music.163.com`、`163cn.tv`
- QQ 音乐：`y.qq.com` 歌单链接，支持 `id` 或 `disstid`
- 酷狗音乐：`m.kugou.com/songlist/...`、`www.kugou.com/songlist/...`、`t*.kugou.com` 分享链接
- 酷我音乐：`m.kuwo.cn`、`www.kuwo.cn` 歌单详情链接

酷狗部分公开分享页只暴露预览曲目，接口返回会用 `limited: true` 标记这种情况。

## 主要功能

- 自动识别歌单来源平台
- 解析歌单名、封面、创建者、曲目顺序、歌名、歌手、专辑和时长
- 通过 Server-Sent Events 实时显示解析进度
- 使用队列保护免费 Worker，用户可以看到排队位置和预计等待时间
- 浏览器内完成 Apple Music 授权，不需要注册账号
- 自动创建 Apple Music 歌单
- 根据歌名、歌手和专辑在 Apple Music 中搜索匹配
- 批量导入匹配成功的歌曲
- 实时展示导入成功、失败、总进度和失败原因
- 支持导出解析后的 JSON 数据

## 使用流程

1. 打开在线页面。
2. 粘贴网易云、QQ 音乐、酷狗或酷我的公开歌单链接。
3. 等待服务端解析歌单。
4. 检查解析出的歌曲列表。
5. 点击连接 Apple Music。
6. 在浏览器中完成 Apple ID 授权。
7. 输入要创建的 Apple Music 歌单名。
8. 等待系统搜索、匹配并导入歌曲。

## 隐私边界

M2M 不做账号系统，也不会在后端保存用户的 Apple ID、Music User Token 或个人资料。

后端只负责：

- 解析公开歌单链接
- 维护临时排队状态
- 提供站点级 Apple Music Developer Token

用户级 Apple Music 授权由 MusicKit JS 在浏览器内完成。导入 Apple Music 时，相关请求直接使用用户浏览器中的授权 token。

## Apple Music 授权模型

Apple Music 需要两层授权：

- 站点级 Developer Token：由服务端生成，用来标识这个网站或应用。
- 用户级 Music User Token：用户在浏览器中登录 Apple ID 后，由 MusicKit JS 生成。

最终用户不需要提供 Apple 开发者账号，也不需要上传任何 Apple 私钥。作为部署者，需要在 Cloudflare Worker 中配置站点级 Apple Music API 凭据。

## API

### `GET /playlist`

解析一个公开歌单链接。

参数：

- `url`：支持平台的公开歌单链接
- `limit`：可选，限制解析曲目数量，主要用于测试

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

### `POST /playlist`

解析歌单链接，适合前端或其他服务调用。

```json
{
  "url": "https://163cn.tv/8kPnBRH",
  "limit": 50
}
```

### `POST /playlist/stream`

以 Server-Sent Events 形式返回解析进度。浏览器端使用这个接口避免把歌单链接和排队票据暴露在 URL 中。

事件类型：

- `progress`：解析阶段、歌单阶段、曲目详情阶段的进度
- `done`：最终歌单解析结果
- `app-error`：标准化错误信息

兼容接口：

- `POST /netease/playlist`
- `POST /netease/playlist/stream`

旧接口仍保留，但新代码建议使用 `/playlist` 和 `/playlist/stream`。

### `GET /apple/developer-token`

返回给 MusicKit JS 使用的 Apple Music Developer Token。

支持两种配置方式：

- `APPLE_DEVELOPER_TOKEN`：预先签好的 Apple Music Developer Token，需要过期前手动更新。
- `APPLE_TEAM_ID`、`APPLE_KEY_ID`、`APPLE_PRIVATE_KEY`：由 Worker 自动签发短期 token。

自动签发所需的 Cloudflare Worker secrets：

- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`

可选变量：

- `APPLE_DEVELOPER_TOKEN`
- `APPLE_TOKEN_TTL_SECONDS`，默认 `43200`

## 本地开发

```sh
npm install
npm test
npm run dev
```

本地测试解析接口：

```sh
curl "http://localhost:8787/playlist?url=https%3A%2F%2F163cn.tv%2F8kPnBRH&limit=10"
```

如果要在本地测试 Apple Music 导入，需要在 `.dev.vars` 中配置站点级 Apple Music API 凭据：

```sh
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
```

也可以只配置预签名 token：

```sh
APPLE_DEVELOPER_TOKEN=YOUR_PRE_SIGNED_DEVELOPER_TOKEN
```

生成预签名 token：

```sh
npm run --silent apple:token -- \
  --team-id YOUR_APPLE_TEAM_ID \
  --private-key ~/share/AuthKey_<KEY_ID>.p8
```

查看 token 过期时间：

```sh
npm run --silent apple:token -- \
  --team-id YOUR_APPLE_TEAM_ID \
  --private-key ~/share/AuthKey_<KEY_ID>.p8 \
  --json
```

`.p8` 私钥文件应始终放在仓库外，不要提交到 GitHub。

## 部署

项目已经适配 Cloudflare Workers。

### GitHub Actions 部署

仓库包含 `.github/workflows/deploy-worker.yml`。

1. 创建具有 Workers 部署权限的 Cloudflare API Token。
2. 在 Cloudflare 控制台找到 Account ID。
3. 在 GitHub 仓库 secrets 中添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 推送到 `main`，或在 GitHub Actions 中手动运行部署。

Apple Music 自动签发还需要在 Cloudflare Worker 中添加 secrets：

```sh
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_KEY_ID
npx wrangler secret put APPLE_PRIVATE_KEY
```

或者使用预签名 token：

```sh
npx wrangler secret put APPLE_DEVELOPER_TOKEN
```

配置后可检查健康状态：

```sh
curl https://m2m.xinyu017722.workers.dev/health
```

返回中的 `appleConfigured` 应为 `true`。

### Cloudflare Git 集成部署

也可以在 Cloudflare Dashboard 中连接 GitHub 仓库 `cunyu-wxy/M2M`。

推荐配置：

- Build command：`npm install && npm test`
- Deploy command：`npx wrangler deploy`
- Worker entry：`src/index.js`

## Worker 限制

`wrangler.toml` 当前配置：

- `PLAYLIST_MAX_TRACKS=2000`
- `NETEASE_MAX_TRACKS=2000`
- `NETEASE_BATCH_SIZE=200`
- `QUEUE_MAX_ACTIVE=2`

不要盲目提高曲目上限。超大歌单会带来更多上游请求，也更容易触发 Apple Music 或音乐平台的限流。

## 当前限制

- Apple Music 搜索匹配可能受同名歌、翻唱版本、专辑版本和版权地区影响。
- Apple Music API 有限流，超大歌单导入需要更稳健的重试策略。
- 各音乐平台公开页面结构可能变化，解析器需要持续维护。
- 酷狗部分分享页只给出预览曲目，无法保证拿到完整歌单。

## 贡献

欢迎提交 issue 或 PR，尤其是：

- 解析失败的歌单链接
- Apple Music 匹配不准的歌曲样例
- 各平台公开接口变化
- 前端交互和可用性改进
