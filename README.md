# Football Matches API with Live Chat

A Node.js backend that fetches football matches with their odds from the API-FOOTBALL and provides a real-time chat system with Gun.js.

## 🚀 Features

### Football Matches
- ✅ Fetching matches from API-FOOTBALL
- ✅ Filtering by specific leagues (IDs: 743, 15, 39, 61, 140, 2, 3, 78, 135)
- ✅ Real odds from API-FOOTBALL with random fallback
- ✅ In-memory cache with automatic refresh
- ✅ Temporal filtering (48h centered on current time)
- ✅ Cron job for synchronization every 10 minutes

### Real-Time Chat
- ✅ Real-time chat with Gun.js
- ✅ One chat room per match
- ✅ System messages (join/leave, match start/end)
- ✅ Bet messages with odds
- ✅ WebSockets for real-time communication

## 🛠️ Technologies

- **Backend**: Node.js, Express, TypeScript
- **Database**: In-memory cache (no DB)
- **Real-time**: Gun.js with WebSockets
- **API**: API-FOOTBALL for matches and odds

## 📋 Prerequisites

- Node.js (version 14+)
- API-FOOTBALL key (free on [api-football.com](https://www.api-football.com/))

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
echo "PORT=3000" >> .env
```

4. **Build and start**
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Matches

#### GET `/matches`
Get all available matches
```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "home_team": "Paris SG",
      "away_team": "Marseille",
      "match_date": "2024-01-15T20:00:00Z",
      "status": "scheduled",
      "league": "Ligue 1",
      "odds": {
        "home_win": 1.85,
        "draw": 3.40,
        "away_win": 4.20
      }
    }
  ]
}
```

#### GET `/matches/live`
Get live matches
```json
{
  "success": true,
  "data": [...]
}
```

#### GET `/matches/upcoming`
Get upcoming matches
```json
{
  "success": true,
  "data": [...]
}
```

#### GET `/matches/{id}`
Get a specific match
```json
{
  "success": true,
  "data": {
    "id": 123456,
    "home_team": "Paris SG",
    "away_team": "Marseille",
    // ... other details
  }
}
```

#### POST `/matches/sync`
Trigger manual synchronization
```json
{
  "success": true,
  "message": "Sync completed"
}
```

### Chat

#### POST `/chat/join/{matchId}`
Join a chat room
```json
{
  "userId": "user_123",
  "username": "JohnDoe"
}
```

#### POST `/chat/leave/{matchId}`
Leave a chat room
```json
{
  "userId": "user_123",
  "username": "JohnDoe"
}
```

#### POST `/chat/message/{matchId}`
Send a message
```json
{
  "userId": "user_123",
  "username": "JohnDoe",
  "message": "Hello everyone!"
}
```

#### POST `/chat/bet/{matchId}`
Place a bet
```json
{
  "userId": "user_123",
  "username": "JohnDoe",
  "betType": "home_win",
  "amount": 50,
  "odds": 1.85
}
```

#### GET `/chat/messages/{matchId}`
Get messages from a room
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "matchId": 123456,
      "userId": "user_123",
      "username": "JohnDoe",
      "message": "Hello!",
      "timestamp": 1642248000000,
      "type": "message"
    }
  ]
}
```

#### GET `/chat/users/{matchId}`
Get connected users
```json
{
  "success": true,
  "users": ["JohnDoe", "JaneSmith"]
}
```

#### GET `/chat/stats`
Chat statistics
```json
{
  "success": true,
  "stats": {
    "connectedUsers": 5,
    "activeRooms": 3
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_FOOTBALL_KEY` | API-FOOTBALL key | Required |
| `PORT` | Server port | 3000 |

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
- 135: Eredivisie (Netherlands)

## 🔄 Synchronization

- **Automatic**: Every 10 minutes via cron job
- **Manual**: POST `/matches/sync`
- **Cache**: 15 minutes validity

## 📊 Logs

The system generates detailed logs:
- 🔄 Match synchronization
- 💰 Odds fetching (real or random)
- 💬 Chat messages
- 👥 User connections/disconnections
- ⚠️ Errors and warnings

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure API key
echo "API_FOOTBALL_KEY=your_key" > .env

# 3. Start server
npm start

# 4. Test API
curl http://localhost:3000
```

## 🔍 Debug

To see detailed logs:
```bash
npm start 2>&1 | tee server.log
```

## 📝 Project Structure

```
server/
├── controllers/
│   ├── match.controller.ts
│   └── chat.controller.ts
├── services/
│   ├── match.service.ts
│   ├── chat.service.ts
│   └── service.result.ts
├── models/
│   ├── index.ts
│   └── chat.model.ts
├── cron/
│   └── sync-matches.cron.ts
├── index.ts
└── README.md
```

## 📄 License

This project is licensed under AGPL-3.0. See the `LICENSE` file for more details.

**Note**: This project uses the API-FOOTBALL which requires a free API key. Make sure you have a valid key for the system to work properly. 