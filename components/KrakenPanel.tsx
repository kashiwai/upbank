'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AppSettings, ExecutionLog } from '@/lib/settings'

function isValidTronAddress(addr: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)
}

interface KrakenBalance {
  AUD: number
  USDT: number
}

interface SettingsData {
  settings: AppSettings
  logs: ExecutionLog[]
  addresses: Array<{ key: string; address: string }>
}

function StatusBadge({ status }: { status: ExecutionLog['status'] }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-600',
  }
  const labels = { success: '成功', error: 'エラー', skipped: 'スキップ' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function KrakenPanel() {
  const [balance, setBalance] = useState<KrakenBalance | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [executeResult, setExecuteResult] = useState<{ status: string; message: string } | null>(null)
  const [form, setForm] = useState<AppSettings>({
    krakenWithdrawKey: '',
    tronAddress: '',
    minAudThreshold: 10,
    autoEnabled: true,
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const loadBalance = useCallback(async () => {
    setIsLoadingBalance(true)
    setBalanceError(null)
    try {
      const res = await fetch('/api/kraken/balance')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBalance(data.data)
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : '残高取得エラー')
    } finally {
      setIsLoadingBalance(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettingsData(data)
      setForm(data.settings)
    } catch (err) {
      console.error('設定取得エラー:', err)
    }
  }, [])

  useEffect(() => {
    loadBalance()
    loadSettings()
  }, [loadBalance, loadSettings])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setSettingsData(prev => prev ? { ...prev, settings: data.settings } : null)
      setForm(data.settings)
      setIsSettingsOpen(false)
    } catch (err) {
      console.error('設定保存エラー:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExecute = async () => {
    setIsExecuting(true)
    setExecuteResult(null)
    try {
      const res = await fetch('/api/kraken/execute', { method: 'POST' })
      const data = await res.json()
      setExecuteResult(data)
      // ログと残高を更新
      await Promise.all([loadBalance(), loadSettings()])
    } catch {
      setExecuteResult({ status: 'error', message: 'ネットワークエラー' })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Kraken 自動送金
        </h2>
        <button
          onClick={() => setIsSettingsOpen(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          設定
        </button>
      </div>

      {/* Kraken 残高カード */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <span className="font-semibold text-gray-800">Kraken 残高</span>
          </div>
          <button onClick={loadBalance} disabled={isLoadingBalance}
            className="text-xs text-gray-400 hover:text-gray-600">
            {isLoadingBalance ? '更新中...' : '更新'}
          </button>
        </div>

        {balanceError ? (
          <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-600">
            {balanceError}
            <p className="text-xs mt-1 text-red-400">KRAKEN_API_KEY / KRAKEN_API_SECRET を確認してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">AUD 残高</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                {balance ? `$${balance.AUD.toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-500 mb-1">USDT 残高</p>
              <p className="text-xl font-bold text-purple-800 tabular-nums">
                {balance ? balance.USDT.toFixed(2) : '—'}
              </p>
            </div>
          </div>
        )}

        {/* 自動実行スケジュール表示 */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          自動実行: 毎日 12:30 / 17:30 (JST)
          {settingsData && !settingsData.settings.autoEnabled && (
            <span className="text-amber-500 font-medium">（無効中）</span>
          )}
        </div>

        {/* 今すぐ実行ボタン */}
        <button
          onClick={handleExecute}
          disabled={isExecuting}
          className="mt-4 w-full py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isExecuting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              実行中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              今すぐ USDT に変換して送金
            </>
          )}
        </button>

        {/* 実行結果 */}
        {executeResult && (
          <div className={`mt-3 px-4 py-3 rounded-xl text-sm ${
            executeResult.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
            executeResult.status === 'skipped' ? 'bg-amber-50 text-amber-700' :
            'bg-red-50 text-red-700'
          }`}>
            {executeResult.message}
          </div>
        )}
      </div>

      {/* 設定パネル */}
      {isSettingsOpen && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Kraken 送金設定</h3>

          {/* TRC-20バッジ */}
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <span className="text-lg">🔴</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Tron (TRC-20) 専用</p>
              <p className="text-xs text-red-500">出金はすべて Tron ネットワーク (TRC-20) で行われます</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              送金先 Tron (TRC-20) アドレス
            </label>
            <input
              type="text"
              value={form.tronAddress}
              onChange={e => setForm(f => ({ ...f, tronAddress: e.target.value.trim() }))}
              placeholder="T から始まる 34 文字のアドレス"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                form.tronAddress && !isValidTronAddress(form.tronAddress)
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : form.tronAddress && isValidTronAddress(form.tronAddress)
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-gray-200'
              }`}
            />
            {form.tronAddress && !isValidTronAddress(form.tronAddress) && (
              <p className="text-xs text-red-500 mt-1">⚠️ 無効なTronアドレスです（Tで始まる34文字）</p>
            )}
            {form.tronAddress && isValidTronAddress(form.tronAddress) && (
              <p className="text-xs text-emerald-600 mt-1">✓ 有効なTronアドレスです</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kraken 出金先キー名（TRC-20で登録済みのもの）
            </label>
            <input
              type="text"
              value={form.krakenWithdrawKey}
              onChange={e => setForm(f => ({ ...f, krakenWithdrawKey: e.target.value }))}
              placeholder="例: my-tron-wallet"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            {settingsData?.addresses && settingsData.addresses.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">Krakenに登録済みのTRC-20アドレス:</p>
                {settingsData.addresses.map(a => (
                  <button
                    key={a.key}
                    onClick={() => setForm(f => ({ ...f, krakenWithdrawKey: a.key, tronAddress: a.address }))}
                    className="text-xs text-purple-600 hover:underline mr-3"
                  >
                    {a.key} ({a.address.slice(0, 6)}...{a.address.slice(-4)})
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              Kraken → 出金 → アドレス管理 → 新規追加 でネットワーク「Tron (TRC-20)」を選択して登録
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              最低実行金額（AUD）
            </label>
            <input
              type="number"
              value={form.minAudThreshold}
              onChange={e => setForm(f => ({ ...f, minAudThreshold: parseFloat(e.target.value) || 0 }))}
              min="1"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">これ以上のAUDが Kraken にある場合のみ実行</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">自動実行</p>
              <p className="text-xs text-gray-400">毎日12:30 / 17:30 (JST) に自動実行</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, autoEnabled: !f.autoEnabled }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.autoEnabled ? 'bg-purple-500' : 'bg-gray-200'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.autoEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving || (!!form.tronAddress && !isValidTronAddress(form.tronAddress))}
            className="w-full py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      )}

      {/* 実行ログ */}
      {settingsData?.logs && settingsData.logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">実行ログ</p>
          </div>
          <div className="divide-y divide-gray-50">
            {settingsData.logs.slice(0, 10).map(log => (
              <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                <StatusBadge status={log.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{log.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
