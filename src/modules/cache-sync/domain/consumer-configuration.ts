export class ConsumerConfiguration {
  constructor(
    public readonly brokerUrl: string,
    public readonly cacheUrl: string,
    public readonly subscriptionTopic: string,
    public readonly deadLetterQueueTopic: string,
    public readonly maxRetryAttempts: number,
    public readonly baseRetryDelayMs: number,
    public readonly maxRetryDelayMs: number,
  ) {}

  static fromEnv(): ConsumerConfiguration {
    // In a real implementation, this would read from environment variables
    // For now, we'll return a default configuration
    return new ConsumerConfiguration(
      process.env.BROKER_URL || 'redis://localhost:6379',
      process.env.CACHE_URL || 'redis://localhost:6380',
      process.env.SUBSCRIPTION_TOPIC || 'entity-changes',
      process.env.DLQ_TOPIC || 'entity-changes-dlq',
      parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
      parseInt(process.env.BASE_RETRY_DELAY_MS || '1000', 10),
      parseInt(process.env.MAX_RETRY_DELAY_MS || '10000', 10),
    );
  }
}
