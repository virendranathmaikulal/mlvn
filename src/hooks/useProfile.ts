import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Real-time listener for profile changes
    const unsubscribe = onSnapshot(
      doc(db, 'profiles', user.uid),
      (doc) => {
        if (doc.exists()) {
          setProfile({ id: doc.id, ...doc.data() });
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching profile:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { profile, loading };
}
