import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Users, 
  Send, 
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recipient {
  id: string;
  phone_number: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sent_at?: string;
  error_message?: string;
}

interface WhatsAppCampaignDetailsProps {
  campaignId: string;
  campaignData: any;
  onBack: () => void;
  isLoading?: boolean;
}

const RECIPIENTS_PER_PAGE = 20;

export function WhatsAppCampaignDetails({
  campaignId,
  campaignData,
  onBack,
  isLoading
}: WhatsAppCampaignDetailsProps) {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (campaignId) {
      fetchRecipients();
    }
  }, [campaignId]);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, phone_number, status, sent_at, error_message')
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const formattedRecipients = data?.map(msg => ({
        id: msg.id,
        phone_number: msg.phone_number,
        status: msg.status,
        sent_at: msg.sent_at,
        error_message: msg.error_message
      })) || [];

      setRecipients(formattedRecipients);
    } catch (error: any) {
      console.error('Error loading recipients:', error);
      toast({
        title: "Error",
        description: "Failed to load recipients",
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  if (isLoading || !campaignData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-card rounded-lg p-6 h-32 border border-card-border"></div>
        </div>
      </div>
    );
  }

  const { campaign } = campaignData;

  // Pagination
  const totalPages = Math.ceil(recipients.length / RECIPIENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECIPIENTS_PER_PAGE;
  const endIndex = startIndex + RECIPIENTS_PER_PAGE;
  const paginatedRecipients = recipients.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'sent': { variant: 'secondary' as const, label: '🟡 Sent', className: 'bg-yellow-100 text-yellow-800 font-medium' },
      'delivered': { variant: 'default' as const, label: '🟢 Delivered', className: 'bg-green-100 text-green-800 font-medium' },
      'failed': { variant: 'destructive' as const, label: '🔴 Failed', className: 'bg-red-100 text-red-800 font-medium' },
      'pending': { variant: 'outline' as const, label: '⚫ Pending', className: 'bg-gray-100 text-gray-800 font-medium' }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'secondary' as const, label: status };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const getDeliveryRate = () => {
    if (campaign.messages_sent === 0) return 0;
    return Math.round((campaign.messages_delivered / campaign.messages_sent) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <Card className="shadow-lg border-2 border-green-100">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <Send className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{campaign.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Launched {formatDateTime(campaign.launched_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(campaign.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Stats */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Recipients</p>
                  <p className="font-bold text-2xl">{campaign.total_recipients}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Messages Sent</p>
                  <p className="font-bold text-2xl">{campaign.messages_sent || campaign.total_recipients || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg">Message Content</h3>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">
                {campaign.message_content || 'No message content available'}
              </p>
            </div>
          </div>

          {campaign.template_name && (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Template: <span className="font-medium">{campaign.template_name}</span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipients List */}
      <Card className="shadow-lg border-2 border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            Recipients ({recipients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingRecipients ? (
            <div className="text-center py-8 text-muted-foreground">Loading recipients...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Status
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Sent At
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecipients.length > 0 ? paginatedRecipients.map((recipient) => (
                      <TableRow key={recipient.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              <Phone className="h-4 w-4" />
                            </div>
                            <span className="font-medium">
                              {recipient.phone_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {getStatusBadge(recipient.status)}
                          {recipient.error_message && (
                            <p className="text-xs text-red-600 mt-1">{recipient.error_message}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm">
                            {formatDateTime(recipient.sent_at)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No recipients found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, recipients.length)} of {recipients.length} recipients
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
