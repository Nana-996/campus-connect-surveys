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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail).
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new CampusVerify email address</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={masthead}>CampusVerify</Text>
          <Text style={kicker}>Account security</Text>
          <Heading style={h1}>Confirm your email change</Heading>
          <Text style={text}>
            You asked to move your CampusVerify account from{' '}
            <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>. Confirm
            the change below.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Confirm email change
          </Button>
          <Hr style={rule} />
          <Text style={footer}>
            If the button doesn't work, copy this link into your browser:{' '}
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={{ ...footer, marginTop: '12px' }}>
            If you didn't request this change, secure your account right away by
            resetting your password.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
