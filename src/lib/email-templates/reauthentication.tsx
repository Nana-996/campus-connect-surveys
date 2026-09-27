import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import { brand, card, codeStyle, container, footer, h1, kicker, link, main, masthead, text } from './theme'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Container style={card}>
          <Heading style={masthead}>CampusVerify</Heading>
          <Text style={kicker}>Verified student research</Text>
          <Heading style={h1}>Confirm reauthentication</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={{ ...footer, marginTop: '8px' }}>
            This code will expire shortly. If you didn't request this, you can
            safely ignore this email.
          </Text>
        </Container>
        <Text style={{ ...footer, textAlign: 'center' as const, marginTop: '16px' }}>
          campus-verify · <Link href="https://campus-verify.live" style={{ ...link, color: brand.muted }}>campus-verify.live</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
