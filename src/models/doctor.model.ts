export interface Doctor {
  id: number;
  npi: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  specialty: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  about: string | null;
  image_url: string | null;
  webmd_image_url: string | null;
  webmd_url: string | null;
  match_confidence: "matched" | "unmatched" | "multiple" | null;
}
