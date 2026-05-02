import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PharmacyOrder {
  id: string;
  customer_phone: string;
  customer_name?: string;
  customer_address?: string;
  medicines?: Array<{ name: string; quantity: string }>;
  lead_status: 'new' | 'contacted' | 'confirmed' | 'delivered' | 'cancelled';
  prescription_image_url?: string;
  created_at: string;
  notes?: string;
}

export interface PharmacyConversation {
  id: string;
  customer_phone: string;
  conversation_status: 'active' | 'resolved' | 'abandoned';
  last_message_at: string;
  created_at: string;
}

export function usePharmacyData() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [conversations, setConversations] = useState<PharmacyConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_leads')
        .select(`
          *,
          whatsapp_conversations!inner(
            id,
            whatsapp_conversation_messages(
              media_url
            )
          )
        `)
        .eq('lead_source', 'whatsapp_bot')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process orders to include prescription images from messages
      const processedOrders = (data || []).map(order => {
        const messages = order.whatsapp_conversations?.whatsapp_conversation_messages || [];
        const prescriptionImage = messages.find(msg => msg.media_url)?.media_url;
        
        return {
          ...order,
          prescription_image_url: prescriptionImage || order.prescription_image_url
        };
      });
      
      setOrders(processedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('conversation_type', 'pharmacy_order')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, []);

  const fetchOrderDetails = useCallback(async (orderId: string) => {
    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('order_leads')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Get ALL conversations for this customer phone number
      const { data: allConversations, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('customer_phone', order.customer_phone)
        .order('created_at', { ascending: false });
      
      const conversation = allConversations?.[0] || null;

      // Get messages from ALL conversations for this phone number
      let messages = [];
      if (allConversations && allConversations.length > 0) {
        const conversationIds = allConversations.map(conv => conv.id);
        
        const { data: messageData, error: msgError } = await supabase
          .from('whatsapp_conversation_messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('timestamp', { ascending: true });
        
        if (msgError) {
          console.warn('Error fetching messages:', msgError);
        } else {
          messages = (messageData || []).map(msg => ({
            id: msg.id,
            direction: msg.direction,
            content: msg.content,
            media_url: msg.media_url,
            timestamp: msg.timestamp || msg.created_at
          }));
        }
      }

      return {
        order,
        conversation,
        messages
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  }, []);

  return {
    orders,
    conversations,
    isLoading,
    fetchOrders,
    fetchConversations,
    fetchOrderDetails
  };
}
