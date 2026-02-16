import { ValidationError } from '../../shared/errors/ValidationError';

export class TransactionHash {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): TransactionHash {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Transaction hash is required');
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
      throw new ValidationError('Invalid transaction hash format');
    }

    return new TransactionHash(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TransactionHash): boolean {
    return this.value === other.value;
  }
}
