const BASE_URL = 'https://api.up.com.au/api/v1'

function getToken(): string {
  const token = process.env.UP_API_TOKEN
  if (!token) throw new Error('UP_API_TOKEN is not set')
  return token
}

async function upFetch(path: string, params?: Record<string, string>): Promise<Response> {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })
}

export interface UpAccount {
  id: string
  attributes: {
    displayName: string
    accountType: 'SAVER' | 'TRANSACTIONAL' | 'HOME_LOAN'
    ownershipType: 'INDIVIDUAL' | 'JOINT'
    balance: {
      currencyCode: string
      value: string
      valueInBaseUnits: number
    }
    createdAt: string
  }
}

export interface UpTransaction {
  id: string
  attributes: {
    status: 'HELD' | 'SETTLED'
    rawText: string | null
    description: string
    message: string | null
    amount: {
      currencyCode: string
      value: string
      valueInBaseUnits: number
    }
    settledAt: string | null
    createdAt: string
    category?: string
    tags?: string[]
  }
  relationships: {
    account: {
      data: { id: string }
    }
    category?: {
      data: { id: string } | null
    }
  }
}

export interface UpAccountsResponse {
  data: UpAccount[]
  links: { prev: string | null; next: string | null }
}

export interface UpTransactionsResponse {
  data: UpTransaction[]
  links: { prev: string | null; next: string | null }
}

export async function getAccounts(): Promise<UpAccountsResponse> {
  const res = await upFetch('/accounts', { 'page[size]': '25' })
  if (!res.ok) throw new Error(`Up API error: ${res.status}`)
  return res.json()
}

export async function getTransactions(params?: {
  pageSize?: number
  pageAfter?: string
  accountId?: string
  since?: string
}): Promise<UpTransactionsResponse> {
  const path = params?.accountId
    ? `/accounts/${params.accountId}/transactions`
    : '/transactions'

  const queryParams: Record<string, string> = {
    'page[size]': String(params?.pageSize ?? 50),
  }
  if (params?.pageAfter) queryParams['page[after]'] = params.pageAfter
  if (params?.since) queryParams['filter[since]'] = params.since

  const res = await upFetch(path, queryParams)
  if (!res.ok) throw new Error(`Up API error: ${res.status}`)
  return res.json()
}

export async function ping(): Promise<boolean> {
  try {
    const res = await upFetch('/util/ping')
    return res.ok
  } catch {
    return false
  }
}
