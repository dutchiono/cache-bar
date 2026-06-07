# Storefront Surfaces

Public demo is **A / B only**. **B is the primary site.**

Production host: `https://dotcache.bushleague.xyz` (legacy alias: `cachebar.bushleague.xyz`).

## B — Sticker POD run (primary)

- URL: `/` and `/cache.html`
- Catalog: `public/data.js` (`CST-001`, `CST-002`, `CST-003`)
- Request flow: `/pod-request.html`
- Legacy alias: `/checkout.html` → redirects to `pod-request.html`
- Price: TBD until Prodigi proof and quote are approved

This is the only real product work in flight: three sticker types, fifty each.

## A — Drop 001 demo (archive reference)

- URL: `/drop-001-live.html`
- Catalog: `public/data-drop-001.js` (OG apparel/digital demo)
- Checkout: on-page demo cart only
- Isolated copy: `/drop-001.html`

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
