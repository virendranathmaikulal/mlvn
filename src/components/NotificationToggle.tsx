import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export const NotificationToggle = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(Notification.permission === 'granted');
  }, []);

  const handleToggle = async () => {
    if (Notification.permission === 'granted') {
      setEnabled(false);
    } else {
      const permission = await Notification.requestPermission();
      setEnabled(permission === 'granted');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className="gap-2"
    >
      {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      {enabled ? 'Notifications On' : 'Enable Notifications'}
    </Button>
  );
};
