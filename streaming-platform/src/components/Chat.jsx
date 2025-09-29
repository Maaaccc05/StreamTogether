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
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold flex items-center">
          💬 Chat
          <span className="ml-2 text-sm text-gray-400">
            ({messages.length} messages)
          </span>
        </h3>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">👋</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="group">
              {message.type === 'system' ? (
                <div className="text-center text-gray-400 text-sm py-1">
                  <span className="bg-gray-700 px-2 py-1 rounded">
                    {message.message}
                  </span>
                  <span className="ml-2 text-xs">
                    {message.timestamp}
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col ${
                  message.username === currentUsername ? 'items-end' : 'items-start'
                }`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.username === currentUsername
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    {message.username !== currentUsername && (
                      <div className="text-xs font-semibold mb-1 text-purple-300">
                        {message.username}
                      </div>
                    )}
                    <div className="break-words">{message.message}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 px-1">
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
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        <div className="text-xs text-gray-500 mt-2">
          Press Enter to send • {inputMessage.length}/500
        </div>
      </div>
    </div>
  )
}

export default Chat