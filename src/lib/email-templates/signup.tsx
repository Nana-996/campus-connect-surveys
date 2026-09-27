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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Container style={card}>
          <Heading style={masthead}>CampusVerify</Heading>
          <Text style={kicker}>Verified student research</Text>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Thanks for signing up for{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            !
          </Text>
          <Text style={text}>
            Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ) by clicking the button below:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify Email
          </Button>
          <Text style={{ ...footer, marginTop: '28px' }}>
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </Container>
        <Text style={{ ...footer, textAlign: 'center' as const, marginTop: '16px' }}>
          {siteName} · <Link href={siteUrl} style={{ ...link, color: brand.muted }}>{siteUrl.replace(/^https?:\/\//, '')}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
