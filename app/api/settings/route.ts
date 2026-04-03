import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings, getExecutionLogs } from '@/lib/settings'
import { getWithdrawAddresses } from '@/lib/kraken'

export async function GET() {
  const [settings, logs, addresses] = await Promise.all([
    getSettings(),
    getExecutionLogs(),
    getWithdrawAddresses().catch(() => []),
  ])
  return NextResponse.json({ settings, logs, addresses })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const updated = await saveSettings(body)
  return NextResponse.json({ settings: updated })
}
