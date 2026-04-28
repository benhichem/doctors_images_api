import type { Context } from "hono";
import { doctorService } from "../services/doctor.service";

const MAX_NPIS = 10;
const NPI_REGEX = /^\d{10}$/;

const errorResponse = (
  c: Context,
  status: number,
  code: string,
  message: string,
  example?: string
) => c.json({ error: { code, message, ...(example ? { example } : {}) } }, status as any);

export const doctorController = {
  async getOne(c: Context) {
    const npi = c.req.param("npi");
    if (!NPI_REGEX.test(npi))
      return errorResponse(c, 400, "INVALID_NPI", "NPI must be a 10-digit numeric string");

    const doctor = await doctorService.getByNpi(npi);
    return c.json({ data: doctor ?? null });
  },

  async getMany(c: Context) {
    const raw = c.req.query("npis");

    if (!raw || raw.trim() === "")
      return errorResponse(
        c, 400, "MISSING_NPIS",
        "The 'npis' query param is required. Provide up to 10 comma-separated NPI numbers.",
        "/doctors?npis=1811777683,1972444339"
      );

    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => NPI_REGEX.test(s));

    if (parsed.length === 0)
      return errorResponse(
        c, 400, "INVALID_NPIS",
        "No valid NPIs found. Each must be a 10-digit numeric string.",
        "/doctors?npis=1811777683,1972444339"
      );

    const npis = parsed.slice(0, MAX_NPIS);
    const results = await doctorService.getByNpis(npis);
    const data = npis.map((npi, i) => ({ npi, data: results[i] ?? null }));
    return c.json({ data });
  },
};
