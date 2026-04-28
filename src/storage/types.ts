export interface ImageStorage {
  store(npi: string, source: Response): Promise<string | null>;
  publicUrl(npi: string): string;
  delete?(npi: string): Promise<void>;
}
