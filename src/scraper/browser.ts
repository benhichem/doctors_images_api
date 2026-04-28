import { connect } from "puppeteer-real-browser";

export type BrowserSession = Awaited<ReturnType<typeof connect>>;

export async function launchBrowser(): Promise<BrowserSession> {
  return connect({
    headless: false,
    args: ["--no-sandbox"],
    customConfig: {},
    turnstile: true,
    connectOption: {},
  });
}

export async function closeBrowser(session: BrowserSession): Promise<void> {
  await session.browser.close();
}
