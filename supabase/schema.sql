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
