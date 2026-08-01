import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/context'
import { getAvatarSvg, svgToDataUrl } from '../lib/constants'

interface CandidateIntent {
  id: string
  user_id: string
  venue_id: string | null
  activity_type: string
  datetime: string
  companion_count: number
  gender_rule: string
  users: {
    display_name: string
    avatar_id: string | null
    gender: string
    meetup_count: number
    rating: number
    interests: string[]
  } | null
  venues: {
    name: string
  } | null
}

interface CurrentIntent {
  id: string
  activity_type: string
  datetime: string
  companion_count: number
  gender_rule: string
  user_id: string
  venue_id: string | null
}

interface MatchScreenProps {
  intentId: string
  onBack: () => void
  onMatch: (matchId: string) => void
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (sameDay) return `Today at ${time}`
  if (isTomorrow) return `Tomorrow at ${time}`
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${dateStr} at ${time}`
}

export default function MatchScreen({ intentId, onBack, onMatch }: MatchScreenProps) {
  const { user } = useApp()
  const [currentIntent, setCurrentIntent] = useState<CurrentIntent | null>(null)
  const [candidates, setCandidates] = useState<CandidateIntent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      // Fetch the current intent
      const { data: intent, error: intentError } = await supabase
        .from('intents')
        .select('id, activity_type, datetime, companion_count, gender_rule, user_id, venue_id')
        .eq('id', intentId)
        .maybeSingle()

      if (intentError || !intent) {
        setError(intentError?.message ?? 'Intent not found')
        setLoading(false)
        return
      }

      const ci = intent as unknown as CurrentIntent
      setCurrentIntent(ci)

      // Query other open intents with similar activity_type and overlapping datetime (within ±3 hours)
      const startTime = new Date(ci.datetime)
      startTime.setHours(startTime.getHours() - 3)
      const endTime = new Date(ci.datetime)
      endTime.setHours(endTime.getHours() + 3)

      const { data: rawCandidates, error: candError } = await supabase
        .from('intents')
        .select(
          `id, user_id, venue_id, activity_type, datetime, companion_count, gender_rule,
           users ( display_name, avatar_id, gender, meetup_count, rating, interests ),
           venues ( name )`
        )
        .eq('status', 'open')
        .ilike('activity_type', `%${ci.activity_type}%`)
        .gte('datetime', startTime.toISOString())
        .lte('datetime', endTime.toISOString())
        .neq('user_id', ci.user_id)
        .order('datetime', { ascending: true })

      if (candError) {
        setError(candError.message)
        setLoading(false)
        return
      }

      const all = (rawCandidates ?? []) as unknown as CandidateIntent[]

      // Gender filtering:
      // If the current intent's companion_count is 1 (gender_rule 'same'),
      // only show candidates whose gender matches the current user's gender.
      // If companion_count is 3+, show any gender.
      let filtered = all
      if (ci.companion_count === 1 && user?.gender) {
        filtered = all.filter((c) => c.users?.gender === user.gender)
      }

      setCandidates(filtered)
      setLoading(false)
    }
    load()
  }, [intentId, user])

  async function handleConfirm(candidate: CandidateIntent) {
    if (!currentIntent || !user || !candidate.users) return
    setConfirming(candidate.id)

    const intentIds = [currentIntent.id, candidate.id]
    const memberIds = [currentIntent.user_id, candidate.user_id]
    const groupSize = 2
    const genderMix =
      currentIntent.companion_count === 1 && candidate.companion_count === 1
        ? 'same'
        : 'mixed'

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        intent_ids: intentIds,
        member_ids: memberIds,
        group_size: groupSize,
        gender_mix: genderMix,
        status: 'pending',
        venue_id: candidate.venues ? candidate.venue_id : (currentIntent.venue_id ?? null),
        datetime: candidate.datetime,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setConfirming(null)
      return
    }

    onMatch(data.id)
  }

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
        <p className="text-slate-700 font-semibold mb-1">Something went wrong</p>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={onBack} className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold active:scale-95 transition-all">
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Find your match</h1>
            {currentIntent && (
              <p className="text-xs text-slate-500">
                {currentIntent.activity_type} · {formatDateTime(currentIntent.datetime)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Candidates */}
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 pt-24 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold mb-1">No matches yet</p>
          <p className="text-slate-400 text-sm">
            {currentIntent?.companion_count === 1
              ? 'No one with the same activity and gender nearby. Try widening your search later.'
              : 'No one with the same activity nearby yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {candidates.map((c) => {
            const u = c.users
            const avatarSvg = u?.avatar_id ? getAvatarSvg(u.avatar_id) : ''
            const avatarUrl = avatarSvg ? svgToDataUrl(avatarSvg) : ''
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 ring-2 ring-slate-100">
                    {avatarUrl && <img src={avatarUrl} alt={u?.display_name ?? ''} className="w-full h-full object-cover" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {u ? firstName(u.display_name) : 'Someone'}
                      </h3>
                      {/* Verified badge */}
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth={2} fill="none" />
                        </svg>
                        Verified
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
                        </svg>
                        {u?.meetup_count ?? 0} meetups
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {(u?.rating ?? 0).toFixed(1)}
                      </span>
                    </div>

                    {/* Interest chips */}
                    {u?.interests && u.interests.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {u.interests.slice(0, 4).map((interest) => (
                          <span
                            key={interest}
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Venue + time */}
                    <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400">
                      {c.venues && <span>{c.venues.name}</span>}
                      <span>·</span>
                      <span>{formatDateTime(c.datetime)}</span>
                    </div>

                    {/* Confirm button */}
                    <button
                      onClick={() => handleConfirm(c)}
                      disabled={confirming !== null}
                      className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all"
                    >
                      {confirming === c.id ? 'Confirming…' : 'Confirm WithMe!'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
