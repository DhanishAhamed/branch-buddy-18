import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Building2, Tag, MessageCircle, Trash2, Save } from 'lucide-react';
import { PipelineSettings } from '@/components/settings/PipelineSettings';

interface Branch { id: string; name: string; city: string; }
interface PropertyType { id: string; name: string; portal_type: string; }
interface WhatsAppTemplate { id: string; name: string; template: string; branch_id: string | null; }
interface WhatsAppConfig { 
  id: string; 
  branch_id: string | null; 
  api_key: string | null;
  phone_number: string | null;
  business_name: string | null;
  is_enabled: boolean;
}

export default function AdminSettings() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [newBranch, setNewBranch] = useState({ name: '', city: '' });
  const [newType, setNewType] = useState<{ name: string; portal_type: 'commercial' | 'residential' | 'rentals' }>({ name: '', portal_type: 'residential' });
  const [newTemplate, setNewTemplate] = useState({ name: '', template: '', branch_id: '' });
  const [configForm, setConfigForm] = useState({ api_key: '', phone_number: '', business_name: '', is_enabled: false });
  const { toast } = useToast();

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    const [b, t, templates, config] = await Promise.all([
      supabase.from('branches').select('*'),
      supabase.from('property_types').select('*'),
      supabase.from('whatsapp_templates').select('*'),
      supabase.from('whatsapp_config').select('*').limit(1).maybeSingle(),
    ]);
    if (b.data) setBranches(b.data);
    if (t.data) setPropertyTypes(t.data);
    if (templates.data) setWhatsappTemplates(templates.data);
    if (config.data) {
      setWhatsappConfig(config.data);
      setConfigForm({
        api_key: config.data.api_key || '',
        phone_number: config.data.phone_number || '',
        business_name: config.data.business_name || '',
        is_enabled: config.data.is_enabled,
      });
    }
  };

  const addBranch = async () => {
    if (!newBranch.name || !newBranch.city) return;
    await supabase.from('branches').insert([newBranch]);
    toast({ title: 'Branch added' });
    setNewBranch({ name: '', city: '' });
    fetchData();
  };

  const deleteBranch = async (id: string) => {
    await supabase.from('branches').delete().eq('id', id);
    toast({ title: 'Branch deleted' });
    fetchData();
  };

  const addType = async () => {
    if (!newType.name) return;
    await supabase.from('property_types').insert([newType]);
    toast({ title: 'Property type added' });
    setNewType({ name: '', portal_type: 'residential' });
    fetchData();
  };

  const deleteType = async (id: string) => {
    await supabase.from('property_types').delete().eq('id', id);
    toast({ title: 'Property type deleted' });
    fetchData();
  };

  const addTemplate = async () => {
    if (!newTemplate.name || !newTemplate.template) return;
    await supabase.from('whatsapp_templates').insert([{
      name: newTemplate.name,
      template: newTemplate.template,
      branch_id: newTemplate.branch_id || null,
    }]);
    toast({ title: 'Template added' });
    setNewTemplate({ name: '', template: '', branch_id: '' });
    fetchData();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from('whatsapp_templates').delete().eq('id', id);
    toast({ title: 'Template deleted' });
    fetchData();
  };

  const saveWhatsAppConfig = async () => {
    if (whatsappConfig) {
      await supabase.from('whatsapp_config').update({
        api_key: configForm.api_key || null,
        phone_number: configForm.phone_number || null,
        business_name: configForm.business_name || null,
        is_enabled: configForm.is_enabled,
      }).eq('id', whatsappConfig.id);
    } else {
      await supabase.from('whatsapp_config').insert([{
        api_key: configForm.api_key || null,
        phone_number: configForm.phone_number || null,
        business_name: configForm.business_name || null,
        is_enabled: configForm.is_enabled,
      }]);
    }
    toast({ title: 'WhatsApp configuration saved' });
    fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        Settings
      </h1>

      {/* Pipeline Settings */}
      <PipelineSettings />

      {/* Branches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branches / Cities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Branch Name" 
              value={newBranch.name} 
              onChange={(e) => setNewBranch(p => ({ ...p, name: e.target.value }))} 
            />
            <Input 
              placeholder="City" 
              value={newBranch.city} 
              onChange={(e) => setNewBranch(p => ({ ...p, city: e.target.value }))} 
            />
            <Button onClick={addBranch}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{b.name} - {b.city}</span>
                <Button variant="ghost" size="icon" onClick={() => deleteBranch(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Property Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Property Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Type name" 
              value={newType.name} 
              onChange={(e) => setNewType(p => ({ ...p, name: e.target.value }))} 
              className="flex-1"
            />
            <Select 
              value={newType.portal_type} 
              onValueChange={(val: 'commercial' | 'residential' | 'rentals') => setNewType(p => ({ ...p, portal_type: val }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="rentals">Rentals</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addType}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {propertyTypes.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({t.portal_type})</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteType(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input 
                placeholder="Your Business Name" 
                value={configForm.business_name} 
                onChange={(e) => setConfigForm(p => ({ ...p, business_name: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Phone Number</Label>
              <Input 
                placeholder="+91 98765 43210" 
                value={configForm.phone_number} 
                onChange={(e) => setConfigForm(p => ({ ...p, phone_number: e.target.value }))} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>API Key (for WhatsApp Business API)</Label>
            <Input 
              type="password"
              placeholder="Your API Key" 
              value={configForm.api_key} 
              onChange={(e) => setConfigForm(p => ({ ...p, api_key: e.target.value }))} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable WhatsApp Integration</Label>
              <p className="text-xs text-muted-foreground">Send messages via WhatsApp</p>
            </div>
            <Switch 
              checked={configForm.is_enabled} 
              onCheckedChange={(checked) => setConfigForm(p => ({ ...p, is_enabled: checked }))} 
            />
          </div>
          <Button onClick={saveWhatsAppConfig} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Template name" 
                value={newTemplate.name} 
                onChange={(e) => setNewTemplate(p => ({ ...p, name: e.target.value }))} 
              />
              <Select 
                value={newTemplate.branch_id || 'all'} 
                onValueChange={(val) => setNewTemplate(p => ({ ...p, branch_id: val === 'all' ? '' : val }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea 
              placeholder="Template message... Use {name}, {phone}, {property} as placeholders"
              value={newTemplate.template}
              onChange={(e) => setNewTemplate(p => ({ ...p, template: e.target.value }))}
              rows={3}
            />
            <Button onClick={addTemplate} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
          
          <div className="space-y-2">
            {whatsappTemplates.map((t) => (
              <div key={t.id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{t.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t.template}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
