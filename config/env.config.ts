import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

export const config = {
    // Configuration de la base de données
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        name: process.env.DB_NAME || 'your_database_name',
        user: process.env.DB_USER || 'your_database_user',
        password: process.env.DB_PASSWORD || 'your_database_password'
    },
    
    // Configuration de l'API-FOOTBALL
    apiFootball: {
        key: process.env.API_FOOTBALL_KEY || ''
    },
    
    // Configuration du serveur
    server: {
        port: parseInt(process.env.PORT || '3000'),
        nodeEnv: process.env.NODE_ENV || 'development'
    }
}; 