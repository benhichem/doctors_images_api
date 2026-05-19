import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const JSON_FILE = join(import.meta.dir, "../matched_doctors.json");
const OUTPUT_DIR = join(import.meta.dir, "../images");

const CONCURRENCY = 5;

interface Doctor {
  npi: string;
  image_url?: string | null;
  [key: string]: unknown;
}

const doctors: Doctor[] = await Bun.file(JSON_FILE).json();
const withImages = doctors.filter((d) => d.image_url);

mkdirSync(OUTPUT_DIR, { recursive: true });

let saved = 0;
let skipped = 0;
let failed = 0;
let done = 0;
const total = withImages.length;

async function downloadOne(doctor: Doctor) {
  const filename = `${doctor.npi}.jpg`;
  const dest = join(OUTPUT_DIR, filename);

  if (existsSync(dest)) {
    skipped++;
    done++;
    process.stdout.write(`\r[${done}/${total}] skipped ${filename} (exists)`);
    return;
  }

  try {
    const res = await fetch(doctor.image_url!);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await Bun.write(dest, res);
    saved++;
    done++;
    process.stdout.write(`\r[${done}/${total}] saved   ${filename}          `);
  } catch (err) {
    failed++;
    done++;
    process.stdout.write(`\r[${done}/${total}] failed  ${filename}: ${err}  `);
  }
}

// Process in batches of CONCURRENCY
for (let i = 0; i < withImages.length; i += CONCURRENCY) {
  const batch = withImages.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(downloadOne));
}

console.log(`\n\nDone. saved=${saved}  skipped=${skipped}  failed=${failed}`);
