import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const PHARMACY_CHAT_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pharmacy-chat`
const YCLOUD_API_KEY = Deno.env.get('YCLOUD_API_KEY')
const DEFAULT_USER_ID = Deno.env.get('DEFAULT_PHARMACY_USER_ID')

const handleMessage = async (customerPhone: string, businessPhone: string, message: string, imageUrl?: string) => {
  console.log('Calling pharmacy-chat function...')
  
  const chatResponse = await fetch(PHARMACY_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      message,
      phone: customerPhone,
      user_id: DEFAULT_USER_ID,
      image_url: imageUrl
    })
  })

  if (!chatResponse.ok) {
    console.error(`Pharmacy chat failed: ${chatResponse.status}`, await chatResponse.text())
  } else {
    const { response: botReply } = await chatResponse.json()
    console.log('Bot reply:', botReply)

    console.log('Sending WhatsApp message via YCloud API...')
    console.log('YCloud payload:', JSON.stringify({ from: businessPhone, to: customerPhone, type: 'text', text: { body: botReply } }))
    
    const whatsappResponse = await fetch('https://api.ycloud.com/v2/whatsapp/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': YCLOUD_API_KEY || ''
      },
      body: JSON.stringify({
        from: businessPhone,
        to: customerPhone,
        type: 'text',
        text: { body: botReply }
      })
    })
    
    console.log(`YCloud API response status: ${whatsappResponse.status}`)
    
    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text()
      console.error(`🔴 YCloud API failed: ${whatsappResponse.status}`, errorText)
    } else {
      const successResponse = await whatsappResponse.json()
      console.log('✅ YCloud message sent successfully:', successResponse)
    }
  }
}

serve(async (req) => {
  console.log(`Webhook received: ${req.method} ${req.url}`)
  
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const challenge = url.searchParams.get('hub.challenge')
    if (challenge) return new Response(challenge, { status: 200 })
    return new Response('Webhook active', { status: 200 })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const payload = await req.json()
    console.log('Webhook payload:', JSON.stringify(payload, null, 2))

    // Handle YCloud webhook format
    if (payload.type === 'whatsapp.inbound_message.received' && payload.whatsappInboundMessage) {
      const msg = payload.whatsappInboundMessage
      
      if (msg.type === 'text' && msg.text?.body) {
        const customerPhone = msg.from
        const businessPhone = msg.to // This is your business WhatsApp number
        const messageText = msg.text.body
        console.log(`From: ${customerPhone}, To: ${businessPhone}, Message: ${messageText}`)

        await handleMessage(customerPhone, businessPhone, messageText, null)
      } else if (msg.type === 'image' && msg.image) {
        const customerPhone = msg.from
        const businessPhone = msg.to
        const imageUrl = msg.image.link
        console.log(`From: ${customerPhone}, To: ${businessPhone}, Image: ${imageUrl}`)

        await handleMessage(customerPhone, businessPhone, 'Prescription image received', imageUrl)
      }
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
