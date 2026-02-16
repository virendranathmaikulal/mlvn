import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

export function DashboardRouter() {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;

    const hasVoice = profile?.has_voice_integration ?? false;
    const hasWhatsApp = profile?.has_whatsapp_integration ?? false;

    if (!hasVoice && !hasWhatsApp) {
      navigate('/settings');
      toast({
        title: "No Features Enabled",
        description: "Please contact support to enable features",
        variant: "destructive",
      });
    } else if (hasVoice) {
      navigate('/dashboard/voice');
    } else if (hasWhatsApp) {
      navigate('/dashboard/whatsapp');
    }
  }, [profile, loading, navigate, toast]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return null;
}
