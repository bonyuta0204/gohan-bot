create table ai_conversation_history (
  id bigint generated always as identity primary key,
  message_text text not null,
  ai_response text not null,
  response_id text not null,
  conversation_id text,
  created_at timestamptz not null default now()
);

create index on ai_conversation_history (conversation_id);