# Self-hosting

This guide covers deploying Hopla on your own infrastructure. If you do not
want to run a server, use the hosted service at [hopla.page](https://hopla.page).

The Hopla name and logo are reserved for the hosted service: a public instance
must use a different name (see "License and trademark" in the README).

## Requirements

- A server with Docker: 1 GB of RAM to build the image, 256 MB at runtime.
  [Coolify](https://coolify.io) and [Dokploy](https://dokploy.com) handle the
  domain and the TLS certificate; several providers, including Hostinger, offer
  VPS images with either one preinstalled.
- A domain name with a DNS record pointing to the server.
- For sign-in emails, a [Resend](https://resend.com) account with a verified
  domain (free tier: 3,000 emails per month). Without Resend, the instance runs,
  but only the administrator can sign in (see [First start](#first-start)).

Optional: Cloudflare Turnstile (bot protection on public forms), Creem (paid
plans).

## Features without billing

Without a Creem configuration, the instance sells no plans: every account gets
all features, with no trial period and no limits. This includes unlimited
blocks, scheduling, the email list, one year of analytics, the REST API and the
MCP server. API keys are created in Réglages (Settings), section "API et MCP",
and are used against the instance domain: `LIENS_ORIGINE/api/v2` and
`LIENS_ORIGINE/mcp` (or `LIENS_ORIGINE_ADMIN` if set).

With `CREEM_API_KEY` and `CREEM_WEBHOOK_SECRET`, the instance enforces the
hopla.page plans, the 14-day trial and their limits.

## Environment variables

Configuration is read from environment variables at startup: a change requires
a service restart, not an image rebuild.

### Required

| Variable | Example | Description |
| --- | --- | --- |
| `LIENS_ORIGINE` | `https://links.example.org` | Public URL of the instance. Pages at `/<username>`, admin panel at `/admin` |
| `LIENS_ADMIN_EMAIL` | `admin@example.org` | Administrator email address, also receives abuse reports |

### Optional

| Variable | Description |
| --- | --- |
| `LIENS_PSEUDO_PRINCIPAL` | Username of the administrator page (default: `moi`) |
| `LIENS_ORIGINE_ADMIN` | Separate URL for the admin panel (see below) |
| `RESEND_API_KEY`, `CONTACT_FROM` | Email delivery through Resend |
| `LIENS_CLE_INTEGRATIONS` | Encryption key for API credentials and subscribers (`openssl rand -base64 32`). Never change it once set |
| `LIENS_EDITEUR`, `LIENS_HEBERGEUR`, `LIENS_DIRECTEUR`, `LIENS_CONTACT_LEGAL` | Legal notice: publisher, hosting provider, publication director, legal contact |
| `LIENS_INSCRIPTION` | Empty: open sign-up. `attente`: waitlist, invitations sent from the Comptes (Accounts) tab |
| `LIENS_DEPOT_SOURCE` | URL of your modified fork, target of the "Code source" link (AGPL-3.0) |

The full list, with default values, is in
[`docker-compose.yml`](../docker-compose.yml) and [`.env.example`](../.env.example).

By default, the admin panel is served on the same domain as the pages. To serve
it on another hostname (`https://app.links.example.org`), set
`LIENS_ORIGINE_ADMIN` and point that hostname to the same service: each domain
redirects requests that belong to the other one.

## Deployment

### Coolify

1. **New Resource**, source **Git repository** (public, or private through the
   Coolify GitHub App): URL of this repository or of your fork, branch `main`.
2. **Build Pack**: Docker Compose, file `/docker-compose.yml`.
3. **Environment Variables**: set `LIENS_ORIGINE` and `LIENS_ADMIN_EMAIL`
   (Coolify flags missing required variables).
4. Domain of the `hopla` service: `https://links.example.org:3000`. Coolify
   routes the domain to port 3000 and issues the certificate.
5. **Deploy**. The first build takes a few minutes (type checking and tests
   included).

### Dokploy

1. **Create Service**, type **Compose**, Git source: branch `main`, path
   `./docker-compose.yml`.
2. **Environment**: `LIENS_ORIGINE` and `LIENS_ADMIN_EMAIL`.
3. **Domains**: the domain name, service `hopla`, port 3000, HTTPS with
   Let's Encrypt.
4. **Deploy**.

### Docker Compose

```bash
git clone https://github.com/liliansev/linkinbio.git hopla && cd hopla
cp .env.example .env        # fill in the variables
docker compose up -d --build
```

The service listens on port 3000 of the Docker network. Put an HTTPS reverse
proxy in front of it, for example Caddy, publishing the port on localhost
(`ports: ['127.0.0.1:3000:3000']` in a `compose.override.yaml`):

```
links.example.org {
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Real-IP {remote_host}
	}
}
```

The `X-Real-IP` header forwards the client IP address, used for rate limiting;
it is never stored. Traefik, used by Coolify and Dokploy, already sets it.

### Without Docker

Requires Node.js 24 and pnpm:

```bash
pnpm install --frozen-lockfile && pnpm build
NODE_ENV=production LIENS_DB=/srv/hopla/liens.db pnpm start
```

with the same environment variables.

## First start

1. On first launch, the database is created with the **main account** (the
   instance administrator): email `LIENS_ADMIN_EMAIL`, username
   `LIENS_PSEUDO_PRINCIPAL`, empty page.
2. Open `https://links.example.org/admin` and enter that email address. The
   magic link is sent by email; without `RESEND_API_KEY`, it is written to the
   service logs ("Logs" in Coolify or Dokploy), for the main account only. Other
   accounts cannot sign in until email delivery is configured.
3. The Comptes (Accounts) tab, available to the main account only, lists
   accounts, abuse reports, moderation and deletion.

## Backups

All data lives in the `hopla-data` volume: the SQLite database
(`/data/liens.db`) and uploaded images. The `deploy/sauvegarde.sh` script takes
an online copy (`VACUUM INTO`), verifies it, keeps 14 days of copies and uploads
them to remote storage with rclone when `HOPLA_SAUVEGARDE_DISTANTE` is set.

Also keep a copy of `LIENS_CLE_INTEGRATIONS`: without it, the API credentials
and subscribers encrypted in the database cannot be read.

## Updates

With Coolify or Dokploy: **Redeploy**, or enable automatic deployment on push.
With Docker Compose:

```bash
git pull && docker compose up -d --build
```

Database migrations run at startup. Back up before every update.

## Customizing a public instance

Outside hopla.page, the instance uses its own URLs, main account, legal
identity and "Code source" link; the author's page, signature and YouTube
channel are not shown. Before opening an instance to the public, review:

- **Legal texts** (`src/lib/legal.ts`): the identity comes from environment
  variables, but the terms of service describe the plans, prices and
  subprocessors of hopla.page.
- **Branding and landing page**: the Hopla name, the logo
  (`src/components/Logo.tsx`, `public/`), the landing page (`src/accueil/`) and
  the social sharing image.
- **Plan prices** (`src/lib/abonnement.ts`) and Creem billing.

Instance configuration is centralized in `src/lib/instance.ts`.

The user interface is in French only.
