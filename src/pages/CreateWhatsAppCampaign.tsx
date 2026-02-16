import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Send, Users, Upload, Plus, X, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ExistingContactsModal } from "@/components/contacts/ExistingContactsModal";
import { CsvUploader } from "@/components/contacts/CsvUploader";

const steps = ["Select Contacts", "Create Message", "Review & Send"];

interface Contact {
  id: string;
  phone: string;
  [key: string]: string;
}

export default function CreateWhatsAppCampaign() {
  const [currentStep, setCurrentStep] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showCsvUploader, setShowCsvUploader] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setMessageTemplate(template.template_content);
      setMediaUrl(template.media_url || '');
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  const replaceVariables = (template: string, contact: Contact) => {
    let message = template;
    Object.keys(contact).forEach(key => {
      if (key !== 'id') {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), contact[key] || '');
      }
    });
    return message;
  };

  const handleLaunchCampaign = async () => {
    if (!user) return;

    setIsLaunching(true);
    try {
      const { data: campaign, error: campaignError } = await supabase
        .from('whatsapp_campaigns')
        .insert({
          user_id: user.id,
          name: campaignName,
          message_content: messageTemplate,
          media_url: mediaUrl || null,
          status: 'running',
          launched_at: new Date().toISOString(),
          total_recipients: contacts.length
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      const campaignContacts = contacts.map(contact => ({
        campaign_id: campaign.id,
        contact_id: contact.id
      }));

      await supabase.from('whatsapp_campaign_contacts').insert(campaignContacts);

      const messages = contacts.map(contact => ({
        user_id: user.id,
        campaign_id: campaign.id,
        contact_id: contact.id,
        phone_number: contact.phone,
        message_content: replaceVariables(messageTemplate, contact),
        media_url: mediaUrl || null,
        status: 'pending'
      }));

      const { error: messagesError } = await supabase
        .from('whatsapp_messages')
        .insert(messages);

      if (messagesError) throw messagesError;

      toast({
        title: "Campaign Created!",
        description: `${contacts.length} messages queued for sending`,
      });

      navigate('/dashboard/whatsapp');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl font-bold">Create WhatsApp Campaign</CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} />
        </CardHeader>
      </Card>

      <Card className="min-h-[400px]">
        <CardContent className="p-8">
          {currentStep === 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Select Contacts</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 cursor-pointer hover:shadow-md border-2 hover:border-primary" onClick={() => setShowContactsModal(true)}>
                  <Users className="h-8 w-8 mb-3 text-primary" />
                  <h4 className="font-semibold">Existing Contacts</h4>
                  <p className="text-sm text-muted-foreground">Select from saved contacts</p>
                </Card>
                <Card className="p-6 cursor-pointer hover:shadow-md border-2 hover:border-primary" onClick={() => setShowCsvUploader(true)}>
                  <Upload className="h-8 w-8 mb-3 text-primary" />
                  <h4 className="font-semibold">Upload CSV</h4>
                  <p className="text-sm text-muted-foreground">Import from file</p>
                </Card>
              </div>
              {contacts.length > 0 && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-green-800">{contacts.length} contacts selected</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {contacts.map((contact, index) => (
                      <div key={contact.id} className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm">{contact.phone}</span>
                        <Button variant="ghost" size="sm" onClick={() => setContacts(contacts.filter((_, i) => i !== index))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Create Message</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name *</label>
                  <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g., Summer Sale 2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Use Template (Optional)</label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {template.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No templates found. <button onClick={() => navigate('/whatsapp/templates')} className="text-primary underline">Create one</button>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message Template *</label>
                  <Textarea 
                    value={messageTemplate} 
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Use {{phone}}, {{name}} for dynamic fields&#10;&#10;Example: Hi {{name}}, check out our summer sale!"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use double curly braces for variables: {`{{name}}, {{phone}}`}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Media URL (Optional)</label>
                  <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Review & Send</h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div><strong>Campaign:</strong> {campaignName}</div>
                  <div><strong>Contacts:</strong> {contacts.length}</div>
                  <div><strong>Message Preview:</strong></div>
                  <div className="mt-2 p-3 bg-white rounded whitespace-pre-wrap">{messageTemplate}</div>
                  {mediaUrl && <div><strong>Media:</strong> {mediaUrl}</div>}
                </div>
                <Button onClick={handleLaunchCampaign} disabled={isLaunching} className="w-full" size="lg">
                  <Send className="h-4 w-4 mr-2" />
                  {isLaunching ? 'Creating Campaign...' : 'Create Campaign'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button 
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} 
          disabled={
            currentStep === steps.length - 1 || 
            (currentStep === 0 && contacts.length === 0) ||
            (currentStep === 1 && (!campaignName || !messageTemplate))
          }
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ExistingContactsModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        onSave={(selected) => { setContacts([...contacts, ...selected]); setShowContactsModal(false); }}
      />

      {showCsvUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload CSV</h2>
              <Button variant="ghost" onClick={() => setShowCsvUploader(false)}><X className="h-4 w-4" /></Button>
            </div>
            <CsvUploader onContactsUploaded={(uploaded) => { setContacts([...contacts, ...uploaded]); setShowCsvUploader(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
