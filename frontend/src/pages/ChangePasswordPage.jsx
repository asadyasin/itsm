import { Box, Typography, Card, CardContent, TextField, Button, Stack, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { authApi } from '../api/endpoints';

export default function ChangePasswordPage() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const submit = async (values) => {
    setError('');
    setSuccess('');
    try {
      await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setSuccess('Password updated successfully.');
      reset();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update password.');
    }
  };

  return (
    <Box sx={{ maxWidth: 420 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Change Password</Typography>
      <Card>
        <CardContent>
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField label="Current password" type="password" error={!!errors.currentPassword} {...register('currentPassword', { required: true })} />
            <TextField label="New password" type="password" helperText="Minimum 8 characters" error={!!errors.newPassword} {...register('newPassword', { required: true, minLength: 8 })} />
            <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>Update Password</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
