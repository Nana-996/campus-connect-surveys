import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe'

async function recordOutcome(
  event: { event_id: string; data: Record<string, unknown> },
  reason: SuppressionReason,
  logStatus: 'bounced' | 'complained' | 'suppressed',
  logMessage: string,
) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const recipient = String(event.data.recipient ?? '').toLowerCase()
  if (!recipient) return

  // Dedupe on event_id — a thrown handler returns 500 and the delivery is retried.
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from('email_send_log')
    .select('id')
    .eq('metadata->>event_id', event.event_id)
    .maybeSingle()
  if (checkErr) throw new Error(checkErr.message)
  if (existing) return

  const { error: suppressErr } = await supabaseAdmin.from('suppressed_emails').upsert(
    {
      email: recipient,
      reason,
      metadata: null,
    },
    { onConflict: 'email' },
  )
  if (suppressErr) throw new Error(suppressErr.message)

  const { error: logErr } = await supabaseAdmin.from('email_send_log').insert({
    message_id: event.event_id,
    template_name: 'system',
    recipient_email: recipient,
    status: logStatus,
    error_message: logMessage,
    metadata: { event_id: event.event_id },
  })
  if (logErr) throw new Error(logErr.message)
}

export const Route = createFileRoute('/lovable/email/events')({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await recordOutcome(event, 'bounce', 'bounced', 'Email bounced (delivery failed)')
            },
            'email.complaint': async (event) => {
              await recordOutcome(event, 'complaint', 'complained', 'Recipient marked the email as spam')
            },
            'email.unsubscribed': async (event) => {
              await recordOutcome(event, 'unsubscribe', 'suppressed', 'Recipient unsubscribed from emails')
            },
          },
        })
        return handler(request)
      },
    },
  },
})
