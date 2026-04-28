import { streamNPIRecords } from "../db/seed";
import { buildWebMDSearchQuery } from "../search/webmd";

const HEADERS = {
  "accept": "application/json, text/plain, */*",
  "client_id": "ffd1790e-63c1-4c47-a6b9-e78fddd2de60",
  "enc_data": "Rb5bcY7Hf3ibzigSRfGwVkCPtg0zWTju6IW9bMvwpiQ=",
  "timestamp": "1776708167",
  "sec-ch-ua": '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "Referer": "https://doctor.webmd.com/",
};

async function searchDoctor(q: string, pt: string | undefined, state: string) {
  const params = new URLSearchParams({
    llmExtracted: "",
    sortby: "bestmatch",
    entity: "all",
    gender: "all",
    distance: "40",
    newpatient: "",
    isvirtualvisit: "",
    minrating: "0",
    start: "0",
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

  const res = await fetch(
    `https://www.webmd.com/kapi/secure/search/care/allresults?${params}`,
    { headers: HEADERS }
  );

  if (!res.ok) return null;
  return res.json() as Promise<any>;
}

async function main() {
  const filePath = "./src/db/seed/db_source/npidata_pfile_20260406-20260412.csv";
  let count = 0;

  for await (const record of streamNPIRecords(filePath)) {
    if (count >= 3) break;

    const query = await buildWebMDSearchQuery(record);
    const npi = record["NPI"];
    const name = query.q;

    console.log(`\n--- [${count + 1}] NPI: ${npi} | Name: ${name} | State: ${query.state} ---`);

    const result = await searchDoctor(query.q, query.pt, query.state);

    if (!result) {
      console.log("Request failed");
    } else {
      const hits = result?.data?.response ?? [];
      console.log(`Total results: ${result?.data?.numofsearchresults}`);
      console.log(`First match:`, hits[0] ?? "none");
    }

    count++;
  }
}

main();
