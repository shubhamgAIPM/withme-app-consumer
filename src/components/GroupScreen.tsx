import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/context'
import { getAvatarSvg, svgToDataUrl } from '../lib/constants'

interface GroupMember {
  id: string
  display_name: string
  avatar_id: string | null
}

interface MatchData {
  id: string
  intent_ids: string[]
  member_ids: string[]
  group_size: number
  gender_mix: string
  status: string
  venue_id: string | null
  datetime: string | null
  venues: { name: string } | null
}

interface ChatMessage {
  id: string
  match_id: string
  sender_id: string
  message: string
  created_at: string
}

interface GroupScreenProps {
  matchId: string
  onBack: () => void
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function redact(text: string): string {
  let result = text
  // 10-digit phone numbers (with optional spaces/dashes/dots)
  result = result.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted — stay on WithMe! until you\'ve met]')
  result = result.replace(/\b\d{10}\b/g, '[redacted — stay on WithMe! until you\'ve met]')
  // @handles
  result = result.replace(/@\w+/g, '[redacted — stay on WithMe! until you\'ve met]')
  // email-like patterns
  result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted — stay on WithMe! until you\'ve met]')
  return result
}

function formatCountdown(target: string): string {
  const now = new Date()
  const targetDate = new Date(target)
  const diff = targetDate.getTime() - now.getTime()

  if (diff <= 0) return 'Meetup time!'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
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

export default function GroupScreen({ matchId, onBack }: GroupScreenProps) {
  const { user } = useApp()
  const [match, setMatch] = useState<MatchData | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load match + members
  useEffect(() => {
    async function loadMatch() {
      setLoading(true)
      setError(null)

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(
          `id, intent_ids, member_ids, group_size, gender_mix, status, venue_id, datetime,
           venues ( name )`
        )
        .eq('id', matchId)
        .maybeSingle()

      if (matchError || !matchData) {
        setError(matchError?.message ?? 'Match not found')
        setLoading(false)
        return
      }

      const md = matchData as unknown as MatchData
      setMatch(md)

      // Load member profiles
      const { data: memberData, error: memberError } = await supabase
        .from('users')
        .select('id, display_name, avatar_id')
        .in('id', md.member_ids)

      if (memberError) {
        setError(memberError.message)
        setLoading(false)
        return
      }

      setMembers((memberData ?? []) as unknown as GroupMember[])
      setLoading(false)
    }
    loadMatch()
  }, [matchId])

  // Load messages + subscribe to realtime
  useEffect(() => {
    async function loadMessages() {
      const { data, error: msgError } = await supabase
        .from('chat_messages')
        .select('id, match_id, sender_id, message, created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      if (!msgError && data) {
        setMessages(data as ChatMessage[])
      }
    }

    loadMessages()

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  // Countdown timer
  useEffect(() => {
    if (!match?.datetime) return
    setCountdown(formatCountdown(match.datetime))
    const interval = setInterval(() => {
      setCountdown(formatCountdown(match.datetime!))
    }, 1000)
    return () => clearInterval(interval)
  }, [match?.datetime])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!newMessage.trim() || !user) return
    const text = newMessage.trim()
    setNewMessage('')

    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        match_id: matchId,
        sender_id: user.id,
        message: text,
      })

    if (insertError) {
      setError(insertError.message)
      setNewMessage(text)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-700 font-semibold mb-1">Something went wrong</p>
        <p className="text-slate-400 text-sm mb-6">{error ?? 'Match not found'}</p>
        <button onClick={onBack} className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold active:scale-95 transition-all">
          Back
        </button>
      </div>
    )
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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900">Your squad</h1>
            <p className="text-xs text-slate-500">
              {match.venues?.name ?? 'Venue TBD'}
              {match.datetime && ` · ${formatDateTime(match.datetime)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Members row + countdown */}
      <div className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {members.map((m) => {
            const avatarSvg = m.avatar_id ? getAvatarSvg(m.avatar_id) : ''
            const avatarUrl = avatarSvg ? svgToDataUrl(avatarSvg) : ''
            return (
              <div key={m.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 ring-2 ring-slate-100">
                  {avatarUrl && <img src={avatarUrl} alt={m.display_name} className="w-full h-full object-cover" />}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {firstName(m.display_name)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Countdown */}
        {match.datetime && (
          <div className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold text-blue-700">{countdown}</span>
          </div>
        )}
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col bg-slate-50">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-center">
              <p className="text-slate-400 text-sm">No messages yet. Say hello to your squad!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              const sender = members.find((m) => m.id === msg.sender_id)
              const senderName = sender ? firstName(sender.display_name) : 'Someone'
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-[10px] font-semibold text-slate-400 mb-0.5 ml-1">{senderName}</span>
                  )}
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
                    }`}
                  >
                    {redact(msg.message)}
                  </div>
                  <span className={`text-[10px] text-slate-300 mt-0.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Type a message…"
              className="flex-1 px-4 py-3 rounded-full border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 active:scale-90 disabled:opacity-30 disabled:bg-slate-300 transition-all flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
