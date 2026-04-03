import { NextResponse } from 'next/server'
import { getAccounts } from '@/lib/upbank'

export async function GET() {
  try {
    const data = await getAccounts()
    return NextResponse.json(data)
  } catch (err) {
    console.error('accounts error:', err)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
