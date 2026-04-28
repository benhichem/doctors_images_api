import type { NPIRecord } from "../db/seed/npi.types";

async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<string | undefined> {
  const params = new URLSearchParams({
    street,
    city,
    state,
    zip,
    benchmark: "2020",
    format: "json",
  });
  const res = await fetch(
    `https://geocoding.geo.census.gov/geocoder/locations/address?${params}`
  );
  if (!res.ok) return undefined;
  const data = await res.json() as any;
  const match = data?.result?.addressMatches?.[0]?.coordinates;
  if (!match) return undefined;
  return `${match.y},${match.x}`;
}

export interface WebMDDoctorSearchQuery {
  q: string;
  d: number;
  sortby: string;
  extractionname: string;
  extractiontype: string;
  medicare: string;
  medicaid: string;
  newpatient: boolean;
  isvirtualvisit: boolean;
  minrating: number;
  entity: string;
  gender: string;
  exp: string;
  hospPromo: boolean;
  pt?: string;
  city: string;
  state: string;
  solrQueryValue: string;
  updateSolrQueryValue: boolean;
  nameSearch: boolean;
}

export async function buildWebMDSearchQuery(record: NPIRecord): Promise<WebMDDoctorSearchQuery> {
  const parts = [
    record["Provider First Name"],
    record["Provider Middle Name"],
    record["Provider Last Name (Legal Name)"],
  ]
    .filter(Boolean)
    .map((s) => s.trim().toUpperCase());

  const name = parts.join(" ");

  const street = record["Provider First Line Business Practice Location Address"] ?? "";
  const city = record["Provider Business Practice Location Address City Name"] ?? "";
  const state = record["Provider Business Practice Location Address State Name"] ?? "";
  const zip = record["Provider Business Practice Location Address Postal Code"] ?? "";

  const pt = await geocodeAddress(street, city, state, zip);

  return {
    q: name,
    d: 40,
    sortby: "bestmatch",
    extractionname: "",
    extractiontype: "specialty",
    medicare: "",
    medicaid: "",
    newpatient: false,
    isvirtualvisit: false,
    minrating: 0,
    entity: "all",
    gender: "all",
    exp: "min_max",
    hospPromo: false,
    pt,
    city,
    state,
    solrQueryValue: name,
    updateSolrQueryValue: true,
    nameSearch: true,
  };
}

export function toWebMDUrl(query: WebMDDoctorSearchQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return `https://doctor.webmd.com/results?${params.toString()}`;
}
