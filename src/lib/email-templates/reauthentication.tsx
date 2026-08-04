import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import {
  card,
  codeStyle,
  container,
  footer,
  h1,
  kicker,
  main,
  masthead,
  rule,
  text,
} from './theme'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your CampusVerify verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={masthead}>CampusVerify</Text>
          <Text style={kicker}>Identity check</Text>
          <Heading style={h1}>Confirm it's you</Heading>
          <Text style={text}>
            Enter this code in CampusVerify to confirm your identity:
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Hr style={rule} />
          <Text style={footer}>
            This code expires shortly. If you didn't request it, ignore this
            email and consider resetting your password.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
