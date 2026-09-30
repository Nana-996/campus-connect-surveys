const APP_OWNER_EMAIL = "nanadjan996@gmail.com";

export function isAppOwnerClaims(claims: Record<string, unknown> | undefined) {
  const email = typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : "";
  return email === APP_OWNER_EMAIL;
}