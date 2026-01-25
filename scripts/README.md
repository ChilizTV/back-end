# Script de déploiement du contrat BettingMatch pour le match mock

Ce script déploie un contrat `BettingMatch` pour le match mock (PSG vs Inter Milan, `api_football_id = 1`) et enregistre l'adresse du contrat déployé en base de données.

## Prérequis

1. Les variables d'environnement suivantes doivent être configurées dans `.env` :
   - `SUPABASE_URL` : URL de votre instance Supabase
   - `SUPABASE_ANON_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` : Clé d'API Supabase
   - `BETTING_MATCH_FACTORY_ADDRESS` : Adresse du contrat Factory
   - `ADMIN_PRIVATE_KEY` : Clé privée de l'admin pour signer les transactions
   - `ADMIN_ADDRESS` : Adresse de l'admin (optionnel, sera dérivée de la clé privée)

2. Installer les dépendances :
   ```bash
   npm install
   ```

## Utilisation

### Méthode 1 : Via npm script (recommandé)
```bash
npm run deploy:mock-match
```

### Méthode 2 : Directement avec ts-node
```bash
npx ts-node scripts/deploy-mock-match.ts
```

## Fonctionnement

Le script effectue les étapes suivantes :

1. **Vérification du match** : Vérifie si le match avec `api_football_id = 1` existe en base de données
2. **Création du match** : Si le match n'existe pas, il est créé avec les données du match mock (PSG vs Inter Milan)
3. **Vérification du contrat** : Si un contrat existe déjà pour ce match, le script s'arrête (pour éviter les déploiements multiples)
4. **Déploiement du contrat** : Déploie un nouveau contrat `BettingMatch` via la Factory
5. **Mise à jour en base** : Met à jour le match en base de données avec l'adresse du contrat déployé

## Résultat attendu

Le script affiche :
- Les informations du match (équipes, date, etc.)
- L'adresse du contrat déployé
- L'adresse du propriétaire du contrat
- Un résumé final avec toutes les informations importantes

## Gestion des erreurs

Le script gère les erreurs suivantes :
- Match introuvable en base (création automatique)
- Contrat déjà déployé (skip du déploiement)
- Erreurs de déploiement blockchain
- Erreurs de mise à jour en base de données

## Notes

- Le script utilise le réseau configuré dans `chiliz.config.ts` (testnet ou mainnet)
- Le contrat est déployé avec l'adresse admin comme propriétaire
- Le match mock est identifié par `api_football_id = 1`
