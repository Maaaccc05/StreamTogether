import { useState } from 'react'
import HomePage from './components/HomePage'
import RoomPage from './components/RoomPage'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [roomData, setRoomData] = useState(null)

  const joinRoom = (roomId, username) => {
    setRoomData({ roomId, username })
    setCurrentPage('room')
  }

  const leaveRoom = () => {
    setRoomData(null)
    setCurrentPage('home')
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
