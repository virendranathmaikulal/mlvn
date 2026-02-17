import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Package, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { PharmacyOrdersList } from "@/components/pharmacy/PharmacyOrdersList";
import { PharmacyOrderDetails } from "@/components/pharmacy/PharmacyOrderDetails";
import { usePharmacyData } from "@/hooks/usePharmacyData";

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { orders, conversations, isLoading, fetchOrders, fetchOrderDetails } = usePharmacyData();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetailsData, setOrderDetailsData] = useState<any>(null);

  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    return 'User';
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewDetails = async (orderId: string) => {
    const details = await fetchOrderDetails(orderId);
    setOrderDetailsData(details);
    setSelectedOrderId(orderId);
  };

  const handleBackToOrders = () => {
    setSelectedOrderId(null);
    setOrderDetailsData(null);
    fetchOrders(); // Refresh orders list
  };

  return (
    <>
      {selectedOrderId ? (
        <div style={{ height: 'calc(100vh - 64px - 80px)' }} className="flex flex-col">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleBackToOrders}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
            <h1 className="text-2xl font-bold">
              Order #{selectedOrderId.slice(-8)} - Details
            </h1>
          </div>
          
          <div className="flex-1 overflow-auto">
            <PharmacyOrderDetails
              orderId={selectedOrderId}
              orderData={orderDetailsData}
              onBack={handleBackToOrders}
              onStatusUpdate={fetchOrders}
              isLoading={isLoading}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
            <h2 className="text-3xl font-bold mb-2">Welcome back, {getFirstName()}!</h2>
            <p className="text-white/90 text-lg">
              Manage your pharmacy orders and customer conversations
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-card-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {orders.filter(o => o.lead_status === 'new').length}
                  </h3>
                  <p className="text-muted-foreground">New Orders</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {conversations.filter(c => c.conversation_status === 'active').length}
                  </h3>
                  <p className="text-muted-foreground">Active Chats</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {orders.filter(o => o.lead_status === 'confirmed').length}
                  </h3>
                  <p className="text-muted-foreground">Confirmed Orders</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <PharmacyOrdersList
            orders={orders}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />
        </div>
      )}
    </>
  );
}
