import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Package, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { WhatsAppCampaignsList } from "@/components/dashboard/WhatsAppCampaignsList";
import { WhatsAppCampaignDetails } from "@/components/dashboard/WhatsAppCampaignDetails";
import { useProfile } from "@/hooks/useProfile";

export default function WhatsAppDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState({ campaigns: 0, messagesSent: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetailsData, setCampaignDetailsData] = useState<any>(null);

  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    return 'User';
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .gte('launched_at', thirtyDaysAgo.toISOString())
        .order('launched_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch message counts for each campaign
      const campaignsWithCounts = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const { count: sentCount } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'sent');

          const { count: deliveredCount } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'delivered');

          const { count: failedCount } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'failed');

          return {
            ...campaign,
            messages_sent: sentCount || 0,
            messages_delivered: deliveredCount || 0,
            messages_failed: failedCount || 0
          };
        })
      );

      const { count: totalSentCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .in('status', ['sent', 'delivered']);

      setStats({
        campaigns: campaignsData?.length || 0,
        messagesSent: totalSentCount || 0
      });
      setCampaigns(campaignsWithCounts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    setCampaignDetailsData({ campaign });
    setSelectedCampaignId(campaignId);
  };

  const handleBackToCampaigns = () => {
    setSelectedCampaignId(null);
    setCampaignDetailsData(null);
    fetchData(); // Refresh campaigns list
  };

  return (
    <>
      {selectedCampaignId ? (
        <div style={{ height: 'calc(100vh - 64px - 80px)' }} className="flex flex-col">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-green-200 flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
            <Button
              variant="outline"
              onClick={handleBackToCampaigns}
              className="gap-2 border-2 border-green-300 hover:bg-green-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Campaigns
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <Send className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">
                Campaign Details
              </h1>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <WhatsAppCampaignDetails
              campaignId={selectedCampaignId}
              campaignData={campaignDetailsData}
              onBack={handleBackToCampaigns}
              isLoading={isLoading}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-green-600 via-green-600 to-emerald-700 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-bold">Welcome back, {getFirstName()}!</h2>
                <p className="text-white/90 text-lg mt-1">
                  Manage your WhatsApp campaigns and customer conversations
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                  <Send className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-green-900">
                    {stats.campaigns}
                  </h3>
                  <p className="text-green-700 font-medium">Campaigns (Last 30 Days)</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <MessageCircle className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-blue-900">
                    {stats.messagesSent}
                  </h3>
                  <p className="text-blue-700 font-medium">Messages Sent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <WhatsAppCampaignsList
            campaigns={campaigns}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-100" onClick={() => navigate('/campaigns/whatsapp')}>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  Create Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-muted-foreground">Send promotional messages to your contacts</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-100" onClick={() => navigate('/whatsapp/templates')}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  Manage Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-muted-foreground">Create and manage message templates</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
