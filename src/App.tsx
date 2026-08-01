import { useState } from 'react'
import Onboarding from './components/Onboarding'
import HomeFeed from './components/HomeFeed'
import { AppContext } from './lib/context'
import type { UserProfile } from './lib/constants'

type Screen = 'feed' | 'post-intent'

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [screen, setScreen] = useState<Screen>('feed')

  return (
    <AppContext.Provider value={{ user, setUser }}>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-xl">
        {user ? (
          screen === 'feed' ? (
            <HomeFeed onPostIntent={() => setScreen('post-intent')} />
          ) : (
            <PostIntentPlaceholder onBack={() => setScreen('feed')} />
          )
        ) : (
          <Onboarding onComplete={(u) => { setUser(u); setScreen('feed') }} />
        )}
      </div>
    </AppContext.Provider>
  )
}

function PostIntentPlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Post an Intent</h2>
      <p className="text-slate-500 text-sm mb-6">This screen is coming soon.</p>
      <button
        onClick={onBack}
        className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-95 transition-all"
      >
        Back to Feed
      </button>
    </div>
  )
}
