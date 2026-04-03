'use client'

import { useState, useEffect, useCallback } from 'react'

interface UpWebhook {
  id: string
  attributes: {
    url: string
    description: string | null
    secretKey: string | null
    createdAt: string
  }
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<UpWebhook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 現在のデプロイURL（Vercelの場合はwindow.location.origin）
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks`
    : ''

  const loadWebhooks = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/webhooks/register')
      const data = await res.json()
      setWebhooks(data.data ?? [])
    } catch {
      setWebhooks([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  const isAlreadyRegistered = webhooks.some(w => w.attributes.url === webhookUrl)

  const handleRegister = async () => {
    setIsRegistering(true)
    setMessage(null)
    try {
      const res = await fetch('/api/webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, description: 'Dashboard realtime notification' }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Webhook を登録しました！入金時にリアルタイム通知が届きます。' })
        await loadWebhooks()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: `登録失敗: ${JSON.stringify(data)}` })
      }
    } catch {
      setMessage({ type: 'error', text: 'ネットワークエラー' })
    } finally {
      setIsRegistering(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/webhooks/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setMessage({ type: 'success', text: 'Webhook を削除しました' })
      await loadWebhooks()
    } catch {
      setMessage({ type: 'error', text: '削除に失敗しました' })
    }
  }

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        入金通知 Webhook
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        {/* 状態表示 */}
        {isAlreadyRegistered ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <span className="text-emerald-500 text-lg">✓</span>
            <div>
              <p className="text-sm font-semibold text-emerald-700">Webhook 登録済み</p>
              <p className="text-xs text-emerald-600">入金があるとリアルタイムで通知されます</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-700">Webhook 未登録</p>
              <p className="text-xs text-amber-600">下のボタンで登録すると入金通知が届きます</p>
            </div>
          </div>
        )}

        {/* 登録URL表示 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">登録するURL</p>
          <p className="text-xs font-mono bg-gray-50 rounded-lg px-3 py-2 text-gray-700 break-all">
            {webhookUrl}
          </p>
        </div>

        {/* 登録ボタン */}
        {!isAlreadyRegistered && (
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isRegistering ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                登録中...
              </>
            ) : (
              '🔔 Webhook を Up Bank に登録する'
            )}
          </button>
        )}

        {/* メッセージ */}
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* 登録済みWebhook一覧 */}
        {!isLoading && webhooks.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">登録済み ({webhooks.length}件)</p>
            <div className="space-y-2">
              {webhooks.map(w => (
                <div key={w.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-600 truncate">{w.attributes.url}</p>
                    <p className="text-xs text-gray-400">{w.attributes.description}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
