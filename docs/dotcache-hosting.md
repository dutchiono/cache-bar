# Dotcache deploy

## Host

- Primary: `https://dotcache.bushleague.xyz`
- Legacy alias: `https://cachebar.bushleague.xyz`
- Web root: `/var/www/dotcache/dist` (dotcache user) and `/var/www/cachebar/dist`
- Nginx templates: `self-hosted/nginx/`

Both hosts serve `cache.html` at `/` (sticker POD primary). Drop 001 demo stays at `/drop-001-live.html`.

## GitHub Actions secrets

- `DOTCACHE_DEPLOY_USER` = `dotcache`
- `DOTCACHE_DEPLOY_PATH` = `/var/www/dotcache`
- `DOTCACHE_DEPLOY_SSH_KEY` = deploy key authorized for the dotcache user

## TLS

Apex HTTPS is issued with normal certbot + nginx (same as every other bushleague site):

```bash
sudo certbot --nginx -d dotcache.bushleague.xyz
```

No special registrar API creds required. Wildcard `*.dotcache.bushleague.xyz` is optional later; apex is the primary storefront.
