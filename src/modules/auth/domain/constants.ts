/** Access token TTL: 15 minutes (plan §4, step 3). */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Refresh token TTL: 30 days per issued token (sliding on rotation). */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
