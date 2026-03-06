import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    } else {
      window.location.replace('/medical-store.html');
    }
  }, [user, navigate]);

  return <div>Loading...</div>;
};

export default Index;
