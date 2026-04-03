import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.up.com.au/api/v1'

function getToken() {
  const token = process.env.UP_API_TOKEN
  if (!token) throw new Error('UP_API_TOKEN が未設定です')
  return token
}

// Webhook一覧を取得
export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/webhooks`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Webhookを登録
export async function POST(req: NextRequest) {
  const { url, description } = await req.json()
  try {
    const res = await fetch(`${BASE_URL}/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            url,
            description: description || 'Dashboard Webhook',
          },
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Webhookを削除
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  try {
    const res = await fetch(`${BASE_URL}/webhooks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (res.status === 204) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: '削除失敗' }, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
