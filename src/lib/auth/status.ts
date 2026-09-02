/** Public `/api/auth/status` payload — safe for the client bundle. */
export type PublicAuthStatus = {
  database: boolean;
  oauth: boolean;
  email: boolean;
};
