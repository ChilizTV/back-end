# Football Matches API with Live Chat

Un backend Node.js qui récupère les matchs de football avec leurs cotes depuis l'API-FOOTBALL et propose un système de chat en temps réel avec Gun.js.

## 🚀 Fonctionnalités

### Matchs de Football
- ✅ Récupération des matchs depuis l'API-FOOTBALL
- ✅ Filtrage par ligues spécifiques (IDs: 743, 15, 39, 61, 140, 2, 3, 78, 135)
- ✅ Cotes réelles depuis l'API-FOOTBALL avec fallback aléatoire
- ✅ Cache en mémoire avec rafraîchissement automatique
- ✅ Filtrage temporel (48h centrées sur l'heure actuelle)
- ✅ Job cron pour synchronisation toutes les 10 minutes

### Chat en Temps Réel
- ✅ Chat en temps réel avec Gun.js
- ✅ Une room de chat par match
- ✅ Messages système (rejoindre/quitter, début/fin de match)
- ✅ Messages de paris avec cotes
- ✅ WebSockets pour communication temps réel

## 🛠️ Technologies

- **Backend**: Node.js, Express, TypeScript
- **Base de données**: In-memory cache (pas de DB)
- **Temps réel**: Gun.js avec WebSockets
- **API**: API-FOOTBALL pour les matchs et cotes

## 📋 Prérequis

- Node.js (version 14+)
- Clé API-FOOTBALL (gratuite sur [api-football.com](https://www.api-football.com/))

## ⚙️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd server
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
# Créer un fichier .env
echo "API_FOOTBALL_KEY=votre_cle_api_football" > .env
echo "PORT=3000" >> .env
```

4. **Compiler et démarrer**
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Matchs

#### GET `/matches`
Récupère tous les matchs disponibles
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
Récupère les matchs en cours
```json
{
  "success": true,
  "data": [...]
}
```

#### GET `/matches/upcoming`
Récupère les matchs à venir
```json
{
  "success": true,
  "data": [...]
}
```

#### GET `/matches/{id}`
Récupère un match spécifique
```json
{
  "success": true,
  "data": {
    "id": 123456,
    "home_team": "Paris SG",
    "away_team": "Marseille",
    // ... autres détails
  }
}
```

#### POST `/matches/sync`
Déclenche une synchronisation manuelle
```json
{
  "success": true,
  "message": "Sync completed"
}
```

### Chat

#### POST `/chat/join/{matchId}`
Rejoindre une room de chat
```json
{
  "userId": "user_123",
  "username": "JohnDoe"
}
```

#### POST `/chat/leave/{matchId}`
Quitter une room de chat
```json
{
  "userId": "user_123",
  "username": "JohnDoe"
}
```

#### POST `/chat/message/{matchId}`
Envoyer un message
```json
{
  "userId": "user_123",
  "username": "JohnDoe",
  "message": "Hello everyone!"
}
```

#### POST `/chat/bet/{matchId}`
Placer un pari
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
Récupérer les messages d'une room
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
Récupérer les utilisateurs connectés
```json
{
  "success": true,
  "users": ["JohnDoe", "JaneSmith"]
}
```

#### GET `/chat/stats`
Statistiques du chat
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

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `API_FOOTBALL_KEY` | Clé API-FOOTBALL | Requis |
| `PORT` | Port du serveur | 3000 |

### Ligues autorisées

Les matchs sont filtrés pour inclure uniquement ces ligues :
- 743: Ligue 1 (France)
- 15: Premier League (Angleterre)
- 39: La Liga (Espagne)
- 61: Serie A (Italie)
- 140: Primeira Liga (Portugal)
- 2: UEFA Champions League
- 3: UEFA Europa League
- 78: Bundesliga (Allemagne)
- 135: Eredivisie (Pays-Bas)

## 🔄 Synchronisation

- **Automatique** : Toutes les 10 minutes via cron job
- **Manuelle** : POST `/matches/sync`
- **Cache** : 15 minutes de validité

## 📊 Logs

Le système génère des logs détaillés :
- 🔄 Synchronisation des matchs
- 💰 Récupération des cotes (réelles ou aléatoires)
- 💬 Messages de chat
- 👥 Connexions/déconnexions utilisateurs
- ⚠️ Erreurs et avertissements

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'API key
echo "API_FOOTBALL_KEY=votre_cle" > .env

# 3. Démarrer le serveur
npm start

# 4. Tester l'API
curl http://localhost:3000
```

## 🔍 Debug

Pour voir les logs détaillés :
```bash
npm start 2>&1 | tee server.log
```

## 📝 Structure du projet

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

## 📄 Licence

Ce projet est sous licence AGPL-3.0. Voir le fichier `LICENSE` pour plus de détails.

**Note** : Ce projet utilise l'API-FOOTBALL qui nécessite une clé API gratuite. Assurez-vous d'avoir une clé valide pour que le système fonctionne correctement. 