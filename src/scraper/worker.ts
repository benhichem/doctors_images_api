import { extractDoctorResults, type WebMDResult } from "./extractor";
import { validateMatch } from "./validator";
import { buildWebMDSearchQuery } from "../search/webmd";
import { db } from "../db";
import { imageStorage } from "../storage";
import type { NPIRecord } from "../db/seed/npi.types";

export async function runWorker(jobs: AsyncIterator<NPIRecord>): Promise<void> {
  while (true) {
    const { value: record, done } = await jobs.next();
    if (done) break;

    const npi = record["NPI"];
    const fullName = `${record["Provider First Name"] ?? ""} ${record["Provider Last Name (Legal Name)"] ?? ""}`.trim();

    if (!npi || !record["Provider Last Name (Legal Name)"]) continue;

    try {
      console.log(`[worker] processing  NPI: ${npi} — ${fullName}`);

      const query = await buildWebMDSearchQuery(record);

      if (!query.state) {
        console.log(`[worker] skipped     NPI: ${npi} — no state in NPI record`);
        continue;
      }

      console.log(`[worker] geocoded    NPI: ${npi} — pt: ${query.pt ?? "not found"}`);
      console.log(`[worker] searching   NPI: ${npi} — q: "${query.q}", state: ${query.state}`);

      const results = await extractDoctorResults(
        query.q,
        query.pt,
        query.state,
        (page) => page.some((r) => validateMatch(r, record))
      );

      console.log(`[worker] fetched     NPI: ${npi} — ${results.length} total results`);

      if (results.length === 0) {
        console.log(`[worker] unmatched   NPI: ${npi} — no results returned`);
        await saveResult(npi, null, "unmatched");
        continue;
      }

      const matched = results.filter((r) => validateMatch(r, record));

      if (matched.length === 0) {
        console.log(`[worker] unmatched   NPI: ${npi} — none of ${results.length} results passed validation`);
        await saveResult(npi, null, "unmatched");
      } else if (matched.length > 1) {
        console.log(`[worker] multiple    NPI: ${npi} — ${matched.length} matches, using first: "${matched[0]?.fullname}"`);
        await saveResult(npi, matched[0] ?? null, "multiple");
      } else {
        console.log(`[worker] matched     NPI: ${npi} — "${matched[0]?.fullname}" (${matched[0]?.city}, ${matched[0]?.state})`);
        await saveResult(npi, matched[0] ?? null, "matched");
      }
    } catch (err) {
      console.error(`[worker] error       NPI: ${npi} — ${err}`);
    }
  }
}

async function downloadImage(npi: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await imageStorage.store(npi, res);
  } catch {
    console.log(`[worker] image       NPI: ${npi} — download failed, skipping`);
    return null;
  }
}

async function saveResult(
  npi: string,
  result: WebMDResult | null,
  confidence: "matched" | "unmatched" | "multiple"
): Promise<void> {
  const url = result?.providerurl ?? result?.provider_url_s ?? null;
  const webmdImageUrl = result?.photourl || null;
  const localImagePath = webmdImageUrl ? await downloadImage(npi, webmdImageUrl) : null;

  await db`
    INSERT INTO doctors (npi, webmd_url, name, specialty, city, state, rating, match_confidence, about, image_url, webmd_image_url)
    VALUES (
      ${npi},
      ${url},
      ${result?.fullname ?? null},
      ${result?.primaryspecialty_nis ?? null},
      ${result?.city ?? null},
      ${result?.state ?? null},
      ${result?.c1_avg_f ?? null},
      ${confidence},
      ${result?.bio_s ?? ""},
      ${localImagePath},
      ${webmdImageUrl}
    )
    ON CONFLICT (npi) DO UPDATE SET
      webmd_url        = EXCLUDED.webmd_url,
      name             = EXCLUDED.name,
      specialty        = EXCLUDED.specialty,
      city             = EXCLUDED.city,
      state            = EXCLUDED.state,
      rating           = EXCLUDED.rating,
      match_confidence = EXCLUDED.match_confidence,
      about            = EXCLUDED.about,
      image_url        = EXCLUDED.image_url,
      webmd_image_url  = EXCLUDED.webmd_image_url
  `;
  console.log(`[worker] saved       NPI: ${npi} — confidence: ${confidence}`);
}
