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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your CampusVerify password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={masthead}>CampusVerify</Text>
          <Text style={kicker}>Account security</Text>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset the password on your CampusVerify
            account. Choose a new one using the button below — the link expires
            in one hour.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Choose a new password
          </Button>
          <Hr style={rule} />
          <Text style={footer}>
            If the button doesn't work, copy this link into your browser:{' '}
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={{ ...footer, marginTop: '12px' }}>
            Didn't request this? Ignore this email — your password stays
            unchanged.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
