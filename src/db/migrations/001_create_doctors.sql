CREATE TABLE IF NOT EXISTS doctors (
  id               SERIAL PRIMARY KEY,
  npi              TEXT UNIQUE NOT NULL,
  name             TEXT,
  firstname        TEXT,
  lastname         TEXT,
  specialty        TEXT,
  city             TEXT,
  state            TEXT,
  rating           NUMERIC,
  about            TEXT,
  image_url        TEXT,
  webmd_url        TEXT,
  match_confidence TEXT CHECK (match_confidence IN ('matched', 'unmatched', 'multiple'))
);
