-- Supabase Database Schema for Gemini Clone
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. CONVERSATIONS TABLE
-- ============================================
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  model text default 'gemini-2.5-flash',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists conversations_user_id_idx on conversations(user_id);
create index if not exists conversations_created_at_idx on conversations(created_at desc);

-- Enable RLS
alter table conversations enable row level security;

-- RLS Policies for conversations
create policy "Users can view own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

-- Function to update timestamps
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on conversations
  for each row execute procedure moddatetime (updated_at);

-- ============================================
-- 3. MESSAGES TABLE
-- ============================================
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text check (role in ('user', 'model', 'error')) not null,
  content jsonb not null, -- stores parts array
  sources jsonb, -- stores grounding sources
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists messages_created_at_idx on messages(created_at);

-- Enable RLS
alter table messages enable row level security;

-- RLS Policies for messages
create policy "Users can view messages from own conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can insert messages to own conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. ATTACHMENTS TABLE
-- ============================================
create table if not exists attachments (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references messages(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size integer,
  created_at timestamp with time zone default now()
);

-- Index for performance
create index if not exists attachments_message_id_idx on attachments(message_id);

-- Enable RLS
alter table attachments enable row level security;

-- RLS Policies for attachments
create policy "Users can view attachments from own messages"
  on attachments for select
  using (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = attachments.message_id
      and c.user_id = auth.uid()
    )
  );

create policy "Users can insert attachments to own messages"
  on attachments for insert
  with check (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = attachments.message_id
      and c.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. STORAGE BUCKETS
-- ============================================

-- Create buckets (run this in Storage section or via SQL)
insert into storage.buckets (id, name, public)
values ('conversation-exports', 'conversation-exports', false),
       ('user-uploads', 'user-uploads', false)
on conflict (id) do nothing;

-- Storage RLS Policies for conversation-exports
create policy "Users can upload their own exports"
  on storage.objects for insert
  with check (
    bucket_id = 'conversation-exports' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own exports"
  on storage.objects for select
  using (
    bucket_id = 'conversation-exports' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own exports"
  on storage.objects for delete
  using (
    bucket_id = 'conversation-exports' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS Policies for user-uploads
create policy "Users can upload their own files"
  on storage.objects for insert
  with check (
    bucket_id = 'user-uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own uploads"
  on storage.objects for select
  using (
    bucket_id = 'user-uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'user-uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 6. ENABLE REALTIME (for live updates)
-- ============================================

-- Enable Realtime for conversations table
alter publication supabase_realtime add table conversations;

-- Enable Realtime for messages table
alter publication supabase_realtime add table messages;

-- ============================================
-- DONE! 
-- ============================================
-- Next steps:
-- 1. Go to Database > Replication in Supabase Dashboard
-- 2. Enable replication for 'conversations' and 'messages'
-- 3. Test the schema by signing up a user and creating a conversation
