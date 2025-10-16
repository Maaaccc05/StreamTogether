import { useState, useEffect } from 'react'
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
    sendMessage 
  } = useSocket(roomId, username)

  const [showChat, setShowChat] = useState(true)
  const [connectionTimeout, setConnectionTimeout] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastSeenMessageId, setLastSeenMessageId] = useState(0)

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
      // When showing chat, mark all messages as read
      setUnreadCount(0)
      if (messages.length > 0) {
        setLastSeenMessageId(messages[messages.length - 1].id)
      }
    }
    setShowChat(!showChat)
  }

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
            {reconnecting ? 'Reconnecting to room' : 'Connecting to room'} {roomId}...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {reconnecting ? 'Video has been paused for all users during reconnection' : 'Please wait while we restore your session'}
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
      <div className="bg-gray-800 border-b border-gray-700 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold text-white">
              🎬 StreamTogether
            </h1>
            <div className="bg-gray-700 px-2 sm:px-3 py-1 rounded-lg flex items-center space-x-2">
              <div>
                <span className="text-xs sm:text-sm text-gray-300">Room: </span>
                <span className="text-xs sm:text-sm font-mono text-white">{roomId}</span>
              </div>
              <button
                onClick={copyRoomCode}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors flex items-center space-x-1"
                title="Copy room code"
              >
                {copied ? (
                  <>
                    <span>✓</span>
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
            {roomState.isHost && (
              <span className="bg-purple-600 px-2 py-1 rounded text-xs font-semibold text-white">
                HOST
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={handleChatToggle}
              className="relative px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
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
              className="px-2 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
            >
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 h-[calc(100vh-80px)]">
        {/* Video Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
          
          {/* Users List */}
          <div className="bg-gray-800 border-t border-gray-700 p-2 sm:p-4 flex-shrink-0">
            <UsersList users={roomState.users} currentUsername={username} />
          </div>
        </div>

        {/* Chat Section */}
        {showChat && (
          <div className="w-full lg:w-80 bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-700 flex flex-col flex-shrink-0 h-64 lg:h-auto">
            <Chat
              messages={messages}
              onSendMessage={sendMessage}
              currentUsername={username}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default RoomPage