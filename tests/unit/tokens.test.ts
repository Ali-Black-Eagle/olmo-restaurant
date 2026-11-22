import { describe, expect, it } from "vitest";
import { generateRef, generateToken, hashToken, verifyToken } from "@/lib/booking/tokens";

describe("cancel tokens", () => {
  it("generates long url-safe tokens and stores only a sha-256 hash", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes in base64url
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
    expect(generateToken()).not.toBe(t);
  });

  it("verifies the right token and rejects everything else", () => {
    const t = generateToken();
    const h = hashToken(t);
    expect(verifyToken(t, h)).toBe(true);
    expect(verifyToken(generateToken(), h)).toBe(false);
    expect(verifyToken("", h)).toBe(false);
    expect(verifyToken(undefined, h)).toBe(false);
    expect(verifyToken(t, "not-hex")).toBe(false);
    expect(verifyToken(t + "x", h)).toBe(false);
  });

  it("makes readable refs without ambiguous characters", () => {
    for (let i = 0; i < 200; i++) expect(generateRef()).toMatch(/^OLM-[A-HJKMNP-Z2-9]{4}$/);
  });
});
