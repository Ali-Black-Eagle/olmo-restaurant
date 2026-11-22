import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, Ticket, buttonStyle } from "./Layout";

export type CancelledEmailData = {
  bookingRef: string;
  guestName: string;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
  bookUrl: string;
};

export default function BookingCancelled(d: CancelledEmailData) {
  return (
    <EmailLayout preview={`Booking ${d.bookingRef} is cancelled.`}>
      <Text style={{ fontSize: 17, lineHeight: "26px", margin: "0 0 16px" }}>
        Hi {d.guestName.split(" ")[0]}, your booking is cancelled and the table is free again.
      </Text>
      <Ticket
        title="Cancelled"
        rows={[
          ["Booking", d.bookingRef],
          ["Date", d.dateLabel],
          ["Time", d.timeLabel],
          ["Party", `${d.partySize} ${d.partySize === 1 ? "guest" : "guests"}`],
        ]}
      />
      <Section style={{ padding: "24px 0 8px" }}>
        <Button href={d.bookUrl} style={buttonStyle}>
          Book another time
        </Button>
      </Section>
    </EmailLayout>
  );
}

BookingCancelled.PreviewProps = {
  bookingRef: "OLM-7K3F",
  guestName: "Priya Shah",
  dateLabel: "Friday 5 June",
  timeLabel: "7:30 pm",
  partySize: 2,
  bookUrl: "http://localhost:3000/book",
} satisfies CancelledEmailData;
