import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Search, 
  X, 
  Eye, 
  Clock, 
  Users, 
  MessageSquare, 
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface WhatsAppCampaign {
  id: string;
  name: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  launched_at: string;
  template_name?: string;
}

interface WhatsAppCampaignsListProps {
  campaigns: WhatsAppCampaign[];
  onViewDetails: (campaignId: string) => void;
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function WhatsAppCampaignsList({
  campaigns,
  onViewDetails,
  isLoading
}: WhatsAppCampaignsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch = !searchQuery.trim() || 
        campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.template_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.launched_at).getTime();
        const dateB = new Date(b.launched_at).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const statusOrder = ['running', 'pending', 'completed', 'failed'];
        const indexA = statusOrder.indexOf(a.status);
        const indexB = statusOrder.indexOf(b.status);
        return sortOrder === 'desc' ? indexB - indexA : indexA - indexB;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'running': { variant: 'secondary' as const, label: '🟡 Running', className: 'bg-yellow-100 text-yellow-800 font-medium' },
      'completed': { variant: 'default' as const, label: '🟢 Completed', className: 'bg-green-100 text-green-800 font-medium' },
      'failed': { variant: 'destructive' as const, label: '🔴 Failed', className: 'bg-red-100 text-red-800 font-medium' },
      'pending': { variant: 'outline' as const, label: '⚫ Pending', className: 'bg-gray-100 text-gray-800 font-medium' }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'secondary' as const, label: status };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const getDeliveryRate = (campaign: WhatsAppCampaign) => {
    if (campaign.messages_sent === 0) return 0;
    return Math.round((campaign.messages_delivered / campaign.messages_sent) * 100);
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
    <Card className="shadow-lg border-2 border-green-100">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                <Send className="h-5 w-5 text-white" />
              </div>
              Recent Campaigns
            </CardTitle>
            <p className="text-muted-foreground mt-2 text-sm">
              {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} {searchQuery && `matching "${searchQuery}"`}
            </p>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by campaign name or template..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
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
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1); // Reset to first page on filter
              }}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="running">🟡 Running</option>
              <option value="completed">🟢 Completed</option>
              <option value="failed">🔴 Failed</option>
              <option value="pending">⚫ Pending</option>
            </select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('desc'); }}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('asc'); }}>
                  Oldest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder('asc'); }}>
                  Status (Running → Failed)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Campaign
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Recipients
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Delivery
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Status
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Launched
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCampaigns.length > 0 ? paginatedCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      {campaign.template_name && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Template: {campaign.template_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{campaign.total_recipients}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          <span className="font-medium text-green-600">{campaign.messages_delivered}</span>
                          <span className="text-muted-foreground"> / {campaign.messages_sent}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${getDeliveryRate(campaign)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{getDeliveryRate(campaign)}%</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    {getStatusBadge(campaign.status)}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDateTime(campaign.launched_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onViewDetails(campaign.id)}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Send className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No campaigns found matching your search' : 'No campaigns found'}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
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
      </CardContent>
    </Card>
  );
}
