import mixpanel from "mixpanel-browser";

let initialized = false;

function getToken() {
  return import.meta.env.VITE_MIXPANEL_TOKEN;
}

export function initMixpanel() {
  const token = getToken();
  if (!token || initialized) return;
  mixpanel.init(token, {
    track_pageview: false,
    persistence: "localStorage",
    autocapture: true,
    debug: false
  });
  initialized = true;
}

export function identifyMixpanel(sessionToken: string) {
  if (!sessionToken) return;
  initMixpanel();
  if (!getToken()) return;
  mixpanel.identify(sessionToken);
  mixpanel.people.set({
    session_token: sessionToken,
    platform: "web"
  });
}

export function trackMixpanel(event: string, properties: Record<string, unknown> = {}) {
  initMixpanel();
  if (!getToken()) return;
  mixpanel.track(event, properties);
}

export function trackMixpanelPage(pageName: string, properties: Record<string, unknown> = {}) {
  trackMixpanel("Page Viewed", {
    page_name: pageName,
    path: window.location.pathname,
    ...properties
  });
}
