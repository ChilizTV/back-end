export interface LiveStream {
    id: string;
    matchId: number;
    streamerId: string;
    streamerName: string;
    streamerWalletAddress?: string;
    streamKey: string;
    hlsPlaylistUrl?: string;
    status: 'active' | 'ended';
    viewerCount: number;
    createdAt: string;
    endedAt?: string;
}

export interface CreateStreamRequest {
    matchId: number;
    streamerId: string;
    streamerName: string;
    streamerWalletAddress?: string;
}

export interface CreateStreamResponse {
    success: boolean;
    stream?: LiveStream;
    error?: string;
}

export interface StreamListResponse {
    success: boolean;
    streams: LiveStream[];
    error?: string;
}

export interface EndStreamRequest {
    streamId: string;
    streamerId: string;
}

export interface EndStreamResponse {
    success: boolean;
    error?: string;
}

export interface StreamMetadata {
    streamKey: string;
    matchId: number;
    streamerId: string;
    streamerName: string;
}

