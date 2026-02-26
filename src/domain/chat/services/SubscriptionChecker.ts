import { injectable, inject } from 'tsyringe';
import { IStreamWalletRepository } from '../../stream-wallet/repositories/IStreamWalletRepository';

/**
 * Domain Service: Checks if a user has an active subscription
 * Follows Clean Architecture principles by staying in the domain layer
 */
@injectable()
export class SubscriptionChecker {
  constructor(
    @inject('IStreamWalletRepository')
    private readonly streamWalletRepository: IStreamWalletRepository
  ) {}

  /**
   * Checks if the user has at least one active subscription
   * @param walletAddress The user's wallet address
   * @returns true if the user has an active subscription, false otherwise
   */
  async hasActiveSubscription(walletAddress: string): Promise<boolean> {
    try {
      // Get all subscriptions for this user
      const subscriptions = await this.streamWalletRepository.findSubscriptionsBySubscriber(
        walletAddress
      );

      // Check if at least one subscription is active
      return subscriptions.some(subscription => subscription.isActive());
    } catch (error) {
      // In case of error, consider user as not subscribed
      // This prevents blocking message sending if the subscription service is down
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
}
