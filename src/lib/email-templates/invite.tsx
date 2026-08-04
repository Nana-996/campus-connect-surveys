import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import {
  button,
  card,
  container,
  footer,
  h1,
  kicker,
  link,
  main,
  masthead,
  rule,
  text,
} from './theme'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join CampusVerify</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={masthead}>CampusVerify</Text>
          <Text style={kicker}>Invitation</Text>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            Someone invited you to join{' '}
            <Link href={siteUrl} style={link}>
              CampusVerify
            </Link>{' '}
            — a credit-powered survey platform for university campuses. Accept
            below to set up your account.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Accept invitation
          </Button>
          <Hr style={rule} />
          <Text style={footer}>
            If the button doesn't work, copy this link into your browser:{' '}
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={{ ...footer, marginTop: '12px' }}>
            Weren't expecting this? You can safely ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
