import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, setSessionCookie, clearSessionCookie } from '@/lib/auth'
import { timingSafeEqual } from 'crypto'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // timing-safe compare
  const match = (() => {
    try {
      const a = Buffer.from(password || '')
      const b = Buffer.from(expected)
      if (a.length !== b.length) {
        // still do a comparison to prevent timing attacks
        timingSafeEqual(Buffer.alloc(b.length), b)
        return false
      }
      return timingSafeEqual(a, b)
    } catch {
      return false
    }
  })()

  if (!match) {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 })
  }

  const token = await createSessionToken()
  await setSessionCookie(token)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
