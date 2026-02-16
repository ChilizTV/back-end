import 'reflect-metadata';
import { container } from 'tsyringe';
import { IPredictionRepository } from '../../domain/predictions/repositories/IPredictionRepository';
import { SupabasePredictionRepository } from '../persistence/repositories/SupabasePredictionRepository';
import { CreatePredictionUseCase } from '../../application/predictions/use-cases/CreatePredictionUseCase';
import { GetUserPredictionsUseCase } from '../../application/predictions/use-cases/GetUserPredictionsUseCase';
import { GetUserStatsUseCase } from '../../application/predictions/use-cases/GetUserStatsUseCase';
import { PredictionController } from '../../presentation/http/controllers/prediction.controller';
import { IMatchRepository } from '../../domain/matches/repositories/IMatchRepository';
import { SupabaseMatchRepository } from '../persistence/repositories/SupabaseMatchRepository';
import { GetAllMatchesUseCase } from '../../application/matches/use-cases/GetAllMatchesUseCase';
import { GetLiveMatchesUseCase } from '../../application/matches/use-cases/GetLiveMatchesUseCase';
import { GetUpcomingMatchesUseCase } from '../../application/matches/use-cases/GetUpcomingMatchesUseCase';
import { GetMatchByIdUseCase } from '../../application/matches/use-cases/GetMatchByIdUseCase';
import { GetMatchesByLeagueUseCase } from '../../application/matches/use-cases/GetMatchesByLeagueUseCase';
import { GetMatchStatsUseCase } from '../../application/matches/use-cases/GetMatchStatsUseCase';
import { MatchController } from '../../presentation/http/controllers/match.controller';
import { IChatRepository } from '../../domain/chat/repositories/IChatRepository';
import { SupabaseChatRepository } from '../persistence/repositories/SupabaseChatRepository';
import { JoinRoomUseCase } from '../../application/chat/use-cases/JoinRoomUseCase';
import { LeaveRoomUseCase } from '../../application/chat/use-cases/LeaveRoomUseCase';
import { SendMessageUseCase } from '../../application/chat/use-cases/SendMessageUseCase';
import { SendBetMessageUseCase } from '../../application/chat/use-cases/SendBetMessageUseCase';
import { GetRoomMessagesUseCase } from '../../application/chat/use-cases/GetRoomMessagesUseCase';
import { GetConnectedUsersUseCase } from '../../application/chat/use-cases/GetConnectedUsersUseCase';
import { GetChatStatsUseCase } from '../../application/chat/use-cases/GetChatStatsUseCase';
import { ChatController } from '../../presentation/http/controllers/chat.controller';
import { IWaitlistRepository } from '../../domain/waitlist/repositories/IWaitlistRepository';
import { SupabaseWaitlistRepository } from '../persistence/repositories/SupabaseWaitlistRepository';
import { JoinWaitlistUseCase } from '../../application/waitlist/use-cases/JoinWaitlistUseCase';
import { CheckAccessUseCase } from '../../application/waitlist/use-cases/CheckAccessUseCase';
import { GetWaitlistStatsUseCase } from '../../application/waitlist/use-cases/GetWaitlistStatsUseCase';
import { WaitlistController } from '../../presentation/http/controllers/waitlist.controller';
import { AuthController } from '../../presentation/http/controllers/auth.controller';
import { IStreamRepository } from '../../domain/streams/repositories/IStreamRepository';
import { SupabaseStreamRepository } from '../persistence/repositories/SupabaseStreamRepository';
import { CreateStreamUseCase } from '../../application/streams/use-cases/CreateStreamUseCase';
import { GetActiveStreamsUseCase } from '../../application/streams/use-cases/GetActiveStreamsUseCase';
import { EndStreamUseCase } from '../../application/streams/use-cases/EndStreamUseCase';
import { UpdateViewerCountUseCase } from '../../application/streams/use-cases/UpdateViewerCountUseCase';
import { StreamController } from '../../presentation/http/controllers/stream.controller';
import { IStreamWalletRepository } from '../../domain/stream-wallet/repositories/IStreamWalletRepository';
import { SupabaseStreamWalletRepository } from '../persistence/repositories/SupabaseStreamWalletRepository';
import { GetStreamerDonationsUseCase } from '../../application/stream-wallet/use-cases/GetStreamerDonationsUseCase';
import { GetStreamerSubscriptionsUseCase } from '../../application/stream-wallet/use-cases/GetStreamerSubscriptionsUseCase';
import { GetStreamerStatsUseCase } from '../../application/stream-wallet/use-cases/GetStreamerStatsUseCase';
import { GetDonorHistoryUseCase } from '../../application/stream-wallet/use-cases/GetDonorHistoryUseCase';
import { GetSubscriberHistoryUseCase } from '../../application/stream-wallet/use-cases/GetSubscriberHistoryUseCase';
import { StreamWalletController } from '../../presentation/http/controllers/stream-wallet.controller';
import { TokenBalanceAdapter } from '../blockchain/adapters/TokenBalanceAdapter';
import { MarketOddsAdapter } from '../blockchain/adapters/MarketOddsAdapter';
import { MatchResolutionAdapter } from '../blockchain/adapters/MatchResolutionAdapter';
import { BettingContractDeploymentAdapter } from '../blockchain/adapters/BettingContractDeploymentAdapter';
import { FootballApiAdapter } from '../external/adapters/FootballApiAdapter';
import { ResolveFinishedMatchesUseCase } from '../../application/matches/use-cases/ResolveFinishedMatchesUseCase';
import { SyncMatchesUseCase } from '../../application/matches/use-cases/SyncMatchesUseCase';

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

  // Application - Matches Use Cases
  container.registerSingleton(GetAllMatchesUseCase);
  container.registerSingleton(GetLiveMatchesUseCase);
  container.registerSingleton(GetUpcomingMatchesUseCase);
  container.registerSingleton(GetMatchByIdUseCase);
  container.registerSingleton(GetMatchesByLeagueUseCase);
  container.registerSingleton(GetMatchStatsUseCase);
  container.registerSingleton(ResolveFinishedMatchesUseCase);
  container.registerSingleton(SyncMatchesUseCase);

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
  container.registerSingleton(EndStreamUseCase);
  container.registerSingleton(UpdateViewerCountUseCase);

  // Application - StreamWallet Use Cases
  container.registerSingleton(GetStreamerDonationsUseCase);
  container.registerSingleton(GetStreamerSubscriptionsUseCase);
  container.registerSingleton(GetStreamerStatsUseCase);
  container.registerSingleton(GetDonorHistoryUseCase);
  container.registerSingleton(GetSubscriberHistoryUseCase);

  // Presentation - Controllers
  container.registerSingleton(PredictionController);
  container.registerSingleton(MatchController);
  container.registerSingleton(ChatController);
  container.registerSingleton(WaitlistController);
  container.registerSingleton(AuthController);
  container.registerSingleton(StreamController);
  container.registerSingleton(StreamWalletController);
}

export { container };
