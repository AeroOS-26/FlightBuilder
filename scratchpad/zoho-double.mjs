/**
 * Local Zoho double — server at :3902
 *
 * Mimics Zoho's envelope and behavior for the two endpoints:
 *   POST /webhook  — flight_group.created, member.joined, interest_lead.created
 *   POST /public-view  — (group_id) -> public-safe flight view
 *
 * Every record id returned is prefixed DOUBLE-, so a long numeric id in logs
 * proves a write escaped to the real CRM. This is intentional and the point.
 *
 * Run: node scratchpad/zoho-double.mjs
 * Then point ZOHO_WEBHOOK_URL and ZOHO_PUBLIC_VIEW_URL at http://localhost:3902/webhook
 * and http://localhost:3902/public-view respectively.
 */

import http from 'node:http'
import url from 'node:url'

const PORT = 3902
const ZOHO_FUNCTION_ID = 'fn-12345-constant'  // Same on every call, by design

/**
 * Mock flight group — what resolvePublicFlight gets back when reading
 * the test group's public view. This must match our test flight's actual data
 * in Neon (202609-MPI-SQL-PWTD6M, 6 spaces, forming).
 */
const MOCK_PUBLIC_VIEW = {
  group_id: '202609-MPI-SQL-PWTD6M',
  group_state_public: 'forming',
  route_origin_city: 'Mamitupu',
  route_destination_city: 'San Carlos',
  estimated_date_range: {
    earliest_date: '2026-09-17',
    latest_date: '2026-09-20',
  },
  aircraft_category: null,
  pet_friendly: true,
  spaces_total: 6,
  spaces_remaining: 4,  // 2 members already joined
  fellow_pet_info: {
    pets_total: 0,
    by_species: {},
  },
}

/**
 * Wrap a result in the Zoho envelope format.
 * The real result is a JSON string inside details.output.
 */
function zohoEnvelope(result) {
  return {
    code: 'success',
    details: {
      id: ZOHO_FUNCTION_ID,
      output: JSON.stringify(result),
    },
  }
}

/**
 * Handle POST /webhook — flight_group.created, member.joined, interest_lead.created
 */
function handleWebhook(req, res) {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
    let event
    try {
      event = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'Invalid JSON' }))
      return
    }

    const eventType = event.event
    console.log(`[webhook] ${eventType} from ${event.source}`)

    let result
    if (eventType === 'flight_group.created') {
      result = {
        success: true,
        event: 'flight_group.created',
        flight_group_id: `DOUBLE-fg-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        group_id: event.flight_group.group_id,
      }
      console.log(`  → created flight group ${result.flight_group_id}`)
    } else if (eventType === 'member.joined') {
      result = {
        success: true,
        event: 'member.joined',
        group_id: event.group_id,
        members_total: 3,  // mock
      }
      console.log(`  → member joined group ${event.group_id}`)
    } else if (eventType === 'interest_lead.created') {
      result = {
        success: true,
        event: 'interest_lead.created',
        lead_id: `DOUBLE-lead-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        group_id: event.group_id,
      }
      console.log(`  → created interest lead ${result.lead_id}`)
    } else {
      result = { success: false, message: `Unknown event: ${eventType}` }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(zohoEnvelope(result)))
  })
}

/**
 * Handle POST /public-view — read the public-safe flight view for a group_id
 */
function handlePublicView(req, res) {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
    let payload
    try {
      payload = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'Invalid JSON' }))
      return
    }

    const groupId = payload.group_id
    console.log(`[public-view] fetch for ${groupId}`)

    // Only return data for our test group; anything else is not found
    if (groupId === '202609-MPI-SQL-PWTD6M') {
      const result = {
        public_view: MOCK_PUBLIC_VIEW,
        zoho_flight_group_record_id: 'DOUBLE-fg-2',
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(zohoEnvelope(result)))
      console.log(`  → served public view for ${groupId}`)
    } else {
      const result = {
        success: false,
        message: `Flight Group not found: ${groupId}`,
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(zohoEnvelope(result)))
      console.log(`  → not found: ${groupId}`)
    }
  })
}

/**
 * Simple HTTP server that routes based on the path
 */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST') {
    if (req.url === '/webhook') {
      handleWebhook(req, res)
    } else if (req.url === '/public-view') {
      handlePublicView(req, res)
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'Not found' }))
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Method not allowed' }))
  }
})

server.listen(PORT, () => {
  console.log(`\n  Zoho double listening on http://localhost:${PORT}`)
  console.log(`  POST /webhook — handles flight_group.created, member.joined, interest_lead.created`)
  console.log(`  POST /public-view — returns public-safe view for group_id\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} already in use. Kill the previous process:`)
    console.error(`  lsof -i :${PORT}`)
    console.error(`  kill -9 <PID>\n`)
  } else {
    console.error(`\n  Server error: ${err.message}\n`)
  }
  process.exit(1)
})
