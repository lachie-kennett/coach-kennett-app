-- Tracks when a user last opened the app. Needed because sessions are
-- long-lived, so auth.users.last_sign_in_at rarely updates and can't be used
-- as a "last seen" signal.
alter table profiles add column if not exists last_active_at timestamptz;
