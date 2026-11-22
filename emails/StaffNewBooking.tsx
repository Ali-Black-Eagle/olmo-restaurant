import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, Ticket, buttonStyle } from "./Layout";

export type StaffEmailData = {
  kind: "new" | "cancelled";
  bookingRef: string;
  guestName: string;
  email: string;
  phone: string;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
  tables: string;
  note?: string | null;
  adminUrl: string;
};

export default function StaffNewBooking(d: StaffEmailData) {
  const heading = d.kind === "new" ? "New booking" : "Booking cancelled";
  return (
    <EmailLayout preview={`${heading}: ${d.guestName}, ${d.partySize} on ${d.dateLabel} at ${d.timeLabel}`}>
      <Text style={{ fontSize: 17, lineHeight: "26px", margin: "0 0 16px" }}>
        {d.kind === "new" ? "A guest booked online." : "A guest cancelled online. The table is free again."}
      </Text>
      <Ticket
        title={heading}
        rows={[
          ["Booking", d.bookingRef],
          ["Guest", d.guestName],
          ["Contact", `${d.email}, ${d.phone}`],
          ["Date", d.dateLabel],
          ["Time", d.timeLabel],
          ["Party", String(d.partySize)],
          ["Tables", d.tables || "None"],
          ...(d.note ? ([["Note", d.note]] as [string, string][]) : []),
        ]}
      />
      <Section style={{ padding: "24px 0 8px" }}>
        <Button href={d.adminUrl} style={buttonStyle}>
          Open today in admin
        </Button>
      </Section>
    </EmailLayout>
  );
}

StaffNewBooking.PreviewProps = {
  kind: "new",
  bookingRef: "OLM-7K3F",
  guestName: "Priya Shah",
  email: "priya@example.com",
  phone: "07700 900123",
  dateLabel: "Friday 5 June",
  timeLabel: "7:30 pm",
  partySize: 2,
  tables: "T1",
  adminUrl: "http://localhost:3000/admin",
} satisfies StaffEmailData;
