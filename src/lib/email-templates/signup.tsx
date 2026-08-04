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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to activate your CampusVerify account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={masthead}>CampusVerify</Text>
          <Text style={kicker}>Verified student research</Text>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Thanks for creating a CampusVerify account with{' '}
            <strong>{recipient}</strong>. Confirm this address to activate your
            account, claim your starting credits, and open your survey feed.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify my email
          </Button>
          <Hr style={rule} />
          <Text style={footer}>
            If the button doesn't work, copy this link into your browser:{' '}
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={{ ...footer, marginTop: '12px' }}>
            Didn't create an account? You can safely ignore this email.{' '}
            <Link href={siteUrl} style={link}>
              campus-verify.live
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
