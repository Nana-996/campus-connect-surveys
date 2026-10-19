// Only local paths can receive a post-authentication redirect.
export function authDestination(next?: string): string | null {
  if (!next || !/^\/(?!\/)/.test(next) || /[\\\u0000-\u0020]/.test(next)) return null;
  return next;
}