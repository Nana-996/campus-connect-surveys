import { afterEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue({}) }))
vi.mock('@lovable.dev/email-js', () => ({
  sendLovableEmail: send,
  EmailAPIError: class extends Error {},
}))
vi.mock('@react-email/render', () => ({ render: vi.fn().mockResolvedValue('Rendered email') }))
vi.mock('./registry', () => ({
  TEMPLATES: { broadcast: { component: () => null, subject: 'Study update' } },
}))

import { sendTemplateEmail } from './send-email'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('official email address', () => {
  it('sends from the founder address using the existing verified domain', async () => {
    vi.stubEnv('LOVABLE_API_KEY', 'test-only-key')
    await sendTemplateEmail('broadcast', 'recipient@example.test')
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      from: 'CampusVerify <founder@campus-verify.live>',
      sender_domain: 'notify.campus-verify.live',
    })
  })

  it('defaults replies to the official founder address', async () => {
    vi.stubEnv('LOVABLE_API_KEY', 'test-only-key')
    await sendTemplateEmail('broadcast', 'recipient@example.test')
    expect(send.mock.calls[0]?.[0].reply_to).toBe('founder@campus-verify.live')
  })

  it('preserves explicit replies to the person submitting a lead', async () => {
    vi.stubEnv('LOVABLE_API_KEY', 'test-only-key')
    await sendTemplateEmail('broadcast', 'recipient@example.test', { replyTo: 'researcher@example.test' })
    expect(send.mock.calls[0]?.[0].reply_to).toBe('researcher@example.test')
  })
})