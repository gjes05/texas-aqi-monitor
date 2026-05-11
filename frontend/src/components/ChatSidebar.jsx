import { useState, useRef, useEffect } from 'react'
import './ChatSidebar.css'

const SUGGESTIONS = [
  'Is it safe to run outside in Austin today?',
  'Which Texas city has the worst air quality right now?',
  'Should I wear a mask in Houston?',
  'Compare air quality between Dallas and San Antonio.',
]

export default function ChatSidebar({ apiBase }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi! I can answer questions about current air quality across Texas. Ask me anything — like "Is it safe to exercise in El Paso today?" or "Which city has the cleanest air right now?"',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const question = (text ?? input).trim()
    if (!question || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) {
        // Parse detail from FastAPI error body if available, but always show the friendly message
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Unable to get AI response, please try again' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <aside className="chat-sidebar">
      <div className="chat-header">
        <div className="chat-header-icon">✦</div>
        <div>
          <h2>AQI Assistant</h2>
          <p>Powered by Gemini · Live Texas data</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.role === 'assistant' && <div className="avatar">AI</div>}
            <div className="bubble">{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="avatar">AI</div>
            <div className="bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="suggestions">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className="suggestion-chip"
              onClick={() => sendMessage(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about Texas air quality…"
          disabled={loading}
          aria-label="Chat input"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
