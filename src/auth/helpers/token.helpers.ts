export const isTokenExpiredError = (e: unknown) =>
  !!e && typeof e === 'object' && 'name' in e && e.name === 'TokenExpiredError';
