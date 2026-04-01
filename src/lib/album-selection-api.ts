import { supabase } from "@/integrations/supabase/client";

export interface AlbumSelection {
  id: string;
  registered_date_time_ad: string;
  album_type: string;
  album_name: string;
  photo_key: string;
  photo_url: string;
  selected_at: string;
}

export interface AlbumDef {
  type: string;
  name: string;
}

const MAX_ALBUM_PHOTOS = 140;

export async function getAlbumSelections(registeredDateTimeAD: string): Promise<AlbumSelection[]> {
  const { data, error } = await supabase
    .from('client_album_selections')
    .select('*')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .order('selected_at', { ascending: true });

  if (error) {
    console.error('Error loading album selections:', error);
    return [];
  }
  return (data || []) as AlbumSelection[];
}

export async function addToAlbum(
  registeredDateTimeAD: string,
  albumType: string,
  albumName: string,
  photoKey: string,
  photoUrl?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('client_album_selections')
    .upsert(
      {
        registered_date_time_ad: registeredDateTimeAD,
        album_type: albumType,
        album_name: albumName,
        photo_key: photoKey,
        photo_url: photoUrl || '',
        selected_at: new Date().toISOString(),
      },
      { onConflict: 'registered_date_time_ad,album_type,photo_key' }
    );

  if (error) {
    console.error('Error adding to album:', error);
    return false;
  }

  return true;
}

export async function removeFromAlbum(
  registeredDateTimeAD: string,
  albumType: string,
  photoKey: string,
  _albumName?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('client_album_selections')
    .delete()
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .eq('album_type', albumType)
    .eq('photo_key', photoKey);

  if (error) {
    console.error('Error removing from album:', error);
    return false;
  }

  return true;
}

export async function getAlbumDefsFromDeliverables(registeredDateTimeAD: string): Promise<AlbumDef[]> {
  const { data, error } = await supabase
    .from('client_deliverables')
    .select('deliverable_type, album_name')
    .eq('registered_date_time_ad', registeredDateTimeAD)
    .eq('section', 'album')
    .eq('enabled', true);

  if (error) {
    console.error('Error loading album deliverables:', error);
    return [];
  }

  return (data || []).map(d => ({
    type: d.deliverable_type,
    name: d.album_name || d.deliverable_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }));
}
