import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function OrderLeads() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Order Leads</h2>
        <p className="text-muted-foreground">Manage orders captured from WhatsApp bot</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Order Leads</h3>
          <p className="text-muted-foreground">Order leads from bot conversations will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}
