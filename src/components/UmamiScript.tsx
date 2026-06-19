/**
 * UmamiScript — env-gated, self-hosted Umami analytics tag (server component).
 *
 * Renders the Umami `<script>` ONLY when both build-time env vars are present:
 *   - NEXT_PUBLIC_UMAMI_SRC          e.g. https://stats.67projects.app/script.js
 *   - NEXT_PUBLIC_UMAMI_WEBSITE_ID   the devince website-id from Umami
 *
 * Unset → renders nothing, so the feature ships dark and the build output
 * contains no analytics tag until the owner sets the vars per deploy. Umami is
 * cookieless + anonymous (no consent banner needed). One website-id covers all
 * three devince hosts; the dashboard filters by hostname.
 */
export function UmamiScript() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC
  const id = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  if (!src || !id) return null
  return <script defer src={src} data-website-id={id} />
}
