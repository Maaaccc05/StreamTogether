import { useState, useEffect } from 'react'
import HomePage from './components/HomePage'
import RoomPage from './components/RoomPage'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [roomData, setRoomData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved room data on app start
  useEffect(() => {
    console.log('App starting, checking for saved room data...')
    const savedRoomData = localStorage.getItem('streamTogether_roomData')
    console.log('Saved room data:', savedRoomData)
    
    if (savedRoomData) {
      try {
        const parsedData = JSON.parse(savedRoomData)
        console.log('Parsed room data:', parsedData)
        
        // Validate the data has required fields
        if (parsedData.roomId && parsedData.username) {
          setRoomData(parsedData)
          setCurrentPage('room')
          console.log('Restored session for room:', parsedData.roomId)
        } else {
          console.log('Invalid room data, clearing localStorage')
          localStorage.removeItem('streamTogether_roomData')
        }
      } catch (error) {
        console.error('Error parsing saved room data:', error)
        localStorage.removeItem('streamTogether_roomData')
      }
    } else {
      console.log('No saved room data found')
    }
    
    setIsLoading(false)
  }, [])

  const joinRoom = (roomId, username) => {
    console.log('Joining room:', roomId, 'as user:', username)
    const newRoomData = { roomId, username }
    setRoomData(newRoomData)
    setCurrentPage('room')
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('streamTogether_roomData', JSON.stringify(newRoomData))
      console.log('Room data saved to localStorage')
    } catch (error) {
      console.error('Error saving room data to localStorage:', error)
    }
  }

  const leaveRoom = () => {
    console.log('Leaving room')
    setRoomData(null)
    setCurrentPage('home')
    
    // Clear saved room data
    try {
      localStorage.removeItem('streamTogether_roomData')
      console.log('Room data cleared from localStorage')
    } catch (error) {
      console.error('Error clearing room data from localStorage:', error)
    }
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
