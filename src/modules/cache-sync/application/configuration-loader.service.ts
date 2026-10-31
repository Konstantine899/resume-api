import { Injectable } from '@nestjs/common';
import { ConsumerConfiguration } from '../domain/consumer-configuration';

/**
 * Service responsible for loading consumer configuration from external sources
 */
@Injectable()
export class ConfigurationLoaderService {
  /**
   * Loads configuration from external service
   * In a real implementation, this might fetch from a remote config service,
   * database, or file system
   */
  loadConfiguration(): ConsumerConfiguration {
    // For now, we'll simulate loading from environment variables
    // In a real implementation, this would make an HTTP call or database query
    return ConsumerConfiguration.fromEnv();
  }

  /**
   * Loads configuration with fallback to default values
   */
  loadConfigurationWithFallback(): ConsumerConfiguration {
    try {
      return this.loadConfiguration();
    } catch (error) {
      // Log the error and return a default configuration
      console.warn('Failed to load configuration from external source, using defaults:', error);
      return new ConsumerConfiguration(
        'redis://localhost:6379',
        'redis://localhost:6380',
        'entity-changes',
        'entity-changes-dlq',
        3,
        1000,
        10000,
      );
    }
  }
}
