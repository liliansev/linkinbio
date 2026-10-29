# Hopla

**The open source, EU-hosted alternative to Linktree.** One link-in-bio page per
user, edited from a mobile-first admin panel.

- Hosted service: [hopla.page](https://hopla.page)
  (example: [hopla.page/lilian](https://hopla.page/lilian)).
- This repository: the full source code of the hosted service, licensed under
  AGPL-3.0.

The user interface is in French. Code comments and internal design notes are
mostly in French; developer-facing documentation is in English.

## Features

- **In-place editing**: on mobile, the page itself is the editor; on desktop,
  the editor sits next to a live preview.
- **URL detection**: a pasted URL picks the matching block type (YouTube video
  player, Calendly booking, product card with image and price, and so on).
- **Block types**: links, headings, text, video, music, image gallery, FAQ,
  vCard contact card, map location, contact form, reviews, email signup, RSS
  feed, latest YouTube video.
- **Conditional display**: show or hide blocks by referrer, time of day, date
  range or visitor country; scheduled links, countdowns, drops.
- **Cookieless analytics**: views, clicks, referrers, countries, devices. IP
  addresses are never stored.
- **Email list integrations**: Brevo, Mailchimp, Kit, MailerLite, beehiiv,
  Systeme.io, MailCheap, Loops, or Make, Zapier and n8n via webhook. Credentials
  are encrypted at rest (AES-256-GCM).
- **Theming**: 20 themes, custom font, background image, grid layout.
- **Passwordless sign-in** via magic link.
- **REST API and MCP server**: [hopla.page/docs](https://hopla.page/docs).

## Hosted vs self-hosted

| | [hopla.page](https://hopla.page) | Self-hosted |
| --- | --- | --- |
| Price | Free tier, then Starter and Pro plans | Free, infrastructure not included |
| Setup | None | Docker Compose, works with Coolify and Dokploy |
| Updates, backups, email delivery | Included | Instance administrator |
| Support | Yes | GitHub issues |

### Quick deploy

With [Coolify](https://coolify.io) or [Dokploy](https://dokploy.com):

1. Create a resource from this repository URL, build pack **Docker Compose**
   (`docker-compose.yml` at the repository root).
2. Set `LIENS_ORIGINE` (public URL of the instance, including `https://`) and
   `LIENS_ADMIN_EMAIL` (administrator email address).
3. Assign the domain to the `hopla` service on port 3000, then deploy.

Then sign in at `/admin` with the administrator email address. Environment
variables, email delivery, legal notices and backups:
[`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md).

## Local development

Requires Node.js 24 and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:4400
pnpm build && pnpm typecheck && pnpm test
```

Without `RESEND_API_KEY`, magic links are printed to the console. All
environment variables: [`.env.example`](.env.example).

## Stack

TanStack Start (React 19, Vite), Tailwind CSS v4, SQLite via `node:sqlite`.
In production, a single Node.js process (`deploy/server.mjs`) serves the public
pages and the admin panel; the Docker image ships without `node_modules`.

The codebase map and project conventions are in [`CLAUDE.md`](CLAUDE.md) (in
French). Much of Hopla was written with Claude Code, and this file is read by
both humans and coding agents.

## Contributing

Issues and pull requests are welcome: see [`CONTRIBUTING.md`](CONTRIBUTING.md).
Report security vulnerabilities privately: [`SECURITY.md`](SECURITY.md).

## License and trademark

The code is licensed under the [GNU Affero General Public License v3.0](LICENSE):
you may use, modify and redistribute it, including to run a network service,
provided you make your modifications available to the users of that service
under the same license.

The **Hopla** name, logo and the hopla.page domain are not covered by the
license: a self-hosted public instance or a public fork must use a different
name and logo. Portraits in the example profiles are AI-generated images
provided for demonstration purposes.

© 2026 AURA GROUP.
