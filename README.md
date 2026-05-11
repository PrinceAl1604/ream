# REAM

A static, role-based prototype for a real-estate / property-lending platform.
Three personas drive the navigation from `index.html`:

- **Admin / Ops** — manages prospects, sites, loans, payments, team, org
- **Customer** — homeowner with active loan (4 lifecycle states)
- **Prospect** — applicant in the pipeline

## Run locally

The app is plain HTML / CSS / JS with no build step. Any static server works:

```sh
npx --yes http-server . -p 5500 -c-1
# then open http://localhost:5500/
```

## Design tokens

- `colors_and_type.css` is the single source of truth. It defines a shadcn-style
  HSL primitive layer (`--background`, `--primary`, …) plus an Untitled-UI–style
  scale (`--color-brand-50` … `--color-brand-950`, `--color-grey-*`, etc.) so
  every existing screen renders without rewrites.
- Brand: **Violet 600** (`#7c3aed`). Neutral: **Slate**.
- Dark theme is opt-in via `<html data-theme="dark">` or `.dark` class.

## Deployment

Served from GitHub Pages. No build step required — pushing to the configured
branch publishes the site.
