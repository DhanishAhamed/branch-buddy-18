import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Building2, Tag } from 'lucide-react';

interface Branch { id: string; name: string; city: string; }
interface PropertyType { id: string; name: string; portal_type: string; }

export default function AdminSettings() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [newBranch, setNewBranch] = useState({ name: '', city: '' });
  const [newType, setNewType] = useState<{ name: string; portal_type: 'commercial' | 'residential' | 'rentals' }>({ name: '', portal_type: 'residential' });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [b, t] = await Promise.all([
      supabase.from('branches').select('*'),
      supabase.from('property_types').select('*'),
    ]);
    if (b.data) setBranches(b.data);
    if (t.data) setPropertyTypes(t.data);
  };

  const addBranch = async () => {
    if (!newBranch.name || !newBranch.city) return;
    await supabase.from('branches').insert([newBranch]);
    toast({ title: 'Branch added' });
    setNewBranch({ name: '', city: '' });
    fetchData();
  };

  const addType = async () => {
    if (!newType.name) return;
    await supabase.from('property_types').insert([newType]);
    toast({ title: 'Property type added' });
    setNewType({ name: '', portal_type: 'residential' });
    fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        Settings
      </h1>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Branches</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Name" value={newBranch.name} onChange={(e) => setNewBranch(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder="City" value={newBranch.city} onChange={(e) => setNewBranch(p => ({ ...p, city: e.target.value }))} />
            <Button onClick={addBranch}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => <span key={b.id} className="px-3 py-1 bg-muted rounded-full text-sm">{b.name} ({b.city})</span>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Property Types</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Type name" value={newType.name} onChange={(e) => setNewType(p => ({ ...p, name: e.target.value }))} />
            <Button onClick={addType}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {propertyTypes.map((t) => <span key={t.id} className="px-3 py-1 bg-muted rounded-full text-sm">{t.name}</span>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
