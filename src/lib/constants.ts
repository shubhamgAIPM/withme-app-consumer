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

// ──────────────────────────────────────────────────────────────
// Illustrated SVG avatars — 10 male + 10 female
// Each is a self-contained SVG (no external fetch, works offline)
// ──────────────────────────────────────────────────────────────

type AvatarDef = { id: string; svg: string }

// Build helpers
function face(
  skin: string,
  hair: string,
  hairStyle: 'short' | 'long' | 'bun' | 'curly' | 'bob',
  shirtColor: string,
  eyeStyle: 'default' | 'happy' | 'wink',
  mouthStyle: 'smile' | 'grin' | 'small',
  accessory?: 'glasses' | 'beard'
): string {
  const eyebrow = `<path d="M34 40 Q40 36 46 40" stroke="${hair}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M54 40 Q60 36 66 40" stroke="${hair}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`

  const eyes = eyeStyle === 'happy'
    ? `<path d="M34 49 Q40 45 46 49" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/>
       <path d="M54 49 Q60 45 66 49" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : eyeStyle === 'wink'
    ? `<ellipse cx="40" cy="48" rx="4" ry="5" fill="#1e293b"/>
       <ellipse cx="40" cy="47" rx="1.5" ry="1.5" fill="white"/>
       <path d="M54 48 Q60 44 66 48" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="40" cy="48" rx="4" ry="5" fill="#1e293b"/>
       <ellipse cx="40" cy="47" rx="1.5" ry="1.5" fill="white"/>
       <ellipse cx="60" cy="48" rx="4" ry="5" fill="#1e293b"/>
       <ellipse cx="60" cy="47" rx="1.5" ry="1.5" fill="white"/>`

  const mouth = mouthStyle === 'grin'
    ? `<path d="M36 62 Q50 72 64 62" stroke="#c53030" stroke-width="2" fill="none" stroke-linecap="round"/>
       <path d="M36 62 Q50 68 64 62" fill="white" stroke="none"/>`
    : mouthStyle === 'small'
    ? `<path d="M42 63 Q50 67 58 63" stroke="#c53030" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<path d="M37 62 Q50 70 63 62" stroke="#c53030" stroke-width="2" fill="none" stroke-linecap="round"/>`

  const glasses = accessory === 'glasses'
    ? `<circle cx="40" cy="48" r="7" stroke="#475569" stroke-width="1.5" fill="none" opacity="0.6"/>
       <circle cx="60" cy="48" r="7" stroke="#475569" stroke-width="1.5" fill="none" opacity="0.6"/>
       <line x1="47" y1="48" x2="53" y2="48" stroke="#475569" stroke-width="1.5" opacity="0.6"/>`
    : ''

  const beard = accessory === 'beard'
    ? `<path d="M35 68 Q50 82 65 68 Q60 76 50 78 Q40 76 35 68Z" fill="${hair}" opacity="0.5"/>`
    : ''

  // Hair shapes
  const hairShapes: Record<string, string> = {
    short: `<ellipse cx="50" cy="28" rx="22" ry="14" fill="${hair}"/>
             <rect x="28" y="28" width="44" height="12" fill="${hair}"/>
             <ellipse cx="28" cy="40" rx="5" ry="8" fill="${hair}"/>
             <ellipse cx="72" cy="40" rx="5" ry="8" fill="${hair}"/>`,
    long: `<ellipse cx="50" cy="26" rx="24" ry="16" fill="${hair}"/>
            <rect x="26" y="26" width="48" height="14" fill="${hair}"/>
            <rect x="26" y="40" width="7" height="40" rx="3" fill="${hair}"/>
            <rect x="67" y="40" width="7" height="40" rx="3" fill="${hair}"/>
            <ellipse cx="26" cy="80" rx="5" ry="8" fill="${hair}"/>
            <ellipse cx="74" cy="80" rx="5" ry="8" fill="${hair}"/>`,
    bun: `<ellipse cx="50" cy="26" rx="24" ry="16" fill="${hair}"/>
           <rect x="26" y="26" width="48" height="12" fill="${hair}"/>
           <ellipse cx="26" cy="40" rx="5" ry="7" fill="${hair}"/>
           <ellipse cx="74" cy="40" rx="5" ry="7" fill="${hair}"/>
           <circle cx="50" cy="14" r="9" fill="${hair}"/>`,
    curly: `<ellipse cx="50" cy="22" rx="25" ry="18" fill="${hair}"/>
             <circle cx="26" cy="38" r="9" fill="${hair}"/>
             <circle cx="74" cy="38" r="9" fill="${hair}"/>
             <circle cx="32" cy="24" r="7" fill="${hair}"/>
             <circle cx="68" cy="24" r="7" fill="${hair}"/>
             <rect x="25" y="30" width="50" height="14" fill="${hair}"/>
             <rect x="26" y="44" width="7" height="30" rx="3" fill="${hair}"/>
             <rect x="67" y="44" width="7" height="30" rx="3" fill="${hair}"/>`,
    bob: `<ellipse cx="50" cy="26" rx="24" ry="16" fill="${hair}"/>
           <rect x="26" y="26" width="48" height="16" fill="${hair}"/>
           <rect x="26" y="42" width="7" height="22" rx="3" fill="${hair}"/>
           <rect x="67" y="42" width="7" height="22" rx="3" fill="${hair}"/>
           <ellipse cx="28" cy="64" rx="8" ry="5" fill="${hair}"/>
           <ellipse cx="72" cy="64" rx="8" ry="5" fill="${hair}"/>`,
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <!-- Background -->
  <circle cx="50" cy="50" r="50" fill="${shirtColor}" opacity="0.15"/>
  <!-- Shirt -->
  <ellipse cx="50" cy="98" rx="30" ry="18" fill="${shirtColor}"/>
  <!-- Neck -->
  <rect x="44" y="72" width="12" height="14" rx="5" fill="${skin}"/>
  <!-- Head -->
  <ellipse cx="50" cy="52" rx="22" ry="25" fill="${skin}"/>
  <!-- Hair -->
  ${hairShapes[hairStyle]}
  <!-- Eyebrows -->
  ${eyebrow}
  <!-- Eyes -->
  ${eyes}
  <!-- Nose -->
  <path d="M48 52 Q50 58 52 52" stroke="${skin}" stroke-width="1.5" fill="none" opacity="0.6"/>
  <!-- Mouth -->
  ${mouth}
  <!-- Accessory -->
  ${glasses}
  ${beard}
</svg>`
}

// Skin tones
const S = {
  fair: '#fde8d0',
  light: '#f5c9a0',
  medium: '#d4956a',
  tan: '#b87248',
  brown: '#8b5e3c',
  dark: '#6b4226',
}

// Hair colors
const H = {
  black: '#2c1b18',
  darkbrown: '#4a312c',
  brown: '#6b3f2a',
  auburn: '#a0522d',
  blonde: '#d4a94b',
  platinum: '#e8d5b0',
  gray: '#94a3b8',
  navy: '#1e3a5f',
}

// Shirt colors
const C = {
  blue: '#3b82f6',
  teal: '#14b8a6',
  coral: '#f97316',
  purple: '#8b5cf6',
  rose: '#ec4899',
  green: '#22c55e',
  red: '#ef4444',
  indigo: '#6366f1',
  amber: '#f59e0b',
  slate: '#64748b',
}

const MALE_AVATARS: AvatarDef[] = [
  { id: 'avatar_01', svg: face(S.fair,   H.black,     'short', C.blue,   'default', 'smile') },
  { id: 'avatar_02', svg: face(S.medium, H.darkbrown, 'short', C.teal,   'happy',   'grin') },
  { id: 'avatar_03', svg: face(S.light,  H.auburn,    'short', C.coral,  'default', 'smile', 'glasses') },
  { id: 'avatar_04', svg: face(S.tan,    H.black,     'short', C.indigo, 'wink',    'small') },
  { id: 'avatar_05', svg: face(S.brown,  H.darkbrown, 'short', C.green,  'happy',   'smile') },
  { id: 'avatar_06', svg: face(S.dark,   H.black,     'short', C.red,    'default', 'grin') },
  { id: 'avatar_07', svg: face(S.fair,   H.blonde,    'short', C.amber,  'happy',   'smile', 'beard') },
  { id: 'avatar_08', svg: face(S.light,  H.navy,      'short', C.purple, 'wink',    'grin') },
  { id: 'avatar_09', svg: face(S.tan,    H.brown,     'short', C.slate,  'default', 'smile', 'glasses') },
  { id: 'avatar_10', svg: face(S.medium, H.gray,      'short', C.teal,   'happy',   'small', 'beard') },
]

const FEMALE_AVATARS: AvatarDef[] = [
  { id: 'avatar_11', svg: face(S.fair,   H.black,     'long',  C.rose,   'happy',   'smile') },
  { id: 'avatar_12', svg: face(S.light,  H.auburn,    'curly', C.purple, 'default', 'grin') },
  { id: 'avatar_13', svg: face(S.medium, H.darkbrown, 'bun',   C.teal,   'wink',    'smile') },
  { id: 'avatar_14', svg: face(S.tan,    H.black,     'bob',   C.coral,  'happy',   'small') },
  { id: 'avatar_15', svg: face(S.brown,  H.darkbrown, 'long',  C.blue,   'default', 'grin') },
  { id: 'avatar_16', svg: face(S.dark,   H.black,     'curly', C.amber,  'happy',   'smile') },
  { id: 'avatar_17', svg: face(S.fair,   H.blonde,    'bob',   C.green,  'wink',    'smile', 'glasses') },
  { id: 'avatar_18', svg: face(S.light,  H.brown,     'bun',   C.indigo, 'default', 'grin') },
  { id: 'avatar_19', svg: face(S.tan,    H.auburn,    'long',  C.rose,   'happy',   'small') },
  { id: 'avatar_20', svg: face(S.medium, H.platinum,  'curly', C.red,    'default', 'smile', 'glasses') },
]

export const AVATARS: { id: string; svg: string }[] = [
  ...MALE_AVATARS,
  ...FEMALE_AVATARS,
]

export const AVATAR_IDS = AVATARS.map((a) => a.id)

export function getAvatarSvg(avatarId: string): string {
  return AVATARS.find((a) => a.id === avatarId)?.svg ?? AVATARS[0].svg
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
