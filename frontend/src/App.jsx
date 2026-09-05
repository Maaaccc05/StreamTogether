import { useState, useEffect } from 'react'
import HomePage from './components/HomePage'
import RoomPage from './components/RoomPage'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [roomData, setRoomData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved room data on app start
  useEffect(() => {
    const savedRoomData = localStorage.getItem('streamTogether_roomData')
    if (savedRoomData) {
      try {
        const parsedData = JSON.parse(savedRoomData)
        if (parsedData.roomId && parsedData.username) {
          setRoomData(parsedData)
          setCurrentPage('room')
        } else {
          localStorage.removeItem('streamTogether_roomData')
        }
      } catch {
        localStorage.removeItem('streamTogether_roomData')
      }
    }
    setIsLoading(false)
  }, [])

  const joinRoom = (roomId, username) => {
    const newRoomData = { roomId, username }
    setRoomData(newRoomData)
    setCurrentPage('room')
    try {
      localStorage.setItem('streamTogether_roomData', JSON.stringify(newRoomData))
    } catch { /* storage unavailable */ }
  }

  const leaveRoom = () => {
    setRoomData(null)
    setCurrentPage('home')
    
    // Clear saved room data
    try {
      localStorage.removeItem('streamTogether_roomData')
    } catch { /* storage unavailable */ }
  }

  // Show loading screen while checking for saved session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading StreamTogether...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {currentPage === 'home' ? (
        <HomePage onJoinRoom={joinRoom} />
      ) : (
        <RoomPage 
          roomId={roomData.roomId} 
          username={roomData.username}
          onLeaveRoom={leaveRoom}
        />
      )}
    </div>
  )
}

export default App
