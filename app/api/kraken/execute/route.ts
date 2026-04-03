import { NextResponse } from 'next/server'
import { executeKrakenTransfer } from '@/lib/execute'

export async function POST() {
  try {
    const result = await executeKrakenTransfer()
    const statusCode = result.status === 'error' ? 500 : 200
    return NextResponse.json(result, { status: statusCode })
  } catch (err) {
    console.error('Kraken execute error:', err)
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : '実行に失敗しました' },
      { status: 500 }
    )
  }
}
