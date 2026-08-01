import { useState } from 'react'
import Onboarding from './components/Onboarding'
import { AppContext } from './lib/context'
import type { UserProfile } from './lib/constants'
import { getAvatarSvg, svgToDataUrl } from './lib/constants'

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null)

  return (
    <AppContext.Provider value={{ user, setUser }}>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-xl">
        {user ? <WelcomeScreen user={user} /> : <Onboarding onComplete={setUser} />}
      </div>
    </AppContext.Provider>
  )
}

function WelcomeScreen({ user }: { user: UserProfile }) {
  const avatarDataUrl = svgToDataUrl(getAvatarSvg(user.avatar_id))

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 mb-5 shadow-lg ring-2 ring-slate-200">
        <img src={avatarDataUrl} alt={user.display_name} className="w-full h-full object-cover" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        Welcome, {user.display_name.split(' ')[0]}!
      </h1>
      <p className="text-slate-500 text-center mb-8">
        Your profile is all set. You're ready to find people to do things with in {user.city}.
      </p>
      <div className="w-full bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {user.interests.map((interest) => (
            <span
              key={interest}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700"
            >
              {interest}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100">
          <span className="text-slate-400">Comfort</span>
          <span className="font-semibold text-slate-700 capitalize">
            {user.comfort_settings === 'both' ? 'Pair + Group' : user.comfort_settings}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">City</span>
          <span className="font-semibold text-slate-700">{user.city}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-8 text-center">
        More screens coming soon — this is Screen 1 of the WithMe! app.
      </p>
    </div>
  )
}
