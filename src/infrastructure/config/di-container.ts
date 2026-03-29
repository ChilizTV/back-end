import 'reflect-metadata';
import { container } from 'tsyringe';
import { IPredictionRepository } from '../../domain/predictions/repositories';
import {
  SupabasePredictionRepository,
  SupabaseMatchRepository,
  SupabaseChatRepository,
  SupabaseWaitlistRepository,
  SupabaseStreamRepository,
  SupabaseStreamWalletRepository,
  SupabaseFollowRepository,
} from '../persistence/repositories';
import {
  CreatePredictionUseCase,
  GetUserPredictionsUseCase,
  GetUserStatsUseCase,
  SettlePredictionsUseCase,
} from '../../application/predictions/use-cases';
import {
  GetAllMatchesUseCase,
  GetLiveMatchesUseCase,
  GetUpcomingMatchesUseCase,
  GetMatchByIdUseCase,
  GetMatchesByLeagueUseCase,
  GetMatchStatsUseCase,
  GetBrowseMatchesUseCase,
  ResolveFinishedMatchesUseCase,
  SyncMatchesUseCase,
  CleanupOldMatchesUseCase,
} from '../../application/matches/use-cases';
import {
  JoinRoomUseCase,
  LeaveRoomUseCase,
  SendMessageUseCase,
  SendBetMessageUseCase,
  GetRoomMessagesUseCase,
  GetConnectedUsersUseCase,
  GetChatStatsUseCase,
} from '../../application/chat/use-cases';
import {
  JoinWaitlistUseCase,
  CheckAccessUseCase,
  GetWaitlistStatsUseCase,
} from '../../application/waitlist/use-cases';
import {
  CreateStreamUseCase,
  GetActiveStreamsUseCase,
  GetPreferredStreamUseCase,
  EndStreamUseCase,
  UpdateViewerCountUseCase,
  CleanupOldStreamsUseCase,
} from '../../application/streams/use-cases';
import {
  GetStreamerDonationsUseCase,
  GetStreamerSubscriptionsUseCase,
  GetStreamerStatsUseCase,
  GetDonorHistoryUseCase,
  GetSubscriberHistoryUseCase,
} from '../../application/stream-wallet/use-cases';
import {
  FollowStreamerUseCase,
  UnfollowStreamerUseCase,
  GetIsFollowingUseCase,
  GetFollowerCountUseCase,
  GetFollowedStreamersUseCase,
} from '../../application/follows/use-cases';
import {
  PredictionController,
  MatchController,
  ChatController,
  WaitlistController,
  AuthController,
  StreamController,
  StreamWalletController,
  FanTokensController,
  FollowController,
  MediamtxWebhookController,
} from '../../presentation/http/controllers';
import {
  TokenBalanceAdapter,
  MarketOddsAdapter,
  MatchResolutionAdapter,
  BettingContractDeploymentAdapter,
  FanTokenAdapter,
} from '../blockchain/adapters';
import { FootballApiAdapter } from '../external/adapters';
import { JobScheduler } from '../scheduling/JobScheduler';
import {
  SyncMatchesJob,
  ResolveMarketsJob,
  CleanupStreamsJob,
  StaleStreamCleanupJob,
  SettlePredictionsJob,
  ViewerReconcileJob,
} from '../scheduling/jobs';
import { ViewerSessionService, StreamLifecycleService } from '../services';
import {
  DeployMissingContractsCommand,
  SetupMarketsCommand,
  TestMatchLifecycleCommand,
} from '../../presentation/cli/commands';
import { BlockchainEventListener } from '../blockchain';
import { StreamWalletIndexer, BettingEventIndexer } from '../blockchain/indexers';
import { IFanTokenRepository } from '../../domain/fan-tokens/repositories';
import { GetUserFanTokenBalancesUseCase } from '../../application/fan-tokens/use-cases';
import { IFollowRepository } from '../../domain/follows/repositories';
import { IMatchRepository } from '../../domain/matches/repositories';
import { IChatRepository } from '../../domain/chat/repositories';
import { IWaitlistRepository } from '../../domain/waitlist/repositories';
import { IStreamRepository } from '../../domain/streams/repositories';
import { IStreamWalletRepository } from '../../domain/stream-wallet/repositories';

export function setupDependencyInjection(): void {
  // Infrastructure - Repositories
  container.register<IPredictionRepository>('IPredictionRepository', {
    useClass: SupabasePredictionRepository,
  });
  container.register<IMatchRepository>('IMatchRepository', {
    useClass: SupabaseMatchRepository,
  });
  container.register<IChatRepository>('IChatRepository', {
    useClass: SupabaseChatRepository,
  });
  container.register<IWaitlistRepository>('IWaitlistRepository', {
    useClass: SupabaseWaitlistRepository,
  });
  container.register<IStreamRepository>('IStreamRepository', {
    useClass: SupabaseStreamRepository,
  });
  container.register<IStreamWalletRepository>('IStreamWalletRepository', {
    useClass: SupabaseStreamWalletRepository,
  });
  container.register<IFanTokenRepository>('IFanTokenRepository', {
    useClass: FanTokenAdapter,
  });
  container.register<IFollowRepository>('IFollowRepository', {
    useClass: SupabaseFollowRepository,
  });

  // Infrastructure - Blockchain Adapters
  container.registerSingleton(TokenBalanceAdapter);
  container.registerSingleton(MarketOddsAdapter);
  container.registerSingleton(MatchResolutionAdapter);
  container.registerSingleton(BettingContractDeploymentAdapter);

  // Infrastructure - External Adapters
  container.registerSingleton(FootballApiAdapter);

  // Application - Predictions Use Cases
  container.registerSingleton(CreatePredictionUseCase);
  container.registerSingleton(GetUserPredictionsUseCase);
  container.registerSingleton(GetUserStatsUseCase);
  container.registerSingleton(SettlePredictionsUseCase);

  // Application - Matches Use Cases
  container.registerSingleton(GetAllMatchesUseCase);
  container.registerSingleton(GetLiveMatchesUseCase);
  container.registerSingleton(GetUpcomingMatchesUseCase);
  container.registerSingleton(GetMatchByIdUseCase);
  container.registerSingleton(GetMatchesByLeagueUseCase);
  container.registerSingleton(GetMatchStatsUseCase);
  container.registerSingleton(GetBrowseMatchesUseCase);
  container.registerSingleton(ResolveFinishedMatchesUseCase);
  container.registerSingleton(SyncMatchesUseCase);
  container.registerSingleton(CleanupOldMatchesUseCase);

  // Application - Chat Use Cases
  container.registerSingleton(JoinRoomUseCase);
  container.registerSingleton(LeaveRoomUseCase);
  container.registerSingleton(SendMessageUseCase);
  container.registerSingleton(SendBetMessageUseCase);
  container.registerSingleton(GetRoomMessagesUseCase);
  container.registerSingleton(GetConnectedUsersUseCase);
  container.registerSingleton(GetChatStatsUseCase);

  // Application - Waitlist Use Cases
  container.registerSingleton(JoinWaitlistUseCase);
  container.registerSingleton(CheckAccessUseCase);
  container.registerSingleton(GetWaitlistStatsUseCase);

  // Application - Stream Use Cases
  container.registerSingleton(CreateStreamUseCase);
  container.registerSingleton(GetActiveStreamsUseCase);
  container.registerSingleton(GetPreferredStreamUseCase);
  container.registerSingleton(EndStreamUseCase);
  container.registerSingleton(UpdateViewerCountUseCase);
  container.registerSingleton(CleanupOldStreamsUseCase);

  // Application - StreamWallet Use Cases
  container.registerSingleton(GetStreamerDonationsUseCase);
  container.registerSingleton(GetStreamerSubscriptionsUseCase);
  container.registerSingleton(GetStreamerStatsUseCase);
  container.registerSingleton(GetDonorHistoryUseCase);
  container.registerSingleton(GetSubscriberHistoryUseCase);

  // Application - FanTokens Use Cases
  container.registerSingleton(GetUserFanTokenBalancesUseCase);

  // Application - Follow Use Cases
  container.registerSingleton(FollowStreamerUseCase);
  container.registerSingleton(UnfollowStreamerUseCase);
  container.registerSingleton(GetIsFollowingUseCase);
  container.registerSingleton(GetFollowerCountUseCase);
  container.registerSingleton(GetFollowedStreamersUseCase);

  // Infrastructure - Scheduling Jobs
  container.registerSingleton(SyncMatchesJob);
  container.registerSingleton(ResolveMarketsJob);
  container.registerSingleton(CleanupStreamsJob);
  container.registerSingleton(StaleStreamCleanupJob);
  container.registerSingleton(SettlePredictionsJob);
  container.registerSingleton(ViewerReconcileJob);
  container.registerSingleton(JobScheduler);

  // Presentation - CLI Commands
  container.registerSingleton(DeployMissingContractsCommand);
  container.registerSingleton(SetupMarketsCommand);
  container.registerSingleton(TestMatchLifecycleCommand);

  // Infrastructure - Stream Lifecycle + Viewer Sessions
  container.registerSingleton(StreamLifecycleService);
  container.registerSingleton(ViewerSessionService);

  // Presentation - mediamtx webhook
  container.registerSingleton(MediamtxWebhookController);

  // Infrastructure - Blockchain Indexers
  container.registerSingleton(BlockchainEventListener);
  container.registerSingleton(StreamWalletIndexer);
  container.registerSingleton(BettingEventIndexer);

  // Presentation - Controllers
  container.registerSingleton(PredictionController);
  container.registerSingleton(MatchController);
  container.registerSingleton(ChatController);
  container.registerSingleton(WaitlistController);
  container.registerSingleton(AuthController);
  container.registerSingleton(StreamController);
  container.registerSingleton(StreamWalletController);
  container.registerSingleton(FanTokensController);
  container.registerSingleton(FollowController);
}

export { container };
