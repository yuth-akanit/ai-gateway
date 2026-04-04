export function authorizeRequest(req: Request): boolean {
  const incoming = req.headers.get("x-ai-gateway-key");
  const expected = process.env.AI_GATEWAY_INTERNAL_KEY;

  if (!expected) {
    console.warn("AI_GATEWAY_INTERNAL_KEY is not defined in environment.");
    return false;
  }

  return incoming === expected;
}
