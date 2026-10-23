import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy · WeShot', description: 'What WeShot stores, for how long, and why. No accounts, no tracking cookies.' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 23, 2026">
      <p>
        WeShot is made by Nova Pixel Studios. We built it to work without knowing who you are: there are no accounts, no sign-in and no tracking
        cookies.
      </p>

      <h2>Images you paste</h2>
      <p>
        <strong>Images you paste, drop or pick stay in your browser.</strong> They are framed and exported on your device and never sent to us, unless
        you press Share link.
      </p>

      <h2>Links you capture</h2>
      <p>
        When you frame a link, our server opens that page in a browser, takes a screenshot or scroll video, and stores the file for 24 hours so your
        browser can download it. We keep a short record of each job (the URL, its status, how long it took) for 30 days to keep the service running
        and to stop abuse.
      </p>

      <h2>Your IP address</h2>
      <p>
        To enforce rate limits we store a one-way hash of your IP address mixed with a secret that changes every day. We never store the IP address
        itself.
      </p>

      <h2>Share links</h2>
      <p>
        When you create a share link, the file is uploaded and kept for 30 days, or until you delete it. The delete key is stored only in your
        browser. Anyone with the link can see the file. Share pages are hidden from search engines.
      </p>

      <h2>Cookies</h2>
      <p>
        WeShot sets no cookies of its own. Cloudflare Turnstile, which checks that a capture request comes from a person, may set a cookie needed for
        that check. Your saved presets and share links live in your browser&apos;s local storage, which you can clear at any time.
      </p>

      <h2>Analytics and error reports</h2>
      <p>
        We count how WeShot is used (for example, how many images are downloaded) with PostHog, configured without cookies or persistent
        identifiers. When something breaks, Sentry receives an error report with technical details about the failure. Neither receives your images.
      </p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Vercel (web hosting)</li>
        <li>Railway (capture servers and databases)</li>
        <li>Cloudflare (file storage, CDN and Turnstile)</li>
        <li>PostHog (anonymous usage counts)</li>
        <li>Sentry (error reports)</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Because we do not know who you are, there is usually nothing to look up or delete. If you have a question or want a share link removed, write
        to <a href="mailto:privacy@weshot.app">privacy@weshot.app</a>.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, we will update the date at the top of this page.</p>
    </LegalPage>
  );
}
