import { BrandLogo } from '@/components/layout/BrandLogo';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';

export default function HomePage() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', py: { xs: 8, md: 14 } }}>
      <Container maxWidth="md">
        <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
            <BrandLogo size={40} />
            <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, maxWidth: 640 }}>
              Small steps. Stronger routines.
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: '1.125rem', maxWidth: 560, lineHeight: 1.7 }}>
              Your new home for building habits with intention. The front end is ready for the next product features.
            </Typography>
            <Button href="/signup" variant="contained" size="large" disableElevation>
              Get started
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
