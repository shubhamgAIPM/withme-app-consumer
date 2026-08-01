import { useState } from 'react'
import Onboarding from './components/Onboarding'
import HomeFeed from './components/HomeFeed'
import PostIntent from './components/PostIntent'
import MatchScreen from './components/MatchScreen'
import GroupScreen from './components/GroupScreen'
import { AppContext } from './lib/context'
import type { UserProfile } from './lib/constants'

type Screen =
  | { name: 'feed' }
  | { name: 'post-intent' }
  | { name: 'match'; intentId: string }
  | { name: 'group'; matchId: string }

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'feed' })

  return (
    <AppContext.Provider value={{ user, setUser }}>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-xl">
        {user ? (
          screen.name === 'feed' ? (
            <HomeFeed
              onPostIntent={() => setScreen({ name: 'post-intent' })}
              onOpenMatch={(intentId) => setScreen({ name: 'match', intentId })}
            />
          ) : screen.name === 'post-intent' ? (
            <PostIntent
              onBack={() => setScreen({ name: 'feed' })}
              onPosted={(intentId) => setScreen({ name: 'match', intentId })}
            />
          ) : screen.name === 'match' ? (
            <MatchScreen
              intentId={screen.intentId}
              onBack={() => setScreen({ name: 'feed' })}
              onMatch={(matchId) => setScreen({ name: 'group', matchId })}
            />
          ) : (
            <GroupScreen
              matchId={screen.matchId}
              onBack={() => setScreen({ name: 'feed' })}
            />
          )
        ) : (
          <Onboarding onComplete={(u) => { setUser(u); setScreen({ name: 'feed' }) }} />
        )}
      </div>
    </AppContext.Provider>
  )
}
