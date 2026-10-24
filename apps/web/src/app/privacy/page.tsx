import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy · WeShot', description: 'What WeShot stores, for how long, and why. No accounts, no tracking cookies.' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 24, 2026">
      <p>
        WeShot is made by Nova Pixel Studios. We built it to work without knowing who you are: there are no accounts, no sign-in and no tracking
        cookies.
      </p>

      <h2>Images you paste</h2>
      <p>
        <strong>Images you paste, drop or pick stay in your browser.</strong> They are framed and exported on your device and never sent to us.
      </p>

      <h2>Links you capture</h2>
      <p>
        When you frame a link, our server opens that page in a browser, takes a screenshot and sends it straight back to your browser. We do not
        keep the screenshot.
      </p>

      <h2>Your IP address</h2>
      <p>
        To enforce rate limits we use a one-way hash of your IP address mixed with a value that changes every day. We never store the IP address
        itself, and the hashed counters expire within a day.
      </p>

      <h2>Cookies</h2>
      <p>
        WeShot sets no cookies of its own. Your saved presets live in your browser&apos;s local storage, which you can clear at any time.
      </p>

      <h2>Analytics and error reports</h2>
      <p>
        If enabled, we count how WeShot is used (for example, how many images are downloaded) with PostHog, configured without cookies or
        persistent identifiers, and Sentry receives technical details when something breaks. Neither receives your images.
      </p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Vercel (hosting and the screenshot browser)</li>
        <li>PostHog and Sentry, when enabled</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:privacy@weshot.app">privacy@weshot.app</a>.
      </p>
    </LegalPage>
  );
}
