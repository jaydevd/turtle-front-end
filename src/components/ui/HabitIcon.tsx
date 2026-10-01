'use client';

import WaterDropRounded from '@mui/icons-material/WaterDropRounded';
import DirectionsRunRounded from '@mui/icons-material/DirectionsRunRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import BedtimeRounded from '@mui/icons-material/BedtimeRounded';
import EnergySavingsLeafRounded from '@mui/icons-material/EnergySavingsLeafRounded';
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import MusicNoteRounded from '@mui/icons-material/MusicNoteRounded';
import CodeRounded from '@mui/icons-material/CodeRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import LocalCafeRounded from '@mui/icons-material/LocalCafeRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import type { HabitIconKey } from '@/theme/tokens';

const iconMap: Record<HabitIconKey, SvgIconComponent> = {
  droplet: WaterDropRounded,
  run: DirectionsRunRounded,
  book: MenuBookRounded,
  meditate: SelfImprovementRounded,
  moon: BedtimeRounded,
  leaf: EnergySavingsLeafRounded,
  sun: WbSunnyRounded,
  pen: EditRounded,
  music: MusicNoteRounded,
  code: CodeRounded,
  heart: FavoriteRounded,
  cup: LocalCafeRounded,
};

export const defaultIconKey: HabitIconKey = 'leaf';

export function resolveIcon(icon: string | null | undefined): SvgIconComponent {
  if (icon && icon in iconMap) {
    return iconMap[icon as HabitIconKey];
  }
  return iconMap[defaultIconKey];
}

export function isValidIcon(icon: string): icon is HabitIconKey {
  return icon in iconMap;
}

export { iconMap };
export type { HabitIconKey };
