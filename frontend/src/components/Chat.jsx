import { useState, useRef, useEffect } from 'react'

const Chat = ({ messages, onSendMessage, currentUsername }) => {
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim())
      setInputMessage('')
      inputRef.current?.focus()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex flex-col h-full min-h-[220px] sm:min-h-[300px] bg-gray-900 sm:bg-transparent">
      {/* Chat Header */}
      <div className="p-3 sm:p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-white font-semibold text-sm sm:text-base truncate">
          💬 Chat
        </h3>
        <span className="ml-2 text-xs sm:text-sm text-gray-400">
          ({messages.length} messages)
        </span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-6 sm:py-8 px-2">
            <div className="text-3xl sm:text-4xl mb-2">👋</div>
            <p className="text-sm sm:text-base break-words">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="group">
              {message.type === 'system' ? (
                <div className="text-center text-gray-400 text-xs sm:text-sm py-1 px-1">
                  <span className="bg-gray-700 px-2 py-1 rounded break-words">
                    {message.message}
                  </span>
                  <span className="ml-2 text-[10px] sm:text-xs">
                    {message.timestamp}
                  </span>
                </div>
              ) : (
                <div
                  className={`flex flex-col ${
                    message.username === currentUsername
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-lg px-2 sm:px-3 py-1 sm:py-2 break-words ${
                      message.username === currentUsername
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {message.username !== currentUsername && (
                      <div className="text-[11px] sm:text-xs font-semibold mb-1 text-purple-300 truncate">
                        {message.username}
                      </div>
                    )}
                    <div className="break-words text-sm sm:text-base leading-snug sm:leading-normal">
                      {message.message}
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1 px-1">
                    {message.timestamp}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-2 sm:p-4 border-t border-gray-700 bg-gray-800 sm:bg-transparent">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            Send
          </button>
        </form>
        <div className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 text-center sm:text-left">
          Press Enter to send • {inputMessage.length}/500
        </div>
      </div>
    </div>
  )
}

export default Chat
