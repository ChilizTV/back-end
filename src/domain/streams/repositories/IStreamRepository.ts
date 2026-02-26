import { Stream } from '../entities/Stream';

export interface IStreamRepository {
  save(stream: Stream): Promise<Stream>;
  findById(id: string): Promise<Stream | null>;
  findByStreamKey(streamKey: string): Promise<Stream | null>;
  findActiveStreams(): Promise<Stream[]>;
  findOldEndedStreams(before: Date): Promise<Stream[]>;
  delete(id: string): Promise<void>;
  update(stream: Stream): Promise<Stream>;
}
