import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export const c = {
  linen: "#ECE4D3",
  ticket: "#FBF8F1",
  ink: "#26301F",
  olive: "#5C6B3C",
  saffron: "#D89A2B",
  beet: "#8A2E3B",
};

const font = "'Hanken Grotesk', Helvetica, Arial, sans-serif";
const serif = "Gloock, Georgia, 'Times New Roman', serif";

export function EmailLayout({ preview, children, footer }: { preview: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: c.linen, margin: 0, padding: "24px 12px", fontFamily: font, color: c.ink }}>
        <Container style={{ maxWidth: 520, margin: "0 auto" }}>
          <Text style={{ fontFamily: serif, fontSize: 30, margin: "0 0 16px", color: c.ink, letterSpacing: "-0.01em" }}>Olmo</Text>
          {children}
          <Section style={{ padding: "20px 4px 0" }}>
            <Text style={{ fontSize: 13, lineHeight: "20px", color: c.olive, margin: 0 }}>
              {footer}
              Olmo is a fictional restaurant built as a demo, so no table is really being held.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "6px 0", fontSize: 14, color: c.olive, width: 96, verticalAlign: "top" }}>{label}</td>
      <td style={{ padding: "6px 0", fontSize: 16, fontWeight: 600, color: c.ink }}>{value}</td>
    </tr>
  );
}

export function Ticket({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Section style={{ backgroundColor: c.ticket, padding: "24px 24px 28px", borderBottom: `2px dashed ${c.olive}` }}>
      <Text style={{ fontFamily: serif, fontSize: 24, margin: "0 0 12px", color: c.ink }}>{title}</Text>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          {rows.map(([l, v]) => (
            <TicketRow key={l} label={l} value={v} />
          ))}
        </tbody>
      </table>
    </Section>
  );
}

export const buttonStyle = {
  backgroundColor: c.ink,
  color: c.ticket,
  fontFamily: font,
  fontWeight: 600,
  fontSize: 16,
  padding: "14px 28px",
  borderRadius: 999,
  textDecoration: "none",
  display: "inline-block",
} as const;

export const linkStyle = { color: c.ink, textDecoration: "underline", textUnderlineOffset: 3 } as const;
