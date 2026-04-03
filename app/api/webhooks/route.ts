import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabase } from '@/lib/supabase'

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
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

  const eventType = (event?.data as Record<string, unknown>)?.type as string
  console.log('Up Bank webhook:', eventType)

  // PING以外のトランザクションイベントをSupabaseに保存 → Realtimeで全クライアントに通知
  if (eventType && eventType !== 'PING') {
    try {
      const data = event.data as Record<string, unknown>
      const relationships = data?.relationships as Record<string, unknown>
      const transactionId = (relationships?.transaction as Record<string, unknown>)?.data
        ? ((relationships.transaction as Record<string, unknown>).data as Record<string, unknown>)?.id as string
        : null

      const sb = getSupabase()
      await sb.from('webhook_events').insert({
        event_type: eventType,
        transaction_id: transactionId ?? null,
      })
    } catch (err) {
      console.error('Supabase insert error:', err)
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
