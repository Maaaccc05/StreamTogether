import { useState, useEffect, useRef } from 'react'
import useSocket from '../hooks/useSocket'
import VideoPlayer from './VideoPlayer'
import Chat from './Chat'
import UsersList from './UsersList'

const RoomPage = ({ roomId, username, onLeaveRoom }) => {
  const { 
    isConnected, 
    roomState, 
    messages, 
    changeVideo, 
    playVideo, 
    pauseVideo, 
    seekVideo, 
    sendMessage,
    sendReaction
  } = useSocket(roomId, username)

  const [showChat, setShowChat] = useState(true)
  const [connectionTimeout, setConnectionTimeout] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastSeenMessageId, setLastSeenMessageId] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const menuRef = useRef(null)

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy room code:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = roomId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle chat toggle and reset unread count
  const handleChatToggle = () => {
    if (!showChat) {
      setUnreadCount(0)
      if (messages.length > 0) {
        setLastSeenMessageId(messages[messages.length - 1].id)
      }
    }
    setShowChat(!showChat)
    setMenuOpen(false)
  }

  // Close hamburger menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  // Track unread messages when chat is hidden
  useEffect(() => {
    if (!showChat && messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      // Only count user messages and system messages (not initial load)
      if (latestMessage.id > lastSeenMessageId && 
          (latestMessage.type === 'user' || latestMessage.type === 'system') &&
          latestMessage.username !== username) { // Don't count own messages
        setUnreadCount(prev => prev + 1)
      }
    }
  }, [messages, showChat, lastSeenMessageId, username])

  // Reset unread count when chat becomes visible
  useEffect(() => {
    if (showChat && messages.length > 0) {
      setUnreadCount(0)
      setLastSeenMessageId(messages[messages.length - 1].id)
    }
  }, [showChat, messages])

  // Set reconnecting state when not connected
  useEffect(() => {
    if (!isConnected) {
      setReconnecting(true)
    } else {
      setReconnecting(false)
    }
  }, [isConnected])

  // Set a timeout to show reconnection options if connection takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isConnected) {
        setConnectionTimeout(true)
      }
    }, 10000) // 10 seconds timeout

    if (isConnected) {
      setConnectionTimeout(false)
    }

    return () => clearTimeout(timer)
  }, [isConnected])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">
            {reconnecting ? 'Connecting to room' : 'Connecting to room'} {roomId}...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {reconnecting ? 'Loading...' : 'Please wait while we restore your session'}
          </p>
          
          {/* {connectionTimeout && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg max-w-md mx-auto">
              <p className="text-yellow-400 text-sm mb-3">Connection is taking longer than expected</p>
              <button
                onClick={onLeaveRoom}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Return to Home & Try Again
              </button>
            </div>
          )} */}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 lg:px-6 py-2 lg:py-4">
        <div className="flex items-center justify-between gap-2">

          {/* Left — branding + room code */}
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <h1 className="text-base lg:text-2xl font-bold text-white whitespace-nowrap">
              🎬 StreamTogether
            </h1>
            <div className="bg-gray-700 px-2 lg:px-3 py-1 rounded-lg flex items-center gap-2">
              <div className="min-w-0">
                <span className="text-xs lg:text-sm text-gray-300">Room: </span>
                <span className="text-xs lg:text-sm font-mono text-white">{roomId}</span>
              </div>
              <button
                onClick={copyRoomCode}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors flex items-center gap-1 flex-shrink-0"
                title="Copy room code"
              >
                {copied ? (
                  <><span>✓</span><span className="hidden sm:inline">Copied!</span></>
                ) : (
                  <><span>📋</span><span className="hidden sm:inline">Copy</span></>
                )}
              </button>
            </div>
            {roomState.isHost && (
              <span className="bg-purple-600 px-2 py-1 rounded text-xs font-semibold text-white flex-shrink-0">
                HOST
              </span>
            )}
          </div>

          {/* Right — desktop buttons (hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={handleChatToggle}
              className="relative px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {showChat ? 'Hide Chat' : 'Show Chat'}
              {!showChat && unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Leave
            </button>
          </div>

          {/* Right — hamburger menu (mobile only) */}
          <div className="relative lg:hidden flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="relative flex flex-col justify-center items-center w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-600 transition-colors gap-[5px] p-2"
            >
              {/* Animated hamburger bars */}
              <span className={`block w-full h-0.5 bg-white rounded-full transition-all duration-200 origin-center ${
                menuOpen ? 'rotate-45 translate-y-[7px]' : ''
              }`} />
              <span className={`block w-full h-0.5 bg-white rounded-full transition-all duration-200 ${
                menuOpen ? 'opacity-0 scale-x-0' : ''
              }`} />
              <span className={`block w-full h-0.5 bg-white rounded-full transition-all duration-200 origin-center ${
                menuOpen ? '-rotate-45 -translate-y-[7px]' : ''
              }`} />
              {/* Unread badge on hamburger */}
              {!showChat && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="hamburger-dropdown absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden z-50">
                <button
                  onClick={handleChatToggle}
                  className="relative w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-gray-700 active:bg-gray-700 transition-colors text-left"
                >
                  <span className="text-base">{showChat ? '🙈' : '💬'}</span>
                  <span>{showChat ? 'Hide Chat' : 'Show Chat'}</span>
                  {!showChat && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold flex-shrink-0">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <div className="h-px bg-gray-700" />
                <button
                  onClick={() => { setShowUsersModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-gray-700 active:bg-gray-700 transition-colors text-left"
                >
                  <span className="text-base">👥</span>
                  <span>Participants ({roomState.users.length})</span>
                </button>
                <div className="h-px bg-gray-700" />
                <button
                  onClick={() => { setMenuOpen(false); setShowLeaveConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-gray-700 active:bg-gray-700 transition-colors text-left"
                >
                  <span className="text-base">🚪</span>
                  <span>Leave Room</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row overflow-hidden" style={{ height: 'calc(100dvh - 64px)' }}>
        {/* Video Section — shrinks to content on mobile, grows on desktop */}
        <div className="flex-shrink-0 lg:flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            {/* Error Boundary for VideoPlayer */}
            <div className="w-full h-full">
              <VideoPlayer
                currentVideo={roomState.currentVideo}
                isPlaying={roomState.isPlaying}
                currentTime={roomState.currentTime}
                isHost={roomState.isHost}
                onVideoChange={changeVideo}
                onPlay={playVideo}
                onPause={pauseVideo}
                onSeek={seekVideo}
              />
            </div>
          </div>
          
          {/* Users List (Desktop only) */}
          <div className="hidden lg:block bg-gray-800 border-t border-gray-700 p-2 sm:p-4 flex-shrink-0">
            <UsersList users={roomState.users} currentUsername={username} />
          </div>
        </div>

        {/* Chat Section — fills ALL remaining space on mobile */}
        {showChat && (
          <div className="w-full lg:w-80 bg-gray-800 border-t-2 border-gray-700 lg:border-t-0 lg:border-l flex flex-col flex-1 min-h-0 lg:flex-none lg:h-full overflow-hidden">
            <Chat
              messages={messages}
              onSendMessage={(msg, replyTo) => sendMessage(msg, replyTo)}
              onReact={sendReaction}
              currentUsername={username}
            />
          </div>
        )}
      </div>
      {/* Users List Modal (Mobile only, triggered from hamburger menu) */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowUsersModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
            <div className="mt-2 text-left">
              <UsersList users={roomState.users} currentUsername={username} />
            </div>
            <button
              onClick={() => setShowUsersModal(false)}
              className="mt-6 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
          Close
            </button>
          </div>
        </div>
      )}
      {/* ── Leave Room Confirmation Modal ── */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onTouchStart={(e) => { if (e.target === e.currentTarget) setShowLeaveConfirm(false) }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLeaveConfirm(false) }}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(17,24,39,0.98) 0%, rgba(30,20,50,0.98) 100%)',
              border: '1px solid rgba(147,51,234,0.35)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(147,51,234,0.2)',
            }}
          >
            {/* Icon */}
            <div className="text-5xl select-none">🚪</div>

            {/* Text */}
            <div className="text-center">
              <h2 className="text-white font-bold text-lg mb-1">Leave Room?</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Are you sure you want to leave? You can always rejoin with the room code.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-300 transition-all duration-150 active:scale-95"
                style={{ background: 'rgba(75,85,99,0.5)', border: '1px solid rgba(107,114,128,0.4)' }}
              >
                Stay
              </button>
              <button
                onClick={() => { setShowLeaveConfirm(false); onLeaveRoom(); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  boxShadow: '0 4px 15px rgba(220,38,38,0.4)',
                }}
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomPage