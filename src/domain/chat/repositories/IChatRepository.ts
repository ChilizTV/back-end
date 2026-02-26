import { ChatMessage } from '../entities/ChatMessage';
import { ConnectedUser } from '../entities/ConnectedUser';

export interface ChatStats {
  connectedUsers: number;
  activeRooms: number;
  totalMessages: number;
  featuredMessages: number;
}

export interface IChatRepository {
  saveMessage(message: ChatMessage): Promise<ChatMessage>;
  findMessagesByMatchId(matchId: number, limit: number, offset: number): Promise<ChatMessage[]>;
  findFeaturedMessages(matchId: number): Promise<ChatMessage[]>;

  addConnectedUser(user: ConnectedUser): Promise<ConnectedUser>;
  removeConnectedUser(matchId: number, userId: string): Promise<void>;
  findConnectedUsersByMatchId(matchId: number): Promise<ConnectedUser[]>;
  updateUserActivity(matchId: number, userId: string): Promise<void>;

  getChatStats(): Promise<ChatStats>;
}
