import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/context'
import { getAvatarSvg, svgToDataUrl } from '../lib/constants'

interface ActivityLogEntry {
  id: string
  activity_type: string
  rating: number | null
  venues: { name: string } | null
  created_at: string
}

interface UserProfileData {
  id: string
  display_name: string
  avatar_id: string | null
  meetup_count: number
  rating: number
  comfort_settings: string
  interests: string[]
  city: string
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function comfortLabel(value: string): string {
  switch (value) {
    case 'pair': return '1:1 meetups'
    case 'group': return 'Small groups'
    case 'both': return 'Both 1:1 and groups'
    default: return value
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TrustProfile() {
  const { user } = useApp()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, display_name, avatar_id, meetup_count, rating, comfort_settings, interests, city')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      setProfile(profileData as unknown as UserProfileData)

      const { data: logData, error: logError } = await supabase
        .from('activity_log')
        .select(
          `id, activity_type, rating, created_at,
           venues ( name )`
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (logError) {
        setError(logError.message)
        setLoading(false)
        return
      }

      setActivities((logData ?? []) as unknown as ActivityLogEntry[])
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-700 font-semibold mb-1">Couldn't load your profile</p>
        <p className="text-slate-400 text-sm">{error ?? 'Please try again'}</p>
      </div>
    )
  }

  const avatarSvg = profile.avatar_id ? getAvatarSvg(profile.avatar_id) : ''
  const avatarUrl = avatarSvg ? svgToDataUrl(avatarSvg) : ''

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-lg font-bold text-slate-900">Your Profile</h1>
        </div>
      </div>

      {/* Profile card */}
      <div className="px-4 pt-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 ring-4 ring-slate-100 flex-shrink-0">
              {avatarUrl && <img src={avatarUrl} alt={profile.display_name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{firstName(profile.display_name)}</h2>
              <p className="text-sm text-slate-500">{profile.city}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth={2} fill="none" />
                  </svg>
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center py-3 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{profile.meetup_count}</p>
              <p className="text-xs text-slate-500 mt-0.5">Meetups</p>
            </div>
            <div className="text-center py-3 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-0.5">
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {profile.rating.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Rating</p>
            </div>
            <div className="text-center py-3 rounded-xl bg-slate-50">
              <p className="text-sm font-bold text-slate-900 leading-tight mt-1">
                {comfortLabel(profile.comfort_settings)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Comfort</p>
            </div>
          </div>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity log */}
      <div className="px-4 pt-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3 px-1">Past Activities</h3>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">No activities yet. Your meetups will show here!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activities.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-slate-100 p-3.5 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{entry.activity_type}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {entry.venues?.name ?? 'No venue'}
                    <span className="text-slate-300"> · {formatDate(entry.created_at)}</span>
                  </p>
                </div>
                {entry.rating && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3.5 h-3.5 ${i < entry.rating! ? 'text-amber-400' : 'text-slate-200'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
