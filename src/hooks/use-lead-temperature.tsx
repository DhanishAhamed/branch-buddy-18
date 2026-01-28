import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type LeadTemperature = 'hot' | 'warm' | 'cold';

interface CallNoteCount {
  lead_id: string;
  count: number;
  last_interaction: string | null;
}

interface LeadSettings {
  show_temperature_indicator: boolean;
}

export function useLeadTemperature() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<LeadSettings>({ show_temperature_indicator: true });
  const [interactionCounts, setInteractionCounts] = useState<Map<string, CallNoteCount>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!profile?.branch_id) return;
    
    const { data } = await supabase
      .from('lead_settings')
      .select('show_temperature_indicator')
      .or(`branch_id.eq.${profile.branch_id},branch_id.is.null`)
      .order('branch_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSettings({ show_temperature_indicator: data.show_temperature_indicator });
    }
  }, [profile?.branch_id]);

  // Fetch interaction counts for all leads
  const fetchInteractionCounts = useCallback(async () => {
    setLoading(true);
    
    // Get call notes counts grouped by lead
    const { data: callNotes } = await supabase
      .from('call_notes')
      .select('lead_id, created_at')
      .order('created_at', { ascending: false });
    
    if (callNotes) {
      const countMap = new Map<string, CallNoteCount>();
      
      callNotes.forEach((note) => {
        const existing = countMap.get(note.lead_id);
        if (existing) {
          existing.count += 1;
        } else {
          countMap.set(note.lead_id, {
            lead_id: note.lead_id,
            count: 1,
            last_interaction: note.created_at,
          });
        }
      });
      
      setInteractionCounts(countMap);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchInteractionCounts();
  }, [fetchSettings, fetchInteractionCounts]);

  // Calculate temperature based on interaction frequency and recency
  const getLeadTemperature = useCallback((leadId: string, createdAt: string): LeadTemperature => {
    const interaction = interactionCounts.get(leadId);
    const now = new Date();
    const leadCreated = new Date(createdAt);
    const daysSinceCreation = Math.floor((now.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24));
    
    if (!interaction) {
      // No interactions yet - based on lead age
      if (daysSinceCreation <= 2) return 'hot'; // New lead, needs attention
      if (daysSinceCreation <= 7) return 'warm';
      return 'cold';
    }
    
    const lastInteraction = interaction.last_interaction ? new Date(interaction.last_interaction) : null;
    const daysSinceLastInteraction = lastInteraction 
      ? Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreation;
    
    // High interaction frequency + recent contact = HOT
    if (interaction.count >= 3 && daysSinceLastInteraction <= 3) return 'hot';
    
    // Moderate interaction or somewhat recent = WARM
    if (interaction.count >= 1 && daysSinceLastInteraction <= 7) return 'warm';
    if (interaction.count >= 2 && daysSinceLastInteraction <= 14) return 'warm';
    
    // Low engagement or stale = COLD
    return 'cold';
  }, [interactionCounts]);

  // Toggle settings
  const updateSettings = useCallback(async (showIndicator: boolean) => {
    if (!profile?.branch_id) return;
    
    const { data: existing } = await supabase
      .from('lead_settings')
      .select('id')
      .eq('branch_id', profile.branch_id)
      .maybeSingle();
    
    if (existing) {
      await supabase
        .from('lead_settings')
        .update({ show_temperature_indicator: showIndicator })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('lead_settings')
        .insert({ branch_id: profile.branch_id, show_temperature_indicator: showIndicator });
    }
    
    setSettings({ show_temperature_indicator: showIndicator });
  }, [profile?.branch_id]);

  return {
    settings,
    loading,
    getLeadTemperature,
    updateSettings,
    showTemperatureIndicator: settings.show_temperature_indicator,
    refetch: fetchInteractionCounts,
  };
}
