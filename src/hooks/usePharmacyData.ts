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
        .select('*')
        .eq('lead_source', 'whatsapp_bot')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
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
      
      console.log('Order details:', order);
      console.log('Looking for conversation with phone:', order.customer_phone);

      // Get conversation for this customer - try multiple approaches
      let conversation = null;
      let conversationError = null;
      
      // First try exact match with conversation_type
      const { data: conv1, error: convError1 } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('customer_phone', order.customer_phone)
        .eq('conversation_type', 'pharmacy_order');
        
      console.log('Conversation search 1 (exact + type):', conv1, convError1);
      
      if (conv1 && conv1.length > 0) {
        conversation = conv1[0];
      } else {
        // Try without conversation_type filter
        const { data: conv2, error: convError2 } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('customer_phone', order.customer_phone);
          
        console.log('Conversation search 2 (phone only):', conv2, convError2);
        
        if (conv2 && conv2.length > 0) {
          conversation = conv2[0];
        } else {
          // Try with LIKE for partial phone matches
          const { data: conv3, error: convError3 } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .ilike('customer_phone', `%${order.customer_phone.slice(-10)}%`);
            
          console.log('Conversation search 3 (partial phone):', conv3, convError3);
          
          if (conv3 && conv3.length > 0) {
            conversation = conv3[0];
          }
        }
      }

      console.log('Final conversation found:', conversation);

      // Get messages if conversation exists
      let messages = [];
      if (conversation) {
        const { data: messageData, error: msgError } = await supabase
          .from('whatsapp_conversation_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('timestamp', { ascending: true });

        console.log('Messages query result:', messageData, msgError);
        
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
          console.log('Processed messages:', messages);
        }
      } else {
        console.log('No conversation found, checking all conversations for debugging...');
        const { data: allConvs } = await supabase
          .from('whatsapp_conversations')
          .select('*');
        console.log('All conversations:', allConvs);
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
