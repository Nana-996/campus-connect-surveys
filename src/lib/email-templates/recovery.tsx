import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import { brand, button, card, container, footer, h1, kicker, link, main, masthead, text } from './theme'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Container style={card}>
          <Heading style={masthead}>CampusVerify</Heading>
          <Text style={kicker}>Verified student research</Text>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset your password for {siteName}. Click
            the button below to choose a new password.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Reset Password
          </Button>
          <Text style={{ ...footer, marginTop: '28px' }}>
            If you didn't request a password reset, you can safely ignore this
            email. Your password will not be changed.
          </Text>
        </Container>
        <Text style={{ ...footer, textAlign: 'center' as const, marginTop: '16px' }}>
          {siteName} · <Link href="https://campus-verify.live" style={{ ...link, color: brand.muted }}>campus-verify.live</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
