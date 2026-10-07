# Food Map

A private map of places I want to eat, and **why** I saved each one.

- What and why: [`docs/product-concept.md`](docs/product-concept.md)
- Plan: [`docs/sprints.md`](docs/sprints.md)

## Run it

Node 24 and Docker. Data lives in `./data` (`places.json` and `images/`), which is not in git.

```bash
cp .env.example .env    # fill in the Cloudflare Access team domain and AUD tag
docker compose up -d --build
curl -I http://127.0.0.1:8088    # 401 is correct: only Access-signed requests get in
```

### Extraction keys (optional)

Claude reads shared screenshots and Google Places pins them. Both keys live in Bitwarden and are exported only into the shell that starts the container:

```bash
bw unlock   # then export BW_SESSION as it prints
export ANTHROPIC_API_KEY="$(bw get password food-map-anthropic)"
export GOOGLE_PLACES_API_KEY="$(bw get password food-map-google-places)"
docker compose up -d --build
docker compose logs app | grep extraction   # "Claude on, Google Places on"
```

Without them, the inbox works as a manual form and Google Maps share links still place the pin.

### Backups

`data/` is the only copy of the map. `scripts/backup.sh <dir>` writes a dated `food-map-YYYY-MM-DD_HHMM.tar.gz` there and keeps the newest 30. Run it nightly from the host's crontab (`crontab -e`), pointing at another disk or a folder that syncs off this machine:

```cron
15 3 * * * /home/main/projects/food-map/scripts/backup.sh /path/to/off-machine/food-map-backups >> /tmp/food-map-backup.log 2>&1
```

To restore: `docker compose down`, `tar -xzf <archive> -C data`, then `docker compose up -d`.

Point a cloudflared public hostname at `http://localhost:8088` and protect it with a Cloudflare Access application. Then add a **second** Access application for the same hostname with path `pwa`, whose only policy is **Bypass → Everyone**. Browsers fetch the app manifest and icons without your login cookie, and without them the app can't install as a share target. Only those static files live under `/pwa/`.

### Install on Android

Install from **Chrome** (or Samsung Internet): ⋮ → **Install app**. It must appear in the app drawer, not just as a home-screen shortcut. **Brave can't do this:** on Android it only creates shortcuts, which never show up in the share sheet ([brave/brave-browser#7357](https://github.com/brave/brave-browser/issues/7357)). Brave can stay your default browser; only the install needs Chrome.

Local development: `npm ci`, then `npm run dev:server` and `npm run dev` in two terminals, then open http://localhost:5178.

The v1 static site is on the `legacy/v1` branch and the `v1-final` tag.
