import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { ConsumerConfiguration } from '../domain/consumer-configuration';

/**
 * Service that supports hot-reloading of configuration updates
 * Periodically checks for configuration changes and reloads when detected
 */
@Injectable()
export class HotReloadConfigurationService implements OnModuleInit, OnModuleDestroy {
  private readonly reloadIntervalMs: number;
  private configReloadCallback: ((config: ConsumerConfiguration) => void) | undefined;
  public intervalId: NodeJS.Timeout | null = null;
  private lastKnownConfig: ConsumerConfiguration | null = null;

  constructor(
    private readonly configLoader: ConfigurationLoaderService,
    reloadIntervalMs: number = 30000, // Default to 30 seconds
    configReloadCallback?: (config: ConsumerConfiguration) => void,
  ) {
    this.reloadIntervalMs = reloadIntervalMs;
    this.configReloadCallback = configReloadCallback;
  }

  async onModuleInit() {
    // Load initial configuration
    await this.reloadConfiguration();

    // Start periodic reload checks
    this.startReloadInterval();
  }

  onModuleDestroy() {
    this.stopReloadInterval();
  }

  onConfigurationChange(callback: (config: ConsumerConfiguration) => void): void {
    this.configReloadCallback = callback;
  }

  private async reloadConfiguration(): Promise<void> {
    try {
      console.log('Reloading configuration...');
      const newConfig = await this.configLoader.loadConfiguration();
      console.log('Loaded config:', newConfig);

      // Check if configuration has actually changed
      if (!this.configHasChanged(newConfig)) {
        console.log('Configuration has not changed, skipping');
        return; // No change, skip callback
      }

      console.log('Configuration has changed, updating');
      console.log('Previous config:', this.lastKnownConfig);
      console.log('New config:', newConfig);
      this.lastKnownConfig = newConfig;
      console.log('Updated lastKnownConfig to:', this.lastKnownConfig);

      // Call the reload callback if provided
      if (this.configReloadCallback) {
        try {
          console.log('Calling reload callback');
          this.configReloadCallback(newConfig);
        } catch (error) {
          console.error('Error in configuration reload callback:', error);
        }
      }
    } catch (error) {
      console.error('Failed to reload configuration:', error);
      // Keep the last known good configuration
    }
  }

  private configHasChanged(newConfig: ConsumerConfiguration): boolean {
    if (!this.lastKnownConfig) {
      return true; // First load is always considered a change
    }

    // Compare all relevant properties
    return (
      this.lastKnownConfig.brokerUrl !== newConfig.brokerUrl ||
      this.lastKnownConfig.cacheUrl !== newConfig.cacheUrl ||
      this.lastKnownConfig.subscriptionTopic !== newConfig.subscriptionTopic ||
      this.lastKnownConfig.deadLetterQueueTopic !== newConfig.deadLetterQueueTopic ||
      this.lastKnownConfig.maxRetryAttempts !== newConfig.maxRetryAttempts ||
      this.lastKnownConfig.baseRetryDelayMs !== newConfig.baseRetryDelayMs ||
      this.lastKnownConfig.maxRetryDelayMs !== newConfig.maxRetryDelayMs
    );
  }

  private startReloadInterval() {
    if (this.intervalId !== null) {
      return; // Already started
    }

    this.intervalId = setInterval(async () => {
      try {
        await this.reloadConfiguration();
      } catch (error) {
        console.error('Error in periodic configuration reload:', error);
      }
    }, this.reloadIntervalMs);
  }

  private stopReloadInterval() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Forces an immediate configuration reload
   */
  async forceReload(): Promise<void> {
    await this.reloadConfiguration();
  }

  /**
   * Gets the current known configuration
   */
  getCurrentConfiguration(): ConsumerConfiguration | null {
    return this.lastKnownConfig;
  }
}
