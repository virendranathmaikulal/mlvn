import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface VoiceFeatureGuardProps {
  children: React.ReactNode;
}

export function VoiceFeatureGuard({ children }: VoiceFeatureGuardProps) {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !profile?.has_voice_integration) {
      navigate('/settings');
      toast({
        title: "Feature Not Available",
        description: "Voice integration is not enabled for your account",
        variant: "destructive",
      });
    }
  }, [profile, loading, navigate, toast]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  if (!profile?.has_voice_integration) return null;

  return <>{children}</>;
}
