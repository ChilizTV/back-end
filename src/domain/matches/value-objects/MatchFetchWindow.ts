/**
 * Encapsulates all temporal business rules for match fetching and cleanup.
 * No temporal magic numbers should exist outside this class.
 */
export class MatchFetchWindow {
  /** Days ahead to fetch from the external API */
  static readonly FETCH_DAYS_AHEAD = 7;

  /** Hours after match end before deletion */
  static readonly CLEANUP_HOURS_AFTER = 24;

  /**
   * @returns Lower bound of the fetch window (24h ago, to include recently finished matches)
   */
  static fetchFrom(now: Date): Date {
    return new Date(now.getTime() - this.CLEANUP_HOURS_AFTER * 3_600_000);
  }

  /**
   * @returns Upper bound of the fetch window (7 days ahead)
   */
  static fetchTo(now: Date): Date {
    return new Date(now.getTime() + this.FETCH_DAYS_AHEAD * 86_400_000);
  }

  /**
   * @returns Cutoff date before which matches should be deleted
   */
  static cleanupBefore(now: Date): Date {
    return new Date(now.getTime() - this.CLEANUP_HOURS_AFTER * 3_600_000);
  }
}
