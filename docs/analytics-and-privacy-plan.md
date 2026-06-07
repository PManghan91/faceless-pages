# BriefPicks Analytics And Privacy Plan

Date: 2026-06-06

Issue: `PManghan91/faceless-pages#11` - Analytics and privacy plan before tracking.

## Decision

BriefPicks will use Pirsch Analytics on `briefpicks.com`.

Launch setup:

- Tool: Pirsch Analytics.
- Plan assumption: Pirsch Standard, 100,000 monthly page views.
- Cost assumption: USD 12/month or USD 120/year before applicable taxes.
- Dashboard hostname: `briefpicks.com`.
- Pirsch dashboard subdomain: `briefpicks`.
- Site timezone: `Europe/London`.
- Integration: frontend JavaScript snippet using `https://api.pirsch.io/pa.js`.

Do not use Cloudflare Web Analytics as the main analytics tool for launch because BriefPicks needs campaign and event visibility, not only basic traffic counts.

## Tracking Scope

Enable Pirsch on public content and trust pages:

- `/`
- `/uk/pet-tech/`
- `/uk/gadget-checklists/`
- `/uk/travel/`
- `/disclosure`
- `/terms`
- `/ai-use`

Do not enable Pirsch on:

- `/privacy`, so visitors can read the analytics notice and set the browser opt-out without sending an analytics page view from that page.
- `/tiktok-callback`, because direct TikTok OAuth is parked and this page is not part of the public content journey.

## Events And Parameters

Tracked at launch:

- Page views for the enabled pages.
- Referrer and campaign attribution, including UTM parameters.
- Outbound link click events detected by Pirsch.
- File download events detected by Pirsch.

Not tracked at launch:

- No custom business events.
- No `/go/{slug}` redirect events yet.
- No email capture events.
- No ad pixels, social pixels, affiliate network browser pixels, remarketing tags, or cross-site tracking.
- No Pirsch session-extension pings.

Parameters and dimensions expected from Pirsch:

- Page path and page title.
- Referrer.
- UTM source, medium, campaign, content, and term.
- Time of visit.
- Language.
- Browser, operating system, device type, and screen size.
- Country and city-level location.
- Outbound link or file URL when those automatic events fire.

Operational rule: do not place personal data, email addresses, names, phone numbers, account IDs, private IDs, or other user-identifying values in URL query strings, UTM values, or Pirsch event metadata.

## Future `/go` Link Tracking

Future `/go/{slug}` links can be tracked with Pirsch, but the implementation must be designed before affiliate redirects go live.

Preferred posture:

- Treat `/go/{slug}` as a first-party redirect route.
- Track a `Go Click` event before redirecting or through the server-side redirect handler.
- Use non-personal metadata only: `slug`, `channel`, `destination_host`, `placement`, `campaign`, and similar aggregate fields.
- Keep destination URLs and UTM values free of personal data.
- Do not share user-level conversion data with advertising partners without revising this plan and consent posture.

This is enough for aggregate affiliate/content performance reporting. It is not enough for retargeting, ad-pixel attribution, user-level journeys, or CRM-linked conversion tracking.

## Site-Wide Implementation

Current answer: not automatically. The site is plain static HTML and has no shared `<head>` template, so the Pirsch browser script must be present in each HTML page that should be tracked.

Approved launch approach:

- Add the script directly to each normal public HTML page.
- Keep `/privacy` and `/tiktok-callback` excluded.
- Verify with grep that only intended pages contain `https://api.pirsch.io/pa.js`.

Future options for a true site-wide include:

- Add a small static-site build step or template system so the shared head is generated consistently.
- Use a Cloudflare Pages Function or Worker with `HTMLRewriter` to inject the script into eligible HTML responses.
- Consider Cloudflare Zaraz only after a separate review, because it moves third-party tool behavior into Cloudflare configuration and is less visible in the site repository.

Do not use edge injection casually. It can reduce repeated edits, but it also makes the deployed HTML differ from the checked-in HTML and still needs route exclusions for privacy and callback pages.

## Retention And Access

Assumptions:

- Pirsch Standard includes unlimited data retention and unlimited members.
- Monthly usage is counted from page views, events, and 10% of session-extension events. Session extension is disabled at launch.
- Pirsch dashboard access should be limited to the owner and named admins who need analytics for BriefPicks operations.
- Do not enable public dashboards or unique access links unless this plan is updated.
- Sign or store the Pirsch Data Processing Agreement before meaningful public traffic.
- Review analytics retention at least annually. Delete or export old dashboard data when it is no longer needed for aggregate trend analysis.

## Cookie And Consent Impact

Pirsch states that its analytics are cookie-free, that visitor IDs are generated from request data with a per-site salt, and that visitors are not tracked across websites.

UK compliance posture:

- The ICO's April 2026 storage and access technologies guidance covers scripts, tags, device fingerprinting, link decoration, and navigational tracking, not only cookies.
- The statistical purposes exception can apply only where analytics are used for aggregate service improvement, users receive clear information, users have a simple and free way to object, and the data is not used for advertising, profiling, cross-site tracking, or decisions about individuals.
- BriefPicks will rely on this privacy-preserving statistical analytics posture at launch, with a privacy-page opt-out.
- If BriefPicks later adds GA4, Meta/TikTok pixels, affiliate network browser pixels, retargeting, advertising measurement, session replay, A/B testing, user-level profiling, or named-user CRM analytics, this plan must be revised before deployment and a consent management flow may be required.

Residual checks before meaningful public traffic:

- Confirm whether Pirsch can reduce location granularity below city level for this dashboard. If not, keep the city-level disclosure and reassess whether the extra precision is necessary.
- Confirm no public dashboard or unique dashboard access link is enabled.
- Keep UTM values non-personal; campaign tracking must not become user-level tracking.
- Reassess whether a formal privacy impact or legitimate-interest assessment is needed if traffic volume, data sensitivity, tracking tools, or use cases expand.

## Privacy Page Changes

Required before installing the analytics script:

- Name Pirsch as the analytics provider.
- Explain the categories of analytics data collected.
- State that BriefPicks uses analytics for aggregate site/content improvement, not advertising or profiling.
- State that analytics is cookie-free, while still acknowledging the UK storage/access technology rules.
- Provide a simple browser opt-out using Pirsch's `disable_pirsch` localStorage flag.
- Explain that affiliate and retailer sites may apply their own tracking after an outbound click.

Status: implemented in `privacy.html` on 2026-06-06.

## Evidence Sources

- Pirsch pricing: `https://pirsch.io/pricing`
- Pirsch privacy documentation: `https://docs.pirsch.io/privacy`
- Pirsch website integration documentation: `https://docs.pirsch.io/get-started/frontend-integration`
- Pirsch outbound link tracking: `https://docs.pirsch.io/advanced/outbound-links`
- Pirsch file download tracking: `https://docs.pirsch.io/advanced/file-downloads`
- Pirsch events documentation: `https://docs.pirsch.io/advanced/events`
- Pirsch URL shortener documentation: `https://docs.pirsch.io/advanced/url-shortener`
- Pirsch sessions documentation: `https://docs.pirsch.io/advanced/sessions`
- Pirsch traffic filtering / client-side opt-out: `https://docs.pirsch.io/advanced/traffic-filter`
- Cloudflare Workers HTMLRewriter: `https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/`
- Cloudflare Pages Functions plugins: `https://developers.cloudflare.com/pages/functions/plugins/`
- Cloudflare Zaraz FAQ: `https://developers.cloudflare.com/zaraz/faq/`
- ICO storage and access technology exceptions: `https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/`
