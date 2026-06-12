# Deployment Verification Runbook

Use this runbook after a production deploy, after a domain or DNS change, or before public traffic is sent to BriefPicks.

This file is safe for the public `PManghan91/faceless-pages` repo. Keep secrets, account IDs, private dashboard screenshots, API tokens, OAuth client secrets, and internal-only notes out of this file and out of PR comments.

## Source Of Truth

Current public deployment facts:

| Item | Expected value |
| --- | --- |
| Cloudflare Pages project | `faceless-pages` |
| GitHub deployment repo | `PManghan91/faceless-pages` |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `_site` |
| Root directory | repository root |
| Canonical host | `https://briefpicks.com` |
| Pages default host | `https://faceless-pages.pages.dev` |
| Active mail provider | Zoho Mail |

If any dashboard value differs, stop and confirm whether the change was intentional before treating the deploy as healthy.

## Local Preflight

Run from the repository root:

```powershell
git status --short --branch
npm install
npm test
npm run build
Test-Path _site
Get-Content _site\_routes.json
```

Expected:

- Working tree has no unexpected tracked changes.
- `npm test` passes.
- `npm run build` exits `0`.
- `_site` exists.
- `_site\_routes.json` includes `"/go/*"` so only `/go` requests invoke the Pages Function.

Failure handling:

- If tests fail, fix the failing code or expected route contract before deploying.
- If `_site` is missing, check Eleventy output and the `dir.output` value in `eleventy.config.js`.
- If `_site\_routes.json` is missing or wrong, check `_routes.json` and the Eleventy passthrough copy list.

## Cloudflare Build

Dashboard check:

1. Open Cloudflare dashboard.
2. Go to `Workers & Pages`.
3. Open the `faceless-pages` Pages project.
4. Open `Deployments`.
5. Confirm the latest production deployment:
   - branch is `main`;
   - commit SHA matches the merged PR commit being verified;
   - build status is successful;
   - build log shows `npm run build`;
   - deployed output is `_site`.
6. Open `Settings > Build`.
7. Confirm:
   - Build command: `npm run build`;
   - Build output directory: `_site`;
   - Root directory: repository root.

Failure handling:

- If the latest production deploy is not the expected commit, do not verify production as complete.
- If the build failed, read the first real error in the Cloudflare build log, reproduce locally with `npm run build`, then push a fix.
- If the build uses the wrong output directory, correct the Pages project settings before redeploying. Do not work around it by publishing repo-root files.
- If a cache issue is suspected after a dependency or build-tool change, use `Settings > Build > Build cache > Clear Cache`, then retry the deployment.

## Domains And HTTPS

Run:

```powershell
$urls = @(
  'https://briefpicks.com/',
  'https://www.briefpicks.com/',
  'https://briefpicks.co.uk/',
  'https://www.briefpicks.co.uk/',
  'https://briefpicks.uk/',
  'https://www.briefpicks.uk/',
  'https://faceless-pages.pages.dev/'
)

foreach ($url in $urls) {
  $head = curl.exe -s -o NUL -w '%{http_code} %{redirect_url}' -I $url
  $final = curl.exe -s -L -o NUL -w '%{http_code} %{url_effective}' -I $url
  Write-Output "$url -> head: $head ; final: $final"
}
```

Expected:

| URL | First response | Final response |
| --- | --- | --- |
| `https://briefpicks.com/` | `200` | `200 https://briefpicks.com/` |
| `https://www.briefpicks.com/` | `301 https://briefpicks.com/` | `200 https://briefpicks.com/` |
| `https://briefpicks.co.uk/` | `301 https://briefpicks.com/` | `200 https://briefpicks.com/` |
| `https://www.briefpicks.co.uk/` | `301 https://briefpicks.com/` | `200 https://briefpicks.com/` |
| `https://briefpicks.uk/` | `301 https://briefpicks.com/` | `200 https://briefpicks.com/` |
| `https://www.briefpicks.uk/` | `301 https://briefpicks.com/` | `200 https://briefpicks.com/` |
| `https://faceless-pages.pages.dev/` | `200` | `200 https://faceless-pages.pages.dev/` |

Failure handling:

- If `briefpicks.com` is not `200`, pause public publishing and inspect the latest Cloudflare deployment first.
- If an alternate domain is not `301` to `https://briefpicks.com/`, check the Cloudflare Bulk Redirect rule and custom domain state.
- If HTTPS fails, check the Cloudflare custom domain certificate status before changing site code.
- If `pages.dev` is reachable, confirm it sends `X-Robots-Tag: noindex` with the header check in the callback section below.

## Route And Redirect Status Codes

Run:

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
  '/go/pet-tech-tractive-dog-gps-escape-alerts',
  '/go/pet-tech-not-in-map',
  '/definitely-missing-route-audit'
)

foreach ($path in $checks) {
  $url = "$base$path"
  $result = curl.exe -s -o NUL -w '%{http_code} %{redirect_url}' -I $url
  Write-Output "$url -> $result"
}
```

Expected status codes:

| Path | Expected |
| --- | --- |
| `/` | `200` |
| `/uk` | `302` to `/uk/pet-tech/` |
| `/pet-tech` | `302` to `/uk/pet-tech/` |
| `/gadgets` | `302` to `/uk/gadget-checklists/` |
| `/travel` | `302` to `/uk/travel/` |
| `/uk/pet-tech` | `308` to `/uk/pet-tech/` |
| `/uk/pet-tech/` | `200` |
| `/uk/gadget-checklists` | `308` to `/uk/gadget-checklists/` |
| `/uk/gadget-checklists/` | `200` |
| `/uk/travel` | `308` to `/uk/travel/` |
| `/uk/travel/` | `200` |
| `/disclosure`, `/privacy`, `/terms`, `/ai-use` | `200` |
| `/disclosure.html`, `/privacy.html`, `/terms.html`, `/ai-use.html` | `308` to extensionless path |
| `/robots.txt`, `/sitemap.xml`, `/styles.css`, `/assets/briefpicks-social.png` | `200` |
| `/tiktok-callback` | `200` |
| `/tiktok-callback.html` | `308` to `/tiktok-callback` |
| `/go/pet-tech-tractive-dog-gps-escape-alerts` | `302` to `/uk/pet-tech/` with mapped UTM parameters |
| `/go/pet-tech-not-in-map` | `404` |
| `/definitely-missing-route-audit` | `404` |

Failure handling:

- If short aliases stop returning `302`, check `_redirects` and confirm it is copied into `_site`.
- If missing paths return `200`, check that `src/404.njk` still builds `404.html` and that no catch-all rewrite was added.
- If extensionless or trailing-slash routes change from `308`, confirm whether Cloudflare static asset behavior changed before changing code.
- If `/go` routes do not match expectations, use the Functions section before editing redirects.

## Crawl Files

Run:

```powershell
curl.exe -s -o NUL -w '%{http_code}' https://briefpicks.com/robots.txt
curl.exe -s -o NUL -w '%{http_code}' https://briefpicks.com/sitemap.xml
curl.exe -s https://briefpicks.com/robots.txt
curl.exe -s https://briefpicks.com/sitemap.xml
curl.exe -s https://briefpicks.com/robots.txt | Select-String 'Disallow: /go/'
curl.exe -s https://briefpicks.com/sitemap.xml | Select-String 'pages.dev|/go/|tiktok-callback'
```

Expected:

- `robots.txt` returns `200`.
- `sitemap.xml` returns `200`.
- `robots.txt` allows `/`, disallows `/go/`, and references `https://briefpicks.com/sitemap.xml`.
- `sitemap.xml` lists canonical `https://briefpicks.com/...` URLs only.
- The final `Select-String` command returns no output, because the sitemap must not include `pages.dev`, `/go/`, or callback URLs.

Failure handling:

- If `robots.txt` or `sitemap.xml` is missing, check the root files and Eleventy passthrough copy configuration.
- If the sitemap contains non-canonical, private, callback, draft, or `/go` URLs, fix `sitemap.xml` before public traffic.
- If `/go/` is not disallowed, fix `robots.txt` before publishing new social links.

## Functions Routes

Current route source:

- Function wrapper: `functions/go/[video_id].js`
- Shared handler: `src/go-handler.mjs`
- Reviewed map: `functions/_data/go-links.json`
- Generated map: `functions/_data/go-links.generated.mjs`
- Invocation control: `_routes.json`

Local checks:

```powershell
npm test
npm run build
Get-Content _site\_routes.json
```

Production checks:

```powershell
$slug = 'pet-tech-tractive-dog-gps-escape-alerts'

curl.exe -s -I "https://briefpicks.com/go/$slug"
curl.exe -s -I 'https://briefpicks.com/go/pet-tech-not-in-map'
curl.exe -s -o NUL -w '%{http_code}' -X POST "https://briefpicks.com/go/$slug"
```

Expected:

- Known enabled slug returns `302`.
- The `Location` header starts with `https://briefpicks.com/uk/pet-tech/`.
- The `Location` header includes mapped UTM parameters from `functions/_data/go-links.json`.
- Response includes `Cache-Control: no-store`.
- Response includes `X-Robots-Tag: noindex, nofollow`.
- Unknown slug returns `404`.
- Unsupported `POST` returns `405`.

Failure handling:

- If every `/go` request is `404`, check whether `_site\_routes.json` was deployed and includes `"/go/*"`.
- If the Function throws or returns `500`, inspect the latest Cloudflare Pages Function logs for the deployment, then run `npm test` locally.
- If a mapped destination is wrong, update `functions/_data/go-links.json`, not the generated module.
- If visitor query parameters affect the destination, treat it as a security bug and stop public link use until fixed.

## Mail DNS

Run:

```powershell
Resolve-DnsName -Type MX briefpicks.com -Server 1.1.1.1 | Select-Object NameExchange,Preference
Resolve-DnsName -Type TXT briefpicks.com -Server 1.1.1.1 | Select-Object -ExpandProperty Strings
Resolve-DnsName -Type TXT zmail._domainkey.briefpicks.com -Server 1.1.1.1 | Select-Object -ExpandProperty Strings
Resolve-DnsName -Type TXT _dmarc.briefpicks.com -Server 1.1.1.1 | Select-Object -ExpandProperty Strings
```

Expected:

| Record | Expected value |
| --- | --- |
| MX `briefpicks.com` | `mx.zoho.eu` priority `10`; `mx2.zoho.eu` priority `20`; `mx3.zoho.eu` priority `50` |
| TXT `briefpicks.com` SPF | `v=spf1 include:zohomail.eu ~all` |
| TXT `briefpicks.com` Zoho verification | `zoho-verification=zb73049202.zmverify.zoho.eu` |
| TXT `zmail._domainkey.briefpicks.com` | starts with `v=DKIM1; k=rsa; p=` |
| TXT `_dmarc.briefpicks.com` | `v=DMARC1; p=none; rua=mailto:contact@briefpicks.com` |

Observable mailbox check:

- Send a test message to `contact@briefpicks.com`.
- Reply from `contact@briefpicks.com`.
- Confirm both inbound and outbound messages arrive without SPF, DKIM, or DMARC failure warnings.

Failure handling:

- If web routes are healthy but mail DNS is wrong, do not change Pages records. Fix only the mail DNS records in Cloudflare DNS.
- If MX records are missing, inbound mail can fail. Restore the Zoho MX records before using the contact address publicly.
- If SPF, DKIM, or DMARC fails, do not send outreach or affiliate applications from the mailbox until authentication is fixed.
- Keep DKIM private signing material in Zoho. Only the public DNS TXT value belongs in DNS.

## Callback URLs

Current status:

- Direct TikTok OAuth/API posting is inactive.
- The callback page is parked and must not exchange, store, or display tokens.
- The live canonical callback path is `https://briefpicks.com/tiktok-callback`.
- The legacy `.html` path redirects to the canonical callback path.

Run:

```powershell
curl.exe -s -I https://briefpicks.com/tiktok-callback
curl.exe -s -I https://briefpicks.com/tiktok-callback.html
curl.exe -s -I https://faceless-pages.pages.dev/
```

Expected:

| URL | Expected |
| --- | --- |
| `https://briefpicks.com/tiktok-callback` | `200`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer` |
| `https://briefpicks.com/tiktok-callback.html` | `308` to `/tiktok-callback`, with noindex/no-referrer headers |
| `https://faceless-pages.pages.dev/` | `200`, `X-Robots-Tag: noindex` |

Dashboard check if direct OAuth is resumed:

- Open the provider developer dashboard.
- Confirm the registered redirect URI exactly matches the chosen live HTTPS callback URL.
- Confirm no client secret, access token, refresh token, authorization code, or state value is committed to this repo.
- Run an end-to-end OAuth test only after server-side token exchange and state validation exist.

Failure handling:

- If the callback page is `404`, restore `src/tiktok-callback.njk` and rebuild.
- If noindex/no-referrer headers are missing, fix `_headers` before registering the callback with any provider.
- If OAuth must use the `.html` URL exactly, change and verify the site behavior before registering it. Do not assume providers will accept a redirect through `308`.

## Final Pass

Before marking a deployment verified:

```powershell
git status --short --branch
npm test
npm run build
```

Record in the PR or issue:

- production deployment commit SHA;
- Cloudflare deployment status;
- route/status command result summary;
- mail DNS result summary;
- any failures and the fix or rollback used.

Do not close the issue or mark the launch gate complete while any required check is failing.

## Official References

- Cloudflare Pages build configuration: `https://developers.cloudflare.com/pages/configuration/build-configuration/`
- Cloudflare Pages redirects: `https://developers.cloudflare.com/pages/configuration/redirects/`
- Cloudflare Pages Functions routing: `https://developers.cloudflare.com/pages/functions/routing/`
- Cloudflare Pages Functions logs: `https://developers.cloudflare.com/pages/functions/debugging-and-logging/`
- Cloudflare DNS records: `https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/`
