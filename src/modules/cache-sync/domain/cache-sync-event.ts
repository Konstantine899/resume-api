export class CacheSyncEvent {
  constructor(
    public readonly id: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly action: 'CREATE' | 'UPDATE' | 'DELETE',
    public readonly payload: Record<string, unknown>,
    public readonly timestamp: Date,
    public readonly correlationId?: string,
  ) {}
}
