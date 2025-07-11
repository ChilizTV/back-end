# API Matchs - Live Matches Betting Platform

Cette API permet de gérer les matchs de football pour la plateforme de paris en direct avec Fan Tokens, utilisant GUN.js comme base de données décentralisée.

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Configuration de la base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

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

### Démarrage des serveurs

#### Option 1 : Démarrage séparé
```bash
# Terminal 1 : Démarrer le serveur GUN.js
npm run gun

# Terminal 2 : Démarrer l'API principale
npm start
```

#### Option 2 : Démarrage simultané
```bash
npm run dev
```

## Architecture

### Base de données hybride
- **Sequelize** : Base de données relationnelle pour la persistance
- **GUN.js** : Base de données décentralisée pour les données en temps réel
- **Synchronisation automatique** : Les données sont synchronisées entre les deux systèmes

### Serveurs
- **API principale** : Port 3000 - Endpoints REST
- **Serveur GUN.js** : Port 8765 - Base de données décentralisée

## Endpoints des Matchs

### Récupération des matchs

#### GET /matches
Récupère tous les matchs triés par date décroissante.

#### GET /matches/live
Récupère tous les matchs en cours (utilise GUN.js).

#### GET /matches/upcoming
Récupère tous les matchs à venir.

#### GET /matches/next24h ⭐ **NOUVEAU**
Récupère uniquement les matchs qui auront lieu dans les 24 prochaines heures (utilise GUN.js).

**Réponse :**
```json
[
  {
    "id": 1,
    "api_football_id": 123456,
    "home_team": "Paris Saint-Germain",
    "away_team": "Marseille",
    "home_score": null,
    "away_score": null,
    "match_date": "2024-01-15T20:00:00.000Z",
    "status": "scheduled",
    "league": "Ligue 1",
    "season": "2023-2024",
    "venue": "Parc des Princes",
    "referee": "Clément Turpin"
  }
]
```

#### GET /matches/:id
Récupère un match spécifique par son ID.

#### GET /matches/league/:league
Récupère tous les matchs d'une ligue spécifique.

#### GET /matches/date-range?startDate=2024-01-01&endDate=2024-01-31
Récupère tous les matchs dans une plage de dates.

### Administration

#### POST /matches/sync
Synchronise les matchs depuis l'API-FOOTBALL et les synchronise avec GUN.js.

#### PUT /matches/:id/status
Met à jour le statut d'un match (Sequelize + GUN.js).

## Intégration GUN.js

### Fonctionnalités
- **Données en temps réel** : GUN.js permet la synchronisation en temps réel
- **Base de données décentralisée** : Pas de point de défaillance unique
- **Synchronisation hybride** : Combinaison avec Sequelize pour la persistance

### Avantages
- **Performance** : Accès rapide aux données fréquemment consultées
- **Résilience** : Pas de dépendance à une seule base de données
- **Temps réel** : Mises à jour instantanées des statuts de matchs

## Synchronisation automatique

Le serveur inclut un job CRON qui :
1. Synchronise les matchs depuis l'API-FOOTBALL
2. Met à jour la base de données Sequelize
3. Synchronise les données avec GUN.js
4. Se répète toutes les 10 minutes

## Filtrage des matchs dans les 24h

L'endpoint `/matches/next24h` :
- Récupère uniquement les matchs programmés (`status: 'scheduled'`)
- Filtre les matchs qui ont lieu dans les 24 prochaines heures
- Utilise GUN.js pour des performances optimales
- Retourne les données formatées pour l'API

## Structure des données

### Match (Sequelize + GUN.js)
```typescript
interface Match {
    id: number;
    api_football_id: number;
    home_team: string;
    away_team: string;
    home_score?: number;
    away_score?: number;
    match_date: Date;
    status: 'scheduled' | 'live' | 'finished' | 'cancelled';
    league: string;
    season: string;
    venue?: string;
    referee?: string;
    created_at: Date;
    updated_at: Date;
}
```

## Monitoring

### Vérifier le serveur GUN.js
```bash
curl http://localhost:8765/health
```

### Logs
- Les synchronisations sont loggées dans la console
- Les erreurs de connexion GUN.js sont affichées
- Les mises à jour de statut sont tracées

## Développement

### Scripts disponibles
- `npm start` : Démarre l'API principale
- `npm run gun` : Démarre le serveur GUN.js
- `npm run dev` : Démarre les deux serveurs simultanément
- `npm run build` : Compile le code TypeScript 