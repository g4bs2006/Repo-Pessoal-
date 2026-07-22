import { NextRequest, NextResponse } from 'next/server'
import { clinicorpGet } from '@/lib/clinicorp'
import { UNIT_CREDENTIALS, UNIT_LIST } from '@/lib/units'
import type { UnitKey } from '@/lib/units'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unit: string }> }
) {
  const { unit } = await params
  const isValid = UNIT_LIST.some((u) => u.key === unit)
  if (!isValid) {
    return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
  }

  const creds = UNIT_CREDENTIALS[unit as UnitKey]
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  if (!from || !to) {
    return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios' }, { status: 400 })
  }

  try {
    const data = await clinicorpGet(
      '/financial/list_payments',
      { subscriber_id: creds.subscriberId, from, to },
      creds.username,
      creds.token
    )
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
