import { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, InputAdornment, IconButton, Divider } from '@mui/material';
import { useForm } from 'react-hook-form';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const googleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
      const result = await loginWithGoogle(credentialResponse.credential);
      navigate(redirectTo, { replace: true });
      if (result.isNewUser) {
        // A brand-new account was just auto-created with the default 'user' role — nothing
        // further needed here, but an admin will want to assign a real role/department soon.
      }
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
        bgcolor: '#0F1420',
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(43,58,103,0.5), transparent 40%), radial-gradient(circle at 80% 80%, rgba(31,138,112,0.35), transparent 40%)'
      }}
    >
      <Paper elevation={8} sx={{ width: 400, p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="10xE logo"
            sx={{ width: 46, height: 46, objectFit: 'contain' }}
          />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.1}>10xE Inventory</Typography>
            <Typography variant="caption" color="text.secondary">IT Help Desk</Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in with your company account to continue.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {googleConfigured && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                text="signin_with"
                shape="rectangular"
                width="336"
              />
            </Box>
            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">OR</Typography>
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
            {...register('email', { required: 'Email is required' })}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            {...register('password', { required: 'Password is required' })}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={isSubmitting} sx={{ mt: 3, py: 1.2 }}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
