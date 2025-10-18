import { useState } from 'react'

const HomePage = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('')
  const [username, setUsername] = useState('')
  const [errors, setErrors] = useState({})

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomId(randomId)
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!roomId.trim()) {
      newErrors.roomId = 'Room ID is required'
    }
    
    if (!username.trim()) {
      newErrors.username = 'Username is required'
    } else if (username.trim().length < 2) {
      newErrors.username = 'Username must be at least 2 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleJoinRoom = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      onJoinRoom(roomId.trim().toUpperCase(), username.trim())
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎬 StreamTogether
          </h1>
          <p className="text-gray-300">
            Watch YouTube videos together in real-time
          </p>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter or generate room ID"
                className={`flex-1 px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.roomId ? 'border-red-500' : 'border-gray-600'
                }`}
                maxLength={6}
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
              >
                Generate
              </button>
            </div>
            {errors.roomId && (
              <p className="text-red-400 text-sm mt-1">{errors.roomId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your display name"
              className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.username ? 'border-red-500' : 'border-gray-600'
              }`}
              maxLength={20}
            />
            {errors.username && (
              <p className="text-red-400 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-105"
          >
            Join Room
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Share the Room ID with friends to watch together!
          </p>
        </div>
      </div>
    </div>
  )
}

export default HomePage
