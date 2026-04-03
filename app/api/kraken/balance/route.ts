import { NextResponse } from 'next/server'
import { getKrakenBalance } from '@/lib/kraken'

export async function GET() {
  try {
    const balance = await getKrakenBalance()
    return NextResponse.json({ data: balance })
  } catch (err) {
    console.error('Kraken balance error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kraken残高の取得に失敗しました' },
      { status: 500 }
    )
  }
}
