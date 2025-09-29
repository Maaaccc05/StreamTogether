import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const server = createServer(app)

// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"]
  }
});

app.use(cors())
app.use(express.json())

// Store room data
const rooms = new Map()

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Join a room
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId)
    socket.username = username
    socket.roomId = roomId

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        currentVideo: null,
        isPlaying: false,
        currentTime: 0,
        host: socket.id
      })
    }

    const room = rooms.get(roomId)
    room.users.set(socket.id, { username, id: socket.id })

    // Send current room state to the new user
    socket.emit('room-state', {
      currentVideo: room.currentVideo,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      users: Array.from(room.users.values()),
      isHost: room.host === socket.id
    })

    // Notify others about the new user
    socket.to(roomId).emit('user-joined', { 
      username, 
      userId: socket.id,
      users: Array.from(room.users.values())
    })

    console.log(`${username} joined room ${roomId}`)
  })

  // Handle video changes
  socket.on('video-change', ({ roomId, videoId, videoTitle }) => {
    const room = rooms.get(roomId)
    if (room && room.host === socket.id) {
      room.currentVideo = { videoId, videoTitle }
      room.currentTime = 0
      room.isPlaying = false
      
      socket.to(roomId).emit('video-changed', { 
        videoId, 
        videoTitle,
        currentTime: 0,
        isPlaying: false
      })
    }
  })

  // Handle play/pause events
  socket.on('video-play', ({ roomId, currentTime }) => {
    const room = rooms.get(roomId)
    if (room) {
      room.isPlaying = true
      room.currentTime = currentTime
      socket.to(roomId).emit('video-play', { currentTime })
    }
  })

  socket.on('video-pause', ({ roomId, currentTime }) => {
    const room = rooms.get(roomId)
    if (room) {
      room.isPlaying = false
      room.currentTime = currentTime
      socket.to(roomId).emit('video-pause', { currentTime })
    }
  })

  // Handle seek events
  socket.on('video-seek', ({ roomId, currentTime }) => {
    const room = rooms.get(roomId)
    if (room && room.host === socket.id) {
      room.currentTime = currentTime
      socket.to(roomId).emit('video-seek', { currentTime })
    }
  })

  // Handle chat messages
  socket.on('chat-message', ({ roomId, message }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id)
      const chatMessage = {
        id: Date.now(),
        username: user.username,
        message,
        timestamp: new Date().toLocaleTimeString()
      }
      
      io.to(roomId).emit('chat-message', chatMessage)
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId)
      room.users.delete(socket.id)
      
      // If the host disconnects, assign a new host
      if (room.host === socket.id && room.users.size > 0) {
        room.host = room.users.keys().next().value
        io.to(socket.roomId).emit('new-host', { hostId: room.host })
      }
      
      // Notify others about user leaving
      socket.to(socket.roomId).emit('user-left', { 
        userId: socket.id,
        username: socket.username,
        users: Array.from(room.users.values())
      })
      
      // Remove room if empty
      if (room.users.size === 0) {
        rooms.delete(socket.roomId)
      }
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})