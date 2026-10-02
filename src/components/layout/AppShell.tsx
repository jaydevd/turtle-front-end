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
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardRounded },
  { href: '/habits', label: 'Habits', icon: AutoAwesomeRounded },
  { href: '/groups', label: 'Groups', icon: GroupsOutlined },
  { href: '/tags', label: 'Tags', icon: LocalOfferOutlined },
  { href: '/insights', label: 'Insights', icon: InsightsOutlined },
  { href: '/settings', label: 'Settings', icon: SettingsOutlined },
] as const;

/** Highlights the deepest matching route so detail pages keep their parent lit. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <List sx={{ p: 1.25, display: 'grid', gap: 0.5 }}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <ListItemButton
            key={href}
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
      })}
    </List>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '·';

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
      <Tooltip title="Account">
        <IconButton
          onClick={(event) => setAnchor(event.currentTarget)}
          aria-label="Account menu"
          aria-haspopup="menu"
          sx={{ p: 0.5 }}
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
            }}
          >
            {initials}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.25, maxWidth: 240 }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }} noWrap>
            {user ? `${user.first_name} ${user.last_name}`.trim() || user.email : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleSignOut} disabled={signingOut} sx={{ mt: 0.5 }}>
          <LogoutRounded sx={{ fontSize: 18, mr: 1.5, opacity: 0.7 }} />
          {signingOut ? 'Signing out…' : 'Sign out'}
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
      <Box sx={{ px: 2.5, pt: 2 }}>
        <Typography variant="caption" sx={{ color: colors.inkSoft }}>
          Small steps, every day.
        </Typography>
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
          <AccountMenu />
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
