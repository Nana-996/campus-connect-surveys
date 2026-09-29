import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { container, footer, h1, main, rule, text } from "./theme";

interface Props {
  kind?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  roleTitle?: string;
  country?: string;
  studentCount?: string;
  message?: string;
}

const Email = (p: Props) => {
  const label = p.kind === "school" ? "School interest" : "Demo request";
  const rows: [string, string | undefined][] = [
    ["Name", p.fullName], ["Email", p.email], ["Phone", p.phone],
    ["Organisation", p.organization], ["Role", p.roleTitle], ["Country", p.country],
    ["Students", p.studentCount], ["Message", p.message],
  ];
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New ${label.toLowerCase()} from ${p.fullName ?? "someone"}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New {label.toLowerCase()}</Heading>
          <Section>
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <Text key={k} style={text}><strong>{k}:</strong> {v}</Text>
            ))}
          </Section>
          <Hr style={rule} />
          <Text style={footer}>Manage this lead in CampusVerify admin → Leads.</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) =>
    `New ${d?.["kind"] === "school" ? "school interest" : "demo request"}: ${(d?.["fullName"] as string) ?? ""}`.trim(),
  displayName: "New lead alert",
  previewData: { kind: "school", fullName: "Kofi Mensah", email: "kofi@ug.edu.gh", organization: "University of Ghana", studentCount: "5,000+", message: "We'd like to onboard." },
} satisfies TemplateEntry;
