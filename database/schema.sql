create table if not exists users (
  id bigserial primary key,
  name varchar(120) not null,
  email varchar(160) not null unique,
  role varchar(40) not null,
  zone varchar(120) not null,
  created_at timestamp not null default now()
);

create table if not exists zones (
  id bigserial primary key,
  name varchar(120) not null unique,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  criticality varchar(40) not null default 'Media'
);

create table if not exists schedules (
  id bigserial primary key,
  zone_id bigint not null references zones(id),
  day varchar(120) not null,
  time varchar(80) not null,
  waste varchar(120) not null
);

create table if not exists trucks (
  id bigserial primary key,
  code varchar(20) not null unique,
  driver varchar(120) not null,
  status varchar(60) not null,
  zone_id bigint not null references zones(id),
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null
);

create table if not exists routes (
  id bigserial primary key,
  truck_id bigint not null references trucks(id),
  zone_id bigint not null references zones(id),
  progress integer not null check (progress between 0 and 100),
  eta varchar(40) not null,
  delay varchar(80) not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null
);

create table if not exists reports (
  id bigserial primary key,
  citizen varchar(120) not null,
  zone varchar(120) not null,
  type varchar(120) not null,
  detail text not null,
  status varchar(60) not null default 'Pendiente',
  created_at timestamp not null default now()
);

create table if not exists collections (
  id bigserial primary key,
  zone_id bigint not null references zones(id),
  truck_id bigint not null references trucks(id),
  kg integer not null,
  status varchar(60) not null,
  date date not null
);
