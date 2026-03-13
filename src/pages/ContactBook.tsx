import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  FolderOpen,
  Phone,
  Mail,
  Trash2,
  Edit2,
  ChevronLeft,
  BookUser,
  FolderPlus,
  User,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface ContactFolder {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  _count?: number;
}

interface ContactEntry {
  id: string;
  folder_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  source_type: string | null;
  created_at: string;
}

export default function ContactBook() {
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [folders, setFolders] = useState<ContactFolder[]>([]);
  const [entries, setEntries] = useState<ContactEntry[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ContactFolder | null>(null);
  const [search, setSearch] = useState('');

  // Folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ContactFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');

  // Contact dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  useEffect(() => {
    if (isAdmin) fetchFolders();
  }, [activeWorkspace?.id, isAdmin]);

  useEffect(() => {
    if (selectedFolder) fetchEntries(selectedFolder.id);
  }, [selectedFolder]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const fetchFolders = async () => {
    const { data: foldersData } = await supabase
      .from('contact_folders')
      .select('*')
      .order('created_at', { ascending: true });

    if (foldersData) {
      // Get counts
      const { data: entriesData } = await supabase
        .from('contact_entries')
        .select('folder_id');

      const countMap: Record<string, number> = {};
      entriesData?.forEach(e => {
        countMap[e.folder_id] = (countMap[e.folder_id] || 0) + 1;
      });

      setFolders(foldersData.map(f => ({ ...f, _count: countMap[f.id] || 0 })));
    }
  };

  const fetchEntries = async (folderId: string) => {
    const { data } = await supabase
      .from('contact_entries')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    if (data) setEntries(data as ContactEntry[]);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim() || !activeWorkspace?.id) return;

    if (editingFolder) {
      await supabase.from('contact_folders').update({
        name: folderName.trim(),
        description: folderDesc.trim() || null,
      }).eq('id', editingFolder.id);
      toast({ title: 'Folder updated' });
    } else {
      await supabase.from('contact_folders').insert({
        name: folderName.trim(),
        description: folderDesc.trim() || null,
        workspace_id: activeWorkspace.id,
        created_by: profile?.user_id || '',
      });
      toast({ title: 'Folder created' });
    }

    setFolderDialogOpen(false);
    setEditingFolder(null);
    setFolderName('');
    setFolderDesc('');
    fetchFolders();
  };

  const handleDeleteFolder = async (folderId: string) => {
    await supabase.from('contact_folders').delete().eq('id', folderId);
    if (selectedFolder?.id === folderId) {
      setSelectedFolder(null);
      setEntries([]);
    }
    toast({ title: 'Folder deleted' });
    fetchFolders();
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !selectedFolder || !profile?.branch_id) return;

    await supabase.from('contact_entries').insert({
      folder_id: selectedFolder.id,
      name: contactName.trim(),
      phone: contactPhone.trim() || null,
      email: contactEmail.trim() || null,
      notes: contactNotes.trim() || null,
      source_type: 'manual',
      branch_id: profile.branch_id,
      workspace_id: activeWorkspace?.id || null,
      created_by: profile.user_id,
    });

    toast({ title: 'Contact added' });
    setContactDialogOpen(false);
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactNotes('');
    fetchEntries(selectedFolder.id);
    fetchFolders();
  };

  const handleDeleteEntry = async (entryId: string) => {
    await supabase.from('contact_entries').delete().eq('id', entryId);
    if (selectedFolder) fetchEntries(selectedFolder.id);
    fetchFolders();
    toast({ title: 'Contact removed' });
  };

  const filteredEntries = entries.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.phone && e.phone.includes(search)) ||
    (e.email && e.email.toLowerCase().includes(search.toLowerCase()))
  );

  const getSourceBadge = (type: string | null) => {
    switch (type) {
      case 'lead': return <Badge variant="outline" className="text-xs">Lead</Badge>;
      case 'customer': return <Badge variant="outline" className="text-xs">Customer</Badge>;
      case 'owner': return <Badge variant="outline" className="text-xs">Owner</Badge>;
      default: return <Badge variant="outline" className="text-xs">Manual</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookUser className="h-6 w-6" />
          Contact Book
        </h1>
        <Button onClick={() => { setEditingFolder(null); setFolderName(''); setFolderDesc(''); setFolderDialogOpen(true); }}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>

      {!selectedFolder ? (
        /* Folder Grid */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {folders.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No folders yet</p>
              <p className="text-sm">Create a folder to start organizing your contacts.</p>
            </div>
          ) : (
            folders.map(folder => (
              <Card
                key={folder.id}
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => setSelectedFolder(folder)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{folder.name}</p>
                        {folder.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{folder.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{folder._count || 0}</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolder(folder);
                        setFolderName(folder.name);
                        setFolderDesc(folder.description || '');
                        setFolderDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Folder Detail View */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedFolder(null); setSearch(''); }}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">{selectedFolder.name}</h2>
              {selectedFolder.description && (
                <p className="text-xs text-muted-foreground">{selectedFolder.description}</p>
              )}
            </div>
            <Button size="sm" onClick={() => { setContactName(''); setContactPhone(''); setContactEmail(''); setContactNotes(''); setContactDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Contact
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-2 flex-1 overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No contacts in this folder.</p>
              </div>
            ) : (
              filteredEntries.map(entry => (
                <Card key={entry.id} className="group">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {entry.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground truncate">{entry.name}</p>
                          {getSourceBadge(entry.source_type)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {entry.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {entry.phone}
                            </span>
                          )}
                          {entry.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {entry.email}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{entry.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleDeleteEntry(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Edit Folder' : 'New Folder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. VIP Contacts, Vendors..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={folderDesc}
                onChange={(e) => setFolderDesc(e.target.value)}
                placeholder="What is this folder for?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
              {editingFolder ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91..." />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} placeholder="Any notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveContact} disabled={!contactName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
