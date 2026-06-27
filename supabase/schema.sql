-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enums
create type user_role as enum ('coach', 'client');
create type muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'forearms', 'core', 'quads', 'hamstrings', 'glutes',
  'calves', 'full_body', 'cardio', 'other'
);

-- ============================================================
-- TABLES (all tables first, policies after)
-- ============================================================

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'client',
  coach_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  muscle_groups muscle_group[] not null default '{}',
  youtube_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table program_workouts (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  day_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references program_workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  sets integer not null default 3,
  reps text not null default '10',
  weight_kg numeric(6,2),
  rest_seconds integer not null default 60,
  order_index integer not null default 0,
  superset_group text,
  notes text
);

create table client_programs (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  start_date date not null default current_date,
  is_active boolean not null default true,
  assigned_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table workout_logs (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  workout_id uuid not null references program_workouts(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

create table set_logs (
  id uuid primary key default uuid_generate_v4(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_number integer not null,
  reps_completed integer,
  weight_kg numeric(6,2),
  notes text,
  is_pr boolean not null default false,
  logged_at timestamptz not null default now()
);

create table personal_records (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  weight_kg numeric(6,2) not null,
  reps integer not null,
  set_log_id uuid not null references set_logs(id) on delete cascade,
  achieved_at timestamptz not null default now(),
  unique(client_id, exercise_id)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at();
create trigger update_exercises_updated_at before update on exercises
  for each row execute procedure update_updated_at();
create trigger update_programs_updated_at before update on programs
  for each row execute procedure update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table exercises enable row level security;
alter table programs enable row level security;
alter table program_workouts enable row level security;
alter table workout_exercises enable row level security;
alter table client_programs enable row level security;
alter table workout_logs enable row level security;
alter table set_logs enable row level security;
alter table personal_records enable row level security;

-- profiles
create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = id);

create policy "Coaches can view their clients" on profiles
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'coach'
    ) and coach_id = auth.uid()
  );

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

create policy "Coaches can update their clients" on profiles
  for update using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'coach'
    ) and coach_id = auth.uid()
  );

create policy "Anyone can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- exercises
create policy "Coaches can manage their exercises" on exercises
  for all using (coach_id = auth.uid());

create policy "Clients can view exercises from their coach" on exercises
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.coach_id = exercises.coach_id
    )
  );

-- programs
create policy "Coaches can manage their programs" on programs
  for all using (coach_id = auth.uid());

create policy "Clients can view assigned programs" on programs
  for select using (
    exists (
      select 1 from client_programs cp
      where cp.program_id = programs.id and cp.client_id = auth.uid()
    )
  );

-- program_workouts
create policy "Coaches can manage workouts in their programs" on program_workouts
  for all using (
    exists (
      select 1 from programs p
      where p.id = program_workouts.program_id and p.coach_id = auth.uid()
    )
  );

create policy "Clients can view workouts in assigned programs" on program_workouts
  for select using (
    exists (
      select 1 from programs p
      join client_programs cp on cp.program_id = p.id
      where p.id = program_workouts.program_id and cp.client_id = auth.uid()
    )
  );

-- workout_exercises
create policy "Coaches can manage workout exercises" on workout_exercises
  for all using (
    exists (
      select 1 from program_workouts pw
      join programs p on p.id = pw.program_id
      where pw.id = workout_exercises.workout_id and p.coach_id = auth.uid()
    )
  );

create policy "Clients can view workout exercises" on workout_exercises
  for select using (
    exists (
      select 1 from program_workouts pw
      join programs p on p.id = pw.program_id
      join client_programs cp on cp.program_id = p.id
      where pw.id = workout_exercises.workout_id and cp.client_id = auth.uid()
    )
  );

-- client_programs
create policy "Coaches can manage client program assignments" on client_programs
  for all using (assigned_by = auth.uid());

create policy "Clients can view their own assignments" on client_programs
  for select using (client_id = auth.uid());

-- workout_logs
create policy "Clients can manage their own workout logs" on workout_logs
  for all using (client_id = auth.uid());

create policy "Coaches can view their clients workout logs" on workout_logs
  for select using (
    exists (
      select 1 from profiles p
      where p.id = workout_logs.client_id and p.coach_id = auth.uid()
    )
  );

-- set_logs
create policy "Clients can manage their own set logs" on set_logs
  for all using (
    exists (
      select 1 from workout_logs wl
      where wl.id = set_logs.workout_log_id and wl.client_id = auth.uid()
    )
  );

create policy "Coaches can view their clients set logs" on set_logs
  for select using (
    exists (
      select 1 from workout_logs wl
      join profiles p on p.id = wl.client_id
      where wl.id = set_logs.workout_log_id and p.coach_id = auth.uid()
    )
  );

-- personal_records
create policy "Clients can view their own PRs" on personal_records
  for select using (client_id = auth.uid());

create policy "Coaches can view their clients PRs" on personal_records
  for select using (
    exists (
      select 1 from profiles p
      where p.id = personal_records.client_id and p.coach_id = auth.uid()
    )
  );

create policy "System can insert PRs" on personal_records
  for insert with check (client_id = auth.uid());

create policy "System can update PRs" on personal_records
  for update using (client_id = auth.uid());
