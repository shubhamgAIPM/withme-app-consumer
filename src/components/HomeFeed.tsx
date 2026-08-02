import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAvatarSvg, svgToDataUrl } from '../lib/constants'

interface FeedIntent {
  id: string
  activity_type: string
  bio: string | null
  datetime: string
  user_id: string
  companion_count: number
  users: {
    display_name: string
    avatar_id: string | null
    bio: string | null
  } | null
  venues: {
    name: string
  } | null
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '\u2026'
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (sameDay) return `Today at ${time}`
  if (isTomorrow) return `Tomorrow at ${time}`

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return `${dateStr} at ${time}`
}

export default function HomeFeed({ onPostIntent, onOpenMatch }: { onPostIntent: () => void; onOpenMatch: (intentId: string) => void }) {
  const [intents, setIntents] = useState<FeedIntent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('intents')
        .select(
          `id, activity_type, bio, datetime, user_id, companion_count,
           users!inner ( display_name, avatar_id, bio ),
           venues ( name )`
        )
        .eq('status', 'open')
        .order('datetime', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        setIntents((data ?? []) as unknown as FeedIntent[])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-700 font-semibold mb-1">Couldn't load the feed</p>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-40">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-xl font-bold text-slate-900">WithMe!</h1>
          <p className="text-sm text-slate-500">People near you looking to hang out</p>
        </div>
      </div>

      {/* Feed */}
      {intents.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 pt-24 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold mb-1">No open intents yet</p>
          <p className="text-slate-400 text-sm">Be the first to post one!</p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {intents.map((intent) => {
            const user = intent.users
            const avatarSvg = user?.avatar_id ? getAvatarSvg(user.avatar_id) : ''
            const avatarUrl = avatarSvg ? svgToDataUrl(avatarSvg) : ''
            const oneLiner =
              intent.bio ?? user?.bio ?? 'Looking for company!'
            return (
              <div
                key={intent.id}
                onClick={() => onOpenMatch(intent.id)}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 ring-2 ring-slate-100">
                    {avatarUrl && (
                      <img src={avatarUrl} alt={user?.display_name ?? ''} className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {user ? firstName(user.display_name) : 'Someone'}
                      </h3>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatDateTime(intent.datetime)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {truncate(oneLiner, 80)}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {intent.activity_type}
                      </span>
                      {intent.venues && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {intent.venues.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Post an Intent button */}
      <button
        onClick={onPostIntent}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-6 py-3.5 rounded-full bg-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 active:scale-95 transition-all"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Post an Intent
      </button>
    </div>
  )
}
