import express from 'express';
import bodyParser from 'body-parser';
import sequelize from './config/database.config';
import cors from "cors";
import { AuthController, UserController, MatchController } from './controllers';
import { startMatchSyncCron } from './cron/sync-matches.cron';

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const authController = new AuthController();
const userController = new UserController();
const matchController = new MatchController();

app.use('/auth', authController.buildRoutes());
app.use('/user', userController.buildRoutes());
app.use('/matches', matchController.buildRoutes());

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
    
    startMatchSyncCron();
  });
}).catch((error) => console.error('Error connecting to database', error));