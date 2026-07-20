# Vendor sign-up, brochures, AI chatbot & Zoho integration

Companies register, add contact + email info and brochures; admins organize and
approve them; an AI chatbot helps; and outreach goes out through **Zoho Mail** /
**Zoho Meeting**. Everything degrades gracefully — the UI works even before
Supabase or Zoho credentials are added (writes return a draft / synthetic ref).

## Pages
- `/vendor-signup` — company registration (3 steps: company → what you provide →
  brochures). Bilingual EN/ES. Floating AI chat assistant (vendor mode).
- `/admin/vendors` — admin directory. Access-code gate (`PRIVATE_ACCESS_CODE`,
  default `4444`). Filter by status, search, view brochures, approve/pause/reject,
  and send a Zoho email or schedule a Zoho meeting per company.

## API
| Route | Method | Purpose |
|---|---|---|
| `/api/vendors/signup` | POST | Create a `vendor_profiles` row; drafts a welcome email via Zoho |
| `/api/vendors/brochures` | POST (multipart) / GET | Upload to the `vendor-brochures` bucket; list a vendor's files |
| `/api/vendors/manage` | GET / PATCH | Admin: list + filter companies; update status/notes (admin-gated) |
| `/api/zoho/status` | GET | Whether Zoho mail/meeting are connected (drives UI) |
| `/api/zoho/email` | POST | Send (or draft) an email via Zoho Mail; logs to `zoho_outbox` (admin-gated) |
| `/api/zoho/meeting` | POST | Schedule (or propose) a Zoho Meeting; optional email invite (admin-gated) |
| `/api/chat` | POST | NXT//LINK AI assistant (uses the LLM router; deterministic fallback) |

## Database
Migration `supabase/migrations/20260629_vendor_signup_zoho.sql` adds:
- `vendor_profiles`, `vendor_brochures`, `zoho_connections`, `zoho_outbox`
- Storage bucket `vendor-brochures` (private)
- Extends `ai_draft_logs.ai_mode` to include `chatbot`

Apply it with your normal Supabase migration flow (`supabase db push`, the SQL
editor, or the Supabase MCP `apply_migration`).

## Activating Zoho (env)
Add these to `.env.local` (see `.env.example`). Create an OAuth app at
https://api-console.zoho.com with scopes `ZohoMail.messages.CREATE` and
`ZohoMeeting.meeting.CREATE`, then generate a refresh token.

```
ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
ZOHO_ACCOUNTS_DOMAIN (default https://accounts.zoho.com)
ZOHO_API_DOMAIN      (default https://www.zohoapis.com)
ZOHO_MAIL_ACCOUNT_ID, ZOHO_FROM_ADDRESS     # Zoho Mail send
ZOHO_MEETING_ZSOID                          # Zoho Meeting org id
```

Until these are set, email actions are saved as **drafts** and meetings as
**proposed slots**, so a human can finish them manually — nothing breaks.

## AI chatbot
Uses `aiDraft()` (LLM router with `GEMINI_API_KEY` etc.). With no LLM key it
returns a useful deterministic reply that still guides signup / search.
