import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getClients, getDropdowns, fullResyncAllBookedClients, fullSyncEventDetails, fullSyncContactDetails, getBookedClients } from "@/lib/sheets-api";
import { setCachedData, notifyCacheUpdate, CACHE_SCHEMA_VERSION, setCachedBookedClients } from "@/lib/cache-manager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SyncPhase {
  id: 'tracker' | 'booked' | 'events' | 'vendors' | 'contacts';
  label: string;
  description: string;
}

const SYNC_PHASES: SyncPhase[] = [
  { id: 'tracker', label: 'Client Tracker', description: 'Fetching fresh client data...' },
  { id: 'booked', label: 'Booked Clients', description: 'Validating booked clients data...' },
  { id: 'events', label: 'Event Details', description: 'Updating event logistics...' },
  { id: 'vendors', label: 'Vendor Sync', description: 'Refreshing venue & parlour data...' },
  { id: 'contacts', label: 'Contact Details', description: 'Syncing client contact data...' },
];

export function MasterSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'countdown' | 'tracker' | 'booked' | 'events' | 'vendors' | 'contacts' | 'complete'>('countdown');
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [syncStats, setSyncStats] = useState({ clients: 0, synced: 0, events: 0, vendors: 0, contacts: 0 });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleMasterSync = async () => {
    setIsSyncing(true);
    setShowOverlay(true);
    setCurrentPhase('countdown');
    setProgress(0);
    setCountdown(3);
    setSyncStats({ clients: 0, synced: 0, events: 0, vendors: 0, contacts: 0 });
    setShowSuccess(false);
    
    // Countdown animation
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    try {
      // Phase 1: Client Tracker (0-25%)
      setCurrentPhase('tracker');
      setProgress(5);
      
      const [clients, dropdowns] = await Promise.all([
        getClients(2000),
        getDropdowns()
      ]);
      
      await setCachedData({
        clients,
        dropdowns,
        lastSyncedAt: Date.now(),
        version: CACHE_SCHEMA_VERSION
      });
      notifyCacheUpdate('all');
      
      setSyncStats(prev => ({ ...prev, clients: clients.length }));
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Phase 2: Booked Clients (26-50%)
      setCurrentPhase('booked');
      setProgress(30);
      
      const bookedResult = await fullResyncAllBookedClients(true);
      
      // Refresh booked clients cache after sync
      setProgress(40);
      const freshBookedClients = await getBookedClients(500);
      await setCachedBookedClients(freshBookedClients);
      notifyCacheUpdate('booked-clients', freshBookedClients);
      
      setSyncStats(prev => ({ ...prev, synced: bookedResult.syncedCount + bookedResult.copiedCount }));
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Phase 3: Event Details (51-75%)
      setCurrentPhase('events');
      setProgress(55);
      
      const eventsResult = await fullSyncEventDetails();
      
      setSyncStats(prev => ({ ...prev, events: eventsResult.copiedCount + eventsResult.updatedCount }));
      setProgress(75);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Phase 4: Vendor Sync (76-88%)
      setCurrentPhase('vendors');
      setProgress(76);
      
      // Get all booked clients and refresh their vendor data
      const { data: bookedClientsData } = await supabase.functions.invoke('google-sheets', {
        body: { action: 'getBookedClients', limit: 500 }
      });
      
      let vendorUpdatesCount = 0;
      const bookedClients = bookedClientsData?.data || [];
      
      // Refresh vendor data for each booked client (in batches to avoid rate limits)
      for (let i = 0; i < bookedClients.length; i++) {
        const client = bookedClients[i];
        if (!client.registeredDateTimeAD) continue;
        
        try {
          const { data: refreshResult } = await supabase.functions.invoke('google-sheets', {
            body: {
              action: 'refreshClientVendorData',
              data: { registeredDateTimeAD: client.registeredDateTimeAD }
            }
          });
          
          if (refreshResult?.data?.eventsUpdated > 0) {
            vendorUpdatesCount += refreshResult.data.eventsUpdated;
          }
        } catch (err) {
          console.warn(`Failed to refresh vendor data for ${client.clientName}:`, err);
        }
        
        // Update progress incrementally
        const progressIncrement = (88 - 76) * ((i + 1) / bookedClients.length);
        setProgress(76 + progressIncrement);
      }
      
      setSyncStats(prev => ({ ...prev, vendors: vendorUpdatesCount }));
      setProgress(88);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Phase 5: Contact Details Sync (89-100%)
      setCurrentPhase('contacts');
      setProgress(89);
      
      const contactsResult = await fullSyncContactDetails();
      
      setSyncStats(prev => ({ ...prev, contacts: contactsResult.copiedCount + contactsResult.updatedCount }));
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Success!
      setCurrentPhase('complete');
      setShowSuccess(true);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success("Master Sync Complete!", {
        description: `${syncStats.clients} clients • ${syncStats.synced} synced • ${syncStats.events} events • ${vendorUpdatesCount} vendor updates • ${contactsResult.copiedCount + contactsResult.updatedCount} contacts`,
      });
      
    } catch (error) {
      console.error("Master sync failed:", error);
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setShowOverlay(false);
      setIsSyncing(false);
      setProgress(0);
      setCurrentPhase('countdown');
    }
  };

  const getCurrentPhaseInfo = () => {
    return SYNC_PHASES.find(p => p.id === currentPhase) || SYNC_PHASES[0];
  };

  return (
    <>
      <Button
        onClick={handleMasterSync}
        disabled={isSyncing}
        className={cn(
          "h-9 w-full rounded-full font-semibold gap-1 px-2 transition-all text-[11px]",
          "bg-gradient-to-r from-orange-500 via-red-500 to-purple-600",
          "hover:from-orange-600 hover:via-red-600 hover:to-purple-700",
          "shadow-md shadow-orange-500/25",
          "hover:shadow-lg hover:shadow-orange-500/40",
          "hover:scale-[1.02] active:scale-[0.98]",
          "text-white border-0"
        )}
      >
        <Rocket className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Sync</span>
      </Button>

      {/* Full Screen Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a1a] overflow-hidden">
          {/* Starfield Background */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white animate-pulse"
                style={{
                  width: Math.random() * 3 + 1 + 'px',
                  height: Math.random() * 3 + 1 + 'px',
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                  opacity: Math.random() * 0.8 + 0.2,
                  animationDelay: Math.random() * 2 + 's',
                  animationDuration: Math.random() * 2 + 1 + 's',
                }}
              />
            ))}
          </div>

          {/* Warp Speed Lines (on complete) */}
          {showSuccess && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={`warp-${i}`}
                  className="absolute h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[warpSpeed_0.5s_ease-out_forwards]"
                  style={{
                    width: Math.random() * 300 + 100 + 'px',
                    left: '50%',
                    top: '50%',
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animationDelay: Math.random() * 0.3 + 's',
                    opacity: 0,
                  }}
                />
              ))}
            </div>
          )}

          {/* Content Container */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
            
            {/* Countdown Phase */}
            {currentPhase === 'countdown' && (
              <div className="text-center animate-pulse">
                <div className="text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.5)]">
                  {countdown}
                </div>
                <p className="text-xl text-cyan-300 mt-4 uppercase tracking-widest">
                  Initiating Sync Sequence
                </p>
              </div>
            )}

            {/* Syncing Phases */}
            {(currentPhase === 'tracker' || currentPhase === 'booked' || currentPhase === 'events' || currentPhase === 'vendors' || currentPhase === 'contacts') && (
              <>
                {/* Rocket with Flames */}
                <div className="relative mb-12 animate-bounce" style={{ animationDuration: '2s' }}>
                  {/* Exhaust Flames */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-6 h-12 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full blur-sm animate-pulse" />
                    <div className="w-4 h-8 bg-gradient-to-t from-red-500 via-orange-400 to-transparent rounded-full blur-sm animate-pulse -mt-4" />
                  </div>
                  
                  {/* Rocket Icon */}
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_60px_rgba(249,115,22,0.6)]">
                    <Rocket className="w-12 h-12 text-white transform -rotate-45" />
                  </div>
                </div>

                {/* Phase Info */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {getCurrentPhaseInfo().label}
                  </h2>
                  <p className="text-lg text-cyan-300">
                    {getCurrentPhaseInfo().description}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-md">
                  <Progress 
                    value={progress} 
                    className="h-4 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-cyan-400 [&>div]:to-purple-500 [&>div]:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                  />
                  <div className="flex justify-between mt-3">
                    <span className="text-cyan-400 font-medium">{Math.round(progress)}%</span>
                    <span className="text-gray-400 text-sm">
                      Phase {currentPhase === 'tracker' ? 1 : currentPhase === 'booked' ? 2 : currentPhase === 'events' ? 3 : currentPhase === 'vendors' ? 4 : 5} of 5
                    </span>
                  </div>
                </div>

                {/* Phase Indicators */}
                <div className="flex gap-4 mt-8">
                  {SYNC_PHASES.map((phase, index) => {
                    const phaseIndex = SYNC_PHASES.findIndex(p => p.id === currentPhase);
                    const isComplete = index < phaseIndex;
                    const isCurrent = phase.id === currentPhase;
                    
                    return (
                      <div
                        key={phase.id}
                        className={cn(
                          "w-3 h-3 rounded-full transition-all",
                          isComplete && "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]",
                          isCurrent && "bg-cyan-400 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.8)]",
                          !isComplete && !isCurrent && "bg-gray-600"
                        )}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* Success Phase */}
            {currentPhase === 'complete' && showSuccess && (
              <div className="text-center animate-scale-in">
                {/* Success Icon */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(74,222,128,0.6)] animate-pulse">
                  <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h2 className="text-4xl font-black text-white mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  SYNC COMPLETE
                </h2>
                
                {/* Stats */}
                <div className="flex gap-6 justify-center mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400">{syncStats.clients}</div>
                    <div className="text-sm text-gray-400">Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">{syncStats.synced}</div>
                    <div className="text-sm text-gray-400">Synced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{syncStats.events}</div>
                    <div className="text-sm text-gray-400">Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-400">{syncStats.vendors}</div>
                    <div className="text-sm text-gray-400">Vendors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-violet-400">{syncStats.contacts}</div>
                    <div className="text-sm text-gray-400">Contacts</div>
                  </div>
                </div>
                
                <p className="text-lg text-cyan-300">
                  All systems synchronized successfully
                </p>
              </div>
            )}
          </div>

          {/* Scan Lines Effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            }}
          />
        </div>
      )}

      {/* Custom Animation Styles */}
      <style>{`
        @keyframes warpSpeed {
          0% {
            opacity: 0;
            transform: translateX(-50%) scaleX(0);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(200px) scaleX(2);
          }
        }
        
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
}
