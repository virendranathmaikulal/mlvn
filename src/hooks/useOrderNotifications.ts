import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOrderNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Create audio element
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKDf8sFuIwUrgc7y2Ik2CBhku+zooVARC0yl4fG5ZRwFNo3V7859KQUofsz');

    // Subscribe to new orders
    const channel = supabase
      .channel('order_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_leads',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const order = payload.new;
          
          // Play sound
          audioRef.current?.play().catch(console.error);

          // Show toast
          toast({
            title: '🔔 New Pharmacy Order!',
            description: `Order from ${order.customer_name || order.customer_phone}`,
            duration: 10000,
          });

          // Desktop notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Pharmacy Order', {
              body: `Order from ${order.customer_name || order.customer_phone}`,
              icon: '/pharmacy-icon.png',
              tag: order.id,
              requireInteraction: true
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, toast]);
};
