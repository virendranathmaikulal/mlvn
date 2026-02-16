import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function WhatsAppConversations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Conversations</h2>
        <p className="text-muted-foreground">Manage customer chats and bot interactions</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active Conversations</h3>
          <p className="text-muted-foreground">Conversations will appear here when customers message you</p>
        </CardContent>
      </Card>
    </div>
  );
}
