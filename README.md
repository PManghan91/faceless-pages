# BriefPicks Pages

Static Cloudflare Pages site for BriefPicks.

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
