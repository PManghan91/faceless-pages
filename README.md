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
