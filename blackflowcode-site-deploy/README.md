# Blackflowcode.ai — website

Static four-page marketing site. No build step, no framework, no server dependency.
All CSS is inline; the only external requests are Google Fonts (CDN) and the contact
form POST to Formspree.

```
index.html      Home
services.html   Services (7 service lines)
work.html       Work / portfolio
contact.html    Contact + form
vercel.json     Headers + cache config (Vercel)
netlify.toml    Headers + redirect config (Netlify) — ignored by Vercel
```

---

## Before you deploy — wire up the contact form

Both forms (`contact.html` and the home-page section in `index.html`) POST to a
**Formspree placeholder**. Until this is set, submissions silently fail.

1. Create a form at https://formspree.io pointed at `hello@blackflowcodeai.com`
2. Copy the form ID it gives you (e.g. `xldpkqwe`)
3. Replace `YOUR_FORM_ID` in **both** `index.html` and `contact.html`:
   `https://formspree.io/f/YOUR_FORM_ID` → `https://formspree.io/f/xldpkqwe`

---

## Deploy — Vercel (recommended)

You already run `dashboard.blackflowcodeai.com` on Vercel Pro, so the apex and the
subdomain stay in one place.

**Git (auto-deploys on push):**
1. Push these files to the repo root of `gitlab.com/gfcadmin/blackflowcodeai-site.git`
2. Vercel → New Project → import the GitLab repo
3. Framework Preset: **Other** · Build Command: **(empty)** · Output Directory: **`.`**
4. Deploy

**One-off (no Git):** drag this folder into the Vercel dashboard's deploy drop zone.

**Domain:** Project → Settings → Domains → add both `blackflowcodeai.com` and
`www.blackflowcodeai.com`. The `www`→apex 301 is already handled in `vercel.json`
(no need to set a primary in the dashboard). Then add the records Vercel shows you in
**Cloudflare DNS**, set to **DNS only (grey cloud)** — do not proxy a Vercel site:
- apex `blackflowcodeai.com` → **A record** → value from the dashboard (generally `76.76.21.21`), grey cloud
- `www` → **CNAME** → value from the dashboard (e.g. `cname.vercel-dns.com`), grey cloud

The apex cannot be a CNAME — it must be an A record (or full nameserver delegation).
Keeping it grey-cloud also ensures Vercel Web Analytics (`/_vercel/insights/*`) works.

---

## Deploy — Netlify (alternative)

`netlify.toml` is already set (`publish = "."`, no build). Either connect the GitLab
repo, or drag the folder into Netlify Drop. Add the custom domain in Site settings →
Domain management; the `www`→apex redirect is handled by `netlify.toml`.

---

## Analytics — Vercel Web Analytics (pre-wired)

Each page already includes the Vercel Web Analytics snippet before `</body>`. It's
same-origin (`/_vercel/insights/script.js`), so the CSP stays at `'self'` — no
third-party allowance, ad-blocker-resistant. To turn it on:

1. In the Vercel dashboard, open the project → **Analytics** tab → enable Web Analytics.
2. **Redeploy** and **Promote to Production** (the `/_vercel/insights/*` routes only
   exist after a deploy with Analytics enabled — otherwise `script.js` 404s).
3. Verify: load any page and check the Network tab for a request to
   `/_vercel/insights/view`.

Note: this is Vercel-specific. On Netlify the script harmlessly 404s — swap in a
different provider (Umami, Fathom, etc.) if you host there.

## Assets included

```
favicon.svg                 brand mark (rounded lime >_)
apple-touch-icon.png        iOS home-screen icon (also in /assets)
assets/og-image.png         1200x630 social share card
assets/icon-192.png         PWA icon
assets/icon-512.png         PWA icon (maskable)
site.webmanifest            PWA manifest + theme color
sitemap.xml / robots.txt    crawler hints
404.html                    branded not-found page
```

## Notes

- `cleanUrls` is on, so pages serve at `/services` (no `.html`); internal links and
  canonicals match. The `.html` files still resolve and redirect to the clean path.
- Security headers (CSP, HSTS, nosniff, frame-deny) are pre-set. The CSP allows Google
  Fonts and Formspree only (Vercel Analytics is same-origin) — if you add another embed
  (e.g. a Cal.com inline widget), widen the relevant `*-src` directive.
- Motion respects `prefers-reduced-motion`; dimmest text color was nudged to pass
  WCAG AA contrast.
- No secrets in this repo. Safe to keep public or private.
