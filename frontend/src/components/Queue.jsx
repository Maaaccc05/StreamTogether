import { useState } from 'react'

/* ─── Icons ────────────────────────────────────────────────────────── */
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0A8 8 0 0 1 2 10Zm6.39-2.908a.75.75 0 0 1 .766.027l3.5 2.25a.75.75 0 0 1 0 1.262l-3.5 2.25A.75.75 0 0 1 8 12.25v-4.5a.75.75 0 0 1 .39-.658Z" clipRule="evenodd" />
  </svg>
)
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
  </svg>
)
const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
    <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
  </svg>
)
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
)
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
  </svg>
)

/* ─── URL helper ──────────────────────────────────────────────────── */
const extractVideoId = (url) => {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|live\/|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

/* ─── Queue Component ─────────────────────────────────────────────── */
const Queue = ({ queue = [], onAdd, onRemove, onPlayItem, onReorder, currentUsername }) => {
  const [urlInput, setUrlInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    const videoId = extractVideoId(urlInput.trim())
    if (!videoId) {
      setError('Invalid YouTube URL')
      return
    }
    setError('')
    setIsAdding(true)
    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
      const data = await res.json()
      onAdd(videoId, data.title || 'YouTube Video')
      setUrlInput('')
    } catch {
      onAdd(videoId, 'YouTube Video')
      setUrlInput('')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 sm:bg-transparent overflow-hidden">

      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <h3 className="text-white font-semibold text-sm sm:text-base">📋 Queue</h3>
        <span className="ml-2 text-xs sm:text-sm text-gray-400">
          {queue.length === 0 ? 'Empty' : `${queue.length} video${queue.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-8 px-4">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-sm font-medium text-gray-400 mb-1">Queue is empty</p>
            <p className="text-xs text-gray-500">Add YouTube videos below to build a playlist</p>
          </div>
        ) : (
          queue.map((item, idx) => (
            <div
              key={item.id}
              className="flex gap-2 p-2 rounded-xl bg-gray-800 border border-gray-700/60 hover:border-purple-500/40 transition-all duration-150"
            >
              {/* Position badge */}
              <div className="flex-shrink-0 flex items-start justify-center w-6 pt-1 text-xs font-bold text-gray-500 select-none">
                {idx === 0 ? (
                  <span className="text-purple-400 text-[9px] font-bold leading-tight">NEXT</span>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden bg-gray-700">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-white text-xs font-medium leading-tight line-clamp-2">
                  {item.title}
                </p>
                <p className="text-gray-500 text-[10px] mt-0.5">
                  by {item.addedBy === currentUsername ? 'you' : item.addedBy}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-0.5 flex-shrink-0 items-center justify-center">
                <button
                  onClick={() => onPlayItem(item.id)}
                  title="Play now"
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/70 active:scale-90 transition-all duration-150"
                >
                  <PlayIcon />
                </button>
                <button
                  onClick={() => onReorder(item.id, 'up')}
                  disabled={idx === 0}
                  title="Move up"
                  className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-600/60 disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 transition-all duration-150"
                >
                  <ChevronUpIcon />
                </button>
                <button
                  onClick={() => onReorder(item.id, 'down')}
                  disabled={idx === queue.length - 1}
                  title="Move down"
                  className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-600/60 disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 transition-all duration-150"
                >
                  <ChevronDownIcon />
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  title="Remove"
                  className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all duration-150"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add to Queue Form */}
      <div className="p-2 sm:p-3 border-t border-gray-700 bg-gray-800 sm:bg-transparent flex-shrink-0">
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setError('') }}
            placeholder="Paste YouTube URL to queue…"
            disabled={isAdding}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isAdding || !urlInput.trim()}
            aria-label="Add to queue"
            title="Add to queue"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {isAdding ? (
              <svg className="w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : <PlusIcon />}
          </button>
        </form>
        {error && <p className="text-red-400 text-xs mt-1 px-1">{error}</p>}
        <p className="text-[10px] text-gray-500 mt-1 text-center">
          Auto-plays next when current video ends
        </p>
      </div>
    </div>
  )
}

export default Queue
