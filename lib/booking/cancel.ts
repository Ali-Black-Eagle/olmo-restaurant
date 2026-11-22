import type { Booking, PrismaClient } from "@/generated/prisma/client";
import { verifyToken } from "./tokens";

export type CancelResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: "NOT_FOUND" | "ALREADY_CANCELLED" | "TOO_LATE" | "NOT_CANCELLABLE" };

/** Looks a booking up by ref and checks the token in constant time. Never reveals which part was wrong. */
export async function findBookingByToken(db: PrismaClient, ref: string, token: string | undefined) {
  const booking = await db.booking.findUnique({ where: { ref: ref.toUpperCase() } });
  if (!booking || !verifyToken(token, booking.cancelTokenHash)) return null;
  return booking;
}

/** Cancels and frees the tables in one transaction (the Booking row stays for history). */
export async function cancelBookingById(db: PrismaClient, id: string, now = new Date()): Promise<CancelResult> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) return { ok: false, error: "NOT_FOUND" } as const;
    if (booking.status === "CANCELLED") return { ok: false, error: "ALREADY_CANCELLED" } as const;
    if (booking.status !== "CONFIRMED") return { ok: false, error: "NOT_CANCELLABLE" } as const;
    if (booking.startsAt <= now) return { ok: false, error: "TOO_LATE" } as const;
    await tx.bookingTable.deleteMany({ where: { bookingId: id } });
    const updated = await tx.booking.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: now } });
    return { ok: true, booking: updated } as const;
  });
}

/** Guest cancellation: must present the emailed token. Called from a POST Server Action only. */
export async function cancelBookingWithToken(
  db: PrismaClient,
  ref: string,
  token: string | undefined,
  now = new Date(),
): Promise<CancelResult> {
  const booking = await findBookingByToken(db, ref, token);
  if (!booking) return { ok: false, error: "NOT_FOUND" };
  return cancelBookingById(db, booking.id, now);
}
