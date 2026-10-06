/** Only same-site relative paths ("/deals?x=1"); rejects "//evil.com", "/\evil.com", control characters, etc. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return "/";
  return next;
}
