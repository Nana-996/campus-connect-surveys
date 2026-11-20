const DEFAULT_APP_OWNER_EMAIL = "nanadjan996@gmail.com";

export function getAppOwnerEmail(): string {
  const envOwner =
    typeof process !== "undefined" && process.env ? process.env.APP_OWNER_EMAIL : undefined;
  return (envOwner?.trim() || DEFAULT_APP_OWNER_EMAIL).toLowerCase();
}

export function isAppOwnerClaims(claims: Record<string, unknown> | undefined) {
  const email = typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : "";
  return email === getAppOwnerEmail();
}
