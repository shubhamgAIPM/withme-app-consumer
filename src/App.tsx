import { useState } from 'react'
import Onboarding from './components/Onboarding'
import HomeFeed from './components/HomeFeed'
import PostIntent from './components/PostIntent'
import MatchScreen from './components/MatchScreen'
import GroupScreen from './components/GroupScreen'
import AIConcierge from './components/AIConcierge'
import TrustProfile from './components/TrustProfile'
import { AppContext } from './lib/context'
import type { UserProfile } from './lib/constants'

type Tab = 'feed' | 'concierge' | 'profile'

type Screen =
  | { name: 'tab'; tab: Tab }
  | { name: 'post-intent' }
  | { name: 'match'; intentId: string }
  | { name: 'group'; matchId: string }

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'tab', tab: 'feed' })

  const goFeed = () => setScreen({ name: 'tab', tab: 'feed' })

  return (
    <AppContext.Provider value={{ user, setUser }}>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-xl">
        {user ? (
          screen.name === 'post-intent' ? (
            <PostIntent onBack={goFeed} onPosted={(intentId) => setScreen({ name: 'match', intentId })} />
          ) : screen.name === 'match' ? (
            <MatchScreen intentId={screen.intentId} onBack={goFeed} onMatch={(matchId) => setScreen({ name: 'group', matchId })} />
          ) : screen.name === 'group' ? (
            <GroupScreen matchId={screen.matchId} onBack={goFeed} />
          ) : (
            <>
              {/* Tab content */}
              <div className="pb-20">
                {screen.tab === 'feed' && (
                  <HomeFeed
                    onPostIntent={() => setScreen({ name: 'post-intent' })}
                    onOpenMatch={(intentId) => setScreen({ name: 'match', intentId })}
                  />
                )}
                {screen.tab === 'concierge' && <AIConcierge />}
                {screen.tab === 'profile' && <TrustProfile />}
              </div>

              {/* Bottom tab bar */}
              <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-100 z-30">
                <div className="flex items-center justify-around px-2 py-2">
                  <TabButton
                    active={screen.tab === 'feed'}
                    onClick={() => setScreen({ name: 'tab', tab: 'feed' })}
                    label="Feed"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    }
                  />
                  <TabButton
                    active={screen.tab === 'concierge'}
                    onClick={() => setScreen({ name: 'tab', tab: 'concierge' })}
                    label="Concierge"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    }
                  />
                  <TabButton
                    active={screen.tab === 'profile'}
                    onClick={() => setScreen({ name: 'tab', tab: 'profile' })}
                    label="Profile"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                  />
                </div>
              </nav>
            </>
          )
        ) : (
          <Onboarding onComplete={(u) => { setUser(u); setScreen({ name: 'tab', tab: 'feed' }) }} />
        )}
      </div>
    </AppContext.Provider>
  )
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all active:scale-90 ${
        active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  )
}
