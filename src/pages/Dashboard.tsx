import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Phone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { CampaignsList } from "@/components/dashboard/CampaignsList";
import { CampaignDetails } from "@/components/dashboard/CampaignDetails";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { metrics, campaigns, conversations, isLoading, fetchDashboardData, fetchCampaignDetails } = useDashboardData();
  
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(['all']);
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<string | null>(null);
  const [campaignDetailsData, setCampaignDetailsData] = useState<any[]>([]);

  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    return 'User';
  };

  const handleCampaignChange = (campaignIds: string[]) => {
    setSelectedCampaigns(campaignIds);
    const campaignsToFilter = campaignIds.includes('all') ? undefined : campaignIds;
    fetchDashboardData(campaignsToFilter);
  };

  const handleClearFilters = () => {
    setSelectedCampaigns(['all']);
    fetchDashboardData();
  };

  // Initialize data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleViewDetails = async (campaignId: string) => {
    const details = await fetchCampaignDetails(campaignId);
    setCampaignDetailsData(details);
    setSelectedCampaignDetails(campaignId);
  };

  const handleBackToCampaigns = () => {
    setSelectedCampaignDetails(null);
    setCampaignDetailsData([]);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-brand rounded-xl p-6 text-white shadow-medium">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {getFirstName()}!</h2>
        <p className="text-white/90 text-lg">
          Create amazing voice experiences for your customers
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Button
          onClick={() => navigate("/create-agent")}
          className="h-32 bg-card border border-card-border hover:bg-muted/50 text-left p-6 shadow-soft transition-all hover:shadow-medium group"
          variant="outline"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">Create Voice Agent</h3>
              <p className="text-muted-foreground">Set up a new AI voice agent for your business needs</p>
            </div>
          </div>
        </Button>

        <Button
          onClick={() => navigate("/run-campaign")}
          className="h-32 bg-card border border-card-border hover:bg-muted/50 text-left p-6 shadow-soft transition-all hover:shadow-medium group"
          variant="outline"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
              <Phone className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">Run Campaign</h3>
              <p className="text-muted-foreground">Launch inbound or outbound calling campaigns</p>
            </div>
          </div>
        </Button>
      </div>

      {/* Dashboard Filters */}
      <DashboardFilters
        campaigns={campaigns.map(c => ({ id: c.id, name: c.name }))}
        selectedCampaigns={selectedCampaigns}
        onCampaignChange={handleCampaignChange}
        onClearFilters={handleClearFilters}
      />

      {/* Dashboard Metrics */}
      <DashboardMetrics metrics={metrics} isLoading={isLoading} />

      {/* Campaign Details or Campaigns List */}
      {selectedCampaignDetails ? (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-background flex flex-col">
          {/* Static Header */}
          <div className="sticky top-0 z-10 bg-background border-b p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBackToCampaigns}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold">
                {campaigns.find(c => c.id === selectedCampaignDetails)?.name || 'Campaign'} - Details
              </h1>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <CampaignDetails
                campaignId={selectedCampaignDetails}
                campaignName={campaigns.find(c => c.id === selectedCampaignDetails)?.name || 'Campaign'}
                conversations={campaignDetailsData}
                onBack={handleBackToCampaigns}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      ) : (
        <CampaignsList
          campaigns={campaigns}
          onViewDetails={handleViewDetails}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}