import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.config';

export class Match extends Model {
    public id!: number;
    public api_football_id!: number;
    public home_team!: string;
    public away_team!: string;
    public home_score?: number;
    public away_score?: number;
    public match_date!: Date;
    public status!: string; // 'scheduled', 'live', 'finished', 'cancelled'
    public league!: string;
    public season!: string;
    public venue?: string;
    public referee?: string;
    public created_at!: Date;
    public updated_at!: Date;
}

Match.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    api_football_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    home_team: {
        type: DataTypes.STRING,
        allowNull: false
    },
    away_team: {
        type: DataTypes.STRING,
        allowNull: false
    },
    home_score: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    away_score: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    match_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'finished', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
    },
    league: {
        type: DataTypes.STRING,
        allowNull: false
    },
    season: {
        type: DataTypes.STRING,
        allowNull: false
    },
    venue: {
        type: DataTypes.STRING,
        allowNull: true
    },
    referee: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    tableName: 'matches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
}); 