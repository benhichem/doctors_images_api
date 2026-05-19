const SUPABASE_URL = "https://dqdjiakaflsnrmzlktni.supabase.co";
const SUPABASE_KEY = "sb_publishable_Il1pgpPgTKZ8QM2_pAkELw_wgS9OtQp";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function getByNpi(npi: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/doctors?npi=eq.${npi}&select=npi,name,match_confidence,about,image_url,webmd_url`,
    { headers }
  );
  return res.json();
}

async function getByNpis(npis: string[]) {
  const list = npis.join(",");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/doctors?npi=in.(${list})&select=npi,name,match_confidence,about,image_url,webmd_url`,
    { headers }
  );
  return res.json();
}

async function getMatched(limit = 5) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/doctors?match_confidence=eq.matched&select=npi,name,match_confidence,about,image_url,webmd_url&limit=${limit}`,
    { headers }
  );
  return res.json();
}

async function getAllMatched() {
  let all: any[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/doctors?match_confidence=in.(matched,multiple)&select=npi,name,match_confidence,about,image_url,webmd_url&limit=${pageSize}&offset=${offset}`,
      { headers: { ...headers, Prefer: "count=exact" } }
    );
    const page: any[] = await res.json();
    all = all.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

// --- run ---

const [, , cmd, ...args] = process.argv;

if (cmd === "one") {
  console.log(await getByNpi(args[0]!));
} else if (cmd === "many") {
  console.log(await getByNpis(args));
} else if (cmd === "matched") {
  console.log(await getMatched(Number(args[0]) || 5));
} else if (cmd === "all-matched") {
  const results = await getAllMatched();
  console.log(`Total matched: ${results.length}`);
  console.log(results);
  Bun.write("matched_doctors.json", JSON.stringify(results, null, 2));
} else {
  console.log("Usage:");
  console.log("  bun src/test_supabase.ts one <npi>");
  console.log("  bun src/test_supabase.ts many <npi1> <npi2> ...");
  console.log("  bun src/test_supabase.ts matched [limit]");
  console.log("  bun src/test_supabase.ts all-matched");
}
