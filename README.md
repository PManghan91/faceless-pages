# BriefPicks Pages

Static Cloudflare Pages site for BriefPicks.

## Repository Boundary

This repository, `PManghan91/faceless-pages`, is the Cloudflare Pages deployment repository. Public site PRs should be opened here against `main`, with site files at the repository root.

The broader `PManghan91/Faceless` repository may keep project notes, workflow files, and local planning material, but branches from that repository are not deploy-ready site branches because its static site copy lives under `github-pages/faceless-pages/` and has a separate Git history.

## Current Routes

Canonical public routes:

- `/`
- `/uk/pet-tech/`
- `/uk/gadget-checklists/`
- `/uk/travel/`
- `/disclosure`
- `/privacy`
- `/terms`
- `/ai-use`

Static utility and crawl routes:

- `/404`
- `/robots.txt`
- `/sitemap.xml`
- `/styles.css`
- `/assets/briefpicks-social.png`
- `/tiktok-callback`

`/tiktok-callback.html` is parked and inactive. It is retained only for possible future direct TikTok OAuth testing, should stay `noindex,nofollow` and `no-referrer`, and should not be linked as public content.

## Redirect And 404 Behavior

Cloudflare Pages applies `_redirects` from the static asset directory. The current `_redirects` file contains only explicit short-path redirects:

```text
/uk              /uk/pet-tech/              302
/pet-tech        /uk/pet-tech/              302
/gadgets         /uk/gadget-checklists/     302
/travel          /uk/travel/                302
```

Cloudflare Pages also applies built-in static-route behavior:

- HTML files are served at extensionless paths, so `/privacy.html` redirects to `/privacy`.
- Directory index files use trailing slashes, so `/uk/pet-tech` redirects to `/uk/pet-tech/`.
- A top-level `404.html` makes missing paths return a 404 response instead of serving homepage HTML as a single-page app fallback.

Do not add fake 404 rewrites to `_redirects`; Cloudflare Pages supports redirect status codes there, but not rewrite-style 404 entries.

## Route Audit

Run this after a preview or production deployment:

```powershell
$base = 'https://briefpicks.com'
$checks = @(
  '/',
  '/uk',
  '/pet-tech',
  '/gadgets',
  '/travel',
  '/uk/pet-tech',
  '/uk/pet-tech/',
  '/uk/gadget-checklists',
  '/uk/gadget-checklists/',
  '/uk/travel',
  '/uk/travel/',
  '/disclosure',
  '/disclosure.html',
  '/privacy',
  '/privacy.html',
  '/terms',
  '/terms.html',
  '/ai-use',
  '/ai-use.html',
  '/robots.txt',
  '/sitemap.xml',
  '/styles.css',
  '/assets/briefpicks-social.png',
  '/tiktok-callback',
  '/tiktok-callback.html',
  '/definitely-missing-route-audit'
)

foreach ($path in $checks) {
  $url = "$base$path"
  $result = curl.exe -s -o NUL -w '%{http_code} %{redirect_url}' -I $url
  Write-Output "$url -> $result"
}
```

Expected results:

- Canonical public pages, crawl files, CSS, and the social image return `200`.
- Short aliases in `_redirects` return `302` to their canonical `/uk/.../` routes.
- Directory paths without the trailing slash return Cloudflare's redirect to the trailing-slash route.
- `.html` page URLs return Cloudflare's redirect to extensionless routes.
- Fake or missing paths return `404`.

Keep the site static until the first public deployment is working. Add the dynamic `/go/{video_id}` redirect function after Cloudflare Pages and the custom domains are confirmed live.

## Analytics And Privacy

Issue: [#11 Analytics and privacy plan before tracking](https://github.com/PManghan91/faceless-pages/issues/11)

Launch analytics provider: Pirsch Analytics.

The Pirsch script is installed on normal public and trust pages:

- `/`
- `/uk/pet-tech/`
- `/uk/gadget-checklists/`
- `/uk/travel/`
- `/disclosure`
- `/terms`
- `/ai-use`

The Pirsch script is intentionally not installed on `/privacy` or `/tiktok-callback`. `/privacy` contains the analytics notice and browser opt-out control; `/tiktok-callback` is a parked utility page.

Keep UTM query parameters enabled. Do not add `data-disable-query` unless the analytics plan is revised. Do not add `data-enable-sessions` unless session-extension tracking is separately approved.

Current site-wide answer: this repo is plain static HTML with no shared `<head>` template, so the browser script must be present in each HTML page that should be tracked. For a true site-wide include later, introduce a shared build/template step or a Cloudflare Pages Function/Worker HTML rewrite. Do not use edge injection until the operational tradeoff is accepted, because it moves analytics behavior out of the visible source HTML and must still exclude `/privacy` and utility/callback routes.

Future `/go` links can be tracked, but not as a blank cheque for every analytics idea. Treat `/go/{slug}` as a first-party redirect and track only non-personal metadata such as `slug`, `channel`, `destination_host`, `placement`, and campaign fields. Do not send names, email addresses, account IDs, phone numbers, private IDs, or other personally identifying values in URLs, UTM values, or Pirsch event metadata.

Analytics that stays within the current posture:

- Aggregate page views.
- Referrers and non-personal UTM parameters.
- Automatic outbound link and file download events.
- Custom events for non-personal site actions such as future `/go` clicks.
- Conversion goals based on aggregate paths or non-personal event metadata.

Analytics that requires a revised plan before deployment:

- Ad pixels, social pixels, affiliate-network browser pixels, or remarketing tags.
- User-level attribution, profiling, cross-site tracking, or audience building.
- Session replay, heatmaps tied to visitor sessions, or detailed visitor logs.
- Email capture tracking or CRM analytics that links behavior to a named person.
- Revenue or conversion tracking shared with advertising partners.

See `docs/analytics-and-privacy-plan.md` for the full decision record.

## Mail DNS Setup

Issue: [#10 Zoho Mail setup and sender authentication](https://github.com/PManghan91/faceless-pages/issues/10)

Goal: make `contact@briefpicks.com` a real mailbox without changing the Cloudflare Pages web records.

Outcome on 2026-06-06:

- Zoho Mail Free was not available in the live UK signup flow; Zoho Mail Lite was selected and paid for.
- Domain ownership was verified in Zoho.
- `contact@briefpicks.com` was created as the Zoho super admin mailbox.
- Inbound and outbound test messages passed, reported by the mailbox operator after DNS setup.
- Cloudflare Pages web behavior remained intact.

Final public DNS records, checked on 2026-06-06 with resolver `1.1.1.1`:

| Record | Current value |
| --- | --- |
| MX `briefpicks.com` | `mx.zoho.eu` priority `10`; `mx2.zoho.eu` priority `20`; `mx3.zoho.eu` priority `50` |
| TXT `briefpicks.com` SPF | `v=spf1 include:zohomail.eu ~all` |
| TXT `briefpicks.com` Zoho verification | `zoho-verification=zb73049202.zmverify.zoho.eu` |
| TXT `zmail._domainkey.briefpicks.com` | Zoho-generated `v=DKIM1; k=rsa; p=...` DKIM key |
| TXT `_dmarc.briefpicks.com` | `v=DMARC1; p=none; rua=mailto:contact@briefpicks.com` |

Final web checks from the same pass:

| URL | Result |
| --- | --- |
| `https://www.briefpicks.com/` with redirects followed | `200` at `https://briefpicks.com/` |

Pre-change rollback snapshot:

| Record | Previous value |
| --- | --- |
| MX `briefpicks.com` | `eforward1.registrar-servers.com` priority `10`; `eforward2.registrar-servers.com` priority `10`; `eforward3.registrar-servers.com` priority `10`; `eforward4.registrar-servers.com` priority `15`; `eforward5.registrar-servers.com` priority `20` |
| TXT `briefpicks.com` SPF | `v=spf1 include:spf.efwd.registrar-servers.com ~all` |
| TXT `_dmarc.briefpicks.com` | not present |

Official references checked on 2026-06-06:

- Zoho Mail pricing: `https://www.zoho.com/mail/zohomail-pricing.html`
- Zoho domain verification: `https://www.zoho.com/mail/help/adminconsole/domain-verification.html`
- Zoho email delivery and MX setup: `https://www.zoho.com/mail/help/adminconsole/configure-email-delivery.html`
- Zoho SPF: `https://www.zoho.com/mail/help/adminconsole/spf-configuration.html`
- Zoho DKIM: `https://www.zoho.com/mail/help/adminconsole/dkim-configuration.html`
- Zoho DMARC: `https://www.zoho.com/mail/help/adminconsole/dmarc-policy.html`
- Cloudflare DNS record types: `https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/`
- Cloudflare Pages custom domains: `https://developers.cloudflare.com/pages/configuration/custom-domains/`
