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

  useEffect(() => {
    if (!roomId || !username) return;

    // Connect to server
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-room', { roomId, username });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Room state events
    newSocket.on('room-state', (state) => {
      setRoomState(state);
    });

    newSocket.on('user-joined', ({ username: newUsername, users }) => {
      setRoomState(prev => ({ ...prev, users }));
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        message: `${newUsername} joined the room`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    });

    newSocket.on('user-left', ({ username: leftUsername, users }) => {
      setRoomState(prev => ({ ...prev, users }));
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        message: `${leftUsername} left the room`,
        timestamp: new Date().toLocaleTimeString()
      }]);
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

    newSocket.on('video-pause', ({ currentTime }) => {
      setRoomState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime
      }));
    });

    newSocket.on('video-seek', ({ currentTime }) => {
      setRoomState(prev => ({
        ...prev,
        currentTime
      }));
    });

    // Chat events
    newSocket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      newSocket.close();
    };
  }, [roomId, username]);

  // Socket methods
  const changeVideo = (videoId, videoTitle) => {
    if (socket && roomState.isHost) {
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
    if (socket && roomState.isHost) {
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