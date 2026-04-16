/**
 * Shared helpers for wedding side-timing feature.
 * When event name contains "WEDDING", separate bride/groom timings are shown.
 */

export function isWeddingEvent(eventName: string): boolean {
  return (eventName || '').toUpperCase().includes('WEDDING');
}

export type TimingSide = 'bride' | 'groom' | 'both';

/**
 * Map a freelancer assignment role key to the timing side they should see.
 * PB/VB → bride, PG/VG → groom, everything else → both.
 */
export function getFreelancerTimingSide(roleKey: string): TimingSide {
  const brideRoles = ['photographer_bride', 'videographer_bride'];
  const groomRoles = ['photographer_groom', 'videographer_groom'];
  if (brideRoles.includes(roleKey)) return 'bride';
  if (groomRoles.includes(roleKey)) return 'groom';
  return 'both';
}

/**
 * Determine which role key a freelancer has in an assignment row.
 */
export function getFreelancerRoleKey(freelancerName: string, assignment: Record<string, any>): string {
  const roleKeys = [
    'photographer_bride', 'photographer_groom',
    'videographer_bride', 'videographer_groom',
    'extra_photographer', 'extra_videographer',
    'assistant', 'iphone_shooter', 'drone_operator', 'fpv_operator',
  ];
  const lowerName = (freelancerName || '').toLowerCase().trim();
  for (const key of roleKeys) {
    if ((assignment[key] || '').toLowerCase().trim() === lowerName) {
      return key;
    }
  }
  return '';
}
