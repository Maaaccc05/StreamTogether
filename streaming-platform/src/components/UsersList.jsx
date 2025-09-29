const UsersList = ({ users, currentUsername }) => {
  return (
    <div>
      <h3 className="text-white font-semibold mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
        👥 Participants 
        <span className="ml-2 text-xs sm:text-sm text-gray-400">
          ({users.length} {users.length === 1 ? 'person' : 'people'})
        </span>
      </h3>
      
      <div className="flex flex-wrap gap-1 sm:gap-2">
        {users.map((user) => (
          <div
            key={user.id}
            className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm ${
              user.username === currentUsername
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full"></div>
            <span className="font-medium truncate max-w-20 sm:max-w-none">{user.username}</span>
            {user.username === currentUsername && (
              <span className="text-xs bg-purple-800 px-1 rounded hidden sm:inline">You</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default UsersList