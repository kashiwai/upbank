import { getKrakenBalance, buyUSDTWithAUD, withdrawUSDT, isValidTronAddress } from './kraken'
import { getSettings, addExecutionLog } from './settings'

// メイン実行ロジック（自動・手動共通）
export async function executeKrakenTransfer(): Promise<{
  status: 'success' | 'error' | 'skipped'
  message: string
  details?: Record<string, unknown>
}> {
  const settings = await getSettings()

  if (!settings.krakenWithdrawKey) {
    const msg = '出金先キー名が未設定です。設定パネルで Kraken TRC-20 出金先キー名を入力してください。'
    await addExecutionLog({ timestamp: new Date().toISOString(), status: 'skipped', message: msg })
    return { status: 'skipped', message: msg }
  }

  if (!settings.tronAddress || !isValidTronAddress(settings.tronAddress)) {
    const msg = '有効なTronアドレス（TRC-20）が未設定です。Tで始まる34文字のアドレスを設定してください。'
    await addExecutionLog({ timestamp: new Date().toISOString(), status: 'skipped', message: msg })
    return { status: 'skipped', message: msg }
  }

  let balance
  try {
    balance = await getKrakenBalance()
  } catch (err) {
    const msg = `残高取得エラー: ${err instanceof Error ? err.message : String(err)}`
    await addExecutionLog({ timestamp: new Date().toISOString(), status: 'error', message: msg })
    return { status: 'error', message: msg }
  }

  if (balance.AUD < settings.minAudThreshold) {
    const msg = `AUD残高 ${balance.AUD.toFixed(2)} が最低金額 ${settings.minAudThreshold} AUD 未満のためスキップ`
    await addExecutionLog({ timestamp: new Date().toISOString(), status: 'skipped', message: msg, audAmount: balance.AUD })
    return { status: 'skipped', message: msg }
  }

  // USDT購入
  let buyResult
  try {
    buyResult = await buyUSDTWithAUD(balance.AUD)
  } catch (err) {
    const msg = `USDT購入エラー: ${err instanceof Error ? err.message : String(err)}`
    await addExecutionLog({ timestamp: new Date().toISOString(), status: 'error', message: msg, audAmount: balance.AUD })
    return { status: 'error', message: msg }
  }

  // 約定待ち（3秒）
  await new Promise(r => setTimeout(r, 3000))

  // 購入後のUSDT残高を確認
  let newBalance
  try {
    newBalance = await getKrakenBalance()
  } catch {
    newBalance = { AUD: 0, USDT: balance.USDT }
  }

  const usdtToWithdraw = newBalance.USDT
  if (usdtToWithdraw < 0.01) {
    const msg = `USDT残高が少なすぎて出金できません (${usdtToWithdraw} USDT)`
    await addExecutionLog({
      timestamp: new Date().toISOString(), status: 'error', message: msg,
      audAmount: buyResult.audSpent, krakenTxid: buyResult.txid,
    })
    return { status: 'error', message: msg }
  }

  // USDT出金
  let refid
  try {
    refid = await withdrawUSDT(settings.krakenWithdrawKey, usdtToWithdraw.toFixed(6), settings.tronAddress)
  } catch (err) {
    const msg = `USDT出金エラー: ${err instanceof Error ? err.message : String(err)}`
    await addExecutionLog({
      timestamp: new Date().toISOString(), status: 'error', message: msg,
      audAmount: buyResult.audSpent, usdtWithdrawn: usdtToWithdraw, krakenTxid: buyResult.txid,
    })
    return { status: 'error', message: msg }
  }

  const msg = `${buyResult.audSpent.toFixed(2)} AUD → ${usdtToWithdraw.toFixed(2)} USDT 出金完了`
  await addExecutionLog({
    timestamp: new Date().toISOString(), status: 'success', message: msg,
    audAmount: buyResult.audSpent, usdtWithdrawn: usdtToWithdraw,
    krakenTxid: buyResult.txid, withdrawRefid: refid,
  })

  return {
    status: 'success',
    message: msg,
    details: { audSpent: buyResult.audSpent, usdtWithdrawn: usdtToWithdraw, txid: buyResult.txid, refid },
  }
}
