import { getSupabase } from './supabase'

export interface AppSettings {
  krakenWithdrawKey: string   // Krakenに登録したTRC-20出金先キー名
  tronAddress: string         // 実際のTronウォレットアドレス（T...）
  minAudThreshold: number
  autoEnabled: boolean
}

export interface ExecutionLog {
  id: string
  timestamp: string
  status: 'success' | 'error' | 'skipped'
  message: string
  audAmount?: number
  usdtWithdrawn?: number
  krakenTxid?: string
  withdrawRefid?: string
}

const DEFAULT_SETTINGS: AppSettings = {
  krakenWithdrawKey: '',
  tronAddress: '',
  minAudThreshold: 10,
  autoEnabled: true,
}

export async function getSettings(): Promise<AppSettings> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error || !data) return DEFAULT_SETTINGS
  return {
    krakenWithdrawKey: data.kraken_withdraw_key ?? '',
    tronAddress: data.tron_address ?? '',
    minAudThreshold: data.min_aud_threshold ?? 10,
    autoEnabled: data.auto_enabled ?? true,
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('app_settings')
    .upsert({
      id: 1,
      kraken_withdraw_key: patch.krakenWithdrawKey,
      tron_address: patch.tronAddress,
      min_aud_threshold: patch.minAudThreshold,
      auto_enabled: patch.autoEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error || !data) throw new Error('設定の保存に失敗しました')
  return {
    krakenWithdrawKey: data.kraken_withdraw_key,
    tronAddress: data.tron_address,
    minAudThreshold: data.min_aud_threshold,
    autoEnabled: data.auto_enabled,
  }
}

export async function addExecutionLog(log: Omit<ExecutionLog, 'id'>): Promise<void> {
  const sb = getSupabase()
  await sb.from('execution_logs').insert({
    status: log.status,
    message: log.message,
    aud_amount: log.audAmount ?? null,
    usdt_withdrawn: log.usdtWithdrawn ?? null,
    kraken_txid: log.krakenTxid ?? null,
    withdraw_refid: log.withdrawRefid ?? null,
  })
}

export async function getExecutionLogs(): Promise<ExecutionLog[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('execution_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data.map(row => ({
    id: String(row.id),
    timestamp: row.created_at,
    status: row.status,
    message: row.message,
    audAmount: row.aud_amount ?? undefined,
    usdtWithdrawn: row.usdt_withdrawn ?? undefined,
    krakenTxid: row.kraken_txid ?? undefined,
    withdrawRefid: row.withdraw_refid ?? undefined,
  }))
}
