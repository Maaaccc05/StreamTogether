const UsersList = ({ users, currentUsername }) => {
  return (
    <div>
      <h3 className="text-white font-semibold mb-3 flex items-center">
        👥 Participants 
        <span className="ml-2 text-sm text-gray-400">
          ({users.length} {users.length === 1 ? 'person' : 'people'})
        </span>
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {users.map((user) => (
          <div
            key={user.id}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
              user.username === currentUsername
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="font-medium">{user.username}</span>
            {user.username === currentUsername && (
              <span className="text-xs bg-purple-800 px-1 rounded">You</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default UsersList