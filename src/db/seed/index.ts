import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { NPIRecord } from "./npi.types";
import { runWorker } from "../../scraper/worker";

function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    fields.push(current);
    return fields;
}

export async function* streamNPIRecords(filePath: string): AsyncGenerator<NPIRecord> {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let headers: string[] | null = null;

    for await (const line of rl) {
        const fields = parseCSVLine(line);
        if (!headers) {
            headers = fields;
            continue;
        }
        const record = Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? ""]));
        yield record as unknown as NPIRecord;
    }
}

const CONCURRENCY = parseInt(process.argv.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? "3");
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0");
const FILE_PATH = "./src/db/seed/db_source/npidata_pfile_20260406-20260412.csv";

async function main() {
    const startTime = Date.now();
    let processed = 0;
    let skipped = 0;

    console.log("=".repeat(50));
    console.log(`Seed starting`);
    console.log(`  File      : ${FILE_PATH}`);
    console.log(`  Workers   : ${CONCURRENCY}`);
    console.log(`  Limit     : ${LIMIT > 0 ? LIMIT : "none"}`);
    console.log("=".repeat(50));

    async function* limitedStream() {
        for await (const record of streamNPIRecords(FILE_PATH)) {
            const npi = record["NPI"];
            const lastName = record["Provider Last Name (Legal Name)"];

            if (!npi || !lastName) {
                skipped++;
                console.log(`[seed] skipped — missing NPI or name (row ${processed + skipped})`);
                continue;
            }

            if (LIMIT > 0 && processed >= LIMIT) break;
            processed++;
            console.log(`[seed] queued  (${processed}${LIMIT > 0 ? `/${LIMIT}` : ""}) NPI: ${npi} — ${record["Provider First Name"]} ${lastName}`);
            yield record;
        }
    }

    const iterator = limitedStream()[Symbol.asyncIterator]();

    await Promise.all(
        Array.from({ length: CONCURRENCY }, (_, i) => {
            console.log(`[seed] worker ${i + 1} started`);
            return runWorker(iterator).then(() => {
                console.log(`[seed] worker ${i + 1} finished`);
            });
        })
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("=".repeat(50));
    console.log(`Seed complete`);
    console.log(`  Processed : ${processed}`);
    console.log(`  Skipped   : ${skipped}`);
    console.log(`  Time      : ${elapsed}s`);
    console.log("=".repeat(50));
}

if (import.meta.main) main();
