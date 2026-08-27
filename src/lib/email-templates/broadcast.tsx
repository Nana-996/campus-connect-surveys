import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { card, container, footer, h1, kicker, main, masthead, rule, text } from "./theme";

interface Props {
  heading?: string;
  body?: string;
  preview?: string;
}

const Email = ({ heading = "An update from CampusVerify", body = "", preview }: Props) => {
  const paragraphs = String(body)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview || heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Text style={masthead}>CampusVerify</Text>
            <Text style={kicker}>Announcement</Text>

            <Heading style={h1}>{heading}</Heading>

            {paragraphs.map((p, i) => (
              <Text key={i} style={text}>
                {p.split("\n").map((line, j) => (
                  <React.Fragment key={j}>
                    {j > 0 ? <br /> : null}
                    {line}
                  </React.Fragment>
                ))}
              </Text>
            ))}

            <Hr style={rule} />
            <Text style={footer}>
              CampusVerify · campus-verify.live · You are receiving this because you have a CampusVerify
              account. Use the unsubscribe link below to stop receiving announcements.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    (data?.["subject"] as string) || (data?.["heading"] as string) || "An update from CampusVerify",
  displayName: "Broadcast announcement",
  previewData: {
    heading: "New survey visibility controls",
    subject: "New survey visibility controls",
    body: "Hi there,\n\nYou can now choose exactly who sees your survey: your campus, all students, everyone, or invite-only.\n\n— The CampusVerify team",
  },
} satisfies TemplateEntry;
