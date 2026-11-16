import { IngestibleMessage } from '../../types/telemetry';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface DataSourceCallbacks {
  onMessage: (message: IngestibleMessage) => void;
  onConnectionChange: (status: ConnectionStatus, message?: string) => void;
  onError: (error: Error) => void;
}

export interface IDataSource {
  readonly mode: 'DEMO' | 'LIVE';
  readonly isRunning: boolean;
  start(callbacks: DataSourceCallbacks): void;
  stop(): void;
}
