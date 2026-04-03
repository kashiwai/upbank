import { createHash, createHmac } from 'crypto'

const BASE_URL = 'https://api.kraken.com'

// AUD/USDT pair name on Kraken
export const USDT_AUD_PAIR = 'USDTAUD'

function getCredentials() {
  const apiKey = process.env.KRAKEN_API_KEY
  const apiSecret = process.env.KRAKEN_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('KRAKEN_API_KEY または KRAKEN_API_SECRET が未設定です')
  return { apiKey, apiSecret }
}

function signRequest(path: string, postData: string, nonce: string, secret: string): string {
  const secretBuffer = Buffer.from(secret, 'base64')
  const hash = createHash('sha256').update(nonce + postData).digest()
  return createHmac('sha512', secretBuffer)
    .update(Buffer.concat([Buffer.from(path), hash]))
    .digest('base64')
}

async function privateRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { apiKey, apiSecret } = getCredentials()
  const nonce = Date.now().toString()
  const path = `/0/private/${endpoint}`
  const postData = new URLSearchParams({ nonce, ...params }).toString()
  const signature = signRequest(path, postData, nonce, apiSecret)

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'API-Key': apiKey,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: postData,
  })

  const data = await res.json()
  if (data.error?.length > 0) {
    throw new Error(`Kraken API エラー: ${data.error.join(', ')}`)
  }
  return data.result as T
}

export interface KrakenBalance {
  AUD: number
  USDT: number
}

export async function getKrakenBalance(): Promise<KrakenBalance> {
  const result = await privateRequest<Record<string, string>>('Balance')
  return {
    AUD: parseFloat(result['ZAUD'] ?? result['AUD'] ?? '0'),
    USDT: parseFloat(result['USDT'] ?? '0'),
  }
}

// AUDでUSDTを購入（市場価格、viqc = 金額指定）
export async function buyUSDTWithAUD(audAmount: number): Promise<{ txid: string; audSpent: number }> {
  // 手数料0.26%を考慮して少し少なめに
  const spendAmount = Math.floor(audAmount * 0.997 * 100) / 100

  const result = await privateRequest<{ txid: string[] }>('AddOrder', {
    pair: USDT_AUD_PAIR,
    type: 'buy',
    ordertype: 'market',
    volume: spendAmount.toFixed(2),
    oflags: 'viqc', // volume in quote currency (AUD)
  })

  return { txid: result.txid[0], audSpent: spendAmount }
}

// USDTをウォレットへ出金
// key = Krakenアカウントで事前登録した出金先名称
export async function withdrawUSDT(key: string, amount: string): Promise<string> {
  const result = await privateRequest<{ refid: string }>('Withdraw', {
    asset: 'USDT',
    key,
    amount,
  })
  return result.refid
}

// 出金先一覧を取得（Krakenに登録済みのアドレス名を確認用）
export async function getWithdrawAddresses(): Promise<Array<{ key: string; address: string }>> {
  try {
    const result = await privateRequest<Array<{ key: string; address: string }>>('WithdrawAddresses', {
      asset: 'USDT',
    })
    return Array.isArray(result) ? result : []
  } catch {
    return []
  }
}

// 実行ログ用の型
export interface ExecutionResult {
  timestamp: string
  status: 'success' | 'error' | 'skipped'
  message: string
  audAmount?: number
  usdtAmount?: number
  txid?: string
  refid?: string
}
