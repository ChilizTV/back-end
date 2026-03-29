export interface SendMessageDto {
  matchId: number;
  streamId?: string;
  userId: string;
  walletAddress: string;
  username: string;
  message: string;
  isFeatured?: boolean;
}

export interface SendBetMessageDto extends SendMessageDto {
  betType: string;
  betSubType?: string;
  amount: number;
  odds: number;
}
