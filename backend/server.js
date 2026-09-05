import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'

const app = express()
const server = createServer(app)

// I won't recommend this

// const url = `https://streamtogether-backend-n8nm.onrender.com`;
// const interval = 30000;

// function reloadWebsite() {
//   axios
//     .get(url)
//     .then((response) => {
//       console.log("website reloded");
//     })
//     .catch((error) => {
//       console.error(`Error : ${error.message}`);
//     });
// }

// setInterval(reloadWebsite, interval);
// Configure CORS for Socket.IO
const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  process.env.FRONTEND_URL, // Set this in Render environment variables
  // Add your Render frontend URL pattern
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list or matches Render pattern
      if (allowedOrigins.includes(origin) || 
          origin.includes('onrender.com') || 
          origin.includes('localhost')) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || 
        origin.includes('onrender.com') || 
        origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json())

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'StreamTogether Backend is running!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rooms: rooms.size
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    rooms: rooms.size,
    memory: process.memoryUsage()
  });
});

// Store room data
const rooms = new Map()

// ── Security helpers ─────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production'
const log = (...args) => { if (!IS_PROD) console.log(...args) }

// Sanitize a string: trim, limit length, strip dangerous chars
const sanitize = (str, maxLen = 200) =>
  typeof str === 'string' ? str.trim().slice(0, maxLen).replace(/[<>"'`]/g, '') : ''

// Validate YouTube video ID (exactly 11 alphanumeric/-/_ chars)
const isValidVideoId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id)

// Validate roomId (4–10 uppercase alphanumeric chars)
const isValidRoomId = (id) => typeof id === 'string' && /^[A-Z0-9]{4,10}$/.test(id)

// Per-socket rate limiter: max `limit` calls per `windowMs` milliseconds
const makeRateLimiter = (limit, windowMs) => {
  const counts = new Map()
  return (socketId) => {
    const now = Date.now()
    const entry = counts.get(socketId) || { count: 0, start: now }
    if (now - entry.start > windowMs) {
      entry.count = 1; entry.start = now
    } else {
      entry.count++
    }
    counts.set(socketId, entry)
    return entry.count <= limit
  }
}

// Rate limiters for high-frequency events
const chatRateLimit   = makeRateLimiter(5, 3000)   // 5 messages per 3 seconds
const videoRateLimit  = makeRateLimiter(10, 1000)  // 10 play/pause/seek per second
const queueRateLimit  = makeRateLimiter(10, 5000)  // 10 queue ops per 5 seconds

// Max limits
const MAX_ROOMS       = 500   // max simultaneous rooms on server
const MAX_QUEUE_SIZE  = 50    // max videos in a room queue
const MAX_CHAT_HIST   = 100   // max stored chat messages per room

// Socket.io connection handling
io.on('connection', (socket) => {
  log('User connected:', socket.id)

  // ── Join a room ───────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, username }) => {
    // FIX 3: Validate roomId format — reject null / oversized / malformed IDs
    if (!isValidRoomId(roomId)) {
      socket.emit('error', 'Invalid room ID')
      return
    }

    // FIX 1: Sanitize and length-limit username
    const cleanUsername = sanitize(String(username || ''), 30)
    if (cleanUsername.length < 1) {
      socket.emit('error', 'Invalid username')
      return
    }

    // FIX 6: Cap total number of rooms to prevent memory exhaustion
    if (!rooms.has(roomId) && rooms.size >= MAX_ROOMS) {
      socket.emit('error', 'Server is full, try again later')
      return
    }

    socket.join(roomId)
    socket.username = cleanUsername
    socket.roomId = roomId

    log(`User ${cleanUsername} joining room ${roomId}`)

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        currentVideo: null,
        isPlaying: false,
        currentTime: 0,
        host: socket.id,
        chatHistory: [],
        queue: []
      })
    }

    const room = rooms.get(roomId)

    // Welcome message for brand-new empty rooms
    if (room.users.size === 0 && room.chatHistory.length === 0) {
      room.chatHistory.push({
        id: Date.now() - 1000,
        type: 'system',
        message: `Welcome to room ${roomId}! 🎬`,
        timestamp: new Date().toLocaleTimeString()
      })
    }

    room.users.set(socket.id, { username: cleanUsername, id: socket.id })

    // Send current room state to the new user
    socket.emit('room-state', {
      currentVideo: room.currentVideo,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      users: Array.from(room.users.values()),
      isHost: room.host === socket.id,
      chatHistory: room.chatHistory,
      queue: room.queue || []
    })

    // Notify others about the new user
    const joinMessage = {
      id: Date.now(),
      type: 'system',
      message: `${cleanUsername} joined the room`,
      timestamp: new Date().toLocaleTimeString()
    }
    room.chatHistory.push(joinMessage)
    socket.to(roomId).emit('user-joined', {
      username: cleanUsername,
      userId: socket.id,
      users: Array.from(room.users.values())
    })
    socket.to(roomId).emit('chat-message', joinMessage)

    log(`${cleanUsername} joined room ${roomId}`)
  })

  // ── Video change ─────────────────────────────────────────────────
  socket.on('video-change', ({ roomId, videoId, videoTitle }) => {
    const room = rooms.get(roomId)
    if (!room || !room.users.has(socket.id)) return

    // FIX 5: Validate videoId must be exactly 11 YouTube chars
    if (!isValidVideoId(videoId)) return
    const cleanTitle = sanitize(String(videoTitle || 'YouTube Video'), 150)

    const user = room.users.get(socket.id)
    room.currentVideo = { videoId, videoTitle: cleanTitle }
    room.currentTime = 0
    room.isPlaying = false

    io.to(roomId).emit('video-changed', {
      videoId,
      videoTitle: cleanTitle,
      currentTime: 0,
      isPlaying: false,
      changedBy: user.username
    })

    const videoChangeMessage = {
      id: Date.now(),
      type: 'system',
      message: `${user.username} loaded: ${cleanTitle}`,
      timestamp: new Date().toLocaleTimeString()
    }
    room.chatHistory.push(videoChangeMessage)
    io.to(roomId).emit('chat-message', videoChangeMessage)
  })

  // ── Play / Pause / Seek (rate-limited) ──────────────────────────
  socket.on('video-play', ({ roomId, currentTime }) => {
    // FIX 2: Rate-limit play/pause/seek — 10 per second max
    if (!videoRateLimit(socket.id)) return
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      const t = Math.max(0, Number(currentTime) || 0)
      room.isPlaying = true
      room.currentTime = t
      socket.to(roomId).emit('video-play', { currentTime: t })
    }
  })

  socket.on('video-pause', ({ roomId, currentTime }) => {
    if (!videoRateLimit(socket.id)) return
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      const t = Math.max(0, Number(currentTime) || 0)
      room.isPlaying = false
      room.currentTime = t
      socket.to(roomId).emit('video-pause', { currentTime: t })
    }
  })

  socket.on('video-seek', ({ roomId, currentTime }) => {
    if (!videoRateLimit(socket.id)) return
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      const t = Math.max(0, Number(currentTime) || 0)
      room.currentTime = t
      socket.to(roomId).emit('video-seek', { currentTime: t })
    }
  })

  // ── Chat messages (rate-limited + sanitized) ─────────────────────
  socket.on('chat-message', ({ roomId, message, replyTo }) => {
    // FIX 2: Rate-limit — max 5 messages per 3 seconds
    if (!chatRateLimit(socket.id)) return

    const room = rooms.get(roomId)
    if (!room || !room.users.has(socket.id)) return

    // FIX 1: Sanitize and length-limit the message on the server
    const cleanMessage = sanitize(String(message || ''), 500)
    if (cleanMessage.length === 0) return

    // FIX 4: Sanitize replyTo — only allow known safe fields
    let safeReplyTo = null
    if (replyTo && typeof replyTo === 'object') {
      safeReplyTo = {
        id: Number(replyTo.id) || 0,
        username: sanitize(String(replyTo.username || ''), 30),
        message: sanitize(String(replyTo.message || ''), 200)
      }
    }

    const user = room.users.get(socket.id)
    const chatMessage = {
      id: Date.now(),
      username: user.username,
      message: cleanMessage,
      timestamp: new Date().toLocaleTimeString(),
      type: 'user',
      ...(safeReplyTo ? { replyTo: safeReplyTo } : {})
    }

    room.chatHistory.push(chatMessage)
    // Keep only last MAX_CHAT_HIST messages
    if (room.chatHistory.length > MAX_CHAT_HIST) {
      room.chatHistory = room.chatHistory.slice(-MAX_CHAT_HIST)
    }

    io.to(roomId).emit('chat-message', chatMessage)
  })

  // Handle emoji reactions
  socket.on('react-message', ({ roomId, messageId, emoji }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id)
      // Find the message in chat history
      const msg = room.chatHistory.find(m => m.id === messageId)
      if (msg) {
        if (!msg.reactions) msg.reactions = {}
        if (!msg.reactions[emoji]) msg.reactions[emoji] = []
        const idx = msg.reactions[emoji].indexOf(user.username)
        if (idx === -1) {
          // Add reaction
          msg.reactions[emoji].push(user.username)
        } else {
          // Toggle off
          msg.reactions[emoji].splice(idx, 1)
          if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji]
        }
        // Broadcast updated reactions for this message to the whole room
        io.to(roomId).emit('reaction-updated', {
          messageId,
          reactions: msg.reactions
        })
      }
    }
  })

  // ── Chat history request ─────────────────────────────────────────
  socket.on('get-chat-history', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      socket.emit('chat-history', { chatHistory: room.chatHistory })
    }
  })

  // ── Queue Events ─────────────────────────────────────────────

  // ── Queue: add ───────────────────────────────────────────────────
  socket.on('queue-add', ({ roomId, videoId, title, thumbnail }) => {
    // FIX 2: Rate-limit queue operations
    if (!queueRateLimit(socket.id)) return

    const room = rooms.get(roomId)
    if (!room || !room.users.has(socket.id)) return

    // FIX 5: Validate videoId
    if (!isValidVideoId(videoId)) return

    // FIX 7: Cap queue size
    if (room.queue.length >= MAX_QUEUE_SIZE) {
      socket.emit('error', `Queue is full (max ${MAX_QUEUE_SIZE} videos)`)
      return
    }

    const cleanTitle = sanitize(String(title || 'YouTube Video'), 150)
    const user = room.users.get(socket.id)
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      videoId,
      title: cleanTitle,
      // Always generate thumbnail from videoId — never trust client-supplied URL
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      addedBy: user.username
    }
    room.queue.push(item)
    io.to(roomId).emit('queue-updated', { queue: room.queue })
    log(`Queue add in room ${roomId}: ${cleanTitle}`)
  })

  // Remove a video from the queue
  socket.on('queue-remove', ({ roomId, itemId }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      room.queue = room.queue.filter(item => item.id !== itemId)
      io.to(roomId).emit('queue-updated', { queue: room.queue })
    }
  })

  // Play a specific item from the queue immediately (remove from queue, set as current)
  socket.on('queue-play-item', ({ roomId, itemId }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      const idx = room.queue.findIndex(item => item.id === itemId)
      if (idx !== -1) {
        const [item] = room.queue.splice(idx, 1)
        room.currentVideo = { videoId: item.videoId, videoTitle: item.title }
        room.currentTime = 0
        room.isPlaying = true
        io.to(roomId).emit('video-changed', {
          videoId: item.videoId,
          videoTitle: item.title,
          currentTime: 0,
          isPlaying: true
        })
        io.to(roomId).emit('queue-updated', { queue: room.queue })
        const user = room.users.get(socket.id)
        const msg = {
          id: Date.now(), type: 'system',
          message: `${user.username} played: ${item.title}`,
          timestamp: new Date().toLocaleTimeString()
        }
        room.chatHistory.push(msg)
        io.to(roomId).emit('chat-message', msg)
      }
    }
  })

  // Auto-advance: video ended, play next in queue
  socket.on('queue-play-next', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      if (room.queue.length === 0) return
      const next = room.queue.shift()
      room.currentVideo = { videoId: next.videoId, videoTitle: next.title }
      room.currentTime = 0
      room.isPlaying = true
      io.to(roomId).emit('video-changed', {
        videoId: next.videoId,
        videoTitle: next.title,
        currentTime: 0,
        isPlaying: true
      })
      io.to(roomId).emit('queue-updated', { queue: room.queue })
      const msg = {
        id: Date.now(), type: 'system',
        message: `▶ Now playing: ${next.title}`,
        timestamp: new Date().toLocaleTimeString()
      }
      room.chatHistory.push(msg)
      io.to(roomId).emit('chat-message', msg)
      log(`Queue auto-advance in room ${roomId}: ${next.title}`)
    }
  })

  // Move item up or down in the queue
  socket.on('queue-reorder', ({ roomId, itemId, direction }) => {
    const room = rooms.get(roomId)
    if (room && room.users.has(socket.id)) {
      const idx = room.queue.findIndex(item => item.id === itemId)
      if (idx === -1) return
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= room.queue.length) return
      // Swap
      ;[room.queue[idx], room.queue[newIdx]] = [room.queue[newIdx], room.queue[idx]]
      io.to(roomId).emit('queue-updated', { queue: room.queue })
    }
  })

  // ── Disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    log('User disconnected:', socket.id, 'from room:', socket.roomId)
    
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