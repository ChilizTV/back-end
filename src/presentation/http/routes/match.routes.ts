import { Router } from 'express';
import { container } from 'tsyringe';
import { MatchController } from '../controllers/match.controller';

const router = Router();
const matchController = container.resolve(MatchController);

router.get('/stats/summary', matchController.getMatchStats.bind(matchController));
router.get('/browse', matchController.getBrowseMatches.bind(matchController));
router.get('/live', matchController.getLiveMatches.bind(matchController));
router.get('/upcoming', matchController.getUpcomingMatches.bind(matchController));
router.get('/league/:league', matchController.getMatchesByLeague.bind(matchController));
router.get('/:id', matchController.getMatchById.bind(matchController));
router.get('/', matchController.getAllMatches.bind(matchController));

export { router as matchRoutes };
