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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Container style={card}>
          <Heading style={masthead}>CampusVerify</Heading>
          <Text style={kicker}>Verified student research</Text>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . Click the button below to accept the invitation and create your
            account.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation
          </Button>
          <Text style={{ ...footer, marginTop: '28px' }}>
            If you weren't expecting this invitation, you can safely ignore this
            email.
          </Text>
        </Container>
        <Text style={{ ...footer, textAlign: 'center' as const, marginTop: '16px' }}>
          {siteName} · <Link href={siteUrl} style={{ ...link, color: brand.muted }}>{siteUrl.replace(/^https?:\/\//, '')}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
