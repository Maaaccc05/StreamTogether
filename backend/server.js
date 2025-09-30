import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const server = createServer(app)

const url = ``;
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);
// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", /
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

    console.log(`User ${username} attempting to join room ${roomId}`)
    console.log(`Room exists:`, rooms.has(roomId))

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      console.log(`Creating new room: ${roomId}`)
      rooms.set(roomId, {
        users: new Map(),
        currentVideo: null,
        isPlaying: false,
        currentTime: 0,
        host: socket.id,
        chatHistory: [] // Store chat messages
      })
    } else {
      console.log(`Room ${roomId} already exists with ${rooms.get(roomId).chatHistory.length} messages in history`)
    }

    const room = rooms.get(roomId)
    
    // Add a test message if this is the first user and room is new
    if (room.users.size === 0 && room.chatHistory.length === 0) {
      const welcomeMessage = {
        id: Date.now() - 1000, // Make it earlier than join message
        type: 'system',
        message: `Welcome to room ${roomId}! 🎬`,
        timestamp: new Date().toLocaleTimeString()
      }
      room.chatHistory.push(welcomeMessage)
      console.log('Added welcome message to new room')
    }
    
    room.users.set(socket.id, { username, id: socket.id })

    console.log(`Current chat history for room ${roomId}:`, room.chatHistory.length, 'messages')

    // Send current room state to the new user
    socket.emit('room-state', {
      currentVideo: room.currentVideo,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      users: Array.from(room.users.values()),
      isHost: room.host === socket.id,
      chatHistory: room.chatHistory // Send chat history
    })

    console.log(`Sent room state to ${username} with ${room.chatHistory.length} chat messages`)

    // Notify others about the new user
    const joinMessage = {
      id: Date.now(),
      type: 'system',
      message: `${username} joined the room`,
      timestamp: new Date().toLocaleTimeString()
    }
    
    // Store join message in chat history
    room.chatHistory.push(joinMessage)
    
    socket.to(roomId).emit('user-joined', { 
      username, 
      userId: socket.id,
      users: Array.from(room.users.values())
    })
    
    // Send join message to other users (not the joining user since they get full history)
    socket.to(roomId).emit('chat-message', joinMessage)

    console.log(`${username} joined room ${roomId}`)
  })

  // Handle video changes (allow any user to change video)
  socket.on('video-change', ({ roomId, videoId, videoTitle }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      room.currentVideo = { videoId, videoTitle }
      room.currentTime = 0
      room.isPlaying = false
      
      // Get username for the notification
      const user = room.users.get(socket.id)
      
      // Notify all users in the room about the video change (including the user who loaded it)
      io.to(roomId).emit('video-changed', { 
        videoId, 
        videoTitle,
        currentTime: 0,
        isPlaying: false,
        changedBy: user.username
      })
      
      // Add system message about video change
      const videoChangeMessage = {
        id: Date.now(),
        type: 'system',
        message: `${user.username} loaded: ${videoTitle}`,
        timestamp: new Date().toLocaleTimeString()
      }
      
      room.chatHistory.push(videoChangeMessage)
      io.to(roomId).emit('chat-message', videoChangeMessage)
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
    if (room) {
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
        timestamp: new Date().toLocaleTimeString(),
        type: 'user'
      }
      
      // Store message in room's chat history
      room.chatHistory.push(chatMessage)
      
      // Keep only last 100 messages to prevent memory issues
      if (room.chatHistory.length > 100) {
        room.chatHistory = room.chatHistory.slice(-100)
      }
      
      // Send to all users in the room
      io.to(roomId).emit('chat-message', chatMessage)
      
      console.log(`Chat message stored for room ${roomId}:`, chatMessage.message)
      console.log(`Total messages in room ${roomId}:`, room.chatHistory.length)
    }
  })

  // Handle explicit chat history requests
  socket.on('get-chat-history', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      console.log(`Sending chat history to ${socket.id}: ${room.chatHistory.length} messages`)
      socket.emit('chat-history', { chatHistory: room.chatHistory })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id, 'from room:', socket.roomId)
    
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId)
      const user = room.users.get(socket.id)
      
      console.log('Room state before disconnect:', {
        isPlaying: room.isPlaying,
        userCount: room.users.size,
        chatHistoryCount: room.chatHistory.length,
        disconnectingUser: user ? user.username : 'Unknown'
      })
      
      // DON'T delete room immediately on disconnect - wait to see if they reconnect
      // Remove user from room but keep room and chat history
      room.users.delete(socket.id)
      
      // Pause video for everyone when someone disconnects during playback
      if (room.isPlaying && room.users.size > 0) {
        console.log('Pausing video for all users due to disconnect')
        room.isPlaying = false
        
        io.to(socket.roomId).emit('video-pause', { 
          currentTime: room.currentTime,
          reason: 'user-disconnected',
          username: user ? user.username : 'Someone'
        })
        
        console.log('Pause event sent to room:', socket.roomId)
      }
      
      // If the host disconnects, assign a new host
      if (room.host === socket.id && room.users.size > 0) {
        const newHostId = room.users.keys().next().value
        room.host = newHostId
        console.log('New host assigned:', newHostId)
        io.to(socket.roomId).emit('new-host', { hostId: newHostId })
      }
      
      // Only notify others and add leave message if there are other users
      if (user && room.users.size > 0) {
        const leaveMessage = {
          id: Date.now(),
          type: 'system',
          message: `${user.username} left the room`,
          timestamp: new Date().toLocaleTimeString()
        }
        
        room.chatHistory.push(leaveMessage)
        
        socket.to(socket.roomId).emit('user-left', { 
          userId: socket.id,
          username: user.username,
          users: Array.from(room.users.values())
        })
        
        socket.to(socket.roomId).emit('chat-message', leaveMessage)
      }
      
      // Only remove room if empty for more than 30 seconds (to allow reconnection)
      if (room.users.size === 0) {
        console.log('Room is empty, scheduling cleanup in 30 seconds:', socket.roomId)
        setTimeout(() => {
          if (rooms.has(socket.roomId) && rooms.get(socket.roomId).users.size === 0) {
            console.log('Removing empty room after timeout:', socket.roomId)
            rooms.delete(socket.roomId)
          }
        }, 30000) // 30 second delay
      }
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})