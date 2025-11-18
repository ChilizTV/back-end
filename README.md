# Live Football Match Streaming Platform

Node.js backend that enables live streaming of football matches with a real-time chat system via Supabase.

## 🚀 Features

### 📺 Live Streaming System

The system allows users to create and broadcast live video streams for football matches. Viewers can watch these streams in real-time in their browser.

#### Available streaming modes

**1. Screen share only**
- User shares only their screen
- Ideal for commenting on matches or sharing content

**2. Camera only**
- User streams only their webcam
- Perfect for face-to-camera live commentary

**3. Screen + Camera combined**
- User shares their screen with a camera overlay
- Camera appears as an overlay on the shared screen
- Camera position and size can be adjusted in real-time
- Ideal for match commentary with visual presentation

#### Audio features

- **System audio capture**: Captures sound from the shared screen (music, videos, etc.)
- **Microphone capture**: Captures the streamer's voice
- **Automatic fallback**: If system audio is not available, the system automatically uses the microphone
- **Cross-platform compatibility**: Works on Windows, macOS, and Linux

#### Viewer experience

- **Real-time playback**: Viewers see the stream with a slight delay (a few seconds)
- **Automatic adaptation**: Quality automatically adapts to the connection
- **Audio/video synchronization**: Audio and video are perfectly synchronized
- **Smooth playback**: System automatically handles buffering and reconnections

### ⚽ Football Matches

- ✅ Fetching matches from API-FOOTBALL
- ✅ Filtering by specific leagues (Ligue 1, Premier League, La Liga, Serie A, etc.)
- ✅ Real odds from API-FOOTBALL with random fallback
- ✅ In-memory cache with automatic refresh
- ✅ Temporal filtering (48h centered on current time)
- ✅ Automatic synchronization every 10 minutes

### 💬 Real-Time Chat

- ✅ Real-time chat with Supabase Realtime
- ✅ One chat room per match
- ✅ System messages (join/leave, match start/end)
- ✅ Messages with odds
- ✅ Featured messages for users with tokens
- ✅ PostgreSQL database with automatic indexing

## 🎬 How does streaming work?

### For the streamer

1. **Stream creation**: User creates a new stream for a specific match
2. **Source selection**: User chooses what to stream (screen, camera, or both)
3. **Configuration**: If both modes are selected, user can adjust camera position and size
4. **Start**: Stream begins and video/audio data is sent to the server
5. **Broadcast**: Server processes the data and makes it available to viewers
6. **Stop**: User can stop the stream at any time

### For the viewer

1. **Discovery**: Viewer sees the list of active streams for a match
2. **Selection**: Viewer chooses a stream to watch
3. **Playback**: Stream automatically loads and starts playing
4. **Experience**: Viewer sees the stream in real-time with synchronized audio

### Simplified architecture

- **Client (browser)**: Captures video/audio and sends it to the server
- **Server**: Receives data, processes it, and converts it to streaming format
- **Database**: Stores information about active streams
- **Viewers**: Connect to the server to receive the processed stream

## 📡 API Endpoints

### Streaming

#### POST `/stream`
Create a new stream for a match

**Request:**
```json
{
  "matchId": 123456,
  "streamerId": "user_123",
  "streamerName": "JohnDoe"
}
```

**Response:**
```json
{
  "success": true,
  "stream": {
    "id": "uuid",
    "matchId": 123456,
    "streamerId": "user_123",
    "streamerName": "JohnDoe",
    "streamKey": "stream_1234567890_abc123",
    "hlsPlaylistUrl": "http://localhost:3001/streams/stream_1234567890_abc123/playlist.m3u8",
    "status": "active",
    "viewerCount": 0,
    "createdAt": "2024-01-15T20:00:00Z"
  }
}
```

#### GET `/stream?matchId={matchId}`
Get all active streams for a match

**Response:**
```json
{
  "success": true,
  "streams": [
    {
      "id": "uuid",
      "matchId": 123456,
      "streamerName": "JohnDoe",
      "hlsPlaylistUrl": "http://localhost:3001/streams/stream_1234567890_abc123/playlist.m3u8",
      "status": "active",
      "viewerCount": 5
    }
  ]
}
```

#### DELETE `/stream/{streamId}`
Stop a stream

**Response:**
```json
{
  "success": true,
  "message": "Stream ended successfully"
}
```

### Matches

#### GET `/matches`
Get all available matches

#### GET `/matches/live`
Get live matches

#### GET `/matches/upcoming`
Get upcoming matches

#### GET `/matches/{id}`
Get a specific match

#### POST `/matches/sync`
Trigger manual synchronization

### Chat

#### POST `/chat/join/{matchId}`
Join a chat room

#### POST `/chat/leave/{matchId}`
Leave a chat room

#### POST `/chat/message/{matchId}`
Send a message

#### POST `/chat/bet/{matchId}`
Place a prediction

#### GET `/chat/messages/{matchId}`
Get messages from a room

#### GET `/chat/users/{matchId}`
Get connected users

#### GET `/chat/stats`
Chat statistics

## ⚙️ Installation

1. **Clone the project**
```bash
git clone <repository-url>
cd server
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Create a .env file
echo "API_FOOTBALL_KEY=your_api_football_key" > .env
echo "PORT=3001" >> .env
echo "SUPABASE_URL=your_supabase_url" >> .env
echo "SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env
```

4. **Set up Supabase Database**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL scripts from `database/schema.sql` and `database/streams-schema.sql`

5. **Test Supabase connection**
```bash
node test-supabase.js
```

6. **Build and start**
```bash
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_FOOTBALL_KEY` | API-FOOTBALL key | Required |
| `PORT` | Server port | 3001 |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |
| `STREAM_BASE_URL` | Base URL for streams | Auto-detected |

### Allowed Leagues

Matches are filtered to include only these leagues:
- 743: Ligue 1 (France)
- 15: Premier League (England)
- 39: La Liga (Spain)
- 61: Serie A (Italy)
- 140: Primeira Liga (Portugal)
- 2: UEFA Champions League
- 3: UEFA Europa League
- 78: Bundesliga (Germany)
- 135: Serie A (Italy)

## 🚀 Deployment

### Local Development
```bash
npm run build
npm start
```

### Production
```bash
npm run build
NODE_ENV=production npm start
```

## 📊 Monitoring

- **Health Check**: `GET /supabase-status`
- **Chat Statistics**: `GET /chat/stats`
- **Match Statistics**: Available in logs

## 🐛 Troubleshooting

### Supabase Connection Issues
1. Check your environment variables
2. Run `node test-supabase.js`
3. Verify tables are created in Supabase

### Chat Not Working
1. Check that Supabase Realtime is enabled
2. Verify RLS policies (if enabled)
3. Check network connectivity

### Streaming Not Working
1. Verify that port 3001 is accessible
2. Verify that FFmpeg is installed on the server
3. Check write permissions in the `public/streams` folder
4. Check server logs for errors

## 📝 License

AGPL-3.0 License 
