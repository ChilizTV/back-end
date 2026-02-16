import { ValidationError } from '../../shared/errors/ValidationError';

export class Odds {
  private readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): Odds {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError('Odds must be a valid number');
    }

    if (value <= 1) {
      throw new ValidationError('Odds must be greater than 1');
    }

    if (value > 1000) {
      throw new ValidationError('Odds seem unrealistic (max 1000)');
    }

    return new Odds(value);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: Odds): boolean {
    return this.value === other.value;
  }
}
