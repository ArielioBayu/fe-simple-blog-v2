import { uploadService } from '@/services/upload.service';

export interface BannerPreset {
  id: string;
  name: string;
  gradient: string;
  tag: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'preset:sunset-coral',
    name: 'Sunset Blaze',
    gradient: 'linear-gradient(135deg, #FF5A36 0%, #E1306C 50%, #833AB4 100%)',
    tag: 'Signature',
  },
  {
    id: 'preset:deep-obsidian',
    name: 'Deep Obsidian',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
    tag: 'Minimal Dark',
  },
  {
    id: 'preset:cosmic-nebula',
    name: 'Cosmic Nebula',
    gradient: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 50%, #F000FF 100%)',
    tag: 'Vibrant',
  },
  {
    id: 'preset:midnight-aurora',
    name: 'Midnight Aurora',
    gradient: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
    tag: 'Nordic Calm',
  },
  {
    id: 'preset:cyber-teal',
    name: 'Cyber Teal',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #6366F1 100%)',
    tag: 'Tech Modern',
  },
  {
    id: 'preset:rose-gold',
    name: 'Rose Gold',
    gradient: 'linear-gradient(135deg, #F857A6 0%, #FF5858 100%)',
    tag: 'Warm Pastel',
  },
  {
    id: 'preset:emerald-glow',
    name: 'Emerald Glow',
    gradient: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
    tag: 'Fresh Nature',
  },
  {
    id: 'preset:golden-hour',
    name: 'Golden Hour',
    gradient: 'linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)',
    tag: 'Warm Amber',
  },
];

export const DEFAULT_BANNER_GRADIENT = 'linear-gradient(135deg, #FF5A36 0%, #E1306C 50%, #833AB4 100%)';

/**
 * Resolves any banner_url value (preset identifier or uploaded file path)
 * into a valid CSS background image value.
 */
export function getBannerBackground(bannerUrl?: string | null): string {
  if (!bannerUrl || typeof bannerUrl !== 'string') {
    return DEFAULT_BANNER_GRADIENT;
  }

  const trimmed = bannerUrl.trim();
  if (!trimmed) {
    return DEFAULT_BANNER_GRADIENT;
  }

  // Check if it's one of the preset gradient templates
  if (trimmed.startsWith('preset:')) {
    const found = BANNER_PRESETS.find((p) => p.id === trimmed);
    if (found) {
      return found.gradient;
    }
    return DEFAULT_BANNER_GRADIENT;
  }

  // Check if it's already a CSS gradient value
  if (trimmed.startsWith('linear-gradient') || trimmed.startsWith('radial-gradient')) {
    return trimmed;
  }

  // Otherwise, treat as an image file path or external image URL
  const resolvedUrl = uploadService.getImageUrl(trimmed);
  if (resolvedUrl) {
    return `url("${resolvedUrl}")`;
  }

  return DEFAULT_BANNER_GRADIENT;
}
