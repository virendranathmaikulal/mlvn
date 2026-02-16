import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

export default function WhatsAppTemplates() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Message Templates</h2>
          <p className="text-muted-foreground">Create reusable message templates for your campaigns</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Templates Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first message template to get started</p>
          <Button>Create Template</Button>
        </CardContent>
      </Card>
    </div>
  );
}
