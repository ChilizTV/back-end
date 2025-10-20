# Football Matches API with Live Chat

A Node.js backend that fetches football matches with their odds from the API-FOOTBALL and provides a real-time chat system with Supabase Realtime.

## 🚀 Features

### Football Matches
- ✅ Fetching matches from API-FOOTBALL
- ✅ Filtering by specific leagues (IDs: 743, 15, 39, 61, 140, 2, 3, 78, 135)
- ✅ Real odds from API-FOOTBALL with random fallback
- ✅ In-memory cache with automatic refresh
- ✅ Temporal filtering (48h centered on current time)
- ✅ Cron job for synchronization every 10 minutes

### Real-Time Chat
- ✅ Real-time chat with Supabase Realtime
- ✅ One chat room per match
- ✅ System messages (join/leave, match start/end)
- ✅ Messages with odds
- ✅ Featured messages for users with tokens
- ✅ PostgreSQL database with automatic indexing

## 🛠️ Technologies

- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **API**: API-FOOTBALL for matches and odds

## 📋 Prerequisites

- Node.js (version 14+)
- API-FOOTBALL key (free on [api-football.com](https://www.api-football.com/))
- Supabase account (free on [supabase.com](https://supabase.com/))

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
echo "SUPABASE_URL=your_supabase_url" >> .env
echo "SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env
```

4. **Set up Supabase Database**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL script from `database/schema.sql`

5. **Test Supabase connection**
```bash
node test-supabase.js
```

6. **Build and start**
```bash
npm run build
npm start
```

## 🗄️ Database Setup

### Create Tables in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Table des messages
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'bet', 'system')),
  is_featured BOOLEAN DEFAULT false,
  bet_type TEXT,
  bet_sub_type TEXT,
  amount DECIMAL(10,2),
  odds DECIMAL(5,2),
  system_type TEXT,
  system_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_chat_messages_match_id ON chat_messages(match_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_is_featured ON chat_messages(is_featured) WHERE is_featured = true;

-- Table des utilisateurs connectés (optionnel)
CREATE TABLE chat_connected_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Index pour les utilisateurs connectés
CREATE INDEX idx_chat_connected_users_match_id ON chat_connected_users(match_id);
CREATE INDEX idx_chat_connected_users_user_id ON chat_connected_users(user_id);
```

### Test Database Integration

After setting up the tables, test the integration:

```bash
# Test basic connection
node test-supabase-integration.js

# Expected output:
# ✅ Connection successful
# ✅ Test message inserted
# ✅ Test message retrieved
# ✅ Test user connected
# ✅ Connected users retrieved
# ✅ Test data cleaned up
# 🎉 All tests passed!
```

## 📊 Data Models

### Chat Message Types

```typescript
// Base message interface
interface ChatMessage {
    id: string;
    matchId: number;
    userId: string;
    walletAddress: string;
    username: string;
    message: string;
    timestamp: number;
    type: 'message' | 'system' | 'bet';
    isFeatured: boolean;
}

// Bet message interface
interface BetMessage extends ChatMessage {
    type: 'bet';
    betType: 'match_winner' | 'over_under' | 'both_teams_score' | 'double_chance' | 'draw_no_bet' | 'first_half_winner' | 'first_half_goals' | 'ht_ft' | 'correct_score' | 'exact_goals_number' | 'goalscorers' | 'clean_sheet' | 'win_to_nil' | 'highest_scoring_half' | 'odd_even_goals' | 'first_half_odd_even';
    betSubType?: string;
    amount: number;
    odds: number;
}

// System message interface
interface SystemMessage extends ChatMessage {
    type: 'system';
    systemType: 'match_start' | 'match_end' | 'goal' | 'user_joined' | 'user_left';
    data?: any;
}

// Connected user interface
interface ConnectedUser {
    id: string;
    matchId: number;
    userId: string;
    username: string;
    connectedAt: number;
    lastActivity: number;
}
```

### API Response Types

```typescript
// Chat response
interface ChatResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

// Chat statistics
interface ChatStats {
    connectedUsers: number;
    activeRooms: number;
    totalMessages: number;
    featuredMessages: number;
}
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
  "message": "Hello everyone!",
  "walletAddress": "0x1234..."
}
```

#### POST `/chat/bet/{matchId}`
Place a prediction
```json
{
  "userId": "user_123",
  "username": "JohnDoe",
  "betType": "match_winner",
  "betSubType": "home",
  "amount": 50,
  "odds": 1.85,
  "walletAddress": "0x1234..."
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
      "type": "message",
      "isFeatured": false
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

#### GET `/supabase-status`
Check Supabase connection
```json
{
  "success": true,
  "message": "Supabase Chat service is running",
  "realtime": true
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_FOOTBALL_KEY` | API-FOOTBALL key | Required |
| `PORT` | Server port | 3000 |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |

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
- **Chat Stats**: `GET /chat/stats`
- **Match Stats**: Available in logs

## 🔄 Migration from Gun.js

This project has been migrated from Gun.js to Supabase Realtime. The main changes:

- ✅ **Better Performance**: PostgreSQL with optimized indexes
- ✅ **Reliability**: Cloud-managed database
- ✅ **Scalability**: Automatic scaling
- ✅ **Security**: Row Level Security (RLS) ready
- ✅ **Monitoring**: Built-in analytics

## 🐛 Troubleshooting

### Supabase Connection Issues
1. Check your environment variables
2. Run `node test-supabase.js`
3. Verify tables are created in Supabase

### Chat Not Working
1. Check Supabase Realtime is enabled
2. Verify RLS policies (if enabled)
3. Check network connectivity

## 📝 License

ISC License 