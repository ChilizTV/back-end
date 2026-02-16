# Postman Usage Guide - Chiliz Football Betting API

## 📦 Importing the Collection

1. Open Postman
2. Click **Import** (top left)
3. Select the `postman_collection.json` file
4. The "Chiliz Football Betting API" collection will appear in your sidebar

## 🔧 Configuration

### Collection Variables

Two variables are pre-configured:

- **`base_url`**: `http://localhost:3000` (modify for your environment)
- **`jwt_token`**: Empty initially, automatically filled after authentication

### Modify Base URL

1. Click on the "Chiliz Football Betting API" collection
2. Go to **Variables** tab
3. Edit `base_url` (e.g., `https://api.production.com`)

## 🔐 Authentication

### Step 1: Generate JWT Token

1. Go to **Authentication** > **Generate Token**
2. Modify the body with your wallet address:
   ```json
   {
     "walletAddress": "0xYOUR_WALLET_ADDRESS",
     "username": "your_username"
   }
   ```
3. Click **Send**
4. ✅ JWT token is **automatically saved** to `{{jwt_token}}`

### Step 2: Use Authenticated Endpoints

All endpoints (except `/auth` and `/health`) automatically use the JWT token stored in `{{jwt_token}}`.

**Note:** Public endpoints have authentication disabled (`"type": "noauth"`).

## 📋 Collection Structure

### 1️⃣ Health & Status (Public)
- `GET /health` - Check server status
- `GET /` - API information
- `GET /supabase-status` - Supabase status (authenticated)

### 2️⃣ Authentication (Public)
- `POST /auth/token` - Generate JWT token
  - **Auto-save**: Postman script automatically saves the token

### 3️⃣ Matches (Authenticated)
- `GET /matches` - All matches
- `GET /matches/live` - Live matches
- `GET /matches/upcoming` - Upcoming matches
- `GET /matches/stats/summary` - Summary statistics
- `GET /matches/:id` - Match details
- `GET /matches/league/:league` - Matches by league

### 4️⃣ Predictions (Authenticated)
- `POST /predictions` - Create a prediction
- `GET /predictions/:userId` - User predictions
- `GET /predictions/stats/:userId` - User statistics

### 5️⃣ Chat (Authenticated)
- `POST /chat/join/:matchId` - Join a chat room
- `POST /chat/leave/:matchId` - Leave a chat room
- `POST /chat/message/:matchId` - Send a message
- `POST /chat/bet/:matchId` - Send a bet message
- `GET /chat/messages/:matchId` - Get room messages
- `GET /chat/users/:matchId` - Get connected users
- `GET /chat/stats` - Global chat statistics

### 6️⃣ Streaming (Authenticated)
- `POST /stream` - Create a stream
- `GET /stream` - Get active streams
- `DELETE /stream` - End a stream
- `PUT /stream/:streamId/viewers` - Update viewer count

### 7️⃣ Stream Wallet (Authenticated)
- `GET /stream-wallet/donations/:streamerAddress` - Streamer donations
- `GET /stream-wallet/subscriptions/:streamerAddress` - Streamer subscriptions
- `GET /stream-wallet/stats/:streamerAddress` - Streamer statistics
- `GET /stream-wallet/donor/:donorAddress/donations` - Donor history
- `GET /stream-wallet/subscriber/:subscriberAddress/subscriptions` - Subscriber history

### 8️⃣ Waitlist (Authenticated)
- `POST /waitlist` - Join waitlist
- `GET /waitlist/check-access` - Check access
- `GET /waitlist/stats` - Waitlist statistics

## 🚀 Typical Workflow

### Complete API Test

1. **Health**: `GET /health` → Check server is responding
2. **Auth**: `POST /auth/token` → Get JWT (auto-saved)
3. **Matches**: `GET /matches/live` → View live matches
4. **Chat**: `POST /chat/join/:matchId` → Join match chat
5. **Message**: `POST /chat/message/:matchId` → Send a message
6. **Prediction**: `POST /predictions` → Create a prediction
7. **Stats**: `GET /predictions/stats/:userId` → View your stats

### Stream Testing

1. **Auth**: Generate token
2. **Create**: `POST /stream` → Create a stream
3. **List**: `GET /stream` → Verify it appears
4. **Update**: `PUT /stream/:streamId/viewers` → Update viewer count
5. **End**: `DELETE /stream` → End the stream

## 💡 Tips & Tricks

### Replace IDs Dynamically

Examples use hardcoded values. You can replace them with variables:

1. In the body, use `{{match_id}}` instead of `1035090`
2. Add the variable in **Collection Variables**

### View JWT Token

1. Click on the collection
2. Go to **Variables** tab
3. `jwt_token` displays the current token

### Automatic Test Scripts

The **Generate Token** endpoint has a script that:
- Extracts the token from the response
- Automatically saves it to `{{jwt_token}}`

Script code:
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.collectionVariables.set('jwt_token', jsonData.token);
}
```

## 🔥 Rate Limits

The API has configured rate limits:

- **Global**: 100 req/15min per IP
- **Auth**: 5 req/15min per IP
- **Predictions**: 20 req/15min per IP
- **Chat**: 50 req/15min per IP

## 🐛 Troubleshooting

### Error 401 Unauthorized

- Check that JWT token is generated (`{{jwt_token}}` not empty)
- Regenerate token if expired

### Error 404 Not Found

- Verify `{{base_url}}` points to the correct server
- Check that the server is running (`npm run dev`)

### Error 429 Too Many Requests

- Wait 15 minutes (rate limit)
- Check limits in `/src/presentation/http/middlewares/rate-limit.middleware.ts`

## 📚 Resources

- **API Docs**: See main README
- **Schemas**: `/src/presentation/http/validation/schemas/`
- **Controllers**: `/src/presentation/http/controllers/`

---

✅ Collection ready to use with 35+ testable endpoints!
