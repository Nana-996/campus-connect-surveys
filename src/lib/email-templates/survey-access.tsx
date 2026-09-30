import React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { container, footer, h1, main, rule, text } from "./theme";

const btn = { background: "#1f4d33", color: "#fff", padding: "10px 18px", borderRadius: 999, textDecoration: "none" };

interface InviteProps { surveyTitle?: string; ownerName?: string; viaAdmin?: boolean; link?: string }

const InviteEmail = (p: InviteProps) => (
  <Html lang="en">
    <Head />
    <Preview>{`You've been invited to follow "${p.surveyTitle ?? "a survey"}" on CampusVerify`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Follow a survey's progress</Heading>
        <Section>
          <Text style={text}>
            {p.viaAdmin
              ? <>The CampusVerify team, on behalf of <strong>{p.ownerName}</strong>, has invited you</>
              : <><strong>{p.ownerName}</strong> has invited you</>}{" "}
            to view the progress of the survey <strong>"{p.surveyTitle}"</strong>.
          </Text>
          <Text style={text}>
            To accept, sign in (or create a free CampusVerify account) using this email address, then confirm the invitation.
            The link expires in 14 days.
          </Text>
          <Button href={p.link} style={btn}>Review invitation</Button>
          <Text style={{ ...text, fontSize: 12 }}>If you weren't expecting this, you can ignore this email.</Text>
        </Section>
        <Hr style={rule} />
        <Text style={footer}>CampusVerify · campus-verify.live</Text>
      </Container>
    </Body>
  </Html>
);

export const inviteTemplate = {
  component: InviteEmail,
  subject: (d: Record<string, unknown>) => `Invitation to follow "${d?.["surveyTitle"] ?? "a survey"}" on CampusVerify`,
  displayName: "Survey progress access invite",
  previewData: { surveyTitle: "Campus Food Habits", ownerName: "Ama Mensah", viaAdmin: false, link: "https://campus-verify.live/track-invite/abc" },
} satisfies TemplateEntry;

interface NoticeProps { surveyTitle?: string; ownerName?: string; inviteeEmail?: string; manageUrl?: string }

const NoticeEmail = (p: NoticeProps) => (
  <Html lang="en">
    <Head />
    <Preview>{`Progress access requested for "${p.surveyTitle ?? "your survey"}"`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Access to your survey was shared</Heading>
        <Section>
          <Text style={text}>Hi {p.ownerName || "there"},</Text>
          <Text style={text}>
            A CampusVerify administrator invited <strong>{p.inviteeEmail}</strong> to view the progress of your survey{" "}
            <strong>"{p.surveyTitle}"</strong>. They'll get access once they confirm the invitation.
          </Text>
          <Text style={text}>
            If you didn't ask for this, you can cancel the invitation or remove their access at any time from your surveys page.
          </Text>
          <Button href={p.manageUrl} style={btn}>Manage access</Button>
        </Section>
        <Hr style={rule} />
        <Text style={footer}>CampusVerify · campus-verify.live</Text>
      </Container>
    </Body>
  </Html>
);

export const noticeTemplate = {
  component: NoticeEmail,
  subject: (d: Record<string, unknown>) => `Access shared on your survey "${d?.["surveyTitle"] ?? ""}"`,
  displayName: "Survey access owner notice",
  previewData: { surveyTitle: "Campus Food Habits", ownerName: "Ama", inviteeEmail: "kofi@ug.edu.gh", manageUrl: "https://campus-verify.live/my-surveys" },
} satisfies TemplateEntry;
