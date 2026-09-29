import React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { container, footer, h1, main, rule, text } from "./theme";

interface Props { name?: string; amount?: number; balance?: number; reason?: string; expires?: boolean }

const Email = (p: Props) => (
  <Html lang="en">
    <Head />
    <Preview>{`${p.amount ?? 0} credits have been added to your CampusVerify account`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've received {p.amount} credits</Heading>
        <Section>
          <Text style={text}>Hi {p.name || "there"},</Text>
          <Text style={text}>
            The CampusVerify team has added <strong>{p.amount} credits</strong> to your account.
            {p.reason ? ` Note: ${p.reason}` : ""}
          </Text>
          {typeof p.balance === "number" && <Text style={text}>Your balance is now <strong>{p.balance}</strong> credits.</Text>}
          {p.expires && <Text style={text}>These credits expire in 30 days, so put them to use soon.</Text>}
          <Button href="https://campus-verify.live/create"
            style={{ background: "#1f4d33", color: "#fff", padding: "10px 18px", borderRadius: 999, textDecoration: "none" }}>
            Publish a survey
          </Button>
        </Section>
        <Hr style={rule} />
        <Text style={footer}>CampusVerify · campus-verify.live</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => `${d?.["amount"] ?? ""} credits added to your CampusVerify account`.trim(),
  displayName: "Credits granted",
  previewData: { name: "Ama", amount: 20, balance: 35, reason: "Research support", expires: true },
} satisfies TemplateEntry;
