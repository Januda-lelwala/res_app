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
  last_synced       timestamptz not null default now()
);

create table if not exists place_menu_items (
  id                serial primary key,
  place_id          text not null references places(place_id) on delete cascade,
  item_name         text not null,
  description       text,
  price_lkr         integer,
  category          text,
  is_vegetarian     boolean,
  is_vegan          boolean,
  confidence        text check (confidence in ('high','medium','low')),
  source_photo_refs text[] not null default '{}',
  extracted_at      timestamptz not null default now(),
  unique (place_id, item_name)
);

create index if not exists place_menu_items_place_id_idx
  on place_menu_items (place_id);

create table if not exists place_menu_extractions (
  place_id        text primary key references places(place_id) on delete cascade,
  extracted_at    timestamptz not null default now(),
  photo_count     integer not null default 0,
  item_count      integer not null default 0,
  model           text not null default 'claude-haiku-4-5-20251001',
  notes           text
);
