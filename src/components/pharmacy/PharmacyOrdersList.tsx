import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Search, X, Eye, Clock, User, Phone, MoreHorizontal, Image as ImageIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface PharmacyOrder {
  id: string;
  customer_phone: string;
  customer_name?: string;
  customer_address?: string;
  medicines?: Array<{ name: string; quantity: string }>;
  lead_status: 'new' | 'contacted' | 'confirmed' | 'delivered' | 'cancelled';
  prescription_image_url?: string;
  created_at: string;
  notes?: string;
}

interface PharmacyOrdersListProps {
  orders: PharmacyOrder[];
  onViewDetails: (orderId: string) => void;
  onStatusUpdate?: () => void;
  isLoading?: boolean;
}

export function PharmacyOrdersList({
  orders,
  onViewDetails,
  onStatusUpdate,
  isLoading
}: PharmacyOrdersListProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery.trim() || 
      order.customer_phone?.includes(searchQuery) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.medicines?.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || order.lead_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new': { variant: 'destructive' as const, label: 'New', className: 'bg-red-100 text-red-800' },
      'contacted': { variant: 'secondary' as const, label: 'Contacted', className: 'bg-yellow-100 text-yellow-800' },
      'confirmed': { variant: 'default' as const, label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      'delivered': { variant: 'default' as const, label: 'Delivered', className: 'bg-green-100 text-green-800' },
      'cancelled': { variant: 'outline' as const, label: 'Cancelled', className: 'bg-gray-100 text-gray-800' }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'secondary' as const, label: status };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('order_leads')
        .update({ lead_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });

      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-card rounded-lg p-6 h-32 border border-card-border"></div>
        </div>
      </div>
    );
  }

  return (
    <Card className="shadow-soft border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pharmacy Orders
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              {filteredOrders.length} orders {searchQuery && `matching "${searchQuery}"`}
            </p>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Medicines</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Prescription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {order.customer_name || 'Unknown'}
                        </div>
                        {order.customer_address && (
                          <div className="text-sm text-muted-foreground truncate max-w-32">
                            {order.customer_address}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {order.customer_phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-48">
                      {order.medicines && order.medicines.length > 0 ? (
                        <div className="space-y-1">
                          {order.medicines.slice(0, 2).map((med, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{med.name}</span> - {med.quantity}
                            </div>
                          ))}
                          {order.medicines.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{order.medicines.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No medicines</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.lead_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDateTime(order.created_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.prescription_image_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Create a temporary image modal or navigate to view
                          window.open(order.prescription_image_url, '_blank');
                        }}
                        className="gap-2 bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        <ImageIcon className="h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(order.id)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updating === order.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {statusOptions
                            .filter(status => status.value !== order.lead_status)
                            .map((status) => (
                              <DropdownMenuItem
                                key={status.value}
                                onClick={() => handleStatusUpdate(order.id, status.value)}
                              >
                                Mark as {status.label}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No orders found matching your search' : 'No orders found'}
                      </p>
                      {searchQuery && (
                        <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="gap-2">
                          <X className="h-4 w-4" />
                          Clear search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
