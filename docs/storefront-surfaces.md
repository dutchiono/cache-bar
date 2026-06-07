# Storefront Surfaces

**Live shop is primary.** Production: `https://dotcache.bushleague.xyz` (legacy: `cachebar.bushleague.xyz`).

## Live shop (primary)

- URL: `/` and `/cache.html`
- Catalog: `public/data.js` — sticker pilot SKUs today; same rails for future merch
- Request flow: `/pod-request.html`
- Legacy alias: `/checkout.html` → `pod-request.html`

## Reference demo (internal only)

- URL: `/drop-001-live.html` — **not linked from live shop nav**
- Fake apparel catalog (`data-drop-001.js`) preserved for UX reference
- Banner + `noindex` — clearly not production

## Ops

- `/app` — staff backend (React SPA via `index.html` fallback)
- `/app/pod-setup` — Prodigi setup dashboard

## Redirects

| URL | Goes to |
| --- | --- |
| `/` | `cache.html` (nginx + SPA dev redirect) |
| `/checkout` | `/pod-request.html` |
| `/stash` | `/cache.html` |

## Branch / PR notes

- PR #1 (`codex/sticker-pod-run`) merged the sticker static storefront into `main` on 2026-06-01.
- Follow-up commit `f0c4e4a` on that branch is **not** a separate merge, but its checkout changes are already present on `main`.
- `origin/codex/sticker-pod-run` is stale relative to `main` (missing Foundry/platform work). Do not merge it wholesale.
- What made the old React commerce UI appear at `/` was `index.html` (SPA) winning before `cache.html`. Nginx now serves `cache.html` at `/`.

See also [docs/pod-sticker-run.md](pod-sticker-run.md) and [docs/dotcache-hosting.md](dotcache-hosting.md).
