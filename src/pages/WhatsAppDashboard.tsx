import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function WhatsAppDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ campaigns: 0, messagesSent: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('whatsapp_campaigns')
        .select('*, whatsapp_messages(count)')
        .eq('user_id', user?.id)
        .gte('launched_at', thirtyDaysAgo.toISOString())
        .order('launched_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      const { count: sentCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'sent');

      setStats({
        campaigns: campaignsData?.length || 0,
        messagesSent: sentCount || 0
      });
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">WhatsApp Marketing & Automation</h2>
        <p className="text-white/90 text-lg">Manage promotional campaigns and customer conversations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns (Last 30 Days)</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.campaigns}</div>
            <p className="text-xs text-muted-foreground">Total campaigns launched</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesSent}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No campaigns launched yet</div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{campaign.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(campaign.launched_at).toLocaleDateString()} • {campaign.total_recipients} recipients
                    </p>
                  </div>
                  <Badge variant={campaign.status === 'completed' ? 'default' : campaign.status === 'running' ? 'secondary' : 'destructive'}>
                    {campaign.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/campaigns/whatsapp')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Create Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Send promotional messages to your contacts</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/whatsapp/templates')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Manage Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Create and manage message templates</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-semibold">1</span>
            </div>
            <div>
              <h4 className="font-medium">Configure WhatsApp Business</h4>
              <p className="text-sm text-muted-foreground">Set up your WhatsApp Business API credentials in Settings</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-semibold">2</span>
            </div>
            <div>
              <h4 className="font-medium">Create Message Templates</h4>
              <p className="text-sm text-muted-foreground">Design reusable message templates for your campaigns</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-semibold">3</span>
            </div>
            <div>
              <h4 className="font-medium">Launch Your First Campaign</h4>
              <p className="text-sm text-muted-foreground">Select contacts and send your promotional messages</p>
            </div>
          </div>
          <Button onClick={() => navigate('/campaigns/whatsapp')} className="w-full mt-4">
            Create Your First Campaign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
