import { supabase } from "@/integrations/supabase/client";
import { copyE2Object, deleteE2Object } from "@/lib/idrive-e2-api";

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

/** Build the E2 destination path for an album photo */
function buildAlbumE2Path(photoKey: string, albumName: string): string {
  // photoKey format: "MAGH EVENTS 2082/ClientName/Photos/EventName/Photographer/filename.jpg"
  // Target: "MAGH EVENTS 2082/ClientName/Albums/AlbumName/filename.jpg"
  const parts = photoKey.split('/');
  const filename = parts[parts.length - 1];
  // First two parts are month-folder and client name
  const monthFolder = parts[0] || '';
  const clientFolder = parts[1] || '';
  return `${monthFolder}/${clientFolder}/Albums/${albumName}/${filename}`;
}

export async function addToAlbum(
  registeredDateTimeAD: string,
  albumType: string,
  albumName: string,
  photoKey: string,
  photoUrl?: string
): Promise<boolean> {
  // DB save — fire and forget style, caller handles optimistic UI
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

  // Background E2 copy — fire and forget
  const destPath = buildAlbumE2Path(photoKey, albumName);
  copyE2Object(photoKey, destPath).catch(err => {
    console.error('Background E2 copy failed:', err);
  });

  return true;
}

export async function removeFromAlbum(
  registeredDateTimeAD: string,
  albumType: string,
  photoKey: string,
  albumName?: string
): Promise<boolean> {
  // Get album name if not provided (needed for E2 path)
  let resolvedAlbumName = albumName;
  if (!resolvedAlbumName) {
    const { data } = await supabase
      .from('client_album_selections')
      .select('album_name')
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .eq('album_type', albumType)
      .eq('photo_key', photoKey)
      .maybeSingle();
    resolvedAlbumName = data?.album_name || '';
  }

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

  // Background E2 delete — fire and forget
  if (resolvedAlbumName) {
    const destPath = buildAlbumE2Path(photoKey, resolvedAlbumName);
    deleteE2Object(destPath).catch(err => {
      console.error('Background E2 delete failed:', err);
    });
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
