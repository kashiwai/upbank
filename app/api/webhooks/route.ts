import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// Up Bank webhook signature verification
// https://developer.up.com.au/#webhooks
function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
    const { timingSafeEqual } = require('crypto')
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return expected === signature
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('X-Up-Authenticity-Signature') ?? ''
  const secret = process.env.WEBHOOK_SECRET_KEY ?? ''

  if (secret && !verifySignature(body, signature, secret)) {
    console.warn('Invalid webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('Up Bank webhook event:', JSON.stringify(event, null, 2))

  // In a stateless Vercel deployment, we just acknowledge the event.
  // The dashboard polls every 30 seconds to pick up new data.
  return NextResponse.json({ ok: true }, { status: 200 })
}
