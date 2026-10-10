CREATE SCHEMA IF NOT EXISTS aitrade;

CREATE TABLE IF NOT EXISTS aitrade.sessions (
  id serial PRIMARY KEY,
  session_date date NOT NULL UNIQUE,
  tz text NOT NULL DEFAULT 'America/New_York',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aitrade.candidates (
  id serial PRIMARY KEY,
  session_id integer NOT NULL REFERENCES aitrade.sessions(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  rank integer NOT NULL,
  score double precision NOT NULL DEFAULT 0,
  gap_pct double precision,
  rel_vol double precision,
  rsi double precision,
  atr double precision,
  entry double precision,
  stop double precision,
  target double precision,
  status text NOT NULL DEFAULT 'watch',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidates_session_idx ON aitrade.candidates(session_id);

CREATE TABLE IF NOT EXISTS aitrade.results (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES aitrade.candidates(id) ON DELETE CASCADE,
  ref_price double precision,
  pnl_pct double precision,
  outcome text NOT NULL DEFAULT 'unavailable',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aitrade.journal (
  id serial PRIMARY KEY,
  symbol text NOT NULL,
  side text NOT NULL DEFAULT 'buy',
  shares double precision NOT NULL,
  fill_price double precision NOT NULL,
  exit_price double precision,
  notes text,
  filled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aitrade.webhook_endpoints (
  id serial PRIMARY KEY,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aitrade.webhook_deliveries (
  id serial PRIMARY KEY,
  endpoint_id integer REFERENCES aitrade.webhook_endpoints(id) ON DELETE SET NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  signature text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aitrade.screener_config (
  id serial PRIMARY KEY,
  weights jsonb NOT NULL,
  thresholds jsonb NOT NULL,
  universe text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
