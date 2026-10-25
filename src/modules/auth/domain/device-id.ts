import { randomUUID } from 'node:crypto';

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Stable identifier of the client device the session family belongs to.
 * The client MAY send it in the login body; when absent the server
 * generates one, so the contract stays backward compatible.
 */
export class DeviceId {
  private constructor(public readonly value: string) {}

  static create(raw?: string): DeviceId {
    if (raw === undefined || raw === '') {
      return new DeviceId(randomUUID());
    }
    const value = raw.trim();
    if (!DEVICE_ID_PATTERN.test(value)) {
      throw new Error('DeviceId: must be 1-64 chars of [A-Za-z0-9_-]');
    }
    return new DeviceId(value);
  }

  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }
}
