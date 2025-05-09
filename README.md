# gohan-bot

**Dinner-Assistant Slack Bot** powered by Supabase Edge Functions (Deno) and OpenAI.

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Setup & Development](#setup--development)
5. [Local Testing](#local-testing)
6. [Deployment](#deployment)
7. [Database Schema](#database-schema)
8. [Usage](#usage)
9. [Future Improvements](#future-improvements)
10. [License](#license)

## Overview
`gohan-bot` is a Slack app that helps users manage fridge items and log meals. It uses:
- **Supabase Edge Functions** (single-file Deno workers)
- **OpenAI** LLM with function-calling for precise operations
- **EdgeRuntime.waitUntil** for non-blocking acknowledgments

## Architecture

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant S as Slack
  participant F as EdgeFn (slack_mentions)
  participant AI as OpenAI LLM
  participant DB as Supabase

  U->>S: @gohan What can I cook?
  S->>F: HTTP event
  F--)S: 200 OK (ACK ≤200ms)
  F->>AI: chat + functions schema
  AI-->>F: function_call(JSON)
  F->>DB: SQL (insert/select)
  F->>AI: context + function result
  AI-->>F: final menu text
  F->>S: chat.postMessage
```

## Prerequisites
- Supabase CLI (`supabase`) installed
- Deno (v1.40+) installed
- A Supabase project with:
  - Edge Functions enabled
- A Slack App with scopes: `chat:write`, `app_mentions:read`
- OpenAI API key (`OPENAI_API_KEY`)

## Setup & Development

1. Clone the repo:
   ```bash
   git clone https://github.com/bonyuta0204/gohan-bot.git
   cd gohan-bot
   ```
2. Initialize Supabase (if not already):
   ```bash
   supabase init
   ```
3. Set environment variables (locally in `.env` or via Supabase secrets):
   ```bash
   supabase secrets set \
     SLACK_TOKEN=<bot_token> \
     OPENAI_API_KEY=<openai_api_key>
   ```
4. Open in VS Code (with Deno extension) for IntelliSense.

## Local Testing

1. Start local Supabase emulator:
   ```bash
   supabase start
   ```
2. Serve functions:
   ```bash
   supabase functions serve slack_mentions handle_message
   ```
3. Test via `curl`:
   ```bash
   # Test handle_message (recommended for local testing, bypasses Slack)
   curl http://127.0.0.1:54321/functions/v1/handle_message \
     -H "Content-Type: application/json" \
     --data '{"userMessage":"Add milk to fridge"}'
   # Sample request body for handle_message:
   # {
   #   "userMessage": "Add milk to fridge",
   #   "userSlackId": "U12345678"  # optional, for user-specific operations
   # }
   ```
   > **Tip:** Using `handle_message` directly is the easiest way to test logic locally, as it does not require Slack integration or signature verification.
4. (Optional) Expose to Slack with `ngrok`:
   ```bash
   ngrok http 54321
   ```
   Update your Slack App Request URL to `https://<ngrok_id>.ngrok.io/slack_mentions`.

## Deployment

1. Ensure secrets are set in your Supabase project.
2. Deploy functions:
   ```bash
   supabase functions deploy slack_mentions
   supabase functions deploy handle_message
   ```
3. Invite the bot to your Slack channel and mention it to start.

## Database Migrations

We use Supabase migrations for schema management. To create and apply migrations:

1. Create a new migration file:
   ```bash
   supabase migration new <migration_name>
   ```
2. Edit the generated SQL file in `supabase/migrations/` as needed.
3. Apply migrations locally:
   ```bash
   supabase migration up
   ```
4. To push migrations to your remote Supabase project:
   ```bash
   supabase db push
   ```

See the [Supabase migration docs](https://supabase.com/docs/guides/deployment/database-migrations) for more details and best practices.

## Database Schema

Tables:
- `fridge_items(user_slack_id, item_name, added_at)`
- `meal_logs(user_slack_id, meal_name, eaten_at)`

## Usage
- `add_fridge_item` to store new items
- `record_meal` to log meals
- `fetch_recent_items` to view the latest items

## Future Improvements
- Retry and error-handling strategies
- Item quantities and expiration dates
- User-specific preferences and settings

## License
MIT 2025 bonyuta0204
