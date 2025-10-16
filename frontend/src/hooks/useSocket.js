import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const useSocket = (roomId, username) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState({
    currentVideo: null,
    isPlaying: false,
    currentTime: 0,
    users: [],
    isHost: false
  });
  const [messages, setMessages] = useState([]);
  const [chatLoaded, setChatLoaded] = useState(false);

  useEffect(() => {
    if (!roomId || !username) {
      console.log('Missing roomId or username, not connecting to socket')
      return
    }

    console.log('Connecting to socket for room:', roomId, 'user:', username)
    
    // Connect to server
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    console.log('Connecting to server:', serverUrl);
    
    const newSocket = io(serverUrl, {
      forceNew: false,  // Don't force new connection
      autoConnect: true,
      transports: ['polling', 'websocket'],  // Try polling first, then websocket
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server, joining room:', roomId);
      newSocket.emit('join-room', { roomId, username });
      
      // Request chat history explicitly as backup
      setTimeout(() => {
        newSocket.emit('get-chat-history', { roomId });
      }, 1000);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Room state events
    newSocket.on('room-state', (state) => {
      console.log('Received room state:', state)
      console.log('Chat history in room state:', state.chatHistory ? state.chatHistory.length : 0, 'messages')
      setRoomState(state);
      
      // Load chat history if available
      if (state.chatHistory && state.chatHistory.length > 0) {
        console.log('Loading chat history:', state.chatHistory)
        setMessages(state.chatHistory)
        setChatLoaded(true)
      } else {
        console.log('No chat history available')
        // Only clear messages if chat has been loaded before (to prevent clearing on initial load)
        if (chatLoaded) {
          setMessages([])
        }
      }
    });

    newSocket.on('user-joined', ({ username: newUsername, users }) => {
      setRoomState(prev => ({ ...prev, users }));
      // Note: Join message is now handled by server and sent via chat-message event
    });

    newSocket.on('user-left', ({ username: leftUsername, users }) => {
      setRoomState(prev => ({ ...prev, users }));
    });

    newSocket.on('new-host', ({ hostId }) => {
      setRoomState(prev => ({ ...prev, isHost: newSocket.id === hostId }));
    });

    // Video events
    newSocket.on('video-changed', ({ videoId, videoTitle, currentTime, isPlaying }) => {
      setRoomState(prev => ({
        ...prev,
        currentVideo: { videoId, videoTitle },
        currentTime,
        isPlaying
      }));
    });

    newSocket.on('video-play', ({ currentTime }) => {
      setRoomState(prev => ({
        ...prev,
        isPlaying: true,
        currentTime
      }));
    });

    newSocket.on('video-pause', ({ currentTime, reason, username }) => {
      console.log('Received video-pause event:', { currentTime, reason, username })
      
      setRoomState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime
      }));
      
      // Add a system message if video was paused due to user disconnection
      if (reason === 'user-disconnected') {
        console.log('Video paused due to user disconnection:', username)
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'system',
          message: `Video paused - ${username} disconnected`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    });

    newSocket.on('video-seek', ({ currentTime }) => {
      setRoomState(prev => ({
        ...prev,
        currentTime
      }));
    });

    // Chat events
    newSocket.on('chat-message', (message) => {
      console.log('Received chat message:', message)
      setMessages(prev => {
        console.log('Adding message to existing messages:', prev.length)
        return [...prev, message]
      })
    })

    // Backup chat history handler
    newSocket.on('chat-history', ({ chatHistory }) => {
      console.log('Received backup chat history:', chatHistory.length, 'messages')
      if (chatHistory && chatHistory.length > 0) {
        setMessages(chatHistory)
        setChatLoaded(true)
      }
    })

    return () => {
      console.log('Cleaning up socket connection')
      newSocket.removeAllListeners()
      newSocket.close()
    }
  }, [roomId, username])

  // Socket methods
  const changeVideo = (videoId, videoTitle) => {
    if (socket) {
      socket.emit('video-change', { roomId, videoId, videoTitle });
    }
  };

  const playVideo = (currentTime) => {
    if (socket) {
      socket.emit('video-play', { roomId, currentTime });
    }
  };

  const pauseVideo = (currentTime) => {
    if (socket) {
      socket.emit('video-pause', { roomId, currentTime });
    }
  };

  const seekVideo = (currentTime) => {
    if (socket) {
      socket.emit('video-seek', { roomId, currentTime });
    }
  };

  const sendMessage = (message) => {
    if (socket && message.trim()) {
      socket.emit('chat-message', { roomId, message });
    }
  };

  return {
    socket,
    isConnected,
    roomState,
    messages,
    changeVideo,
    playVideo,
    pauseVideo,
    seekVideo,
    sendMessage
  };
};

export default useSocket;