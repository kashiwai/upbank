import type { UpAccount } from '@/lib/upbank'

interface Props {
  account: UpAccount
  isSelected: boolean
  onClick: () => void
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  TRANSACTIONAL: '支出口座',
  SAVER: '貯蓄口座',
  HOME_LOAN: 'ホームローン',
}

const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  TRANSACTIONAL: 'from-orange-400 to-orange-600',
  SAVER: 'from-emerald-400 to-emerald-600',
  HOME_LOAN: 'from-blue-400 to-blue-600',
}

export function AccountCard({ account, isSelected, onClick }: Props) {
  const { displayName, accountType, balance } = account.attributes
  const gradient = ACCOUNT_TYPE_COLOR[accountType] ?? 'from-gray-400 to-gray-600'
  const amount = parseFloat(balance.value)
  const isNegative = amount < 0

  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white shadow-lg transition-all duration-200 ${
        isSelected
          ? 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-[1.02]'
          : 'hover:scale-[1.01] hover:shadow-xl'
      }`}
    >
      <p className="text-sm font-medium opacity-80 mb-1">
        {ACCOUNT_TYPE_LABEL[accountType] ?? accountType}
      </p>
      <p className="text-lg font-semibold tracking-tight truncate mb-3">{displayName}</p>
      <p className={`text-3xl font-bold tabular-nums ${isNegative ? 'text-red-200' : ''}`}>
        {isNegative ? '-' : ''}
        <span className="text-xl font-semibold mr-0.5">{balance.currencyCode}</span>
        {Math.abs(amount).toLocaleString('en-AU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      {isSelected && (
        <div className="absolute top-3 right-3 bg-white/20 rounded-full px-2 py-0.5 text-xs font-medium">
          選択中
        </div>
      )}
    </button>
  )
}
