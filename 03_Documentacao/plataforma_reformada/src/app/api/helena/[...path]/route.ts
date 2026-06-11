import { NextRequest, NextResponse } from 'next/server'

const HELENA_BASE = process.env.HELENA_API_BASE_URL ?? 'https://api.wts.chat'
const HELENA_TOKEN = process.env.HELENA_API_TOKEN ?? ''

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params, 'GET')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params, 'POST')
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params, 'PUT')
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params, 'PATCH')
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params, 'DELETE')
}

async function proxy(
  req: NextRequest,
  params: { path: string[] },
  method: string
) {
  const path = params.path.join('/')
  const search = req.nextUrl.searchParams.toString()
  const url = `${HELENA_BASE}/${path}${search ? `?${search}` : ''}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${HELENA_TOKEN}`,
    'Content-Type': 'application/json',
  }

  let body: string | undefined
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      body = JSON.stringify(await req.json())
    } catch {
      body = undefined
    }
  }

  try {
    const res = await fetch(url, { method, headers, body })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[Helena Proxy Error]', err)
    return NextResponse.json({ error: 'Erro ao conectar com a API Helena' }, { status: 500 })
  }
}
