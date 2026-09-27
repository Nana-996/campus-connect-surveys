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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Container style={card}>
          <Heading style={masthead}>CampusVerify</Heading>
          <Text style={kicker}>Verified student research</Text>
          <Heading style={h1}>Your login link</Heading>
          <Text style={text}>
            Click the button below to log in to {siteName}. This link will expire
            shortly.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Log In
          </Button>
          <Text style={{ ...footer, marginTop: '28px' }}>
            If you didn't request this link, you can safely ignore this email.
          </Text>
        </Container>
        <Text style={{ ...footer, textAlign: 'center' as const, marginTop: '16px' }}>
          {siteName} · <Link href="https://campus-verify.live" style={{ ...link, color: brand.muted }}>campus-verify.live</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
