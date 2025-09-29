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
    if (!youtubeUrl.trim()) return

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

    // Allow any user to control video playback
    if (event.data === YouTube.PlayerState.PLAYING) {
      onPlay(currentPlayerTime)
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      onPause(currentPlayerTime)
    }
  }

  // Handle seeking when user moves the progress bar
  const handleSeek = (event) => {
    if (!playerRef.current || !playerReady) return
    
    const player = playerRef.current
    const currentPlayerTime = player.getCurrentTime()
    onSeek(currentPlayerTime)
  }

  // Sync player with room state
  useEffect(() => {
    if (!playerRef.current || !playerReady || !currentVideo) return

    try {
      const player = playerRef.current
      if (!player || typeof player.getCurrentTime !== 'function') {
        console.log('Player not ready for sync')
        return
      }
      
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
    } catch (error) {
      console.error('Error syncing video player:', error)
    }
  }, [isPlaying, currentTime, currentVideo, playerReady])

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1, // Always show controls for everyone
      disablekb: 0, // Enable keyboard controls for everyone
      fs: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3
    },
    host: 'https://www.youtube.com'
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 p-1 sm:p-2">
      {/* Video URL Input (Available for All Users) */}
      {
        <div className="mb-2 sm:mb-3">
          <form onSubmit={handleSubmitUrl} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !youtubeUrl.trim()}
              className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isLoading ? 'Loading...' : 'Load Video'}
            </button>
          </form>
        </div>
      }

      {/* Video Player */}
      <div className="flex-1 bg-black rounded-lg overflow-hidden" style={{ minHeight: '40vh' }}>
        {currentVideo ? (
          <div className="w-full h-full" style={{ minHeight: '40vh' }}>
            <YouTube
              videoId={currentVideo.videoId}
              opts={opts}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              onPlaybackRateChange={handleSeek}
              style={{ width: '100%', height: '100%' }}
              iframeClassName="w-full h-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-gray-400 p-4 sm:p-8">
            <div>
              <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">🎬</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">No video loaded</h3>
              <p className="text-gray-500 text-sm sm:text-base">
                Paste a YouTube URL above to start watching together!
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default VideoPlayer