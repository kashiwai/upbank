'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

interface WebhookEvent {
  id: number
  created_at: string
  event_type: string
  transaction_id: string | null
}

interface Props {
  onExecute: () => void
  isExecuting: boolean
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  return createClient(url, key)
}

export function DepositNotification({ onExecute, isExecuting }: Props) {
  const [notification, setNotification] = useState<WebhookEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [lastSeenId, setLastSeenId] = useState<number>(0)

  const handleExecute = useCallback(() => {
    setDismissed(true)
    onExecute()
  }, [onExecute])

  useEffect(() => {
    const sb = getSupabaseClient()

    // Supabase Realtime で webhook_events テーブルを監視
    const channel = sb
      .channel('webhook-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webhook_events' },
        (payload) => {
          const event = payload.new as WebhookEvent
          if (event.id > lastSeenId) {
            setLastSeenId(event.id)
            setDismissed(false)
            setNotification(event)
          }
        }
      )
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [lastSeenId])

  if (!notification || dismissed) return null

  const isIncoming =
    notification.event_type === 'TRANSACTION_CREATED' ||
    notification.event_type === 'TRANSACTION_SETTLED'

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg animate-in slide-in-from-top-2 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-orange-400 to-orange-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl">🔔</span>
            <span className="font-bold text-sm">
              {isIncoming ? 'Up Bank に入金がありました！' : 'Up Bank 取引通知'}
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/70 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* 本文 */}
        <div className="px-4 py-4">
          <p className="text-sm text-gray-600 mb-1">
            イベント: <span className="font-medium text-gray-800">{notification.event_type}</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {new Date(notification.created_at).toLocaleString('ja-JP')}
          </p>

          {isIncoming && (
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">📱 次のステップ</p>
                <p>Up Bank アプリを開いて、KrakenのPayIDに送金してください。</p>
                <p className="text-xs mt-1 text-amber-600">送金完了後、下のボタンを押してください。</p>
              </div>

              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    実行中...
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Kraken送金完了 → 今すぐ USDT に変換して送金
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
