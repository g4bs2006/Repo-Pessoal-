const BASE_URL = 'https://api.clinicorp.com/rest/v1'

function basicAuth(username: string, token: string): string {
  return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`
}

export async function clinicorpGet<T>(
  path: string,
  params: Record<string, string>,
  username: string,
  token: string
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: basicAuth(username, token),
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Clinicorp ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}
