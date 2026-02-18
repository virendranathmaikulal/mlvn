import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WhatsAppDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">WhatsApp Marketing & Automation</h2>
        <p className="text-white/90 text-lg">Manage promotional campaigns and customer conversations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Total campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pharmacy Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Total orders</p>
          </CardContent>
        </Card>
      </div>

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

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/pharmacy')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pharmacy Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Manage orders and customer conversations</p>
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
