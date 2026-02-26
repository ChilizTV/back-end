export interface CreateStreamDto {
  matchId: number;
  streamerId: string;
  streamerName: string;
  streamerWalletAddress?: string;
  title?: string;
}
