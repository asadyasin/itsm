import { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import { useForm } from 'react-hook-form';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    setError('');
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log in. Please check your credentials.');
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
          <Box sx={{ width: 42, height: 42, borderRadius: '10px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: '#fff', fontWeight: 800 }}>IT</Typography>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.1}>Asset Desk</Typography>
            <Typography variant="caption" color="text.secondary">IT Inventory & Help Desk</Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in with your company account to continue.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
