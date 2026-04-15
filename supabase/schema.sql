create table if not exists places (
  place_id          text primary key,
  name              text not null,
  category          text not null,
  price_level       integer,
  price_range       text not null default 'Price varies',
  rating            real,
  total_ratings     integer,
  address           text,
  open_now          boolean,
  lat               real,
  lng               real,
  distance_from_fort integer not null default 0,
  types             text[] not null default '{}',
  photo_reference   text,
  last_synced       timestamptz not null default now(),
  user_description  text
);

create table if not exists place_reviews (
  id               uuid primary key default gen_random_uuid(),
  place_id         text not null references places(place_id) on delete cascade,

  -- Reviewer identity (no auth — fingerprint-based rate limiting)
  reviewer_name    text not null check (char_length(reviewer_name) between 1 and 60),
  reviewer_fp      text not null,       -- sha256(ip + userAgent)
  reviewer_ip_hash text not null,       -- sha256(ip) for per-IP rate limit

  -- Content
  body             text not null check (char_length(body) between 20 and 1000),
  rating           smallint check (rating between 1 and 5),

  -- Moderation state: pending → approved | rejected | flagged → (admin) → approved | rejected
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected','flagged')),

  -- AI moderation output
  ai_verdict       text check (ai_verdict in ('approve','reject','flag')),
  ai_reason        text,
  ai_confidence    real,

  -- Human moderation
  admin_note       text,

  created_at       timestamptz not null default now(),
  moderated_at     timestamptz,
  reviewed_at      timestamptz
);

create index if not exists place_reviews_place_status_idx on place_reviews (place_id, status);
create index if not exists place_reviews_status_created_idx on place_reviews (status, created_at desc);
create index if not exists place_reviews_ip_created_idx on place_reviews (reviewer_ip_hash, created_at desc);
create index if not exists place_reviews_fp_place_idx on place_reviews (reviewer_fp, place_id);
