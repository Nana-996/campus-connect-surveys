import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { brand, card, container, footer, h1, kicker, main, masthead, rule, text } from "./theme";

interface Props {
  donorName?: string;
  amount?: string;
  frequency?: string;
  receiptNumber?: string;
  date?: string;
  reference?: string;
}

const rowLabel = {
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  color: brand.muted,
  margin: "0 0 2px",
};

const rowValue = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "18px",
  color: brand.ink,
  margin: "0 0 16px",
};

const receiptBox = {
  backgroundColor: "#ffffff",
  border: `1px solid ${brand.line}`,
  borderRadius: "12px",
  padding: "20px 22px 4px",
  margin: "0 0 24px",
};

const Email = ({
  donorName,
  amount = "GHS 0",
  frequency = "One-time gift",
  receiptNumber = "CV-0000",
  date = "",
  reference = "",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your CampusVerify donation receipt ${receiptNumber}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={masthead}>CampusVerify</Text>
          <Text style={kicker}>Official donation receipt</Text>

          <Heading style={h1}>Thank you{donorName ? `, ${donorName}` : ""}.</Heading>
          <Text style={text}>
            Your gift keeps verified campus research running — free for students, and honest for everyone.
            Keep this receipt for your tax records.
          </Text>

          <Section style={receiptBox}>
            <Text style={rowLabel}>Receipt number</Text>
            <Text style={rowValue}>{receiptNumber}</Text>
            <Text style={rowLabel}>Amount</Text>
            <Text style={rowValue}>{amount}</Text>
            <Text style={rowLabel}>Type</Text>
            <Text style={rowValue}>{frequency}</Text>
            {date ? (
              <>
                <Text style={rowLabel}>Date</Text>
                <Text style={rowValue}>{date}</Text>
              </>
            ) : null}
            {reference ? (
              <>
                <Text style={rowLabel}>Payment reference</Text>
                <Text style={{ ...rowValue, fontSize: "14px" }}>{reference}</Text>
              </>
            ) : null}
          </Section>

          <Hr style={rule} />
          <Text style={footer}>
            CampusVerify · campus-verify.live · No goods or services were provided in exchange for this
            contribution. Retain this receipt for your records.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Your CampusVerify donation receipt ${(data?.["receiptNumber"] as string) ?? ""}`.trim(),
  displayName: "Donation receipt",
  previewData: {
    donorName: "Ama",
    amount: "GHS 50",
    frequency: "Monthly pledge",
    receiptNumber: "CV-2026-1042",
    date: "12 August 2026",
    reference: "don_ab12cd34",
  },
} satisfies TemplateEntry;
