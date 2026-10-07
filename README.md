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

Point a cloudflared public hostname at `http://localhost:8088` and protect it with a Cloudflare Access application.

Local development: `npm ci`, then `npm run dev:server` and `npm run dev` in two terminals, then open http://localhost:5178.

The v1 static site is on the `legacy/v1` branch and the `v1-final` tag.
