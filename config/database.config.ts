import { Sequelize } from 'sequelize';
import { config } from 'dotenv'
config();

const sequelize = new Sequelize('ReadyToFly', process.env.DATABASE_USERNAME as string, process.env.DATABASE_PASSWORD, {
    host: process.env.HOST,
    port: Number(process.env.PORT),
    dialect: 'mysql',
    dialectOptions: {
        socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
    },
});

export default sequelize;