import { test, expect, describe } from "bun:test";
import app from "./index";

const BASE = "http://localhost";
const NPI_1 = "1811777683";
const NPI_2 = "1972444339";

describe("GET /doctors/:npi", () => {
  test("returns a doctor for a valid NPI", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors/${NPI_1}`));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toHaveProperty("data");
  });

  test("returns null data for a non-existent NPI", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors/9999999999`));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toBeNull();
  });

  test("returns 400 for a non-numeric NPI", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors/abc`));
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error.code).toBe("INVALID_NPI");
  });

  test("returns 400 for NPI with wrong length", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors/12345`));
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error.code).toBe("INVALID_NPI");
  });
});

describe("GET /doctors?npis=", () => {
  test("returns doctors for valid comma-separated NPIs", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors?npis=${NPI_1},${NPI_2}`));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.data[0]).toHaveProperty("npi");
    expect(body.data[0]).toHaveProperty("data");
  });

  test("returns 400 when npis param is missing", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors`));
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error.code).toBe("MISSING_NPIS");
  });

  test("returns 400 when all NPIs are invalid", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors?npis=abc,xyz`));
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error.code).toBe("INVALID_NPIS");
  });

  test("silently drops invalid NPIs and uses valid ones", async () => {
    const res = await app.fetch(new Request(`${BASE}/doctors?npis=${NPI_1},abc,${NPI_2}`));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(2);
  });

  test("caps results at 10 NPIs", async () => {
    const npis = Array.from({ length: 15 }, (_, i) => `181177768${i}`.padEnd(10, "0").slice(0, 10)).join(",");
    const res = await app.fetch(new Request(`${BASE}/doctors?npis=${npis}`));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(10);
  });
});
