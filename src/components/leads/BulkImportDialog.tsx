import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportLead {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; duplicates: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const downloadTemplate = () => {
    const templateData = [
      { name: 'John Doe', email: 'john@example.com', phone: '+919876543210', source: 'referral', notes: 'Interested in 3BHK' },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '+919876543211', source: 'portal', notes: 'Looking for commercial space' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 40 },
    ];

    XLSX.writeFile(workbook, 'leads_import_template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResults(null);
    }
  };

  const parseExcel = async (file: File): Promise<ImportLead[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ImportLead>(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file || !activeWorkspace?.id) return;

    setIsImporting(true);
    let successCount = 0;
    let failedCount = 0;
    const duplicateNames: string[] = [];

    try {
      const leads = await parseExcel(file);

      // Fetch existing leads to check for duplicates
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('name, email, phone');

      const existingKeys = new Set(
        (existingLeads || []).map(l => l.name?.trim().toLowerCase())
      );

      const newLeads: ImportLead[] = [];

      for (const lead of leads) {
        if (!lead.name) {
          failedCount++;
          continue;
        }
        const key = lead.name.trim().toLowerCase();
        if (existingKeys.has(key)) {
          duplicateNames.push(lead.name);
          continue;
        }
        newLeads.push(lead);
        existingKeys.add(key); // prevent duplicates within same file
      }

      // Insert non-duplicate leads
      for (const lead of newLeads) {
        const { error } = await supabase.from('leads').insert({
          name: lead.name,
          email: lead.email || null,
          phone: lead.phone || null,
          source: lead.source || 'import',
          notes: lead.notes || null,
          branch_id: profile.branch_id,
          workspace_id: activeWorkspace?.id || null,
        });

        if (error) {
          failedCount++;
        } else {
          successCount++;
        }
      }

      setImportResults({ success: successCount, failed: failedCount, duplicates: duplicateNames });

      if (successCount > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${successCount} leads${duplicateNames.length > 0 ? `, ${duplicateNames.length} duplicates skipped` : ''}${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse Excel file',
        variant: 'destructive',
      });
    }

    setIsImporting(false);
  };

  const resetDialog = () => {
    setFile(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetDialog();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import Leads
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              Download our Excel template to ensure your data is formatted correctly.
            </p>
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Upload File */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center gap-2 text-primary">
                  <FileSpreadsheet className="h-8 w-8" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload Excel file</span>
                  <span className="text-xs text-muted-foreground">.xlsx, .xls, or .csv</span>
                </>
              )}
            </label>
          </div>

          {/* Import Results */}
          {importResults && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              {importResults.success > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">{importResults.success} leads imported successfully</span>
                </div>
              )}
              {importResults.duplicates.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{importResults.duplicates.length} leads already exist in CRM (skipped)</span>
                  </div>
                  <div className="ml-6 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                    {importResults.duplicates.map((name, i) => (
                      <p key={i}>• {name}</p>
                    ))}
                  </div>
                </div>
              )}
              {importResults.failed > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{importResults.failed} leads failed to import</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isImporting}
              className="flex-1"
            >
              {isImporting ? 'Importing...' : 'Import Leads'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
