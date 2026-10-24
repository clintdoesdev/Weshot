/**
 * Cookie-banner and chat-widget hiding (product spec §4.6 step 3), used when hideBanners is on.
 * The Ghostery "full" lists block most consent scripts; this catches what still renders.
 */
export const HIDE_CSS = `
#onetrust-consent-sdk, #onetrust-banner-sdk, .onetrust-pc-dark-filter,
#CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay, #cookiebanner, #cookie-banner, #cookie-notice,
#cookie-law-info-bar, .cookie-banner, .cookie-consent, .cookie-notice, .cookies-banner, .cc-window, .cc-banner,
#usercentrics-root, #didomi-host, .didomi-popup-open, #truste-consent-track, .truste_box_overlay, #qc-cmp2-container,
.fc-consent-root, #sp_message_container, [id^="sp_message_container"], .osano-cm-window, #termly-code-snippet-support,
#hs-eu-cookie-confirmation, .iubenda-cs-container, #iubenda-cs-banner, #klaro, .klaro, #axeptio_overlay,
[aria-label="cookieconsent"], [class*="CookieBanner"], [class*="cookie-banner"], [id*="cookie-banner"],
#intercom-container, .intercom-lightweight-app, #intercom-frame, iframe[name="intercom-launcher-frame"],
#hubspot-messages-iframe-container, #drift-widget, #drift-frame-controller, #drift-frame-chat, .drift-conductor-item,
#crisp-chatbox, .crisp-client, #tidio-chat, #tidio-chat-iframe, #fc_frame, #launcher, #zsiq_float, .zsiq_floatmain,
iframe[title*="chat" i][style*="fixed"], #gorgias-chat-container, #chat-widget-container, .olark-launch-button,
#tawkchat-container, iframe[src*="tawk.to"], #beacon-container, .BeaconFabButtonFrame, #front-chat-container {
  display: none !important; visibility: hidden !important;
}
html, body { overflow: auto !important; }
`;

/** Clicks common "accept" buttons so sites that gate content behind consent render normally. */
export const DISMISS_SCRIPT = `(() => {
  const selectors = [
    '#onetrust-accept-btn-handler', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept', '.cc-allow', '.cc-dismiss', '#didomi-notice-agree-button',
    '[data-testid="uc-accept-all-button"]', '.fc-cta-consent', '#truste-consent-button', '.osano-cm-accept-all',
    '#hs-eu-confirmation-button', '.iubenda-cs-accept-btn', 'button[mode="primary"][title*="Accept" i]'
  ];
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el instanceof HTMLElement) { el.click(); return true; }
  }
  const words = /^(accept( all)?( cookies)?|allow( all)?( cookies)?|agree|i agree|got it|ok(ay)?)$/i;
  const containers = document.querySelectorAll('[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], [role="dialog"]');
  for (const c of containers) {
    for (const b of c.querySelectorAll('button, a[role="button"]')) {
      if (words.test((b.textContent || '').trim())) { b.click(); return true; }
    }
  }
  return false;
})()`;
