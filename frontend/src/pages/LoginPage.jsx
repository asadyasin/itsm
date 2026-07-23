import { useState } from 'react';
import {
  Box, TextField, Button, Typography, Alert, InputAdornment, IconButton, Divider, Stack
} from '@mui/material';
import { keyframes } from '@emotion/react';
import { useForm } from 'react-hook-form';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const googleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

// --- Signature element: a bespoke IC-chip illustration for the brand panel -----------------
// Built from scratch in SVG (no stock imagery) so it's specific to a semiconductor company's
// IT platform rather than a generic "person holding a tablet" stock photo.

const pulse = keyframes`
  0%, 100% { opacity: 0.25; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
`;

const PIN_POSITIONS = [
  // [x1, y1, x2, y2, dotX, dotY, delay]
  [200, 140, 200, 60, 200, 95, '0s'],
  [200, 260, 200, 340, 200, 305, '0.6s'],
  [140, 200, 60, 200, 95, 200, '0.3s'],
  [260, 200, 340, 200, 305, 200, '0.9s'],
  [160, 140, 130, 80, 145, 108, '1.1s'],
  [240, 140, 270, 80, 255, 108, '0.2s'],
  [160, 260, 130, 320, 145, 292, '0.8s'],
  [240, 260, 270, 320, 255, 292, '1.4s']
];

function ChipIllustration() {
  return (
    <Box component="svg" viewBox="0 0 400 400" sx={{ width: '100%', maxWidth: 360, height: 'auto' }} aria-hidden="true">
      <defs>
        <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.06)" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="400" height="400" fill="url(#dotGrid)" />

      {/* traces */}
      {PIN_POSITIONS.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      ))}

      {/* pulsing signal dots */}
      {PIN_POSITIONS.map(([, , , , dotX, dotY, delay], i) => (
        <Box
          key={`dot-${i}`}
          component="circle"
          cx={dotX}
          cy={dotY}
          r="5"
          fill="#F2A93B"
          sx={{
            transformOrigin: `${dotX}px ${dotY}px`,
            animation: `${pulse} 2.4s ease-in-out ${delay} infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.7 }
          }}
        />
      ))}

      {/* chip body */}
      <rect x="140" y="140" width="120" height="120" rx="14" fill="#141C2E" stroke="#F2A93B" strokeWidth="2.5" />
      <rect x="160" y="160" width="80" height="80" rx="6" fill="none" stroke="rgba(242, 169, 59, 0)" strokeWidth="1" />
      <text x="200" y="206" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="20" fill="#F2A93B">10x</text>
    </Box>
  );
}

const darkFieldSx = {
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#F2A93B' },
  '& .MuiOutlinedInput-root': {
    color: '#F5F7FA',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#F2A93B' }
  }
};

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  // If the person arrived here via a redirect (e.g. clicked a ticket link in an email while
  // logged out), send them back to that exact page after a successful login instead of the dashboard.
  const redirectTo = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/';

  const onSubmit = async (values) => {
    setError('');
    try {
      await login(values.email, values.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log in. Please check your credentials.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in with Google.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#080B14',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2, md: 4 }
      }}
    >
      {/* soft decorative blobs behind the card, echoing a PCB board's warm/cool signal colors */}
      <Box sx={{ position: 'absolute', top: -120, left: -120, width: 320, height: 320, borderRadius: '50%', bgcolor: '#3E7BFA', opacity: 0.14, filter: 'blur(10px)' }} />
      <Box sx={{ position: 'absolute', bottom: -140, right: -100, width: 360, height: 360, borderRadius: '50%', bgcolor: '#F2A93B', opacity: 0.14, filter: 'blur(10px)' }} />

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 1040,
          minHeight: { md: 620 },
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          bgcolor: '#111827'
        }}
      >
        {/* ---------------- Left: sign-in form ---------------- */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: { xs: 3, sm: 6 }, py: { xs: 5, md: 0 } }}>
          <Box sx={{ maxWidth: 360, width: '100%', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 4 }}>
              <Box component="img" src="/logo.png" alt="10xEngineers logo" sx={{ width: 32, height: 32, objectFit: 'contain' }} />
              <Typography variant="overline" sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.55)' }}>
                10xENGINEERS
              </Typography>
            </Stack>

            <Typography variant="h4" sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, mb: 0.5, color: '#F5F7FA' }}>
              Welcome back
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3.5 }}>
              Sign in to the IT Inventory &amp; Help Desk.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {googleConfigured && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-in failed. Please try again.')}
                    text="signin_with"
                    shape="rectangular"
                    width="300"
                  />
                </Box>
                <Divider sx={{ mb: 2.5, '&::before, &::after': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>or sign in with email</Typography>
                </Divider>
              </>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                label="Email address"
                fullWidth
                margin="normal"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={darkFieldSx}
                {...register('email', { required: 'Email is required' })}
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                error={!!errors.password}
                helperText={errors.password?.message}
                sx={darkFieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                {...register('password', { required: 'Password is required' })}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{
                  mt: 3,
                  py: 1.2,
                  color: '#12172A',
                  background: 'linear-gradient(135deg, #F2A93B 0%, #D9822B 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #E49A2C 0%, #C6741F 100%)' }
                }}
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <Typography variant="caption" display="block" sx={{ mt: 3, textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
              Need access? Contact your IT administrator to get an account set up.
            </Typography>
          </Box>
        </Box>

        {/* ---------------- Right: brand / illustration panel ---------------- */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            bgcolor: '#0B1220',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            px: 6,
            py: 6,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', bgcolor: '#3E7BFA', opacity: 0.16, filter: 'blur(6px)' }} />
          <Box sx={{ position: 'absolute', bottom: -100, left: -60, width: 260, height: 260, borderRadius: '50%', bgcolor: '#F2A93B', opacity: 0.14, filter: 'blur(6px)' }} />

          <Typography variant="overline" sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: 3, color: '#F2A93B', position: 'relative' }}>
            SEMICONDUCTOR ENGINEERING
          </Typography>

          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', my: 2 }}>
            <ChipIllustration />
          </Box>

          <Box sx={{ position: 'relative' }}>
            <Typography variant="h5" sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#fff', mb: 1, lineHeight: 1.25 }}>
              Precision hardware runs on precise IT.
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', maxWidth: 340 }}>
              Track every asset and support ticket for our engineering teams — from wafer lab
              workstations to test bench equipment.
            </Typography>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              bottom: 28,
              right: 28,
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
            }}
          >
            <MemoryRoundedIcon sx={{ color: '#2B3A67' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
