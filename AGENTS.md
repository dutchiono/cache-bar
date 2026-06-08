# cache-bar agent notes

## Pre-push gate (required)

Before pushing to `main`, run the same build CI runs in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

```powershell
bun run build
```

Deploy **fails** on this step if TypeScript errors (e.g. unused locals `TS6133`). Convex + React share `tsc -b`; a dead variable in `convex/lib/*.ts` blocks the whole deploy even when the change is “backend only.”

**Do not push to `main` without a green local `bun run build`.**

### Broader changes

When touching platform/agent code, also run:

```powershell
bun run check:platform
```

CI runs this before deploy.

## If deploy fails

1. Read the failed job log:
   ```powershell
   gh run list --limit 3
   gh run view <run-id> --log-failed
   ```
2. Reproduce locally with the command from the log (usually `bun run build`).
3. Fix, verify locally, push fix to `main`.

### Example (Jun 2026)

- Push `3cd0707` failed: [deploy job](https://github.com/dutchiono/cache-bar/actions/runs/27151638503/job/80143842616)
- Error: `convex/lib/liveShopCatalog.ts(91,9): error TS6133: 'p' is declared but its value is never read.`
- Fix: remove unused variable; push `2c336e8`; redeploy green.

## Deploy workflow summary

On push to `main`: Convex deploy → seed/migrations → **`bun run build`** → upload `dist` + `public/` to miono. Concurrency cancels in-flight runs; only the latest push fully deploys.
