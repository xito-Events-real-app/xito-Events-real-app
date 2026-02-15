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
