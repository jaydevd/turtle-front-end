'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { useAuth } from '@/lib/auth/AuthContext';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import { layout as layoutTokens, motion, radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import {
    Avatar,
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Typography,
    useMediaQuery,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

/** Personal tooling, shown above the separator. */
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardRounded },
  { href: '/habits', label: 'Habits', icon: AutoAwesomeRounded },
  { href: '/tags', label: 'Tags', icon: LocalOfferOutlined },
  { href: '/insights', label: 'Insights', icon: InsightsOutlined },
] as const;

/** The social side of the app, set apart below the separator. */
const SOCIAL_NAV_ITEMS = [
  { href: '/groups', label: 'Groups', icon: GroupsOutlined },
] as const;

/** Highlights the deepest matching route so detail pages keep their parent lit. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { mode, colors } = useAppScheme();
  return (
    <Stack>
      <List sx={{ p: 1.25, display: 'grid', gap: 0.5 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </List>
      <Divider
        sx={{
          mx: 2.5,
          ...(mode === 'dark' ? { borderColor: colors.hairlineStrong } : {}),
        }}
      />
      <List sx={{ p: 1.25, display: 'grid', gap: 0.5 }}>
        {SOCIAL_NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </List>
    </Stack>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: SvgIconComponent;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <ListItemButton
      component={Link}
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      sx={{
        borderRadius: `${radii.sm}px`,
        minHeight: 42,
        px: 1.5,
        color: active ? 'var(--mui-palette-primary-dark)' : 'var(--mui-palette-text-secondary)',
        backgroundColor: active ? 'var(--mui-palette-primary-wash)' : 'transparent',
        fontWeight: active ? 600 : 500,
        '& .MuiListItemIcon .MuiSvgIcon-root': {
          transformOrigin: 'center',
          transition: `transform ${motion.base}ms ${motion.spring}, color ${motion.base}ms ${motion.spring}`,
        },
        '&:hover .MuiListItemIcon .MuiSvgIcon-root': {
          transform: 'translateY(-2px) scale(1.2) rotate(-8deg)',
          color: 'var(--mui-palette-primary-main)',
          animation: 'sidebar-icon-hover 360ms cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '@keyframes sidebar-icon-hover': {
          '0%': { transform: 'translateY(0) scale(1) rotate(0deg)' },
          '55%': { transform: 'translateY(-4px) scale(1.24) rotate(-10deg)' },
          '100%': { transform: 'translateY(-2px) scale(1.2) rotate(-8deg)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& .MuiListItemIcon .MuiSvgIcon-root': {
            transition: 'none',
            transform: 'none',
            animation: 'none',
          },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
        <Icon sx={{ fontSize: 20 }} />
      </ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{ primary: { sx: { fontSize: '0.9375rem', fontWeight: 'inherit' } } }}
      />
    </ListItemButton>
  );
}

/**
 * The account control that lives at the foot of the sidebar. Tapping it opens
 * its menu upward, so the two things it offers - the settings page and signing
 * out - stay anchored to the button the user just pressed.
 */
function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '·';
  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : '';

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      toast({ tone: 'info', message: 'Signed out.' });
    } finally {
      setSigningOut(false);
      setAnchor(null);
    }
  }

  return (
    <>
      <ListItemButton
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label="Account menu"
        aria-haspopup="menu"
        sx={{
          borderRadius: `${radii.sm}px`,
          px: 1.25,
          py: 1,
          gap: 1.25,
          color: 'text.secondary',
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: 'var(--mui-palette-primary-wash)',
            color: 'var(--mui-palette-primary-dark)',
            border: '1px solid var(--mui-palette-divider)',
            flexShrink: 0,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' }}>
            {displayName || 'Account'}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: colors.inkSoft, display: 'block' }}>
            {user?.email}
          </Typography>
        </Box>
      </ListItemButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 240, mb: 0.5 } } }}
      >
        <MenuItem component={Link} href="/settings" onClick={onNavigate}>
          <SettingsOutlined sx={{ fontSize: 18, mr: 1.5, opacity: 0.7 }} />
          Settings
        </MenuItem>
        <MenuItem onClick={handleSignOut} disabled={signingOut}>
          <LogoutRounded sx={{ fontSize: 18, mr: 1.5, opacity: 0.7 }} />
          {signingOut ? 'Signing out…' : 'Log out'}
        </MenuItem>
      </Menu>
    </>
  );
}

function ThemeToggle() {
  const { resolvedMode, toggle } = useThemeMode();
  const { colors } = useAppScheme();
  const nextLabel = resolvedMode === 'dark' ? 'Switch to light' : 'Switch to dark';

  return (
    <IconButton onClick={toggle} aria-label={nextLabel} size="small">
      {resolvedMode === 'dark' ? (
        <LightModeOutlined fontSize="small" sx={{ color: colors.sage }} />
      ) : (
        <DarkModeOutlined fontSize="small" sx={{ color: colors.sage }} />
      )}
    </IconButton>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { colors } = useAppScheme();
  const isDesktop = useMediaQuery('(min-width:900px)');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tapping a nav item closes the drawer via `NavList`'s onNavigate handler.

  const sidebar = (
    <Stack sx={{ height: '100%', py: 2.5 }}>
      <Box sx={{ px: 2.5, pb: 3 }}>
        <BrandLogo darkModeShadow />
      </Box>
      <NavList onNavigate={() => setMobileOpen(false)} />
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ px: 1.5 }}>
        <Divider sx={{ mb: 1 }} />
        <AccountMenu onNavigate={() => setMobileOpen(false)} />
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', backgroundColor: colors.canvas }}>
      {isDesktop ? (
        <Box
          component="nav"
          aria-label="Main"
          sx={{
            width: layoutTokens.sidebarWidth,
            flexShrink: 0,
            borderRight: `1px solid ${colors.hairline}`,
            backgroundColor: colors.paper,
            position: 'sticky',
            top: 0,
            height: '100dvh',
          }}
        >
          {sidebar}
        </Box>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          slotProps={{ paper: { sx: { width: layoutTokens.sidebarWidth, backgroundColor: colors.paper } } }}
        >
          {sidebar}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: { xs: 2, md: 3.5 },
            height: 60,
            backdropFilter: 'blur(10px)',
            backgroundColor: `color-mix(in srgb, ${colors.canvas} 82%, transparent)`,
            borderBottom: `1px solid ${colors.hairline}`,
          }}
        >
          {!isDesktop ? (
            <>
              <IconButton
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                edge="start"
              >
                <MenuRounded />
              </IconButton>
              <Box sx={{ flexGrow: 1 }} />
            </>
          ) : (
            <Box sx={{ flexGrow: 1 }} />
          )}
          <ThemeToggle />
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, md: 3.5 },
            py: { xs: 3, md: 4.5 },
            maxWidth: layoutTokens.contentMaxWidth + 56,
            width: '100%',
            marginInline: 'auto',
            animation: `fade-in ${motion.slow}ms ${motion.spring}`,
            '@keyframes fade-in': {
              from: { opacity: 0, transform: 'translateY(4px)' },
              to: { opacity: 1, transform: 'none' },
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
