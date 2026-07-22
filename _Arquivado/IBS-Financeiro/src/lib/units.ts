// Public unit list — safe to import from client components (no secrets)
export const UNIT_LIST = [
  { key: 'eldorado', name: 'IBS Odonto - Eldorado' },
] as const

export type UnitKey = (typeof UNIT_LIST)[number]['key']

// Server-only credentials — only import this in API routes
export const UNIT_CREDENTIALS: Record<
  UnitKey,
  { subscriberId: string; username: string; token: string }
> = {
  eldorado: {
    subscriberId: process.env.UNIT_ELDORADO_SUBSCRIBER_ID!,
    username: process.env.UNIT_ELDORADO_USER!,
    token: process.env.UNIT_ELDORADO_TOKEN!,
  },
}
