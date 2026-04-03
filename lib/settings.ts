export interface AppSettings {
  krakenWithdrawKey: string   // Krakenに登録した出金先の名前
  minAudThreshold: number     // 最低実行金額（AUD）
  autoEnabled: boolean        // 自動実行のON/OFF
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
  minAudThreshold: 10,
  autoEnabled: true,
}

const SETTINGS_KEY = 'upbank:settings'
const LOGS_KEY = 'upbank:logs'

// KVが設定されているか確認
function hasKV(): boolean {
  return !!process.env.KV_REST_API_URL
}

// フォールバック用インメモリストレージ（ローカル開発用）
const memory = {
  settings: { ...DEFAULT_SETTINGS } as AppSettings,
  logs: [] as ExecutionLog[],
}

export async function getSettings(): Promise<AppSettings> {
  if (!hasKV()) return memory.settings

  const { kv } = await import('@vercel/kv')
  const saved = await kv.get<AppSettings>(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...saved }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const updated = { ...current, ...patch }

  if (!hasKV()) {
    memory.settings = updated
    return updated
  }

  const { kv } = await import('@vercel/kv')
  await kv.set(SETTINGS_KEY, updated)
  return updated
}

export async function addExecutionLog(log: Omit<ExecutionLog, 'id'>): Promise<void> {
  const entry: ExecutionLog = {
    id: Date.now().toString(),
    ...log,
  }

  if (!hasKV()) {
    memory.logs.unshift(entry)
    if (memory.logs.length > 50) memory.logs = memory.logs.slice(0, 50)
    return
  }

  const { kv } = await import('@vercel/kv')
  const existing = (await kv.get<ExecutionLog[]>(LOGS_KEY)) ?? []
  const updated = [entry, ...existing].slice(0, 50) // 最大50件
  await kv.set(LOGS_KEY, updated)
}

export async function getExecutionLogs(): Promise<ExecutionLog[]> {
  if (!hasKV()) return memory.logs

  const { kv } = await import('@vercel/kv')
  return (await kv.get<ExecutionLog[]>(LOGS_KEY)) ?? []
}
