import { db } from "../db";
import type { Doctor } from "../models/doctor.model";

export const doctorService = {
  async getByNpi(npi: string): Promise<Doctor | null> {
    const rows = await db`SELECT * FROM doctors WHERE npi = ${npi}`;
    return (rows[0] as Doctor) ?? null;
  },

  async getByNpis(npis: string[]): Promise<(Doctor | null)[]> {
    const placeholders = npis.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await db.unsafe(`SELECT * FROM doctors WHERE npi IN (${placeholders})`, npis);
    const map = new Map<string, Doctor>();
    for (const row of rows as Doctor[]) map.set(row.npi, row);
    return npis.map((npi) => map.get(npi) ?? null);
  },
};
