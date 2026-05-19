# Doctors API — Supabase Integration Guide

The doctor data is stored in a Supabase PostgreSQL database and exposed via the auto-generated PostgREST API. No backend server required — query it directly from any client.

---

## Connection Details

| | |
|---|---|
| **Base URL** | `https://dqdjiakaflsnrmzlktni.supabase.co` |
| **REST endpoint** | `https://dqdjiakaflsnrmzlktni.supabase.co/rest/v1` |
| **Project ref** | `dqdjiakaflsnrmzlktni` |
| **Publishable API Key** | `sb_publishable_Il1pgpPgTKZ8QM2_pAkELw_wgS9OtQp` |
| **Legacy Anon Key (JWT)** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGppYWthZmxzbnJtemxrdG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODM2NDcsImV4cCI6MjA5Mjk1OTY0N30._A6Yt-HI3JD3ST62yKp0PBogB7jxrokpM3UvaVsMeMw` |
| **Table** | `doctors` |
| **Total rows** | ~9,883 |

> Use the **Publishable Key** for new integrations. The Legacy Anon Key works with older Supabase client versions.

### Required headers (every request)
```http
apikey: sb_publishable_Il1pgpPgTKZ8QM2_pAkELw_wgS9OtQp
Authorization: Bearer sb_publishable_Il1pgpPgTKZ8QM2_pAkELw_wgS9OtQp
```

#### Or with the legacy anon key
```http
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGppYWthZmxzbnJtemxrdG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODM2NDcsImV4cCI6MjA5Mjk1OTY0N30._A6Yt-HI3JD3ST62yKp0PBogB7jxrokpM3UvaVsMeMw
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGppYWthZmxzbnJtemxrdG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODM2NDcsImV4cCI6MjA5Mjk1OTY0N30._A6Yt-HI3JD3ST62yKp0PBogB7jxrokpM3UvaVsMeMw
```

---

## Schema

| Column | Type | Description |
|---|---|---|
| `id` | integer | Auto-increment primary key |
| `npi` | text (unique) | National Provider Identifier — the primary lookup key |
| `name` | text | Full name (e.g. `"Dr. Thomas Quigley"`) |
| `firstname` | text | First name |
| `lastname` | text | Last name |
| `specialty` | text | Medical specialty (e.g. `"Ophthalmology"`) |
| `city` | text | City of practice |
| `state` | text | State of practice (e.g. `"CA"`, `"FL"`) |
| `rating` | numeric | WebMD patient rating (0–5) |
| `about` | text | Doctor biography |
| `image_url` | text | Public image URL (hosted on Cloudflare R2) |
| `webmd_url` | text | Link to doctor's WebMD profile |
| `webmd_image_url` | text | Original image URL on WebMD |
| `match_confidence` | text | `matched` \| `multiple` \| `unmatched` |

### `match_confidence` values
| Value | Meaning |
|---|---|
| `matched` | Single confident WebMD match found |
| `multiple` | Multiple WebMD results — best guess was used |
| `unmatched` | No WebMD result found; minimal data available |

---

## Queries

### Look up a single doctor by NPI

```http
GET /rest/v1/doctors?npi=eq.1902616923&select=npi,name,specialty,city,state,rating,about,image_url,webmd_url
```

```js
const res = await fetch(
  "https://dqdjiakaflsnrmzlktni.supabase.co/rest/v1/doctors?npi=eq.1902616923&select=npi,name,specialty,city,state,rating,about,image_url,webmd_url",
  { headers }
);
const [doctor] = await res.json(); // returns array — take first element
```

---

### Look up multiple doctors by NPI

```http
GET /rest/v1/doctors?npi=in.(1902616923,1003608498,1234567890)&select=npi,name,image_url
```

```js
const npis = ["1902616923", "1003608498", "1234567890"];
const res = await fetch(
  `https://dqdjiakaflsnrmzlktni.supabase.co/rest/v1/doctors?npi=in.(${npis.join(",")})&select=npi,name,image_url`,
  { headers }
);
const doctors = await res.json();
```

---

### Get all matched doctors (paginated)

```http
GET /rest/v1/doctors?match_confidence=eq.matched&select=npi,name,specialty,image_url&limit=100&offset=0
```

To include both `matched` and `multiple`:

```http
GET /rest/v1/doctors?match_confidence=in.(matched,multiple)&select=npi,name,image_url&limit=100&offset=0
```

#### Pagination example

```js
async function fetchAllMatched() {
  const pageSize = 1000;
  let offset = 0;
  let all = [];

  while (true) {
    const res = await fetch(
      `https://dqdjiakaflsnrmzlktni.supabase.co/rest/v1/doctors` +
      `?match_confidence=in.(matched,multiple)` +
      `&select=npi,name,specialty,city,state,rating,about,image_url,webmd_url` +
      `&limit=${pageSize}&offset=${offset}`,
      { headers }
    );
    const page = await res.json();
    all = all.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}
```

---

### Filter by state

```http
GET /rest/v1/doctors?state=eq.CA&match_confidence=eq.matched&select=npi,name,specialty,city,rating,image_url&limit=50
```

---

### Filter by specialty

```http
GET /rest/v1/doctors?specialty=eq.Ophthalmology&select=npi,name,city,state,rating,image_url&limit=50
```

---

### Search by name (partial match)

```http
GET /rest/v1/doctors?name=ilike.*quigley*&select=npi,name,specialty,city,state
```

> `ilike` is case-insensitive. Wrap the pattern in `*` for a substring match.

---

### Get total count

Add the `Prefer: count=exact` header and read the `Content-Range` response header:

```js
const res = await fetch(
  "https://dqdjiakaflsnrmzlktni.supabase.co/rest/v1/doctors?match_confidence=eq.matched&select=id",
  {
    headers: {
      ...headers,
      Prefer: "count=exact",
    },
  }
);
// e.g. Content-Range: 0-999/4521
const total = res.headers.get("Content-Range")?.split("/")[1];
```

---

## Using the Supabase JS Client

Install: `npm install @supabase/supabase-js`

```js
import { createClient } from "@supabase/supabase-js";

// Using publishable key (recommended)
const supabase = createClient(
  "https://dqdjiakaflsnrmzlktni.supabase.co",
  "sb_publishable_Il1pgpPgTKZ8QM2_pAkELw_wgS9OtQp"
);

// Using legacy anon key (older client versions)
const supabase = createClient(
  "https://dqdjiakaflsnrmzlktni.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGppYWthZmxzbnJtemxrdG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODM2NDcsImV4cCI6MjA5Mjk1OTY0N30._A6Yt-HI3JD3ST62yKp0PBogB7jxrokpM3UvaVsMeMw"
);

// Single doctor
const { data } = await supabase
  .from("doctors")
  .select("npi, name, specialty, city, state, rating, about, image_url, webmd_url")
  .eq("npi", "1902616923")
  .single();

// Multiple NPIs
const { data } = await supabase
  .from("doctors")
  .select("npi, name, image_url")
  .in("npi", ["1902616923", "1003608498"]);

// All matched doctors in California
const { data } = await supabase
  .from("doctors")
  .select("npi, name, specialty, city, rating, image_url")
  .eq("state", "CA")
  .eq("match_confidence", "matched")
  .order("rating", { ascending: false })
  .limit(100);
```

---

## PostgREST Filter Operators

| Operator | Meaning | Example |
|---|---|---|
| `eq` | equals | `state=eq.CA` |
| `neq` | not equals | `match_confidence=neq.unmatched` |
| `in` | in list | `npi=in.(123,456,789)` |
| `ilike` | case-insensitive pattern | `name=ilike.*smith*` |
| `gt` / `gte` | greater than | `rating=gte.4` |
| `lt` / `lte` | less than | `rating=lt.3` |
| `is` | is null / not null | `image_url=is.null` |

---

## Notes

- **Images** are hosted on Cloudflare R2 at `https://pub-b8764e3af2204c0b9ef3ea53fad39314.r2.dev/{npi}.jpg`
- **RLS is disabled** — all rows are publicly readable with the API key above
- **Default page size** is 1,000 rows; always paginate for full dataset queries
- The `select` parameter controls which columns are returned — always specify only what you need
