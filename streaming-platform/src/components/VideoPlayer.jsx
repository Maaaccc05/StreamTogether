import { useState, useRef, useEffect } from 'react'
import YouTube from 'react-youtube'

const VideoPlayer = ({ 
  currentVideo, 
  isPlaying, 
  currentTime, 
  isHost, 
  onVideoChange, 
  onPlay, 
  onPause, 
  onSeek 
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const playerRef = useRef(null)
  const lastSyncTime = useRef(0)
  const [playerReady, setPlayerReady] = useState(false)

  // Extract YouTube video ID from URL
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  // Handle URL submission
  const handleSubmitUrl = (e) => {
    e.preventDefault()
    if (!youtubeUrl.trim() || !isHost) return

    const videoId = extractVideoId(youtubeUrl)
    if (videoId) {
      setIsLoading(true)
      // Fetch video title from YouTube
      fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
        .then(res => res.json())
        .then(data => {
          onVideoChange(videoId, data.title || 'YouTube Video')
          setYoutubeUrl('')
        })
        .catch(() => {
          onVideoChange(videoId, 'YouTube Video')
          setYoutubeUrl('')
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      alert('Please enter a valid YouTube URL')
    }
  }

  // YouTube player event handlers
  const onPlayerReady = (event) => {
    playerRef.current = event.target
    setPlayerReady(true)
  }

  const onPlayerStateChange = (event) => {
    if (!playerRef.current || !playerReady) return

    const player = playerRef.current
    const currentPlayerTime = player.getCurrentTime()

    // Sync with room state when player state changes
    if (event.data === YouTube.PlayerState.PLAYING) {
      if (isHost) {
        onPlay(currentPlayerTime)
      }
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      if (isHost) {
        onPause(currentPlayerTime)
      }
    }
  }

  // Sync player with room state
  useEffect(() => {
    if (!playerRef.current || !playerReady || !currentVideo) return

    const player = playerRef.current
    const currentPlayerTime = player.getCurrentTime()
    const timeDifference = Math.abs(currentPlayerTime - currentTime)

    // Only sync if there's a significant time difference (>2 seconds)
    if (timeDifference > 2 && Date.now() - lastSyncTime.current > 1000) {
      player.seekTo(currentTime, true)
      lastSyncTime.current = Date.now()
    }

    // Sync play/pause state
    const playerState = player.getPlayerState()
    if (isPlaying && playerState !== YouTube.PlayerState.PLAYING) {
      player.playVideo()
    } else if (!isPlaying && playerState === YouTube.PlayerState.PLAYING) {
      player.pauseVideo()
    }
  }, [isPlaying, currentTime, currentVideo, playerReady])

  const opts = {
    height: '400',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: isHost ? 1 : 0,
      disablekb: !isHost ? 1 : 0,
      fs: 1,
      modestbranding: 1,
      rel: 0
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 p-6">
      {/* Video URL Input (Host Only) */}
      {isHost && (
        <div className="mb-6">
          <form onSubmit={handleSubmitUrl} className="flex gap-4">
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !youtubeUrl.trim()}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Loading...' : 'Load Video'}
            </button>
          </form>
        </div>
      )}

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
        {currentVideo ? (
          <div className="w-full h-full">
            <YouTube
              videoId={currentVideo.videoId}
              opts={opts}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="text-center text-gray-400 p-8">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">No video loaded</h3>
            <p className="text-gray-500">
              {isHost 
                ? "Paste a YouTube URL above to start watching together!" 
                : "Waiting for the host to load a video..."
              }
            </p>
          </div>
        )}
      </div>

      {/* Video Info */}
      {currentVideo && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white font-semibold text-lg mb-2">
            Now Playing
          </h3>
          <p className="text-gray-300">{currentVideo.videoTitle}</p>
          <div className="flex items-center mt-2 text-sm text-gray-400">
            <span className="mr-4">
              Status: {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
            </span>
            {!isHost && (
              <span className="text-yellow-400">
                🔒 Controlled by host
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer