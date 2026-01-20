import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Instagram, 
  Facebook, 
  Music2, 
  Youtube, 
  Globe, 
  Mail,
  ExternalLink
} from "lucide-react";

type Platform = 'google-map' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'website' | 'gmail';

interface SocialLinkInputProps {
  platform: Platform;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const platformConfig: Record<Platform, { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  placeholder: string;
}> = {
  'google-map': { 
    icon: MapPin, 
    label: 'Google Map', 
    color: 'text-red-500',
    placeholder: 'Paste Google Maps link'
  },
  'instagram': { 
    icon: Instagram, 
    label: 'Instagram', 
    color: 'text-pink-500',
    placeholder: 'Paste Instagram link'
  },
  'facebook': { 
    icon: Facebook, 
    label: 'Facebook', 
    color: 'text-blue-600',
    placeholder: 'Paste Facebook link'
  },
  'tiktok': { 
    icon: Music2, 
    label: 'TikTok', 
    color: 'text-slate-200',
    placeholder: 'Paste TikTok link'
  },
  'youtube': { 
    icon: Youtube, 
    label: 'YouTube', 
    color: 'text-red-600',
    placeholder: 'Paste YouTube link'
  },
  'website': { 
    icon: Globe, 
    label: 'Website', 
    color: 'text-blue-500',
    placeholder: 'Paste website URL'
  },
  'gmail': { 
    icon: Mail, 
    label: 'Email', 
    color: 'text-amber-500',
    placeholder: 'Enter email address'
  },
};

export function SocialLinkInput({ platform, value, onChange, placeholder }: SocialLinkInputProps) {
  const config = platformConfig[platform];
  const Icon = config.icon;

  const handleOpen = () => {
    if (!value) return;
    
    if (platform === 'gmail') {
      window.open(`mailto:${value}`, '_blank');
    } else {
      // Ensure the URL has a protocol
      let url = value;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-shrink-0 ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <Input
        type={platform === 'gmail' ? 'email' : 'url'}
        placeholder={placeholder || config.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border-slate-600 text-white flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        disabled={!value}
        className="flex-shrink-0 text-slate-400 hover:text-white"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}
