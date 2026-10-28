export const SESSION_COOKIE = 'auction_session';
export const SESSION_TTL_SEC = 12 * 60 * 60;

export interface SessionPayload {
  sub: number;
  username: string;
  role: 'user' | 'admin';
  locale: 'vi' | 'en';
  displayName: string;
}
