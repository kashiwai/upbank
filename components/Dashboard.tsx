'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { AccountCard } from './AccountCard'
import { TransactionList } from './TransactionList'
import { KrakenPanel } from './KrakenPanel'
import type { UpAccount, UpTransaction } from '@/lib/upbank'

const REFRESH_INTERVAL = 30 // seconds

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function Dashboard() {
  const [accounts, setAccounts] = useState<UpAccount[]>([])
  const [transactions, setTransactions] = useState<UpTransaction[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [error, setError] = useState<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadAccounts = useCallback(async () => {
    const data = await fetchJSON<{ data: UpAccount[] }>('/api/accounts')
    setAccounts(data.data)
  }, [])

  const loadTransactions = useCallback(
    async (accountId: string | null, replace = true) => {
      const url = new URL('/api/transactions', window.location.origin)
      url.searchParams.set('pageSize', '50')
      if (accountId) url.searchParams.set('accountId', accountId)

      const data = await fetchJSON<{
        data: UpTransaction[]
        links: { next: string | null }
      }>(url.toString())

      if (replace) {
        setTransactions(data.data)
      } else {
        setTransactions(prev => [...prev, ...data.data])
      }

      // Extract cursor from next link
      if (data.links.next) {
        const u = new URL(data.links.next)
        setNextCursor(u.searchParams.get('page[after]'))
      } else {
        setNextCursor(null)
      }
    },
    []
  )

  const refresh = useCallback(async () => {
    setError(null)
    try {
      await Promise.all([loadAccounts(), loadTransactions(selectedAccountId, true)])
      setLastUpdated(new Date())
      setCountdown(REFRESH_INTERVAL)
    } catch (e) {
      setError('データの取得に失敗しました')
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [loadAccounts, loadTransactions, selectedAccountId])

  // Initial load
  useEffect(() => {
    setIsLoading(true)
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when account filter changes
  useEffect(() => {
    setIsLoading(true)
    loadTransactions(selectedAccountId, true).finally(() => setIsLoading(false))
  }, [selectedAccountId, loadTransactions])

  // Auto-refresh countdown
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refresh()
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [refresh])

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const url = new URL('/api/transactions', window.location.origin)
      url.searchParams.set('pageSize', '50')
      url.searchParams.set('pageAfter', nextCursor)
      if (selectedAccountId) url.searchParams.set('accountId', selectedAccountId)

      const data = await fetchJSON<{
        data: UpTransaction[]
        links: { next: string | null }
      }>(url.toString())

      setTransactions(prev => [...prev, ...data.data])

      if (data.links.next) {
        const u = new URL(data.links.next)
        setNextCursor(u.searchParams.get('page[after]'))
      } else {
        setNextCursor(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleAccountClick = (id: string) => {
    setSelectedAccountId(prev => (prev === id ? null : id))
  }

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">UP</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">口座ダッシュボード</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isLoading}
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="tabular-nums">{countdown}s</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Last updated */}
        {lastUpdated && (
          <p className="text-xs text-gray-400 text-right">
            最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Account Cards */}
        {accounts.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              口座残高
              {selectedAccountId && (
                <button
                  onClick={() => setSelectedAccountId(null)}
                  className="ml-2 text-orange-500 normal-case font-normal"
                >
                  (全て表示)
                </button>
              )}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isSelected={selectedAccountId === account.id}
                  onClick={() => handleAccountClick(account.id)}
                />
              ))}
            </div>

            {/* Total */}
            {accounts.length > 1 && (
              <div className="mt-3 bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">合計残高</span>
                <span className="text-xl font-bold text-gray-900 tabular-nums">
                  AUD{' '}
                  {accounts
                    .reduce(
                      (sum, a) => sum + a.attributes.balance.valueInBaseUnits / 100,
                      0
                    )
                    .toLocaleString('en-AU', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
            )}
          </section>
        )}

        {/* Kraken */}
        <KrakenPanel />

        {/* Transactions */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            取引履歴
            {selectedAccountId && accounts.find(a => a.id === selectedAccountId) && (
              <span className="ml-1 font-normal normal-case text-gray-400">
                — {accounts.find(a => a.id === selectedAccountId)!.attributes.displayName}
              </span>
            )}
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <TransactionList
              transactions={transactions}
              isLoading={isLoading}
              hasMore={!!nextCursor}
              onLoadMore={handleLoadMore}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
