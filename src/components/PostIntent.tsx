import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/context'

interface Venue {
  id: string
  name: string
  area: string | null
}

interface PostIntentProps {
  onBack: () => void
  onPosted: (intentId: string) => void
}

export default function PostIntent({ onBack, onPosted }: PostIntentProps) {
  const { user } = useApp()
  const [activityType, setActivityType] = useState('')
  const [venues, setVenues] = useState<Venue[]>([])
  const [venueQuery, setVenueQuery] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [datetime, setDatetime] = useState('')
  const [companionCount, setCompanionCount] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadVenues() {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, area')
        .order('name')
      if (!error && data) setVenues(data as Venue[])
    }
    loadVenues()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(venueQuery.toLowerCase()) ||
    (v.area ?? '').toLowerCase().includes(venueQuery.toLowerCase())
  )

  const genderRule = companionCount === 1 ? 'same' : 'mixed'

  const canSubmit =
    activityType.trim().length > 0 &&
    selectedVenue !== null &&
    datetime.length > 0 &&
    !submitting

  async function handleSubmit() {
    if (!user || !selectedVenue || !datetime) return
    setSubmitting(true)
    setError(null)

    const { data, error } = await supabase
      .from('intents')
      .insert({
        user_id: user.id,
        venue_id: selectedVenue.id,
        activity_type: activityType.trim(),
        datetime: new Date(datetime).toISOString(),
        companion_count: companionCount,
        gender_rule: genderRule,
        status: 'open',
      })
      .select('id')
      .single()

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    onPosted(data.id)
  }

  return (
    <div className="min-h-screen flex flex-col">
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
          <h1 className="text-lg font-bold text-slate-900">Post an Intent</h1>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pt-5 pb-32 space-y-6">
        {/* Activity Type */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Activity</label>
          <input
            type="text"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            placeholder="e.g. Films, Trekking, Cafes…"
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Venue Search */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Venue</label>
          <div className="relative" ref={dropdownRef}>
            {selectedVenue ? (
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-blue-500 bg-blue-50">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-900 truncate">{selectedVenue.name}</span>
                  {selectedVenue.area && (
                    <span className="text-xs text-slate-500 truncate">· {selectedVenue.area}</span>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedVenue(null); setVenueQuery(''); setShowDropdown(true) }}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-100 active:scale-90 transition-all flex-shrink-0"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={venueQuery}
                onChange={(e) => { setVenueQuery(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search for a venue…"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            )}

            {showDropdown && !selectedVenue && (
              <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {filteredVenues.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">No venues found</div>
                ) : (
                  filteredVenues.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVenue(v); setShowDropdown(false); setVenueQuery('') }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{v.name}</p>
                        {v.area && <p className="text-xs text-slate-400 truncate">{v.area}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date / Time */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">When</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Companion Count Stepper */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Companions needed
          </label>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200">
            <button
              onClick={() => setCompanionCount((c) => Math.max(1, c - 1))}
              disabled={companionCount <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-lg hover:bg-slate-200 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              −
            </button>
            <div className="text-center">
              <span className="text-2xl font-bold text-slate-900">{companionCount}</span>
              <p className="text-xs text-slate-400">
                {companionCount === 1 ? '1:1 meetup' : `${companionCount + 1} total`}
              </p>
            </div>
            <button
              onClick={() => setCompanionCount((c) => Math.min(6, c + 1))}
              disabled={companionCount >= 6}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-lg hover:bg-slate-200 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              +
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Gender rule: <span className="font-semibold text-slate-700">{genderRule === 'same' ? 'Same gender only' : 'Mixed group welcome'}</span>
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-3 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-20">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 rounded-2xl font-semibold text-base text-white bg-blue-600 shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-30 disabled:shadow-none disabled:bg-slate-300 transition-all"
        >
          {submitting ? 'Posting…' : 'Post Intent'}
        </button>
      </div>
    </div>
  )
}
