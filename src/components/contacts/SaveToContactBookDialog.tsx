import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderPlus } from 'lucide-react';

interface SaveToContactBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  sourceType: 'lead' | 'customer' | 'owner';
  sourceId?: string;
}

interface Folder {
  id: string;
  name: string;
}

export function SaveToContactBookDialog({
  open,
  onOpenChange,
  contactName,
  contactPhone,
  contactEmail,
  sourceType,
  sourceId,
}: SaveToContactBookDialogProps) {
  const { profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFolders();
      setSelectedFolderId('');
      setNotes('');
    }
  }, [open]);

  const fetchFolders = async () => {
    const { data } = await supabase
      .from('contact_folders')
      .select('id, name')
      .order('name');
    if (data) setFolders(data);
  };

  const handleSave = async () => {
    if (!selectedFolderId || !profile?.branch_id) return;
    setSaving(true);

    const { error } = await supabase.from('contact_entries').insert({
      folder_id: selectedFolderId,
      name: contactName,
      phone: contactPhone || null,
      email: contactEmail || null,
      notes: notes.trim() || null,
      source_type: sourceType,
      source_id: sourceId || null,
      branch_id: profile.branch_id,
      workspace_id: activeWorkspace?.id || null,
      created_by: profile.user_id,
    });

    setSaving(false);

    if (error) {
      toast({ title: 'Failed to save contact', variant: 'destructive' });
    } else {
      toast({ title: 'Contact saved to folder!' });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Save to Contact Book
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium text-foreground">{contactName}</p>
            {contactPhone && <p className="text-muted-foreground text-xs">{contactPhone}</p>}
            {contactEmail && <p className="text-muted-foreground text-xs">{contactEmail}</p>}
          </div>

          <div className="space-y-2">
            <Label>Select Folder *</Label>
            {folders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No folders yet. Create one in the Contact Book page first.</p>
            ) : (
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folder..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this contact..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!selectedFolderId || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
