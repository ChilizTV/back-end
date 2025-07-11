import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database.config';
import { User } from './user.model';

export class UserSession extends Model {
    public fk_user_id!: number;
    public expirationDate!: Date;
    public token!: string;

    public user?: User;

    public getUser!: BelongsToGetAssociationMixin<User>;
}

UserSession.init({
    fk_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    expirationDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
}, {
    sequelize,
    tableName: 'user_session',
    timestamps: false,
});

User.hasMany(UserSession, { foreignKey: 'fk_user_id', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'fk_user_id', as: 'user' });
