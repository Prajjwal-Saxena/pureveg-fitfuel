type MixpanelModule = typeof import("mixpanel-browser");

let mixpanelModulePromise: Promise<MixpanelModule | null> | null = null;
let initialized = false;

function getToken() {
  return import.meta.env.VITE_MIXPANEL_TOKEN;
}

async function loadMixpanel() {
  const token = getToken();
  if (!token) return null;
  if (!mixpanelModulePromise) {
    mixpanelModulePromise = import("mixpanel-browser").then((module) => module.default ? module.default : (module as unknown as MixpanelModule));
  }
  return mixpanelModulePromise;
}

export async function initMixpanel() {
  const token = getToken();
  if (!token || initialized) return;
  const mixpanel = await loadMixpanel();
  if (!mixpanel) return;
  mixpanel.init(token, {
    track_pageview: false,
    persistence: "localStorage",
    autocapture: true,
    debug: false
  });
  initialized = true;
}

export async function identifyMixpanel(sessionToken: string) {
  if (!sessionToken) return;
  await initMixpanel();
  const mixpanel = await loadMixpanel();
  if (!mixpanel || !getToken()) return;
  mixpanel.identify(sessionToken);
  mixpanel.people.set({
    session_token: sessionToken,
    platform: "web"
  });
}

export async function trackMixpanel(event: string, properties: Record<string, unknown> = {}) {
  await initMixpanel();
  const mixpanel = await loadMixpanel();
  if (!mixpanel || !getToken()) return;
  mixpanel.track(event, properties);
}

export async function trackMixpanelPage(pageName: string, properties: Record<string, unknown> = {}) {
  await trackMixpanel("Page Viewed", {
    page_name: pageName,
    path: window.location.pathname,
    ...properties
  });
}
