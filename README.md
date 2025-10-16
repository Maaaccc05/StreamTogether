# StreamTogether

A real-time video streaming platform that allows users to watch YouTube videos together in synchronized rooms with live chat.

## Features

- **Synchronized Video Playback** - Watch YouTube videos together with automatic sync
- **Real-time Chat** - Communicate with other viewers during playback
- **Room Management** - Create and join rooms with unique codes
- **Cross-platform** - Works on desktop and mobile devices

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Socket.io Client  
**Backend:** Node.js, Express, Socket.io  
**Deployment:** Render

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation
1. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. Start development servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

3. Open http://localhost:5173

## Usage

1. Enter your name and create/join a room
2. Share the room code with friends
3. Load a YouTube video by pasting the URL
4. Enjoy synchronized viewing with real-time chat

## Deployment

This project is configured for Render deployment. See `RENDER_DEPLOYMENT.md` for detailed instructions.

### Environment Variables

**Backend:**
- `NODE_ENV=production`
- `FRONTEND_URL=your-frontend-url`

**Frontend:**
- `VITE_SERVER_URL=your-backend-url`

## Project Structure

```
streaming-platform/
├── backend/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
└── README.md
```

