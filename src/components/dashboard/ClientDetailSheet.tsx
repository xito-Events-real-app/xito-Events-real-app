import { useState } from "react";
import { ClientData } from "@/lib/sheets-api";
import { getHandlerInitials, parseEventDetails, formatLocationDisplay, NEPALI_MONTHS } from "@/lib/nepali-months";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageCircle, MapPin, Calendar, User, FileText, Clock, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientDetailSheetProps {
  client: ClientData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedClient: ClientData) => void;
}

export function ClientDetailSheet({ client, isOpen, onClose, onSave }: ClientDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<ClientData | null>(null);

  if (!client) return null;

  const initials = getHandlerInitials(client.whoAdded || '');
  const events = parseEventDetails(
    client.events || '',
    client.eventYear || '',
    client.eventMonth || '',
    client.eventDay || ''
  );
  const location = formatLocationDisplay(client.eventLocation || '', client.eventCity || '');

  const handleEdit = () => {
    setEditedClient({ ...client });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedClient(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (editedClient && onSave) {
      onSave(editedClient);
    }
    setIsEditing(false);
  };

  const updateField = (field: keyof ClientData, value: string) => {
    if (editedClient) {
      setEditedClient({ ...editedClient, [field]: value });
    }
  };

  // Format phone number for tel: link
  const formatPhoneLink = (phone: string) => {
    return `tel:${phone.replace(/\s+/g, '')}`;
  };

  // Format WhatsApp link
  const formatWhatsAppLink = (phone: string) => {
    const cleanNumber = phone.replace(/\s+/g, '').replace(/^\+/, '');
    return `https://wa.me/${cleanNumber}`;
  };

  // Parse date for display
  const formatDate = (dateAD?: string, dateBS?: string) => {
    if (dateBS && dateAD) {
      return `${dateBS} (${dateAD})`;
    }
    return dateAD || dateBS || 'Not set';
  };

  const currentData = isEditing ? editedClient : client;
  if (!currentData) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Client Details</SheetTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="icon" onClick={handleCancel}>
                    <X className="w-5 h-5" />
                  </Button>
                  <Button variant="default" size="icon" onClick={handleSave}>
                    <Check className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="icon" onClick={handleEdit}>
                  <Pencil className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 pb-10">
          {/* Client Header */}
          <div className="flex items-start gap-4 pt-2">
            <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={currentData.clientName}
                  onChange={(e) => updateField('clientName', e.target.value)}
                  className="text-xl font-bold"
                />
              ) : (
                <h2 className="text-xl font-bold text-foreground">{currentData.clientName}</h2>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Added by {currentData.whoAdded || 'Unknown'}
              </p>
            </div>
            {/* Location Badge */}
            {location && (
              <div className="text-right shrink-0">
                <span className={cn(
                  "text-sm font-semibold px-3 py-1.5 rounded-lg",
                  location.type === 'IV' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  location.type === 'OV' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  location.type === 'MX' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                  location.type === 'AB' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                )}>
                  {location.type}
                </span>
                {location.city && (
                  <p className="text-xs text-muted-foreground mt-1">{location.city}</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Contact Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact
            </h3>
            
            <div className="grid gap-3">
              {/* Phone Number */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  {isEditing ? (
                    <Input
                      value={currentData.contactNo || ''}
                      onChange={(e) => updateField('contactNo', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium">{currentData.contactNo || 'Not provided'}</p>
                  )}
                </div>
                {!isEditing && currentData.contactNo && (
                  <a 
                    href={formatPhoneLink(currentData.contactNo)} 
                    className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>

              {/* WhatsApp Number */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  {isEditing ? (
                    <Input
                      value={currentData.whatsappNo || ''}
                      onChange={(e) => updateField('whatsappNo', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium">{currentData.whatsappNo || 'Not provided'}</p>
                  )}
                </div>
                {!isEditing && currentData.whatsappNo && (
                  <a 
                    href={formatWhatsAppLink(currentData.whatsappNo)} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full bg-[#25D366] text-white hover:bg-[#1da851] transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Events Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events
            </h3>
            
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((event, i) => (
                  <div key={i} className="p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">{event.eventName}</p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                        {event.year} {event.monthName} {event.day}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 rounded-xl bg-muted/50">
                No events recorded
              </p>
            )}
          </div>

          <Separator />

          {/* Location Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Details
            </h3>
            
            <div className="grid gap-2">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">Event Location</p>
                <p className="font-medium">{currentData.eventLocation || 'Not specified'}</p>
                {currentData.eventCity && (
                  <p className="text-sm text-muted-foreground mt-1">{currentData.eventCity}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">Current Location</p>
                {isEditing ? (
                  <Input
                    value={currentData.currentCountry || ''}
                    onChange={(e) => updateField('currentCountry', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="font-medium">{currentData.currentCountry || 'Not specified'}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Source & Additional Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4" />
              Source & Info
            </h3>
            
            <div className="grid gap-2">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">Source</p>
                {isEditing ? (
                  <Input
                    value={currentData.source || ''}
                    onChange={(e) => updateField('source', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="font-medium">{currentData.source || 'Not specified'}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">Client Location Type</p>
                <p className="font-medium">{currentData.clientLocation || 'Not specified'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Date Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dates
            </h3>
            
            <div className="grid gap-2">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">Inquiry Date</p>
                <p className="font-medium">{formatDate(currentData.inquiryDateAD, currentData.inquiryDateBS)}</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">Registered</p>
                <p className="font-medium">{formatDate(currentData.registeredDateTimeAD, currentData.registeredDateBS)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {(currentData.description || isEditing) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h3>
                
                {isEditing ? (
                  <Textarea
                    value={currentData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Add notes or description..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">{currentData.description || 'No description'}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
