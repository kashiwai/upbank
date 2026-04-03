import { NextRequest, NextResponse } from 'next/server'
import { getTransactions } from '@/lib/upbank'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const accountId = searchParams.get('accountId') ?? undefined
  const pageAfter = searchParams.get('pageAfter') ?? undefined
  const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10)

  try {
    const data = await getTransactions({ accountId, pageAfter, pageSize })
    return NextResponse.json(data)
  } catch (err) {
    console.error('transactions error:', err)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
