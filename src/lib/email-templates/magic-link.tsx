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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your CampusVerify login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={masthead}>CampusVerify</Text>
          <Text style={kicker}>One-time sign in</Text>
          <Heading style={h1}>Your login link</Heading>
          <Text style={text}>
            Use the button below to sign in to CampusVerify. For your security
            this link works once and expires shortly.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Log in to CampusVerify
          </Button>
          <Hr style={rule} />
          <Text style={footer}>
            If the button doesn't work, copy this link into your browser:{' '}
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={{ ...footer, marginTop: '12px' }}>
            Didn't ask to sign in? You can safely ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
