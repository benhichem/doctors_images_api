"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const JSON_FILE = (0, node_path_1.join)(import.meta.dir, "../matched_doctors.json");
const OUTPUT_DIR = (0, node_path_1.join)(import.meta.dir, "../images");
const CONCURRENCY = 5;
const doctors = await Bun.file(JSON_FILE).json();
const withImages = doctors.filter((d) => d.image_url);
(0, node_fs_1.mkdirSync)(OUTPUT_DIR, { recursive: true });
let saved = 0;
let skipped = 0;
let failed = 0;
let done = 0;
const total = withImages.length;
async function downloadOne(doctor) {
    const filename = `${doctor.npi}.jpg`;
    const dest = (0, node_path_1.join)(OUTPUT_DIR, filename);
    if ((0, node_fs_1.existsSync)(dest)) {
        skipped++;
        done++;
        process.stdout.write(`\r[${done}/${total}] skipped ${filename} (exists)`);
        return;
    }
    try {
        const res = await fetch(doctor.image_url);
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        await Bun.write(dest, res);
        saved++;
        done++;
        process.stdout.write(`\r[${done}/${total}] saved   ${filename}          `);
    }
    catch (err) {
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
