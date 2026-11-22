"use client";

import { BookingFlow } from "@/components/booking/booking-flow";
import { useBooking } from "@/components/booking/booking-provider";

export function BookPageFlow() {
  const { config } = useBooking();
  return <BookingFlow config={config} variant="page" />;
}
