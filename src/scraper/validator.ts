import type { NPIRecord } from "../db/seed/npi.types";
import type { WebMDResult } from "./extractor";

function similarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 1;
  let matches = 0;
  for (const ch of shorter) {
    if (longer.includes(ch)) matches++;
  }
  return matches / longer.length;
}

export function validateMatch(result: WebMDResult, record: NPIRecord): boolean {
  const npiFirst = (record["Provider First Name"] ?? "").trim();
  const npiLast = (record["Provider Last Name (Legal Name)"] ?? "").trim();
  const npiState = (record["Provider Business Practice Location Address State Name"] ?? "").trim();

  const nameSim = similarity(`${npiFirst} ${npiLast}`, result.fullname ?? "");
  const stateMatch = npiState.toUpperCase() === result.state.toUpperCase();

  return nameSim >= 0.8 && stateMatch;
}
