import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

/* ─── Icons ─────────────────────────────────────────────────────────── */
const ReplyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z" clipRule="evenodd" />
  </svg>
)

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
)

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
  </svg>
)

const truncate = (text, max = 80) =>
  text && text.length > max ? text.slice(0, max) + '…' : text

/* ─── Emoji Picker (Portaled to prevent container clipping) ─────────── */
const QUICK_REACTS = ['❤️', '😂', '😢', '😭', '😒', '😛', '👍']

const EmojiPicker = ({ triggerRect, onSelect, onClose, isOwn }) => {
  const ref = useRef(null)

  // Compute smart coordinates based on trigger button and viewport
  const computeCoords = useCallback(() => {
    if (!triggerRect) return { top: 0, left: 0 }
    const pickerWidth = 190
    const pickerHeight = 96
    const margin = 6

    // Vertical positioning: prefer above, flip below if not enough room
    let top = triggerRect.top - pickerHeight - margin
    if (top < 10) {
      top = triggerRect.bottom + margin
    }

    // Horizontal positioning: align with button side & clamp within viewport
    let left = isOwn ? triggerRect.right - pickerWidth : triggerRect.left
    const viewportWidth = window.innerWidth
    const maxLeft = viewportWidth - pickerWidth - 10
    left = Math.max(10, Math.min(left, maxLeft))

    return { top, left }
  }, [triggerRect, isOwn])

  const [coords, setCoords] = useState(computeCoords)

  useLayoutEffect(() => {
    setCoords(computeCoords())
  }, [computeCoords])

  // Close only when the user taps/clicks outside the picker.
  useEffect(() => {
    const handleDown = (e) => {
      const isTriggerClick = e.target?.closest?.('[data-reaction-picker-trigger="true"]')
      if (isTriggerClick) return
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleDown)
    document.addEventListener('touchstart', handleDown)
    document.addEventListener('pointerdown', handleDown)

    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('touchstart', handleDown)
      document.removeEventListener('pointerdown', handleDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: '190px',
        zIndex: 99999,
        background: 'rgba(15,20,35,0.98)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 10px 35px rgba(0,0,0,0.7), 0 0 0 1px rgba(147,51,234,0.3)',
      }}
      className="flex flex-col gap-2 rounded-2xl p-2.5 border border-gray-600/60 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Quick Emojis Row */}
      <div className="grid grid-cols-7 gap-1.5">
        {QUICK_REACTS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-gray-700/80 active:scale-90 transition-all duration-150"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Reaction Pills ─────────────────────────────────────────────────── */
const ReactionPills = ({ reactions, currentUsername, messageId, onReact, isOwn }) => {
  if (!reactions || Object.keys(reactions).length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {Object.entries(reactions).map(([emoji, users]) => {
        const reacted = users.includes(currentUsername)
        const tip = users.length <= 3
          ? users.map(u => u === currentUsername ? 'You' : u).join(', ')
          : users.slice(0, 3).map(u => u === currentUsername ? 'You' : u).join(', ') + ` +${users.length - 3}`

        return (
          <button
            key={emoji}
            onClick={() => onReact(messageId, emoji)}
            title={tip}
            aria-label={`${emoji} ${users.length} — ${tip}`}
            className={`
              reaction-pill
              flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs
              border transition-all duration-150 active:scale-90
              ${reacted
                ? 'bg-purple-600/30 border-purple-500/70 text-purple-200 hover:bg-purple-600/50'
                : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:bg-gray-600/80'}
            `}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="font-semibold tabular-nums">{users.length}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Main Chat Component ────────────────────────────────────────────── */
const Chat = ({ messages, onSendMessage, onReact, currentUsername }) => {
  const [inputMessage, setInputMessage] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [pickerState, setPickerState] = useState(null) // { messageId, rect, isOwn }
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const messageRefs = useRef({})

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim(), replyTo || null)
      setInputMessage('')
      setReplyTo(null)
      inputRef.current?.focus()
    }
  }

  const handleReply = (message) => {
    setReplyTo({ id: message.id, username: message.username, message: message.message })
    inputRef.current?.focus()
  }

  const cancelReply = () => {
    setReplyTo(null)
    inputRef.current?.focus()
  }

  const scrollToMessage = (id) => {
    const el = messageRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'background 0.3s'
      el.style.background = 'rgba(147,51,234,0.25)'
      setTimeout(() => { el.style.background = '' }, 1200)
    }
  }

  const togglePicker = useCallback((msgId, e, isOwn) => {
    if (!e || !e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cleanRect = {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
    }
    setPickerState(prev => {
      if (prev?.messageId === msgId) return null
      return { messageId: msgId, rect: cleanRect, isOwn }
    })
  }, [])

  const closePicker = useCallback(() => setPickerState(null), [])

  const handleReact = (messageId, emoji) => {
    onReact?.(messageId, emoji)
    setPickerState(null)
  }

  return (
    <div className="flex flex-col h-full min-h-[220px] sm:min-h-[300px] bg-gray-900 sm:bg-transparent">

      {/* ── Chat Header ── */}
      <div className="p-3 sm:p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <h3 className="text-white font-semibold text-sm sm:text-base truncate">💬 Chat</h3>
        <span className="ml-2 text-xs sm:text-sm text-gray-400">({messages.length} messages)</span>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 sm:space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-6 sm:py-8 px-2">
            <div className="text-3xl sm:text-4xl mb-2">👋</div>
            <p className="text-sm sm:text-base break-words">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.username === currentUsername
            const isPickerOpen = pickerState?.messageId === message.id
            const isHovered = hoveredId === message.id

            return (
              <div
                key={message.id}
                ref={(el) => { if (el) messageRefs.current[message.id] = el }}
                className="group rounded-lg"
                onMouseEnter={() => setHoveredId(message.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* ── System message ── */}
                {message.type === 'system' ? (
                  <div className="text-center text-gray-400 text-xs sm:text-sm py-1 px-1">
                    <span className="bg-gray-700 px-2 py-1 rounded break-words">{message.message}</span>
                  </div>
                ) : (
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>

                    {/* Row: action buttons + bubble, vertically centred */}
                    <div className={`flex items-center gap-1.5 max-w-[92%] sm:max-w-[82%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>

                      {/* ── Action buttons (reply + react/+) ── */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 relative">

                        {/* Reply */}
                        <button
                          onClick={() => handleReply(message)}
                          aria-label={`Reply to ${message.username}`}
                          className={`
                            p-1.5 rounded-full
                            text-gray-400 hover:text-purple-300 hover:bg-gray-700/80
                            transition-all duration-150
                            ${isHovered || isPickerOpen
                              ? 'opacity-100 scale-100 pointer-events-auto'
                              : 'opacity-70 sm:opacity-0 scale-90 sm:pointer-events-none'}
                          `}
                        >
                          <ReplyIcon />
                        </button>

                        {/* React + (plus icon) */}
                        <button
                          data-reaction-picker-trigger="true"
                          onClick={(e) => togglePicker(message.id, e, isOwn)}
                          aria-label="Add reaction"
                          aria-expanded={isPickerOpen}
                          title="React with emoji"
                          className={`
                            p-1.5 rounded-full
                            transition-all duration-150
                            ${isPickerOpen
                              ? 'opacity-100 scale-100 bg-purple-600/40 text-purple-300 pointer-events-auto ring-1 ring-purple-400'
                              : isHovered
                                ? 'opacity-100 scale-100 text-gray-400 hover:text-yellow-300 hover:bg-gray-700/80 pointer-events-auto'
                                : 'opacity-70 sm:opacity-0 scale-90 sm:pointer-events-none text-gray-400'}
                          `}
                        >
                          <span className="text-sm sm:text-base">😊</span>
                        </button>
                      </div>

                      {/* ── Message bubble ── */}
                      <div
                        className={`rounded-2xl px-3 py-2 break-words shadow-sm ${
                          isOwn
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                        }`}
                      >
                        {/* Sender name (other users only) */}
                        {!isOwn && (
                          <div className="text-[11px] sm:text-xs font-semibold mb-0.5 text-purple-300 truncate">
                            {message.username}
                          </div>
                        )}

                        {/* Reply quote */}
                        {message.replyTo && (
                          <button
                            onClick={() => scrollToMessage(message.replyTo.id)}
                            className={`
                              w-full text-left mb-1.5 px-2 py-1 rounded-lg text-xs
                              border-l-2 border-purple-300
                              ${isOwn ? 'bg-purple-700/60 hover:bg-purple-700/80' : 'bg-gray-600/60 hover:bg-gray-600/80'}
                              transition-colors duration-150
                            `}
                          >
                            <span className={`font-semibold block mb-0.5 ${isOwn ? 'text-purple-200' : 'text-purple-300'}`}>
                              ↩ {message.replyTo.username === currentUsername ? 'You' : message.replyTo.username}
                            </span>
                            <span className={`block leading-snug truncate ${isOwn ? 'text-purple-100/80' : 'text-gray-300/80'}`}>
                              {truncate(message.replyTo.message)}
                            </span>
                          </button>
                        )}

                        {/* Message text — no timestamp */}
                        <div className="break-words text-sm sm:text-base leading-snug">{message.message}</div>
                      </div>
                    </div>

                    {/* ── Reaction pills (below bubble) ── */}
                    <div className={`${isOwn ? 'pr-10 sm:pr-11' : 'pl-10 sm:pl-11'} max-w-[92%] sm:max-w-[82%] w-full`}>
                      <ReactionPills
                        reactions={message.reactions}
                        currentUsername={currentUsername}
                        messageId={message.id}
                        onReact={handleReact}
                        isOwn={isOwn}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Global Portaled Emoji Picker (Prevents any clipping in responsive) ── */}
      {pickerState && typeof document !== 'undefined' && createPortal(
        <EmojiPicker
          triggerRect={pickerState.rect}
          isOwn={pickerState.isOwn}
          onSelect={(emoji) => handleReact(pickerState.messageId, emoji)}
          onClose={closePicker}
        />,
        document.body
      )}

      {/* ── Reply Preview Bar ── */}
      {replyTo && (
        <div className="mx-2 sm:mx-4 mb-1 flex items-start gap-2 bg-gray-700/80 border border-gray-600 rounded-xl px-3 py-2 text-xs">
          <div className="flex-1 min-w-0">
            <span className="text-purple-300 font-semibold block mb-0.5">
              ↩ Replying to {replyTo.username === currentUsername ? 'yourself' : replyTo.username}
            </span>
            <span className="text-gray-300 block truncate">{truncate(replyTo.message, 100)}</span>
          </div>
          <button
            onClick={cancelReply}
            aria-label="Cancel reply"
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-gray-600 mt-0.5"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* ── Message Input ── */}
      <div className="p-2 sm:p-4 border-t border-gray-700 bg-gray-800 sm:bg-transparent flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.username}…` : 'Type a message…'}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base transition-all"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            {replyTo ? 'Reply' : 'Send'}
          </button>
        </form>
        <div className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 text-center sm:text-left">
          Press Enter to send • {inputMessage.length}/500
        </div>
      </div>
    </div>
  )
}

export default Chat
