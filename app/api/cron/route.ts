import { NextRequest, NextResponse } from 'next/server'
import { executeKrakenTransfer } from '@/lib/execute'
import { getSettings } from '@/lib/settings'

export async function GET(req: NextRequest) {
  // Vercel Cronからの呼び出しを検証
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getSettings()
  if (!settings.autoEnabled) {
    console.log('[Cron] 自動実行は無効です。スキップ。')
    return NextResponse.json({ status: 'skipped', message: '自動実行が無効です' })
  }

  console.log('[Cron] 自動実行開始 -', new Date().toISOString())
  const result = await executeKrakenTransfer()
  console.log('[Cron] 実行結果:', result)

  return NextResponse.json(result)
}
