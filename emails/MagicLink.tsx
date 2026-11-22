import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, buttonStyle, c } from "./Layout";

export default function MagicLink({ url }: { url: string }) {
  return (
    <EmailLayout preview="Your Olmo admin sign-in link">
      <Text style={{ fontSize: 17, lineHeight: "26px", margin: "0 0 16px" }}>
        Use this link to sign in to the Olmo admin. It works once and expires in 10 minutes.
      </Text>
      <Section style={{ padding: "8px 0 16px" }}>
        <Button href={url} style={buttonStyle}>
          Sign in to Olmo admin
        </Button>
      </Section>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: c.olive }}>
        If you did not ask for this, ignore this email. Nobody can sign in without the link.
      </Text>
    </EmailLayout>
  );
}

MagicLink.PreviewProps = { url: "http://localhost:3000/api/auth/magic-link/verify?token=example" };
