import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ClientContactDetails, emptyContactDetails } from '@/lib/client-contact-api';

export function useClientContactDetails(registeredDateTimeAD: string | undefined, enabled = true) {
  const [data, setData] = useState<ClientContactDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContactDetails = useCallback(async () => {
    if (!registeredDateTimeAD) return;

    setIsLoading(true);
    setError(null);

    // Try Supabase cache first
    try {
      const { data: cached, error: cacheError } = await supabase
        .from('contact_details_cache')
        .select('*')
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .single();

      if (!cacheError && cached) {
        console.log('[useClientContactDetails] Loaded from cache');
        setData({
          rowNumber: cached.row_number || 0,
          registeredDateTimeAD: cached.registered_date_time_ad,
          registeredDateBS: cached.registered_date_bs || '',
          clientName: cached.client_name || '',
          brideFullName: cached.bride_full_name || '',
          brideContactNumber: cached.bride_contact_number || '',
          brideWhatsappNumber: cached.bride_whatsapp_number || '',
          brideBackupNumber: cached.bride_backup_number || '',
          brideBackupRelation: cached.bride_backup_relation || '',
          brideBackupNumber2: cached.bride_backup_number2 || '',
          brideBackupRelation2: cached.bride_backup_relation2 || '',
          brideInstagram: cached.bride_instagram || '',
          brideHomeCity: cached.bride_home_city || '',
          brideHomeArea: cached.bride_home_area || '',
          brideHomeMap: cached.bride_home_map || '',
          brideHomeLandmark: cached.bride_home_landmark || '',
          groomFullName: cached.groom_full_name || '',
          groomContactNumber: cached.groom_contact_number || '',
          groomWhatsappNumber: cached.groom_whatsapp_number || '',
          groomBackupNumber: cached.groom_backup_number || '',
          groomBackupRelation: cached.groom_backup_relation || '',
          groomBackupNumber2: cached.groom_backup_number2 || '',
          groomBackupRelation2: cached.groom_backup_relation2 || '',
          groomInstagram: cached.groom_instagram || '',
          groomHomeCity: cached.groom_home_city || '',
          groomHomeArea: cached.groom_home_area || '',
          groomHomeMap: cached.groom_home_map || '',
          groomHomeLandmark: cached.groom_home_landmark || '',
          formSentDate: cached.form_sent_date || '',
        });
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[useClientContactDetails] Cache read failed, falling back to Sheets:', err);
    }

    // Fallback: original Google Sheets call
    try {
      const { data: result, error: fetchError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'getClientContactDetails',
          data: { registeredDateTimeAD }
        }
      });

      if (fetchError) throw new Error(fetchError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to fetch contact details');

      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contact details';
      setError(message);
      console.error('Error fetching contact details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [registeredDateTimeAD]);

  // Only fetch when enabled (lazy-load for contact tab)
  useEffect(() => {
    if (enabled) {
      fetchContactDetails();
    }
  }, [fetchContactDetails, enabled]);

  const updateContactDetails = useCallback(async (
    updates: Partial<Omit<ClientContactDetails, 'rowNumber' | 'registeredDateTimeAD' | 'registeredDateBS' | 'clientName'>>
  ): Promise<boolean> => {
    if (!registeredDateTimeAD) return false;

    try {
      const { data: result, error: updateError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'updateClientContactDetails',
          data: { 
            registeredDateTimeAD,
            updates
          }
        }
      });

      if (updateError) throw new Error(updateError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to update contact details');

      await fetchContactDetails();

      toast({
        title: "Saved",
        description: "Contact details updated successfully",
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update contact details';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error('Error updating contact details:', err);
      return false;
    }
  }, [registeredDateTimeAD, fetchContactDetails]);

  const resyncClient = useCallback(async (): Promise<boolean> => {
    if (!registeredDateTimeAD) return false;

    setIsResyncing(true);
    try {
      const { data: result, error: resyncError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'resyncClientContactDetails',
          data: { registeredDateTimeAD }
        }
      });

      if (resyncError) throw new Error(resyncError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to resync contact details');

      setData(result.data);

      toast({
        title: "Resynced",
        description: "Client data refreshed from booked clients",
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resync contact details';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error('Error resyncing contact details:', err);
      return false;
    } finally {
      setIsResyncing(false);
    }
  }, [registeredDateTimeAD]);

  const markFormAsSent = useCallback(async (): Promise<boolean> => {
    if (!registeredDateTimeAD) return false;
    
    try {
      const success = await updateContactDetails({ 
        formSentDate: new Date().toISOString() 
      });
      return success;
    } catch (err) {
      console.error('Error marking form as sent:', err);
      return false;
    }
  }, [registeredDateTimeAD, updateContactDetails]);

  return {
    data,
    isLoading,
    isResyncing,
    error,
    refetch: fetchContactDetails,
    updateContactDetails,
    resyncClient,
    markFormAsSent,
  };
}
