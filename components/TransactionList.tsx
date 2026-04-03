import type { UpTransaction } from '@/lib/upbank'

interface Props {
  transactions: UpTransaction[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TransactionRow({ tx }: { tx: UpTransaction }) {
  const amount = parseFloat(tx.attributes.amount.value)
  const isPositive = amount > 0
  const isHeld = tx.attributes.status === 'HELD'
  const date = tx.attributes.settledAt ?? tx.attributes.createdAt

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg ${
          isPositive ? 'bg-emerald-100' : 'bg-orange-50'
        }`}
      >
        {isPositive ? '💸' : '🛍️'}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {tx.attributes.description}
          {isHeld && (
            <span className="ml-1.5 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              保留中
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(date)}</p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p
          className={`text-sm font-semibold tabular-nums ${
            isPositive ? 'text-emerald-600' : 'text-gray-900'
          } ${isHeld ? 'opacity-60' : ''}`}
        >
          {isPositive ? '+' : ''}
          {amount.toLocaleString('en-AU', {
            style: 'currency',
            currency: tx.attributes.amount.currencyCode,
          })}
        </p>
      </div>
    </div>
  )
}

// Group transactions by date
function groupByDate(transactions: UpTransaction[]): Map<string, UpTransaction[]> {
  const groups = new Map<string, UpTransaction[]>()
  for (const tx of transactions) {
    const date = new Date(tx.attributes.settledAt ?? tx.attributes.createdAt)
    const key = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const existing = groups.get(key) ?? []
    existing.push(tx)
    groups.set(key, existing)
  }
  return groups
}

export function TransactionList({ transactions, isLoading, hasMore, onLoadMore }: Props) {
  if (!isLoading && transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">取引がありません</p>
      </div>
    )
  }

  const groups = groupByDate(transactions)

  return (
    <div>
      {Array.from(groups.entries()).map(([date, txs]) => (
        <div key={date}>
          <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{date}</p>
          </div>
          {txs.map(tx => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      ))}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && hasMore && (
        <div className="p-4">
          <button
            onClick={onLoadMore}
            className="w-full py-3 text-sm font-medium text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            もっと見る
          </button>
        </div>
      )}
    </div>
  )
}
