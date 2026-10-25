import type { Clock } from '../domain/ports';

/** System clock behind the `Clock` port (unit tests inject fixed clocks). */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
