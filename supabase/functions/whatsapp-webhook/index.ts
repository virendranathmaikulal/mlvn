import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const PHARMACY_CHAT_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pharmacy-chat`
const YCLOUD_API_KEY = Deno.env.get('YCLOUD_API_KEY')
const DEFAULT_USER_ID = Deno.env.get('DEFAULT_PHARMACY_USER_ID')

serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const challenge = url.searchParams.get('hub.challenge')
    if (challenge) return new Response(challenge, { status: 200 })
    return new Response('Webhook active', { status: 200 })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const payload = await req.json()
    console.log('YCloud webhook:', JSON.stringify(payload))

    const messages = payload.messages || []
    
    for (const msg of messages) {
      if (msg.type !== 'text' || msg.direction !== 'inbound') continue

      const customerPhone = msg.from
      const messageText = msg.text?.body

      if (!messageText || !customerPhone) continue

      const chatResponse = await fetch(PHARMACY_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          message: messageText,
          phone: customerPhone,
          user_id: DEFAULT_USER_ID
        })
      })

      if (!chatResponse.ok) {
        console.error('Pharmacy chat failed:', await chatResponse.text())
        continue
      }

      const { response: botReply } = await chatResponse.json()

      await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': YCLOUD_API_KEY || ''
        },
        body: JSON.stringify({
          to: customerPhone,
          type: 'text',
          text: { body: botReply }
        })
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
