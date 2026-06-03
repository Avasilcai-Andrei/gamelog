import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`
const WS_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/ws'
  : 'ws://localhost:4000/ws'

export default function Chat() {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState('disconnected')
  const wsRef = useRef(null)
  const listRef = useRef(null)

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/messages?limit=50`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.items || [])
    } catch {}
  }

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    if (!currentUser) return
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws
    ws.onopen = () => setStatus('connected')
    ws.onclose = () => setStatus('disconnected')
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'chat_message') {
          setMessages(prev => [...prev, payload.message])
        }
      } catch {}
    }

    return () => ws.close()
  }, [currentUser?.id])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const sendMessage = async () => {
    if (!text.trim() || !currentUser) return
    const payload = {
      userId: currentUser.id,
      username: currentUser.username,
      content: text.trim(),
    }
    setText('')

    try {
      const res = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Chat error:', res.status, err)
        return
      }
      const saved = await res.json()
      setMessages(prev => [...prev, saved])
      wsRef.current?.send(JSON.stringify({ type: 'chat_message', message: saved }))
    } catch (e) {
      console.error('Chat send error:', e)
    }
  }

  return (
    <div className="page">
      <div className="sync-head">
        <h1 className="page-title">Realtime Chat</h1>
        <div className={`sync-status ${status === 'connected' ? 'online' : 'offline'}`}>
          {status === 'connected' ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="card chat-card">
        <div ref={listRef} className="chat-list">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble ${msg.userId === currentUser?.id ? 'mine' : ''}`}>
              <div className="chat-meta">{msg.username}</div>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            className="input"
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button className="btn btn-primary" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  )
}
