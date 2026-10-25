export const APP_NAME = 'resume-api';

export interface HealthReport {
  status: 'ok';
  app: string;
}

/**
 * Step 1 placeholder. The real NestJS bootstrap and DI graph arrive in Step 2.
 */
export function health(): HealthReport {
  return { status: 'ok', app: APP_NAME };
}

const rulesetGateTestVariable = 42;
