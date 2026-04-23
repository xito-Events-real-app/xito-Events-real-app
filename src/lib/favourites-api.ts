import { supabase } from "@/integrations/supabase/client";

export interface Favourite {
  id: string;
  registered_date_time_ad: string;
  photo_key: string;
  photo_url: string | null;
  created_at: string;
}

export async function getFavourites(registeredDateTimeAD: string): Promise<Favourite[]> {
  const { data, error } = await supabase
    .from('client_favourite_photos')
    .select('*')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading favourites:', error);
    return [];
  }
  return (data || []) as Favourite[];
}

export async function addFavourite(
  registeredDateTimeAD: string,
  photoKey: string,
  photoUrl?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('client_favourite_photos')
    .upsert(
      {
        registered_date_time_ad: registeredDateTimeAD,
        photo_key: photoKey,
        photo_url: photoUrl || '',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'registered_date_time_ad,photo_key' }
    );

  if (error) {
    console.error('Error adding favourite:', error);
    return false;
  }
  return true;
}

export async function removeFavourite(
  registeredDateTimeAD: string,
  photoKey: string
): Promise<boolean> {
  const { error } = await supabase
    .from('client_favourite_photos')
    .delete()
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .eq('photo_key', photoKey);

  if (error) {
    console.error('Error removing favourite:', error);
    return false;
  }
  return true;
}