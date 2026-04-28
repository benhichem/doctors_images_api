import { launchBrowser, closeBrowser } from "./browser";

const SEARCH_URL =
  "https://doctor.webmd.com/results?q=John+Smith&state=NY&city=New+York&d=40&sortby=bestmatch&entity=all&gender=all&nameSearch=true";

const ENV_PATH = ".env";

function upsertEnvVar(env: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  return regex.test(env) ? env.replace(regex, line) : `${env.trimEnd()}\n${line}\n`;
}

// Shared lock — ensures only one browser refresh runs at a time across all workers.
let refreshLock: Promise<void> | null = null;

export async function refreshHeaders(): Promise<void> {
  if (refreshLock) {
    console.log("[refresh] waiting for in-progress refresh to complete...");
    await refreshLock;
    return;
  }

  refreshLock = (async () => {
    console.log("[refresh] launching browser to capture fresh headers...");
    const session = await launchBrowser();
    const { page } = session;

    const captured: { clientId?: string; encData?: string; timestamp?: string } = {};

    try {
      const client = await page.createCDPSession();
      await client.send("Network.enable");

      client.on("Network.requestWillBeSent", (event: any) => {
        if (!event.request.url.includes("kapi/secure/search/care/allresults")) return;
        const h = event.request.headers;
        captured.clientId  = h["client_id"];
        captured.encData   = h["enc_data"];
        captured.timestamp = h["timestamp"];
        console.log(`[refresh] intercepted — client_id: ${captured.clientId} | timestamp: ${captured.timestamp}`);
      });

      console.log("[refresh] navigating to WebMD...");
      await page.goto(SEARCH_URL, { waitUntil: "networkidle2", timeout: 30_000 });

      if (!captured.encData) {
        console.log("[refresh] kapi not detected yet, waiting 10s...");
        await new Promise((r) => setTimeout(r, 10_000));
      }
    } finally {
      await closeBrowser(session);
      console.log("[refresh] browser closed");
    }

    if (!captured.clientId || !captured.encData || !captured.timestamp) {
      throw new Error("[refresh] failed to capture headers — no kapi request intercepted");
    }

    let env = "";
    try { env = await Bun.file(ENV_PATH).text(); } catch { /* no .env yet */ }

    env = upsertEnvVar(env, "WEBMD_CLIENT_ID", captured.clientId);
    env = upsertEnvVar(env, "WEBMD_ENC_DATA",  captured.encData);
    env = upsertEnvVar(env, "WEBMD_TIMESTAMP",  captured.timestamp);
    await Bun.write(ENV_PATH, env);

    // Apply to current process immediately so workers don't need a restart.
    process.env.WEBMD_CLIENT_ID = captured.clientId;
    process.env.WEBMD_ENC_DATA  = captured.encData;
    process.env.WEBMD_TIMESTAMP = captured.timestamp;

    console.log("[refresh] headers updated successfully");
  })().finally(() => { refreshLock = null; });

  await refreshLock;
}

// Allow running standalone: bun src/scraper/refresh_headers.ts
if (import.meta.main) refreshHeaders();
