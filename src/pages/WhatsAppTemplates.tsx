import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Edit, Trash2, Copy, RefreshCw, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as ycloud from "@/lib/ycloud";

interface Template {
  id: string;
  name: string;
  template_content: string;
  media_url: string | null;
  category: string;
  status: string;
  created_at: string;
  language?: string;
  ycloud_status?: string;
  ycloud_name?: string;
  components?: any;
  last_synced_at?: string;
}

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    template_content: '',
    media_url: '',
    category: 'promotional',
    language: 'en'
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFromYCloud = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      console.log('Fetching templates from YCloud...');
      const ycloudTemplates = await ycloud.getTemplates();
      console.log('YCloud templates:', ycloudTemplates);
      
      const approvedTemplates = ycloudTemplates.filter(t => 
        t.status === 'APPROVED' || t.status === 'ACTIVE'
      );
      console.log('Approved/Active templates:', approvedTemplates);

      if (approvedTemplates.length === 0) {
        toast({ title: "Info", description: "No approved/active templates found in YCloud" });
        return;
      }

      for (const template of approvedTemplates) {
        const bodyComponent = template.components.find(c => c.type === 'BODY');
        const headerComponent = template.components.find(c => c.type === 'HEADER');

        const insertData = {
          user_id: user.id,
          name: template.name.replace(/_/g, ' '),
          template_content: bodyComponent?.text || '',
          media_url: headerComponent?.format === 'IMAGE' ? '' : null,
          category: template.category.toLowerCase(),
          language: template.language,
          ycloud_name: template.name,
          ycloud_status: template.status,
          components: template.components,
          status: 'active',
          last_synced_at: new Date().toISOString()
        };
        
        console.log('Inserting template:', insertData);
        
        const { error } = await supabase.from('whatsapp_templates').upsert(insertData, { 
          onConflict: 'ycloud_name,language',
          ignoreDuplicates: false 
        });
        
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      toast({ title: "Success", description: `Imported ${approvedTemplates.length} templates` });
      fetchTemplates();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !formData.name || !formData.template_content) {
      toast({ title: "Error", description: "Name and content are required", variant: "destructive" });
      return;
    }

    try {
      const components = [
        { type: 'BODY' as const, text: formData.template_content },
        ...(formData.media_url ? [{ type: 'HEADER' as const, format: 'IMAGE' as const }] : [])
      ];

      if (!editingTemplate) {
        const ycloudTemplate = await ycloud.createTemplate({
          name: formData.name.toLowerCase().replace(/\s+/g, '_'),
          language: formData.language,
          category: formData.category === 'promotional' ? 'MARKETING' : 'UTILITY',
          components
        });

        const { error } = await supabase
          .from('whatsapp_templates')
          .insert({
            user_id: user.id,
            name: formData.name,
            template_content: formData.template_content,
            media_url: formData.media_url || null,
            category: formData.category,
            language: formData.language,
            ycloud_name: ycloudTemplate.name,
            ycloud_status: ycloudTemplate.status,
            components: ycloudTemplate.components,
            status: 'active'
          });

        if (error) throw error;
        toast({ title: "Success", description: "Template created and submitted to YCloud" });
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update({
            name: formData.name,
            template_content: formData.template_content,
            media_url: formData.media_url || null,
            category: formData.category,
            language: formData.language
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: "Success", description: "Template updated" });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: '', template_content: '', media_url: '', category: 'promotional', language: 'en' });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_content: template.template_content,
      media_url: template.media_url || '',
      category: template.category,
      language: template.language || 'en'
    });
    setIsDialogOpen(true);
  };

  const handleSyncStatus = async (template: Template) => {
    if (!template.ycloud_name || !template.language) {
      toast({ title: "Error", description: "Template not synced with YCloud", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    try {
      const ycloudTemplate = await ycloud.syncTemplateStatus(template.ycloud_name, template.language);
      
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({
          ycloud_status: ycloudTemplate.status,
          components: ycloudTemplate.components,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', template.id);

      if (error) throw error;
      toast({ title: "Success", description: `Status synced: ${ycloudTemplate.status}` });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Template deleted" });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .insert({
          user_id: user?.id,
          name: `${template.name} (Copy)`,
          template_content: template.template_content,
          media_url: template.media_url,
          category: template.category,
          status: 'active'
        });

      if (error) throw error;
      toast({ title: "Success", description: "Template duplicated" });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openNewDialog = () => {
    setEditingTemplate(null);
    setFormData({ name: '', template_content: '', media_url: '', category: 'promotional', language: 'en' });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Message Templates</h2>
          <p className="text-muted-foreground">Create reusable message templates for your campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportFromYCloud}>
            <Download className="h-4 w-4 mr-2" />
            Import from YCloud
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first message template to get started</p>
            <Button onClick={openNewDialog}>Create Template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{template.category}</Badge>
                      {template.ycloud_status && (
                        <Badge variant={template.ycloud_status === 'APPROVED' ? 'default' : 'outline'}>
                          {template.ycloud_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                    {template.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {template.template_content}
                </p>
                {template.media_url && (
                  <p className="text-xs text-muted-foreground mb-4">📎 Has media</p>
                )}
                <div className="flex gap-2">
                  {template.ycloud_name && (
                    <Button variant="outline" size="sm" onClick={() => handleSyncStatus(template)} disabled={isSyncing}>
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDuplicate(template)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Template Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Sale Promotion"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Language</label>
                <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Message Content *</label>
              <Textarea
                value={formData.template_content}
                onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                placeholder="Use {{name}}, {{phone}} for variables&#10;&#10;Example: Hi {{name}}, check out our sale!"
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">Use {`{{variable}}`} for dynamic content</p>
            </div>
            <div>
              <label className="text-sm font-medium">Media URL (Optional)</label>
              <Input
                value={formData.media_url}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingTemplate ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
