# Local Test Doubles

These are standalone servers that mimic Postmark and Zoho so flows can be tested end-to-end without spending real credentials or polluting the client's CRM.

**Important:** `scratchpad/` is outside the git repository (repo root is `aeroos-frontend/`), so these files are not version-controlled and do not survive a clean checkout. Check they exist before relying on them.

## Setup

### Start the doubles

In one terminal:
```bash
node scratchpad/postmark-double.mjs
```

In another:
```bash
node scratchpad/zoho-double.mjs
```

### Update `.env.local`

Point the Zoho and Postmark endpoints at the local doubles:

```bash
# Replace these:
ZOHO_WEBHOOK_URL=https://www.zohoapis.com/...
ZOHO_PUBLIC_VIEW_URL=https://www.zohoapis.com/...
POSTMARK_API_URL=http://localhost:3901

# With these:
ZOHO_WEBHOOK_URL=http://localhost:3902/webhook
ZOHO_PUBLIC_VIEW_URL=http://localhost:3902/public-view
POSTMARK_API_URL=http://localhost:3901
```

### Restart the dev server

```bash
npm run dev
```

## What They Do

### `zoho-double.mjs` (port 3902)

**POST /webhook**
- Handles `flight_group.created`, `member.joined`, `interest_lead.created`
- Returns a Zoho envelope with result nested in `details.output` (as a JSON string)
- Every id returned is prefixed `DOUBLE-` so you can spot if a write escapes to the real CRM
- Logs each event to stdout

**POST /public-view**
- Takes `{ group_id: "..." }`
- Returns the public-safe view for the test group (`202609-MPI-SQL-PWTD6M`)
- Returns "not found" for any other group id
- This is what makes the `/share/[token]` page resolve instead of 404ing

### `postmark-double.mjs` (port 3901)

**POST /email**
- Accepts the Postmark email payload
- Logs to stdout (To, Subject, mock message id)
- Returns a fake response so the code thinks the email sent
- No real emails are sent; useful for verification flows in tests

## Key Points

1. **DOUBLE- prefix:** Every id is prefixed `DOUBLE-` so a live numeric id in logs means a write reached the real CRM. This is intentional — catch regressions early.

2. **Envelope wrapping:** Zoho wraps the function result inside `details.output` as a JSON string, not plain JSON at the top level. The doubles reproduce this exactly so code that forgets to unwrap fails locally instead of succeeding with wrong data.

3. **Test data:** The Zoho double returns a hardcoded public view for group `202609-MPI-SQL-PWTD6M` matching the test flight in Neon. Any other group id gets "not found".

4. **No validation:** The doubles accept any payload and return 200. They are not strict; they just return plausible shapes so the code can run.

## Failure Modes

**"Port already in use"**
```bash
lsof -i :3902
kill -9 <PID>
```

**"Address already in use"** on restart
- Node sometimes holds the port for a few seconds after exit
- Wait a moment and try again, or increase the delay in the error handler

**Share page still 404s**
- Make sure both `ZOHO_WEBHOOK_URL` and `ZOHO_PUBLIC_VIEW_URL` point at `http://localhost:3902`
- Make sure the doubles are running
- Restart the dev server after updating `.env.local`

**"Not found" for a different group id**
- The double only knows about `202609-MPI-SQL-PWTD6M` (the test flight in Neon)
- Create new test flights against the double and they'll 404 on the public page because the double doesn't know about them
- Extend `MOCK_PUBLIC_VIEW` in `zoho-double.mjs` if you need more test groups

## Cleanup

When you're done testing locally:
1. Delete these files (or leave them; they're outside the repo anyway)
2. Restore the live Zoho/Postmark URLs in `.env.local`
3. Restart the dev server
