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

create table if not exists place_photos (
  id                serial primary key,
  place_id          text not null references places(place_id) on delete cascade,
  photo_reference   text not null,
  width             integer,
  height            integer,
  display_order     integer not null default 0,
  fetched_at        timestamptz not null default now(),
  unique (place_id, photo_reference)
);

create index if not exists place_photos_place_id_idx
  on place_photos (place_id, display_order);
