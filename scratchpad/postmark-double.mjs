/**
 * Local Postmark double — server at :3901
 *
 * Mimics Postmark's POST /email endpoint so verification/transactional emails
 * can be tested without spending real quota (100 sends/month on free tier).
 *
 * Every message is logged to stdout; no emails are actually sent.
 *
 * Run: node scratchpad/postmark-double.mjs
 * Then point POSTMARK_API_URL=http://localhost:3901 in .env.local
 */

import http from 'node:http'

const PORT = 3901

/**
 * Simple HTTP server that logs POST requests and returns a fake message id
 */
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Postmark-Server-Token')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/email') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      let message
      try {
        message = JSON.parse(body)
      } catch {
        res.writeHead(400)
        res.end(JSON.stringify({ message: 'Invalid JSON' }))
        return
      }

      const messageId = `DOUBLE-msg-${Date.now()}`
      console.log(`[postmark] email sent`)
      console.log(`  to: ${message.To}`)
      console.log(`  subject: ${message.Subject}`)
      console.log(`  message-id: ${messageId}\n`)

      res.writeHead(200)
      res.end(
        JSON.stringify({
          To: message.To,
          SubmittedAt: new Date().toISOString(),
          MessageID: messageId,
          ErrorCode: 0,
          Message: 'OK',
        }),
      )
    })
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ message: 'Not found' }))
  }
})

server.listen(PORT, () => {
  console.log(`\n  Postmark double listening on http://localhost:${PORT}`)
  console.log(`  POST /email — logs emails to stdout, returns mock message id\n`)
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
