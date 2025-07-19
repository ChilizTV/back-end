# 🚀 Supabase Setup Guide for Football Chat

## 📋 Overview

This guide explains how to set up Supabase for the Football Chat application, which includes:
- Real-time chat system for football matches
- Match synchronization with API Football
- Automatic cleanup of old matches and messages

## 🗄️ Database Schema

The complete database schema is defined in `database/schema.sql`. This includes:

### Tables
- **`matches`** - Football matches from API Football with odds
- **`chat_messages`** - Real-time chat messages for matches
- **`chat_connected_users`** - Users currently connected to match chat rooms

### Features
- ✅ Real-time subscriptions enabled
- ✅ Row Level Security (RLS) configured
- ✅ Foreign key constraints with CASCADE delete
- ✅ Automatic cleanup of old data
- ✅ Performance indexes
- ✅ Views for common queries

## 🛠️ Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Execute Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the entire content of `database/schema.sql`
4. Execute the script

### 3. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# API Football Configuration
API_FOOTBALL_KEY=your_api_football_key

# Server Configuration
PORT=3000
```

### 4. Verify Setup

The schema includes several verification views:

```sql
-- Check active matches (within 24 hours)
SELECT * FROM active_matches;

-- Check match statistics
SELECT * FROM match_stats;

-- Check real-time status
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

## 🔄 Match Synchronization

### How it works:

1. **Fetch from API Football** - Gets matches from last/next 24 hours
2. **Fetch Odds** - Retrieves betting odds for each match
3. **Store in Supabase** - Upserts matches with odds data
4. **Cleanup Old Data** - Removes matches older than 24 hours and related chat data

### Manual Sync

```bash
# Trigger manual sync
curl -X POST http://localhost:3000/matches/sync
```

### Automatic Sync

The cron job runs every 10 minutes automatically.

## 📡 API Endpoints

### Matches
- `GET /matches` - Get all matches
- `GET /matches/live` - Get live matches
- `GET /matches/upcoming` - Get upcoming matches
- `GET /matches/:id` - Get specific match
- `GET /matches/league/:league` - Get matches by league
- `POST /matches/sync` - Manual sync
- `GET /matches/stats/summary` - Match statistics

### Chat
- `POST /chat/join/:matchId` - Join chat room
- `POST /chat/leave/:matchId` - Leave chat room
- `POST /chat/message/:matchId` - Send message
- `POST /chat/bet/:matchId` - Send bet message
- `GET /chat/messages/:matchId` - Get room messages
- `GET /chat/users/:matchId` - Get connected users
- `GET /chat/stats` - Chat statistics

## 🔧 Real-time Features

### Chat Messages
- Real-time notifications when new messages are sent
- Automatic cleanup of old messages when matches are deleted
- Featured messages based on user token balances

### Connected Users
- Real-time user join/leave notifications
- Automatic cleanup when users disconnect
- Activity tracking

## 🧹 Data Cleanup

The system automatically cleans up:

1. **Old Matches** - Matches older than 24 hours
2. **Related Chat Messages** - Messages for deleted matches
3. **Connected Users** - Users for deleted matches

This is handled by:
- Database triggers
- Application-level cleanup in sync process
- Foreign key constraints with CASCADE

## 📊 Monitoring

### Database Views
```sql
-- Active matches
SELECT * FROM active_matches;

-- Match statistics
SELECT * FROM match_stats;

-- Recent chat activity
SELECT 
    m.home_team, 
    m.away_team, 
    COUNT(cm.id) as message_count,
    COUNT(DISTINCT cu.user_id) as connected_users
FROM matches m
LEFT JOIN chat_messages cm ON m.api_football_id = cm.match_id
LEFT JOIN chat_connected_users cu ON m.api_football_id = cu.match_id
WHERE m.match_date > NOW() - INTERVAL '24 hours'
GROUP BY m.api_football_id, m.home_team, m.away_team;
```

### Application Logs
The application provides detailed logging:
- Match synchronization status
- Real-time connection status
- Error tracking
- Performance metrics

## 🔒 Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies allow read/write access for chat functionality
- Secure by default

### Data Validation
- Input validation on all endpoints
- Type checking with TypeScript
- Enum-based message types

## 🚨 Troubleshooting

### Common Issues

1. **Real-time not working**
   - Check if tables are added to `supabase_realtime` publication
   - Verify RLS policies allow access

2. **Matches not syncing**
   - Check API Football key
   - Verify network connectivity
   - Check application logs

3. **Chat messages not saving**
   - Verify Supabase connection
   - Check RLS policies
   - Validate message format

### Debug Commands

```sql
-- Check real-time status
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check recent matches
SELECT * FROM matches ORDER BY created_at DESC LIMIT 10;

-- Check recent messages
SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;

-- Check connected users
SELECT * FROM chat_connected_users ORDER BY connected_at DESC LIMIT 10;
```

## 📈 Performance

### Indexes
- Optimized for match queries by date
- Fast chat message retrieval
- Efficient user connection tracking

### Caching
- Supabase handles query caching
- Real-time subscriptions are efficient
- Automatic connection pooling

## 🔄 Migration from Gun.js

This system replaces the previous Gun.js implementation with:
- ✅ Better scalability
- ✅ Built-in authentication
- ✅ Automatic backups
- ✅ Real-time subscriptions
- ✅ SQL query capabilities
- ✅ Better security

## 📝 Next Steps

1. Set up Supabase project
2. Execute schema
3. Configure environment variables
4. Test endpoints
5. Monitor performance
6. Scale as needed

---

**Need help?** Check the main README.md for additional information or create an issue in the repository. 