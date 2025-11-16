/**
 * Decode JWT token header and payload (without verification)
 * For debugging purposes only
 */
export function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { error: "Invalid JWT format" };
    }

    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    return { header, payload };
  } catch (error) {
    return { error: "Failed to decode JWT" };
  }
}
