import { refreshHeaders } from "./refresh_headers";

function getHeaders() {
  return {
    "accept": "application/json, text/plain, */*",
    "client_id": process.env.WEBMD_CLIENT_ID ?? "",
    "enc_data": process.env.WEBMD_ENC_DATA ?? "",
    "timestamp": process.env.WEBMD_TIMESTAMP ?? "",
    "sec-ch-ua": '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "Referer": "https://doctor.webmd.com/",
  };
}

const PAGE_SIZE = 10;

export interface WebMDResult {
  npi: string;
  fullname: string;
  firstname: string;
  lastname: string;
  provider_url_s: string;
  providerurl: string;
  photourl: string;
  primaryspecialty_nis: string;
  city: string;
  state: string;
  c1_avg_f: number;
  bio_s: string;
}

async function fetchPage(
  q: string,
  pt: string | undefined,
  state: string,
  start: number
): Promise<{ results: WebMDResult[]; total: number }> {
  const params = new URLSearchParams({
    llmExtracted: "",
    sortby: "bestmatch",
    entity: "all",
    gender: "all",
    distance: "40",
    newpatient: "",
    isvirtualvisit: "",
    minrating: "0",
    start: String(start),
    pagename: "serp",
    q,
    pt: pt ?? "",
    specialtyid: "",
    d: "40",
    sid: "",
    pid: "",
    insuranceid: "",
    exp_min: "min",
    exp_max: "max",
    state,
    isSerpPage: "",
    medicare: "",
    medicaid: "",
    fromSeoSerp: "",
    s_conditionid: "",
    s_procedureid: "",
    amagender: "all",
  });

  const url = `https://www.webmd.com/kapi/secure/search/care/allresults?${params}`;
  const res = await fetch(url, { headers: getHeaders() });

  console.log(`[extractor] GET ${res.status} ${res.statusText} — start=${start}`);

  if (res.status === 400) {
    console.log("[extractor] 400 received — refreshing headers and retrying...");
    await refreshHeaders();
    const retry = await fetch(url, { headers: getHeaders() });
    console.log(`[extractor] retry GET ${retry.status} ${retry.statusText} — start=${start}`);
    if (!retry.ok) return { results: [], total: 0 };
    const retryData = (await retry.json()) as any;
    return {
      results: retryData?.data?.response ?? [],
      total: retryData?.data?.numofsearchresults ?? 0,
    };
  }

  if (!res.ok) return { results: [], total: 0 };
  const data = (await res.json()) as any;
  const total = data?.data?.numofsearchresults ?? 0;
  const results = data?.data?.response ?? [];
  console.log(`[extractor] total=${total} returned=${results.length}`);
  return { results, total };
}

// Paginates through results, stopping early if shouldStop returns true for a page.
export async function extractDoctorResults(
  q: string,
  pt: string | undefined,
  state: string,
  shouldStop?: (results: WebMDResult[]) => boolean
): Promise<WebMDResult[]> {
  const all: WebMDResult[] = [];

  const first = await fetchPage(q, pt, state, 0);
  all.push(...first.results);

  if (shouldStop?.(first.results)) return all;

  const total = first.total;
  let start = PAGE_SIZE;

  while (start < total) {
    const page = await fetchPage(q, pt, state, start);
    if (page.results.length === 0) break;
    all.push(...page.results);
    if (shouldStop?.(page.results)) break;
    start += PAGE_SIZE;
  }

  return all;
}
