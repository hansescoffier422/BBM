// Turns any error (including Supabase errors) into readable text
export function errText(
  e: unknown,
  fallback = "Something went wrong.",
): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}
