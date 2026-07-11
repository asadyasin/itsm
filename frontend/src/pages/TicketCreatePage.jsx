import { Box, Typography, Card, CardContent, TextField, MenuItem, Button, Stack, Input } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useCategories } from '../hooks/useInventory';
import { ticketApi } from '../api/endpoints';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: categories } = useCategories();
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: { priority: 'Medium', quantity: 1 } });

  const submit = async (values) => {
    const formData = new FormData();
    formData.append('description', values.description);
    formData.append('requestedItemCategory', values.requestedItemCategory);
    formData.append('quantity', values.quantity);
    formData.append('priority', values.priority);
    if (values.attachments?.length) {
      Array.from(values.attachments).forEach((file) => formData.append('attachments', file));
    }
    const { data } = await ticketApi.create(formData);
    enqueueSnackbar(`Ticket ${data.data.ticketNumber} created`, { variant: 'success' });
    navigate(`/tickets/${data.data._id}`);
  };

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>New Support Ticket</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Controller
              name="requestedItemCategory"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField {...field} select label="Item requested" error={!!errors.requestedItemCategory} fullWidth>
                  {(categories || []).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </TextField>
              )}
            />
            <TextField label="Quantity" type="number" fullWidth {...register('quantity', { required: true, valueAsNumber: true, min: 1 })} />
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Priority" fullWidth>
                  {PRIORITY_OPTIONS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
              )}
            />
            <TextField
              label="Description"
              placeholder="Describe what you need and why..."
              multiline
              rows={4}
              fullWidth
              error={!!errors.description}
              {...register('description', { required: 'Please describe your request' })}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>Attachments (optional)</Typography>
              <Input type="file" inputProps={{ multiple: true }} {...register('attachments')} />
            </Box>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit Ticket'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
