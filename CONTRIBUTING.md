# Contributing to Hopla

Hopla is a small project: for anything beyond a small fix, please open an issue
before starting a large pull request.

## Reporting a bug or suggesting a feature

Open an issue with the steps to reproduce, the expected behavior and the actual
behavior (browser, device, screenshot if possible). Never report a security
vulnerability in a public issue: see [`SECURITY.md`](SECURITY.md).

## Submitting changes

```bash
pnpm install
pnpm dev                                  # http://localhost:4400
pnpm build && pnpm typecheck && pnpm test # same checks as CI
```

- One pull request per topic, branched from `main`.
- All tests pass, and new behavior comes with tests
  (`src/**/*.test.ts`, `deploy/server.test.mjs`).
- Read [`CLAUDE.md`](CLAUDE.md) before changing code: it contains the map of
  `src/` and the project rules. [`DESIGN.md`](DESIGN.md) covers the UI. Both are
  in French.

## Project rules

- **UI copy is in French**, without em dashes. The product name is Hopla.
- **Mobile first**: test every screen on mobile, then on desktop.
- **No new dependency** without prior discussion in an issue: the production
  image has no `node_modules`, everything is bundled at build time.
- **Visitor privacy**: no cookies, no stored IP addresses and no third-party
  tracking on public pages.
- **Icons**: filled Phosphor icons, no emoji, no icon on a background shape.
- **Browser testing**: agent-browser. Playwright is not used in this repository.
- Any change to the terms of service or the data processing agreement must bump
  `VERSION_CGU`.

## Licensing of contributions

This project is licensed under [AGPL-3.0](LICENSE). By submitting a pull
request, you confirm that you have the right to submit the code, and you agree
that it is distributed under AGPL-3.0 and may be used by AURA GROUP, publisher
of Hopla, in the hosted service at hopla.page, including under other license
terms. Sign off every commit (`git commit -s`) per the
[Developer Certificate of Origin](https://developercertificate.org).
