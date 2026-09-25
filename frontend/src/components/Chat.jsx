import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

/* ─── Icons ─────────────────────────────────────────────────────────── */
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
)

const SwipeReplyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
    <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z" clipRule="evenodd" />
  </svg>
)

const truncate = (text, max = 80) =>
  text && text.length > max ? text.slice(0, max) + '…' : text

/* ─── Emoji Picker (Portaled to prevent container clipping) ─────────── */
const QUICK_REACTS = ['❤️', '😂', '😦', '😢', '😭', '😒', '😛']

const EmojiPicker = ({ triggerRect, onSelect, onClose, isOwn }) => {
  const ref = useRef(null)

  const computeCoords = useCallback(() => {
    if (!triggerRect) return { top: 0, left: 0 }
    const pickerWidth = 190
    const pickerHeight = 96
    const margin = 6

    let top = triggerRect.top - pickerHeight - margin
    if (top < 10) top = triggerRect.bottom + margin

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

  useEffect(() => {
    const handleDown = (e) => {
      const isTriggerClick = e.target?.closest?.('[data-reaction-picker-trigger="true"]')
      if (isTriggerClick) return
      if (ref.current && !ref.current.contains(e.target)) onClose()
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
      className="flex flex-col gap-2 rounded-2xl p-2.5 border border-gray-600/60"
    >
      <div className="grid grid-cols-7 gap-1.5">
        {QUICK_REACTS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onSelect(emoji); onClose() }}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-xl hover:bg-gray-700/80 active:scale-90 transition-all duration-150"
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

/* ─── Swipeable Message (WhatsApp / Instagram style reply) ──────────── */
const SWIPE_THRESHOLD = 58   // px drag before reply fires
const SWIPE_MAX       = 80   // max visual translation

const SwipeableMessage = ({ children, onSwipe, isOwn }) => {
  const startXRef    = useRef(null)
  const startYRef    = useRef(null)
  const rafRef       = useRef(null)
  const triggeredRef = useRef(false)
  const lockedRef    = useRef(null) // 'swipe' | 'scroll' | null

  const [translateX, setTranslateX] = useState(0)
  const [dragging,   setDragging]   = useState(false)
  const [triggered,  setTriggered]  = useState(false)

  const commit = useCallback((x) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => setTranslateX(x))
  }, [])

  // These handlers are meant to be spread onto the BUBBLE element only
  const bubbleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return
    startXRef.current    = e.touches[0].clientX
    startYRef.current    = e.touches[0].clientY
    triggeredRef.current = false
    lockedRef.current    = null
    setTriggered(false)
    setDragging(false)
  }, [])

  const bubbleTouchMove = useCallback((e) => {
    if (startXRef.current === null) return

    const dx  = e.touches[0].clientX - startXRef.current
    const dy  = e.touches[0].clientY - startYRef.current
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)

    // Determine lock direction once we know intent
    if (lockedRef.current === null && (adx > 5 || ady > 5)) {
      lockedRef.current = adx > ady ? 'swipe' : 'scroll'
    }

    // If user is scrolling vertically — do nothing, let native scroll happen
    if (lockedRef.current === 'scroll') return

    // own messages swipe LEFT (negative), others swipe RIGHT (positive)
    const ok = isOwn ? dx < 0 : dx > 0
    if (!ok) return

    if (adx > 6) {
      setDragging(true)
      e.preventDefault()   // block scroll only when truly swiping the bubble
    }

    // Rubber-band: normal until threshold, then slow down
    const visual = adx < SWIPE_THRESHOLD
      ? adx
      : SWIPE_THRESHOLD + (adx - SWIPE_THRESHOLD) * 0.25
    const clamped = Math.min(visual, SWIPE_MAX)
    commit(clamped * (isOwn ? -1 : 1))

    if (adx >= SWIPE_THRESHOLD && !triggeredRef.current) {
      triggeredRef.current = true
      setTriggered(true)
      if (navigator.vibrate) navigator.vibrate(12)
    }
  }, [isOwn, commit])

  const bubbleTouchEnd = useCallback(() => {
    if (triggeredRef.current) onSwipe()
    // Spring back
    commit(0)
    setDragging(false)
    setTriggered(false)
    startXRef.current    = null
    startYRef.current    = null
    triggeredRef.current = false
    lockedRef.current    = null
  }, [onSwipe, commit])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const absX      = Math.abs(translateX)
  const iconAlpha = Math.min(absX / SWIPE_THRESHOLD, 1)
  const iconScale = 0.5 + 0.5 * Math.min(absX / SWIPE_THRESHOLD, 1)

  // Expose touch props + slide state to children via render-prop
  const bubbleProps = {
    onTouchStart: bubbleTouchStart,
    onTouchMove:  bubbleTouchMove,
    onTouchEnd:   bubbleTouchEnd,
    style: {
      transform:  `translateX(${translateX}px)`,
      transition: dragging ? 'none' : 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1)',
      willChange: 'transform',
      touchAction: lockedRef.current === 'swipe' ? 'none' : 'pan-y',
    },
  }

  return (
    <div className="relative overflow-hidden select-none">
      {/* Reply icon peeking behind the bubble */}
      <div
        aria-hidden
        className={`absolute inset-y-0 flex items-center px-2 pointer-events-none
          ${isOwn ? 'left-1' : 'right-1'}`}
        style={{
          opacity: iconAlpha,
          transform: `scale(${iconScale})`,
          transition: dragging ? 'none' : 'opacity 0.25s, transform 0.25s',
          color: triggered ? '#a78bfa' : '#9ca3af',
        }}
      >
        <SwipeReplyIcon />
      </div>

      {children(bubbleProps)}
    </div>
  )
}

/* ─── Main Chat Component ────────────────────────────────────────────── */
const Chat = ({ messages, onSendMessage, onReact, currentUsername }) => {
  const [inputMessage, setInputMessage] = useState('')
  const [replyTo,      setReplyTo]      = useState(null)
  const [hoveredId,    setHoveredId]    = useState(null)
  const [pickerState,  setPickerState]  = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const messagesEndRef     = useRef(null)
  const scrollContainerRef = useRef(null)
  const inputRef           = useRef(null)
  const messageRefs        = useRef({})
  // Track whether user is near the bottom so new messages auto-scroll
  const isAtBottomRef      = useRef(true)

  // ── Restore scroll position when the component mounts (tab switch) ──
  const savedScrollTopRef  = useRef(0)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    // Restore saved position
    el.scrollTop = savedScrollTopRef.current
    return () => {
      // Save position when unmounting (tab switch away)
      savedScrollTopRef.current = el.scrollTop
    }
  }, [])

  // ── Track if user is near the bottom ──
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distanceFromBottom < 80
    isAtBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }, [])

  // ── Auto-scroll only when user is already at the bottom ──
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

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

  const handleReply = useCallback((message) => {
    setReplyTo({ id: message.id, username: message.username, message: message.message })
    inputRef.current?.focus()
  }, [])

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
    const cleanRect = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
    setPickerState(prev => prev?.messageId === msgId ? null : { messageId: msgId, rect: cleanRect, isOwn })
  }, [])

  const closePicker = useCallback(() => setPickerState(null), [])

  const handleReact = (messageId, emoji) => {
    onReact?.(messageId, emoji)
    setPickerState(null)
  }

  return (
    /* Use height:100% + minHeight:0 so this works inside ANY flex parent,
       including floating/picture-in-picture windows on mobile */
    <div
      className="flex flex-col bg-gray-900 sm:bg-transparent"
      style={{ height: '100%', minHeight: 0, position: 'relative' }}
    >

      {/* ── Messages ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8 px-2">
            <div className="text-3xl mb-2">👋</div>
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn        = message.username === currentUsername
            const isPickerOpen = pickerState?.messageId === message.id
            const isHovered    = hoveredId === message.id
            const showReactBtn = isHovered || isPickerOpen

            return (
              <div
                key={message.id}
                ref={(el) => { if (el) messageRefs.current[message.id] = el }}
                onMouseEnter={() => setHoveredId(message.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* ── System message ── */}
                {message.type === 'system' ? (
                  <div className="text-center text-gray-400 text-xs py-1 px-1">
                    <span className="bg-gray-700 px-2 py-1 rounded break-words">{message.message}</span>
                  </div>
                ) : (
                  /* Swipe wrapper — touch handlers scoped to the bubble only */
                  <SwipeableMessage isOwn={isOwn} onSwipe={() => handleReply(message)}>
                    {(bubbleProps) => (
                      <div className={`flex flex-col py-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>

                        {/* Bubble row: emoji react button sits inline beside bubble */}
                        <div className={`flex items-end gap-1 max-w-[88%] sm:max-w-[78%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>

                          {/* ── Message bubble — swipe handlers live HERE only ── */}
                          <div
                            {...bubbleProps}
                            className={`rounded-2xl px-3 py-2 break-words shadow-sm min-w-0 flex-shrink ${
                              isOwn
                                ? 'bg-purple-600 text-white rounded-br-sm'
                                : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                            }`}
                          >
                            {/* Sender name (other users only) */}
                            {!isOwn && (
                              <div className="text-[11px] font-semibold mb-0.5 text-purple-300 truncate">
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
                                <span className={`block leading-snug line-clamp-2 ${isOwn ? 'text-purple-100/80' : 'text-gray-300/80'}`}>
                                  {truncate(message.replyTo.message)}
                                </span>
                              </button>
                            )}

                            {/* Message text */}
                            <div className="break-words text-sm leading-snug">{message.message}</div>
                          </div>

                          {/* ── Action buttons beside bubble ── */}
                          <div className={`flex flex-col items-center gap-0.5 flex-shrink-0 mb-0.5`}>

                            {/* Reply button — desktop only (mobile uses swipe) */}
                            <button
                              onClick={() => handleReply(message)}
                              aria-label={`Reply to ${message.username}`}
                              className={`
                                hidden sm:flex items-center justify-center
                                p-1.5 rounded-full
                                text-gray-400 hover:text-purple-300 hover:bg-gray-700/80
                                transition-all duration-150
                                ${showReactBtn
                                  ? 'opacity-100 scale-100 pointer-events-auto'
                                  : 'opacity-0 scale-75 pointer-events-none'}
                              `}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {/* Emoji react button — visible on both mobile and desktop */}
                            <button
                              data-reaction-picker-trigger="true"
                              onClick={(e) => togglePicker(message.id, e, isOwn)}
                              aria-label="Add reaction"
                              aria-expanded={isPickerOpen}
                              className={`
                                flex items-center justify-center
                                p-1.5 rounded-full
                                transition-all duration-150
                                ${isPickerOpen
                                  ? 'opacity-100 scale-100 bg-purple-600/40 text-purple-300 ring-1 ring-purple-400'
                                  : showReactBtn
                                    ? 'opacity-100 scale-100 text-gray-400 hover:text-yellow-300 hover:bg-gray-700/80'
                                    : 'opacity-0 scale-75 pointer-events-none text-gray-400'}
                              `}
                            >
                              <span className="text-sm">😊</span>
                            </button>
                          </div>
                        </div>

                        {/* ── Reaction pills ── */}
                        <div className="max-w-[88%] sm:max-w-[78%] w-full">
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
                  </SwipeableMessage>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Global Portaled Emoji Picker ── */}
      {pickerState && typeof document !== 'undefined' && createPortal(
        <EmojiPicker
          triggerRect={pickerState.rect}
          isOwn={pickerState.isOwn}
          onSelect={(emoji) => handleReact(pickerState.messageId, emoji)}
          onClose={closePicker}
        />,
        document.body
      )}

      {/* ── Scroll-to-bottom button ── */}
      <div
        aria-hidden={!showScrollBtn}
        style={{
          position: 'absolute',
          bottom: replyTo ? '132px' : '80px',
          right: '12px',
          zIndex: 50,
          opacity: showScrollBtn ? 1 : 0,
          transform: showScrollBtn ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.85)',
          transition: 'opacity 0.22s ease, transform 0.22s ease, bottom 0.22s ease',
          pointerEvents: showScrollBtn ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Scroll to latest message"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(147,51,234,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(167,139,250,0.4)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* ── Reply Preview Bar ── */}
      {replyTo && (
        <div className="mx-2 mb-1 flex items-start gap-2 bg-gray-700/80 border border-purple-600/40 rounded-xl px-3 py-2 text-xs flex-shrink-0">
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
      <div
        className="px-2 pt-2 border-t border-gray-700 bg-gray-800 sm:bg-transparent flex-shrink-0"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.username}…` : 'Type a message…'}
            className="flex-1 min-w-0 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            aria-label="Send message"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </form>
        <div className="text-[10px] text-gray-500 mt-1 text-center">
          {'Message length '}• {inputMessage.length}/500
        </div>
      </div>
    </div>
  )
}

export default Chat
