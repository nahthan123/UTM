import { ObservedUAVState, Part5InputFeed } from '../../types/monitoring';
import { MonitoringAlert } from '../../types/telemetry';

export type Part5FeedSubscriber = (feed: Part5InputFeed) => void;

/**
 * Clean data export bridge for Part 5 Tactical AI Conflict Detection
 */
export class Part5ExportBridge {
  private subscribers: Set<Part5FeedSubscriber> = new Set();

  public subscribe(cb: Part5FeedSubscriber): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  /**
   * Generates a sanitized data snapshot formatted specifically for Part 5
   */
  public generateSnapshot(
    activeUavStates: Record<string, ObservedUAVState>,
    alerts: MonitoringAlert[]
  ): Part5InputFeed {
    const states = Object.values(activeUavStates);

    let highConfidence = 0;
    let degraded = 0;
    let stale = 0;

    states.forEach((s) => {
      if (s.data_quality.confidence === 'HIGH') highConfidence++;
      else if (s.data_quality.confidence === 'MEDIUM') degraded++;
      else stale++;
    });

    const feed: Part5InputFeed = {
      feed_timestamp: new Date().toISOString(),
      active_uav_states: activeUavStates,
      airspace_alerts: alerts,
      system_integrity: {
        total_uavs: states.length,
        high_confidence_count: highConfidence,
        degraded_count: degraded,
        stale_count: stale,
        invalid_count: 0,
      },
    };

    // Notify registered subscribers (e.g. AI worker, external REST, or local logger)
    this.subscribers.forEach((sub) => {
      try {
        sub(feed);
      } catch (e) {
        console.error('[Part5ExportBridge] Lỗi callback subscriber:', e);
      }
    });

    return feed;
  }
}

export const part5Bridge = new Part5ExportBridge();
