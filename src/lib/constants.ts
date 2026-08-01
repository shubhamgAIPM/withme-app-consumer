export interface UserProfile {
  id: string
  display_name: string
  city: string
  gender: 'male' | 'female' | 'other'
  interests: string[]
  availability: Record<string, boolean>
  comfort_settings: 'pair' | 'group' | 'both'
  avatar_id: string
}

export const INTERESTS = [
  'Films', 'Cafes', 'City walks', 'Trekking', 'Live music',
  'Board games', 'Photography', 'Books', 'Yoga', 'Quiz nights',
  'Standup comedy', 'Cycling', 'Food tours', 'Art', 'Startups', 'Gaming',
] as const

export const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  avatar_01: { bg: '#ef4444', text: '#fff' },
  avatar_02: { bg: '#f97316', text: '#fff' },
  avatar_03: { bg: '#f59e0b', text: '#fff' },
  avatar_04: { bg: '#eab308', text: '#1e293b' },
  avatar_05: { bg: '#84cc16', text: '#1e293b' },
  avatar_06: { bg: '#22c55e', text: '#fff' },
  avatar_07: { bg: '#10b981', text: '#fff' },
  avatar_08: { bg: '#14b8a6', text: '#fff' },
  avatar_09: { bg: '#06b6d4', text: '#fff' },
  avatar_10: { bg: '#0ea5e9', text: '#fff' },
  avatar_11: { bg: '#3b82f6', text: '#fff' },
  avatar_12: { bg: '#6366f1', text: '#fff' },
  avatar_13: { bg: '#8b5cf6', text: '#fff' },
  avatar_14: { bg: '#a855f7', text: '#fff' },
  avatar_15: { bg: '#d946ef', text: '#fff' },
  avatar_16: { bg: '#ec4899', text: '#fff' },
  avatar_17: { bg: '#f43f5e', text: '#fff' },
  avatar_18: { bg: '#64748b', text: '#fff' },
  avatar_19: { bg: '#0f766e', text: '#fff' },
  avatar_20: { bg: '#7c2d12', text: '#fff' },
}

export const AVATAR_IDS = Object.keys(AVATAR_COLORS)

export function getAvatarColor(avatarId: string): { bg: string; text: string } {
  return AVATAR_COLORS[avatarId] ?? { bg: '#64748b', text: '#fff' }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
