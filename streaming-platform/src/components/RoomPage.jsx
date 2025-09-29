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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">
              🎬 StreamTogether
            </h1>
            <div className="bg-gray-700 px-3 py-1 rounded-lg">
              <span className="text-sm text-gray-300">Room: </span>
              <span className="text-sm font-mono text-white">{roomId}</span>
            </div>
            {roomState.isHost && (
              <span className="bg-purple-600 px-2 py-1 rounded text-xs font-semibold text-white">
                HOST
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showChat ? 'Hide Chat' : 'Show Chat'}
            </button>
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 h-[calc(100vh-80px)]">
        {/* Video Section */}
        <div className={`flex-1 flex flex-col ${showChat ? 'mr-80' : ''}`}>
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
          
          {/* Users List */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <UsersList users={roomState.users} currentUsername={username} />
          </div>
        </div>

        {/* Chat Section */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
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