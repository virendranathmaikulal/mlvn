import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function usePharmacyData() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'order_leads'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversations = async () => {
    if (!user) {
      setConversations([]);
      return;
    }

    try {
      const q = query(
        collection(db, 'whatsapp_conversations'),
        where('user_id', '==', user.uid),
        orderBy('last_message_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const conversationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      // Fetch order
      const orderDoc = await getDoc(doc(db, 'order_leads', orderId));
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      const order = { id: orderDoc.id, ...orderDoc.data() };
      
      // Fetch conversation if exists
      let conversation = null;
      if (order.conversation_id) {
        const convDoc = await getDoc(doc(db, 'whatsapp_conversations', order.conversation_id));
        if (convDoc.exists()) {
          conversation = { id: convDoc.id, ...convDoc.data() };
        }
      }
      
      // Fetch messages
      let messages: any[] = [];
      if (order.conversation_id) {
        const messagesQuery = query(
          collection(db, 'whatsapp_conversation_messages'),
          where('conversation_id', '==', order.conversation_id),
          orderBy('created_at', 'asc')
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      return { order, conversation, messages };
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'order_leads', orderId), {
        lead_status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      // Refresh orders
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchConversations();
  }, [user]);

  return { 
    orders, 
    conversations, 
    isLoading, 
    fetchOrders, 
    fetchOrderDetails,
    updateOrderStatus 
  };
}
