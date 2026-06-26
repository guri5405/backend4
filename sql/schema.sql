create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('user', 'agent', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('open', 'in_progress', 'resolved');
  end if;
end$$;

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          user_role not null default 'user',
  created_at    timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);

create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  agent_id    uuid references users(id) on delete set null,
  subject     text not null,
  status      ticket_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tickets_user_id on tickets(user_id);
create index if not exists idx_tickets_agent_id on tickets(agent_id);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_created_at on tickets(created_at desc);


create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tickets_updated_at on tickets;
create trigger trg_tickets_updated_at
  before update on tickets
  for each row
  execute function set_updated_at();

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  sender_id   uuid not null references users(id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_messages_ticket_id on messages(ticket_id);
create index if not exists idx_messages_created_at on messages(created_at);
