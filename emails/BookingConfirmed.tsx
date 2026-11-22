import { Button, Link, Section, Text } from "@react-email/components";
import { EmailLayout, Ticket, buttonStyle, c, linkStyle } from "./Layout";

export type BookingEmailData = {
  bookingRef: string;
  guestName: string;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
  address: string;
  phone: string;
  manageUrl: string;
  mapUrl: string;
  googleCalendarUrl: string;
  note?: string | null;
};

export default function BookingConfirmed(d: BookingEmailData) {
  return (
    <EmailLayout preview={`Your table for ${d.partySize} on ${d.dateLabel} at ${d.timeLabel} is booked.`}>
      <Text style={{ fontSize: 17, lineHeight: "26px", margin: "0 0 16px" }}>
        Hi {d.guestName.split(" ")[0]}, your table is booked. We have kept the details below. The .ics file attached adds it to your calendar.
      </Text>
      <Ticket
        title={`Table for ${d.partySize}`}
        rows={[
          ["Booking", d.bookingRef],
          ["Date", d.dateLabel],
          ["Time", d.timeLabel],
          ["Party", `${d.partySize} ${d.partySize === 1 ? "guest" : "guests"}`],
          ["Where", d.address],
          ...(d.note ? ([["Note", d.note]] as [string, string][]) : []),
        ]}
      />
      <Section style={{ padding: "24px 0 8px" }}>
        <Button href={d.manageUrl} style={buttonStyle}>
          Manage or cancel booking
        </Button>
      </Section>
      <Text style={{ fontSize: 15, lineHeight: "24px", margin: "8px 0 0", color: c.ink }}>
        <Link href={d.googleCalendarUrl} style={linkStyle}>
          Add to Google Calendar
        </Link>
        {"   "}
        <Link href={d.mapUrl} style={linkStyle}>
          Get directions
        </Link>
      </Text>
      <Text style={{ fontSize: 15, lineHeight: "24px", color: c.olive }}>
        Running late or need to change something? Call us on {d.phone}. We hold tables for 15 minutes.
      </Text>
    </EmailLayout>
  );
}

BookingConfirmed.PreviewProps = {
  bookingRef: "OLM-7K3F",
  guestName: "Priya Shah",
  dateLabel: "Friday 5 June",
  timeLabel: "7:30 pm",
  partySize: 2,
  address: "18 Pip Lane, Bristol, BS1 5QT",
  phone: "0117 496 0123",
  manageUrl: "http://localhost:3000/booking/OLM-7K3F?t=example",
  mapUrl: "https://maps.google.com",
  googleCalendarUrl: "https://calendar.google.com",
} satisfies BookingEmailData;
