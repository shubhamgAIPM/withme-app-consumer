import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  INTERESTS,
  AVATARS,
  svgToDataUrl,
  type UserProfile,
} from '../lib/constants'

interface OnboardingProps {
  onComplete: (user: UserProfile) => void
}

const AVAILABILITY_SLOTS = [
  { key: 'weekday_morning', label: 'Weekday mornings' },
  { key: 'weekday_evening', label: 'Weekday evenings' },
  { key: 'weekend_morning', label: 'Weekend mornings' },
  { key: 'weekend_afternoon', label: 'Weekend afternoons' },
  { key: 'weekend_evening', label: 'Weekend evenings' },
] as const

const TOTAL_STEPS = 5

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const [avatarId, setAvatarId] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('Bangalore')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [comfort, setComfort] = useState<'pair' | 'group' | 'both'>('both')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canProceed = () => {
    switch (step) {
      case 0: return avatarId !== ''
      case 1: return selectedInterests.length > 0
      case 2: return displayName.trim() !== '' && gender !== '' as const
      case 3: return Object.values(availability).some((v) => v)
      case 4: return true
    }
  }

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep(step + 1)
    }
  }

  const back = () => {
    if (step > 0) {
      setDirection(-1)
      setStep(step - 1)
    }
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  const toggleAvailability = (key: string) => {
    setAvailability((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          display_name: displayName.trim(),
          city: city.trim() || 'Bangalore',
          gender: gender as 'male' | 'female' | 'other',
          interests: selectedInterests,
          availability,
          comfort_settings: comfort,
          avatar_id: avatarId,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('No data returned from insert')

      onComplete({
        id: data.id,
        display_name: displayName.trim(),
        city: city.trim() || 'Bangalore',
        gender: gender as 'male' | 'female' | 'other',
        interests: selectedInterests,
        availability,
        comfort_settings: comfort,
        avatar_id: avatarId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setSubmitting(false)
    }
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          {step > 0 ? (
            <button
              onClick={back}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
          ) : (
            <span className="text-sm font-medium text-slate-300">WithMe!</span>
          )}
          <span className="text-sm font-semibold text-slate-400">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div key={step} className="animate-fade-in">
          {step === 0 && (
            <StepAvatar
              avatarId={avatarId}
              setAvatarId={setAvatarId}
            />
          )}
          {step === 1 && (
            <StepInterests
              selected={selectedInterests}
              toggle={toggleInterest}
            />
          )}
          {step === 2 && (
            <StepProfile
              displayName={displayName}
              setDisplayName={setDisplayName}
              city={city}
              setCity={setCity}
              gender={gender}
              setGender={setGender}
            />
          )}
          {step === 3 && (
            <StepAvailability
              availability={availability}
              toggle={toggleAvailability}
            />
          )}
          {step === 4 && (
            <StepComfort comfort={comfort} setComfort={setComfort} />
          )}
        </div>
      </div>

      {/* Footer */}
      {error && (
        <div className="px-5 pt-2 text-sm text-red-500 text-center">
          {error}
        </div>
      )}
      <div className="px-5 pb-8 pt-4 bg-slate-50">
        {step < TOTAL_STEPS - 1 ? (
          <button
            onClick={next}
            disabled={!canProceed()}
            className="w-full h-14 rounded-2xl font-semibold text-base text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-30 disabled:shadow-none disabled:bg-slate-300 disabled:bg-none"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || submitting}
            className="w-full h-14 rounded-2xl font-semibold text-base text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-30 disabled:shadow-none disabled:bg-slate-300 disabled:bg-none flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating your profile...
              </>
            ) : (
              'Start exploring WithMe!'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Step 0: Avatar Selection ── */
function StepAvatar({
  avatarId,
  setAvatarId,
}: {
  avatarId: string
  setAvatarId: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Pick your avatar</h2>
      <p className="text-slate-500 text-sm mb-2">
        This is how others will see you.
      </p>
      <div className="flex gap-2 mb-4">
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">01–10 Male</span>
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">11–20 Female</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {AVATARS.map((avatar) => {
          const isSelected = avatarId === avatar.id
          const dataUrl = svgToDataUrl(avatar.svg)
          return (
            <button
              key={avatar.id}
              onClick={() => setAvatarId(avatar.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`w-16 h-16 rounded-full overflow-hidden bg-slate-100 transition-all duration-200 ${
                  isSelected
                    ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-50 scale-105'
                    : 'group-hover:scale-105 group-active:scale-95 ring-2 ring-transparent'
                }`}
              >
                <img
                  src={dataUrl}
                  alt={avatar.id}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  isSelected ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {avatar.id.replace('avatar_', '#')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Step 1: Interests ── */
function StepInterests({
  selected,
  toggle,
}: {
  selected: string[]
  toggle: (interest: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">What do you enjoy?</h2>
      <p className="text-slate-500 text-sm mb-6">
        Pick a few interests. We'll use these to find people you'll click with.
      </p>
      <div className="flex flex-wrap gap-2.5">
        {INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest)
          return (
            <button
              key={interest}
              onClick={() => toggle(interest)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {interest}
              {isSelected && (
                <span className="ml-1.5 inline-block">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <p className="mt-5 text-sm text-slate-400">
          {selected.length} selected
        </p>
      )}
    </div>
  )
}

/* ── Step 2: Profile ── */
function StepProfile({
  displayName,
  setDisplayName,
  city,
  setCity,
  gender,
  setGender,
}: {
  displayName: string
  setDisplayName: (v: string) => void
  city: string
  setCity: (v: string) => void
  gender: 'male' | 'female' | 'other' | ''
  setGender: (v: 'male' | 'female' | 'other') => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Tell us about you</h2>
      <p className="text-slate-500 text-sm mb-6">
        Just your first name and city — no last names, no phone numbers.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Priya"
            maxLength={30}
            className="w-full h-13 px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            City
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Bangalore"
            maxLength={50}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Gender
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['male', 'female', 'other'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`py-3.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200 active:scale-95 ${
                  gender === g
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Step 3: Availability ── */
function StepAvailability({
  availability,
  toggle,
}: {
  availability: Record<string, boolean>
  toggle: (key: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">When are you free?</h2>
      <p className="text-slate-500 text-sm mb-6">
        Toggle the slots that work for you. We'll match you with people who overlap.
      </p>
      <div className="space-y-3">
        {AVAILABILITY_SLOTS.map((slot) => {
          const isOn = availability[slot.key] ?? false
          return (
            <button
              key={slot.key}
              onClick={() => toggle(slot.key)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${
                isOn
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <span
                className={`text-base font-semibold ${
                  isOn ? 'text-blue-700' : 'text-slate-600'
                }`}
              >
                {slot.label}
              </span>
              {/* Toggle switch */}
              <div
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                  isOn ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isOn ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Step 4: Comfort Settings ── */
function StepComfort({
  comfort,
  setComfort,
}: {
  comfort: 'pair' | 'group' | 'both'
  setComfort: (v: 'pair' | 'group' | 'both') => void
}) {
  const options: { value: 'pair' | 'group' | 'both'; label: string; desc: string; icon: string }[] = [
    {
      value: 'pair',
      label: 'One-on-one',
      desc: 'Meetups with just one other person',
      icon: '👥',
    },
    {
      value: 'group',
      label: 'Small groups',
      desc: 'Meetups with 3 or more people',
      icon: '👨‍👩‍👧',
    },
    {
      value: 'both',
      label: 'Both work',
      desc: "I'm open to either format",
      icon: '✨',
    },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Your comfort zone</h2>
      <p className="text-slate-500 text-sm mb-6">
        How do you prefer to meet up? You can change this later.
      </p>
      <div className="space-y-3">
        {options.map((opt) => {
          const isSelected = comfort === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setComfort(opt.value)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] text-left ${
                isSelected
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <div className="flex-1">
                <p
                  className={`text-base font-bold ${
                    isSelected ? 'text-blue-700' : 'text-slate-700'
                  }`}
                >
                  {opt.label}
                </p>
                <p className="text-sm text-slate-400">{opt.desc}</p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-300'
                }`}
              >
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
