import { useState, useEffect, useMemo } from "react";
import { BookOpen, Image as ImageIcon, Loader2, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadDeliverables, DeliverableRow } from "@/lib/deliverables-api";
import { listE2Folder, getE2FileUrls, E2File } from "@/lib/idrive-e2-api";
import { FreelancerAssignment } from "@/lib/freelancer-assignment-api";
import { cn } from "@/lib/utils";
import XitoImageViewer from "./XitoImageViewer";

interface AlbumSectionProps {
  registeredDateTimeAD: string;
  clientName: string;
  eventYear?: string;
  eventMonth?: string;
  assignments: FreelancerAssignment[];
}

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp", ".heic"];
const isImage = (key: string) => IMAGE_EXTS.some((e) => key.toLowerCase().endsWith(e));

interface TabDef {
  id: string;
  label: string;
  eventName: string;
  photographerName: string;
  s3Prefix: string;
}

const AlbumSection = ({ registeredDateTimeAD, clientName, eventYear, eventMonth, assignments }: AlbumSectionProps) => {
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [deliverablesLoaded, setDeliverablesLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [photos, setPhotos] = useState<E2File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Load deliverables
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    loadDeliverables(registeredDateTimeAD).then((d) => {
      setDeliverables(d);
      setDeliverablesLoaded(true);
    });
  }, [registeredDateTimeAD]);

  // Album summary from deliverables
  const albumSummary = useMemo(() => {
    const albumRows = deliverables.filter(
      (d) => d.section === "album" && d.enabled
    );
    const sides: string[] = [];
    const types: string[] = [];
    albumRows.forEach((r) => {
      if (r.deliverable_type === "bride_album") sides.push("Bride Side");
      if (r.deliverable_type === "groom_album") sides.push("Groom Side");
      if (r.deliverable_type === "other_album") sides.push("Other");
      if (r.album_name) types.push(r.album_name);
    });
    return { count: albumRows.length, sides, types };
  }, [deliverables]);

  // Build tabs from assignments
  const tabs: TabDef[] = useMemo(() => {
    if (!eventYear || !eventMonth) return [];
    const yearMonth = `${eventYear}-${String(parseInt(eventMonth)).padStart(2, "0")}`;
    const result: TabDef[] = [];

    assignments.forEach((a) => {
      const photographers: { name: string; role: string }[] = [];
      if (a.photographerBride) photographers.push({ name: a.photographerBride, role: "PB" });
      if (a.photographerGroom) photographers.push({ name: a.photographerGroom, role: "PG" });
      if (a.extraPhotographer) photographers.push({ name: a.extraPhotographer, role: "EP" });

      photographers.forEach((p) => {
        const tabId = `${a.event}-${p.name}`;
        const prefix = `${yearMonth}/${clientName}/Photos/${a.event}/${p.name}/`;
        result.push({
          id: tabId,
          label: photographers.length > 1 ? `${a.event} (${p.name})` : a.event,
          eventName: a.event,
          photographerName: p.name,
          s3Prefix: prefix,
        });
      });
    });
    return result;
  }, [assignments, eventYear, eventMonth, clientName]);

  // Auto-select first tab
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) setActiveTab(tabs[0].id);
  }, [tabs, activeTab]);

  // Load photos when tab changes
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return;
    setIsLoadingPhotos(true);
    setPhotos([]);
    setPhotoUrls({});

    listE2Folder(tab.s3Prefix)
      .then(async (result) => {
        const imageFiles = result.files.filter((f) => isImage(f.key));
        setPhotos(imageFiles);
        if (imageFiles.length > 0) {
          const urls = await getE2FileUrls(imageFiles.map((f) => f.key));
          setPhotoUrls(urls);
        }
      })
      .catch((err) => console.error("Failed to load album photos:", err))
      .finally(() => setIsLoadingPhotos(false));
  }, [activeTab, tabs]);

  // Viewer data
  const viewerImages = useMemo(
    () => photos.map((p) => ({ key: p.key, url: photoUrls[p.key] || "" })).filter((i) => i.url),
    [photos, photoUrls]
  );

  return (
    <div className="space-y-4">
      {/* Album Summary Header */}
      <Card className="bg-[hsl(220,25%,12%)] border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Album Overview</h3>
              {deliverablesLoaded && (
                <p className="text-sm text-white/50">
                  {albumSummary.count === 0
                    ? "No albums configured in deliverables"
                    : `Total Albums: ${albumSummary.count}`}
                </p>
              )}
            </div>
          </div>

          {albumSummary.count > 0 && (
            <div className="flex flex-wrap gap-2">
              {albumSummary.sides.map((s) => (
                <Badge key={s} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  {s} Album
                </Badge>
              ))}
              {albumSummary.types.map((t, i) => (
                <Badge key={i} variant="outline" className="border-white/20 text-white/70">
                  Type: {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event / Photographer Tabs */}
      {tabs.length === 0 ? (
        <Card className="bg-[hsl(220,25%,12%)] border-white/10">
          <CardContent className="p-8 text-center text-white/40">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No photographer assignments found for this client.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-[hsl(220,25%,10%)] p-1.5">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-white text-white/60"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-3">
              {isLoadingPhotos ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-white/50">Loading photos...</span>
                </div>
              ) : photos.length === 0 ? (
                <Card className="bg-[hsl(220,25%,12%)] border-white/10">
                  <CardContent className="p-8 text-center text-white/40">
                    <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No photos found in this folder yet.</p>
                    <p className="text-xs mt-1 text-white/30">{tab.s3Prefix}</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/50">{photos.length} photos</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                    {photos.map((file, idx) => {
                      const url = photoUrls[file.key];
                      return (
                        <button
                          key={file.key}
                          onClick={() => url && setViewerIndex(idx)}
                          className={cn(
                            "aspect-square rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-primary/50 transition-all relative group cursor-pointer"
                          )}
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={file.key.split("/").pop() || ""}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* XITO IMAGE VIEWER */}
      {viewerIndex !== null && viewerImages.length > 0 && (
        <XitoImageViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};

export default AlbumSection;
