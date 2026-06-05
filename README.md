# M2M

M2M is a Cloudflare Worker for reading a NetEase Cloud Music playlist URL and returning normalized track metadata. The first endpoint focuses on NetEase Cloud Music to Apple Music migration preparation.

## API

### `GET /netease/playlist`

Query parameters:

- `url`: NetEase Cloud Music playlist URL or short URL.
- `limit`: Optional track limit for testing.

Example:

```sh
curl "https://YOUR_WORKER.workers.dev/netease/playlist?url=https%3A%2F%2F163cn.tv%2F8kPnBRH"
```

Response shape:

```json
{
  "sourceUrl": "https://163cn.tv/8kPnBRH",
  "resolvedUrl": "https://music.163.com/playlist?id=486271477",
  "playlist": {
    "id": 486271477,
    "name": "playlist name",
    "trackCount": 1501
  },
  "extractedCount": 1501,
  "missingCount": 0,
  "tracks": [
    {
      "index": 1,
      "id": 2744403189,
      "name": "Opalite",
      "artists": ["Taylor Swift"],
      "album": "The Life of a Showgirl",
      "durationMs": 235356
    }
  ]
}
```

### `POST /netease/playlist`

Body:

```json
{
  "url": "https://163cn.tv/8kPnBRH",
  "limit": 50
}
```

## Local development

```sh
npm install
npm test
npm run dev
```

Then open:

```sh
curl "http://localhost:8787/netease/playlist?url=https%3A%2F%2F163cn.tv%2F8kPnBRH&limit=10"
```

## Deploy with GitHub Actions

This repository includes `.github/workflows/deploy-worker.yml`.

1. Create a Cloudflare API token with Workers deploy permissions.
2. Find the Cloudflare account ID from the Cloudflare dashboard.
3. Add GitHub repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Push to `main`, or run the workflow manually from GitHub Actions.

## Deploy with Cloudflare Git integration

If you prefer Cloudflare's dashboard integration, connect GitHub in Cloudflare, import `cunyu-wxy/M2M`, and use:

- Build command: `npm install && npm test`
- Deploy command: `npx wrangler deploy`
- Worker entry: `src/index.js`

## Worker limits

`wrangler.toml` sets `NETEASE_MAX_TRACKS` to `2000`. Increase it only after adding queueing, retry, and progress tracking, because very large playlists create many upstream requests.
