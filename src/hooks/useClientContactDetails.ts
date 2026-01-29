import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ClientContactDetails, emptyContactDetails } from '@/lib/client-contact-api';

export function useClientContactDetails(registeredDateTimeAD: string | undefined) {
  const [data, setData] = useState<ClientContactDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    fetchContactDetails();
  }, [fetchContactDetails]);

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

      // Refresh data after update
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

  return {
    data,
    isLoading,
    error,
    refetch: fetchContactDetails,
    updateContactDetails,
  };
}
