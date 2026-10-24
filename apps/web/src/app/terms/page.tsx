import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Terms of use · WeShot', description: 'The terms for using WeShot, a free tool by Nova Pixel Studios.' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 24, 2026">
      <p>
        WeShot is a free tool made by Nova Pixel Studios (&ldquo;we&rdquo;). It frames screenshots and websites in a window on a background and lets you
        download the result. By using WeShot you agree to these terms.
      </p>

      <h2>No account, no cost</h2>
      <p>
        WeShot has no accounts and costs nothing. We may limit how often you can capture websites, so the service stays free and fast for everyone.
        Current limits are 30 captures per hour (150 per day) and 2 at a time.
      </p>

      <h2>What you can and cannot do</h2>
      <ul>
        <li>Only capture pages and use images that you have the right to use.</li>
        <li>Do not use WeShot to break the law, to harm others, or to make or share content that is illegal, deceptive, hateful or sexual content involving minors.</li>
        <li>Do not try to reach private networks, bypass our limits or bot protection, or overload the service.</li>
        <li>Do not use WeShot to impersonate other people or companies, for example to fake login pages or receipts.</li>
      </ul>
      <p>We may block sites or refuse requests that break these rules.</p>

      <h2>Your content</h2>
      <p>
        You keep all rights to what you paste, capture and download. Images you paste stay in your browser. When you
        capture a website, the page belongs to its owner; you are responsible for how you use the result.
      </p>

      <h2>No warranty</h2>
      <p>
        WeShot is provided as it is. Some sites block automated browsers, and captures may not always work or look exactly like the live page. To the
        extent the law allows, we are not liable for any loss that comes from using WeShot.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version. Using WeShot after a change means you accept it.</p>

      <h2>Contact</h2>
      <p>
        Nova Pixel Studios · <a href="mailto:hello@weshot.app">hello@weshot.app</a>. To report abuse, write to{' '}
        <a href="mailto:abuse@weshot.app">abuse@weshot.app</a>.
      </p>
    </LegalPage>
  );
}
