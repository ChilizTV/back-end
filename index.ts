import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import { MatchController } from './controllers';
import { startMatchSyncCron } from './cron/sync-matches.cron';
import { config } from 'dotenv';
config();

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const matchController = new MatchController();

app.use('/matches', matchController.buildRoutes());

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
  
  startMatchSyncCron();
});