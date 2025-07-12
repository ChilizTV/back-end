# API Matchs - Live Matches Betting Platform

Cette API permet de récupérer les matchs de football en direct depuis l'API-FOOTBALL avec les cotes pour la plateforme de paris en direct avec Fan Tokens.

## 🚀 Fonctionnalités

- **Cache en mémoire** : Les matchs sont stockés en mémoire pour des réponses rapides
- **Synchronisation automatique** : Cron job qui refetch les données toutes les 10 minutes
- **Filtrage 24h** : Seuls les matchs dans les 24h sont retournés
- **Filtrage par ligues** : Seuls les matchs des compétitions majeures sont inclus
- **Cotes générées** : Odds aléatoires pour chaque match
- **Logs détaillés** : Console logs avec emojis pour un debugging facile

## 🏆 Ligues et Compétitions Supportées

L'API filtre automatiquement les matchs pour ne retourner que ceux des compétitions suivantes (identifiées par leurs IDs API-FOOTBALL) :

### IDs des Ligues Autorisées
- **743** - Premier League (Angleterre)
- **15** - La Liga (Espagne)
- **39** - Bundesliga (Allemagne)
- **61** - Serie A (Italie)
- **140** - Ligue 1 (France)
- **2** - Primeira Liga (Portugal)
- **3** - UEFA Champions League
- **78** - UEFA Europa League
- **135** - UEFA Women's Championship (Euro Féminin)

### Filtrage Automatique
- Seuls les matchs de ces ligues (identifiées par leurs IDs) sont inclus dans les résultats
- Les autres ligues sont automatiquement exclues
- Logs détaillés des matchs exclus avec leur nom et ID pour le debugging

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Configuration de l'API-FOOTBALL
API_FOOTBALL_KEY=your_api_football_key_here

# Configuration du serveur
PORT=3000
NODE_ENV=development
```

### Installation des dépendances

```bash
npm install
```

### Démarrage du serveur

```bash
npm start
```

## 🔄 Système de Cache et Cron Job

### Cache en mémoire
- Les matchs sont stockés en mémoire pour des réponses ultra-rapides
- Le cache se rafraîchit automatiquement si les données ont plus de 15 minutes
- Évite les appels répétés à l'API-FOOTBALL

### Cron Job (toutes les 10 minutes)
- Synchronisation automatique des données depuis l'API-FOOTBALL
- Exécution immédiate au démarrage du serveur
- Logs détaillés avec durée d'exécution et statistiques

### Statistiques du cache
Endpoint pour surveiller l'état du cache :
```
GET /matches/cache/stats
```

Réponse :
```json
{
  "message": "Cache statistics retrieved successfully",
  "stats": {
    "matchesCount": 25,
    "lastFetchTime": "2024-01-15T10:30:00.000Z",
    "cacheAgeMinutes": 5.2,
    "isFetching": false
  }
}
```

## Endpoints des Matchs

**⚠️ Important :** Tous les endpoints retournent uniquement les matchs qui auront lieu dans les 24 prochaines heures ou qui sont actuellement en cours.

### Récupération des matchs

#### GET /matches
Récupère tous les matchs dans les 24h avec les cotes (depuis le cache).

**Réponse :**
```json
[
  {
    "id": 123456,
    "api_football_id": 123456,
    "home_team": "Paris Saint-Germain",
    "away_team": "Marseille",
    "home_score": 2,
    "away_score": 1,
    "match_date": "2024-01-15T20:00:00.000Z",
    "status": "live",
    "league": "Ligue 1",
    "season": "2023-2024",
    "venue": "Parc des Princes",
    "referee": "Clément Turpin",
    "odds": {
      "home_win": 1.85,
      "draw": 3.40,
      "away_win": 2.15
    }
  }
]
```

#### GET /matches/live
Récupère tous les matchs actuellement en cours avec les cotes (depuis le cache).

#### GET /matches/upcoming
Récupère tous les matchs à venir dans les 24h avec les cotes (depuis le cache).

#### GET /matches/next-24h
Récupère spécifiquement tous les matchs dans les 24h avec les cotes (depuis le cache).

#### GET /matches/:id
Récupère un match spécifique par son ID (depuis le cache).

#### GET /matches/league/:league
Récupère tous les matchs d'une ligue spécifique dans les 24h (depuis le cache).

**Paramètres :**
- `league` : Nom de la ligue (ex: "Premier League", "La Liga")

#### GET /matches/date-range?startDate=2024-01-01&endDate=2024-01-31
Récupère tous les matchs dans une plage de dates, filtrés sur les 24h (depuis le cache).

**Paramètres de requête :**
- `startDate` : Date de début (format: YYYY-MM-DD)
- `endDate` : Date de fin (format: YYYY-MM-DD)

### Administration

#### GET /matches/cache/stats
Affiche les statistiques du cache en mémoire.

#### POST /matches/sync
Force une synchronisation manuelle depuis l'API-FOOTBALL.

**Réponse :**
```json
{
  "message": "Matches synced successfully"
}
```

## 🔄 Logs du Cron Job

Le système affiche des logs détaillés pour le monitoring :

```
🔄 ===== CRON JOB: Starting match synchronization =====
🔄 Starting match refetch from API-FOOTBALL...
📅 Fetching matches between 2024-01-15T10:00:00.000Z and 2024-01-16T10:00:00.000Z
📊 API Response received: 45 matches found
✅ Cache updated: 25 matches stored in memory
⏰ Last fetch time: 2024-01-15T10:30:00.000Z
✅ CRON JOB: Match synchronization completed successfully in 1250ms
📊 Cache Stats: 25 matches, age: 0.00 minutes
🔄 ===== CRON JOB: Match synchronization finished =====
```

## Filtrage automatique des 24h

L'API filtre automatiquement tous les matchs pour ne retourner que ceux qui :
- Sont programmés dans les 24 prochaines heures
- Sont actuellement en cours
- Se sont terminés dans les dernières 24h

Cette fonctionnalité permet de :
- Optimiser les performances en réduisant la quantité de données
- Se concentrer sur les matchs pertinents pour les paris en direct
- Inclure les matchs récents pour l'historique et les résultats
- Éviter l'affichage de matchs trop anciens ou trop lointains

## Cotes des matchs

Chaque match retourné inclut des cotes réelles récupérées depuis l'API-FOOTBALL :
- `home_win` : Cote pour la victoire de l'équipe domicile
- `draw` : Cote pour le match nul
- `away_win` : Cote pour la victoire de l'équipe extérieur

### Source des cotes
- **Cotes réelles** : Récupérées depuis l'API-FOOTBALL via l'endpoint `/odds`
- **Bookmaker principal** : Utilisation du bookmaker principal (ID: 1)
- **Fallback** : Cotes aléatoires générées si les vraies cotes ne sont pas disponibles
- **Logs détaillés** : Affichage des cas où les cotes ne sont pas trouvées

## Console Logs

L'API inclut des logs détaillés avec emojis pour le debugging :
- 📋 Logs de début et fin de chaque requête
- 📊 Nombre de matchs trouvés et retournés
- ❌ Erreurs détaillées en cas de problème
- 🔄 Logs de transformation des données
- 📦 Informations sur l'âge du cache

## Architecture

- **Service MatchService** : Gère le cache en mémoire et les appels à l'API-FOOTBALL
- **Contrôleur MatchController** : Gère les endpoints HTTP et les logs
- **Cron Job** : Synchronisation automatique toutes les 10 minutes
- **Interface MatchWithOdds** : Définit la structure des données avec cotes
- **Cache en mémoire** : Stockage temporaire pour des réponses rapides

## Intégration avec l'API-FOOTBALL

L'API utilise l'API-FOOTBALL pour récupérer les données des matchs en temps réel. Les données sont :
1. Récupérées toutes les 10 minutes via le cron job
2. Stockées en mémoire pour des réponses rapides
3. Transformées et enrichies avec des cotes
4. Retournées au frontend depuis le cache

## Structure des données

Chaque match inclut les champs suivants :
- `id` : Identifiant unique (même que api_football_id)
- `api_football_id` : ID du match dans l'API-FOOTBALL
- `home_team` : Équipe domicile
- `away_team` : Équipe extérieur
- `home_score` : Score domicile (null si pas encore joué)
- `away_score` : Score extérieur (null si pas encore joué)
- `match_date` : Date et heure du match
- `status` : Statut du match (scheduled, live, finished, cancelled)
- `league` : Nom de la ligue
- `season` : Saison
- `venue` : Stade (peut être null)
- `referee` : Arbitre (peut être null)
- `odds` : Cotes du match (home_win, draw, away_win) 