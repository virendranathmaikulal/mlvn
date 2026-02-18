import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MessageSquare, 
  User, 
  Phone, 
  MapPin, 
  Package, 
  Image as ImageIcon,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PharmacyMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  media_url?: string;
  timestamp: string;
}

interface PharmacyOrderDetailsProps {
  orderId: string;
  orderData: {
    order: any;
    conversation: any;
    messages: PharmacyMessage[];
  };
  onBack: () => void;
  onStatusUpdate: () => void;
  isLoading?: boolean;
}

export function PharmacyOrderDetails({
  orderId,
  orderData,
  onBack,
  onStatusUpdate,
  isLoading
}: PharmacyOrderDetailsProps) {
  const { toast } = useToast();
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  if (isLoading || !orderData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-card rounded-lg p-6 h-32 border border-card-border"></div>
        </div>
      </div>
    );
  }

  const { order, conversation, messages } = orderData;

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

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
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

      onStatusUpdate();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('order_leads')
        .update({
          customer_name: editedOrder.customer_name,
          customer_address: editedOrder.customer_address,
          medicines: editedOrder.medicines,
          notes: editedOrder.notes
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Updated",
        description: "Order details have been saved successfully",
      });

      setIsEditing(false);
      onStatusUpdate();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const startEditing = () => {
    setEditedOrder({
      customer_name: order.customer_name || '',
      customer_address: order.customer_address || '',
      medicines: order.medicines || [],
      notes: order.notes || ''
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order #{orderId.slice(-8)}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(order.lead_status)}
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={startEditing} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editedOrder.customer_name}
                      onChange={(e) => setEditedOrder({...editedOrder, customer_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={editedOrder.customer_address}
                      onChange={(e) => setEditedOrder({...editedOrder, customer_address: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer_name || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <span className="text-sm">{order.customer_address || 'Not provided'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Info */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Details
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDateTime(order.created_at)}</span>
                </div>
                {order.prescription_image_url && (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setSelectedImage(order.prescription_image_url);
                        setShowImageModal(true);
                      }}
                      className="p-0 h-auto text-blue-600"
                    >
                      View Prescription Image
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Medicines Requested</h3>
            {isEditing ? (
              <div className="space-y-2">
                {editedOrder.medicines.map((med: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Medicine name"
                      value={med.name}
                      onChange={(e) => {
                        const updated = [...editedOrder.medicines];
                        updated[idx] = {...updated[idx], name: e.target.value};
                        setEditedOrder({...editedOrder, medicines: updated});
                      }}
                    />
                    <Input
                      placeholder="Quantity"
                      value={med.quantity}
                      onChange={(e) => {
                        const updated = [...editedOrder.medicines];
                        updated[idx] = {...updated[idx], quantity: e.target.value};
                        setEditedOrder({...editedOrder, medicines: updated});
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = editedOrder.medicines.filter((_: any, i: number) => i !== idx);
                        setEditedOrder({...editedOrder, medicines: updated});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedOrder({
                      ...editedOrder,
                      medicines: [...editedOrder.medicines, {name: '', quantity: ''}]
                    });
                  }}
                >
                  Add Medicine
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {order.medicines && order.medicines.length > 0 ? (
                  order.medicines.map((med: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="font-medium">{med.name}</div>
                      <div className="text-sm text-muted-foreground">Quantity: {med.quantity}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No medicines specified</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Notes</h3>
            {isEditing ? (
              <Textarea
                placeholder="Add notes about this order..."
                value={editedOrder.notes}
                onChange={(e) => setEditedOrder({...editedOrder, notes: e.target.value})}
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {order.notes || 'No notes added'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSaveEdit} disabled={updating} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {order.lead_status === 'new' && (
                  <Button onClick={() => handleStatusUpdate('contacted')} disabled={updating}>
                    Mark as Contacted
                  </Button>
                )}
                {order.lead_status === 'contacted' && (
                  <Button onClick={() => handleStatusUpdate('confirmed')} disabled={updating} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Confirm Order
                  </Button>
                )}
                {order.lead_status === 'confirmed' && (
                  <Button onClick={() => handleStatusUpdate('delivered')} disabled={updating} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark as Delivered
                  </Button>
                )}
                {['new', 'contacted'].includes(order.lead_status) && (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleStatusUpdate('cancelled')} 
                    disabled={updating}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Order
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation History */}
      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {messages && messages.length > 0 ? (
                (() => {
                  const messagesByDate = messages.reduce((acc, message) => {
                    const date = new Date(message.timestamp).toDateString();
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(message);
                    return acc;
                  }, {} as Record<string, typeof messages>);
                  
                  return Object.entries(messagesByDate).map(([date, dayMessages]) => (
                    <div key={date} className="space-y-3">
                      <div className="flex justify-center">
                        <div className="bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground">
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                      {dayMessages.map((message) => (
                        <div key={message.id} className={`p-3 rounded-lg ${
                          message.direction === 'outbound' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={message.direction === 'outbound' ? 'default' : 'secondary'}>
                              {message.direction === 'outbound' ? 'Bot' : 'Customer'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          {message.media_url && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setSelectedImage(message.media_url!);
                                setShowImageModal(true);
                              }}
                              className="p-0 mt-2 text-blue-600"
                            >
                              <ImageIcon className="h-4 w-4 mr-1" />
                              View Image
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ));
                })()
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No conversation history available
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Prescription Image</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img 
              src={selectedImage} 
              alt="Prescription" 
              className="max-w-full max-h-96 object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
