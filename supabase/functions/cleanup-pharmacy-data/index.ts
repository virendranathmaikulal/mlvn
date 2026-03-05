import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const retentionDays = parseInt(Deno.env.get('PHARMACY_DATA_RETENTION_DAYS') || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log('Cleaning up pharmacy data older than:', cutoffDate.toISOString(), `(${retentionDays} days)`);

    // Get old conversations to delete
    const { data: conversationsToDelete } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('conversation_type', 'pharmacy_order')
      .lt('created_at', cutoffDate.toISOString());

    const conversationIds = conversationsToDelete?.map(c => c.id) || [];

    if (conversationIds.length === 0) {
      console.log('No old pharmacy conversations to clean up');
      return new Response(JSON.stringify({ success: true, cleaned: 0, retention_days: retentionDays }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete in correct order to avoid FK violations
    // 1. Get order_lead IDs first
    const { data: orderLeadsToDelete } = await supabase
      .from('order_leads')
      .select('id')
      .in('conversation_id', conversationIds);

    const orderLeadIds = orderLeadsToDelete?.map(o => o.id) || [];

    // 2. Delete pharmacy_notifications
    if (orderLeadIds.length > 0) {
      await supabase
        .from('pharmacy_notifications')
        .delete()
        .in('order_lead_id', orderLeadIds);
    }

    // 3. Delete order_leads
    await supabase
      .from('order_leads')
      .delete()
      .in('conversation_id', conversationIds);

    // 4. Delete conversation messages
    await supabase
      .from('whatsapp_conversation_messages')
      .delete()
      .in('conversation_id', conversationIds);

    // 5. Delete conversations
    const { error: conversationsError } = await supabase
      .from('whatsapp_conversations')
      .delete()
      .in('id', conversationIds);

    if (conversationsError) throw conversationsError;

    console.log('Cleanup completed. Deleted', conversationIds.length, 'pharmacy conversations');

    return new Response(JSON.stringify({ success: true, cleaned: conversationIds.length, retention_days: retentionDays }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
