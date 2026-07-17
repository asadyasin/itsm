import { useState } from 'react';
import { Box, Typography, Button, Stack, Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { companyApi, officeApi } from '../api/endpoints';
import { useConfirm } from '../hooks/useConfirm';

export default function CompanySetupPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();

  const { data: companies, isLoading: loadingCompanies } = useQuery({ queryKey: ['companies'], queryFn: () => companyApi.list().then((r) => r.data.data) });
  const { data: offices, isLoading: loadingOffices } = useQuery({ queryKey: ['offices'], queryFn: () => officeApi.list().then((r) => r.data.data) });

  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyEditTarget, setCompanyEditTarget] = useState(null);
  const [officeDialogOpen, setOfficeDialogOpen] = useState(false);
  const [officeEditTarget, setOfficeEditTarget] = useState(null);

  const invalidateCompanies = () => qc.invalidateQueries({ queryKey: ['companies'] });
  const invalidateOffices = () => qc.invalidateQueries({ queryKey: ['offices'] });

  const deleteCompany = async (company) => {
    const ok = await confirm(`Deactivate company "${company.name}"? Its offices will remain but should be reassigned.`);
    if (!ok) return;
    await companyApi.remove(company._id);
    enqueueSnackbar('Company deactivated', { variant: 'success' });
    invalidateCompanies();
  };

  const deleteOffice = async (office) => {
    const ok = await confirm(`Deactivate office "${office.name}"? Departments and purchases tied to it should be reassigned.`);
    if (!ok) return;
    await officeApi.remove(office._id);
    enqueueSnackbar('Office deactivated', { variant: 'success' });
    invalidateOffices();
  };

  const companyRows = (companies || []).map((c) => ({ id: c._id, name: c.name, address: c.address || '—', raw: c }));
  const companyColumns = [
    { field: 'name', headerName: 'Company', flex: 1, minWidth: 160 },
    { field: 'address', headerName: 'Address', flex: 1, minWidth: 180 },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: (p) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => setCompanyEditTarget(p.row.raw)}><EditOutlinedIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => deleteCompany(p.row.raw)}><DeleteOutlineIcon fontSize="small" /></IconButton>
        </Stack>
      )
    }
  ];

  const officeRows = (offices || []).map((o) => ({ id: o._id, name: o.name, company: o.company?.name || '—', location: o.location, raw: o }));
  const officeColumns = [
    { field: 'name', headerName: 'Office', flex: 1, minWidth: 140 },
    { field: 'company', headerName: 'Company', flex: 1, minWidth: 140 },
    { field: 'location', headerName: 'Location', flex: 1, minWidth: 180 },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: (p) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => setOfficeEditTarget(p.row.raw)}><EditOutlinedIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => deleteOffice(p.row.raw)}><DeleteOutlineIcon fontSize="small" /></IconButton>
        </Stack>
      )
    }
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Company & Offices</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set up your company and its offices first — departments, purchases, and asset locations are all built on top of this.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Companies</Typography>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCompanyDialogOpen(true)}>Add Company</Button>
          </Stack>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <DataGrid autoHeight rows={companyRows} columns={companyColumns} loading={loadingCompanies} sx={{ border: 'none' }} hideFooter={companyRows.length <= 10} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Offices</Typography>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOfficeDialogOpen(true)} disabled={!companies?.length}>Add Office</Button>
          </Stack>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <DataGrid autoHeight rows={officeRows} columns={officeColumns} loading={loadingOffices} sx={{ border: 'none' }} hideFooter={officeRows.length <= 10} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <CompanyDialog open={companyDialogOpen} onClose={() => setCompanyDialogOpen(false)} onSaved={invalidateCompanies} />
      <CompanyDialog open={!!companyEditTarget} company={companyEditTarget} onClose={() => setCompanyEditTarget(null)} onSaved={invalidateCompanies} />

      <OfficeDialog open={officeDialogOpen} companies={companies} onClose={() => setOfficeDialogOpen(false)} onSaved={invalidateOffices} />
      <OfficeDialog open={!!officeEditTarget} office={officeEditTarget} companies={companies} onClose={() => setOfficeEditTarget(null)} onSaved={invalidateOffices} />
    </Box>
  );
}

function CompanyDialog({ open, company, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!company;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit ? { name: company.name, address: company.address || '' } : undefined
  });

  const submit = async (values) => {
    if (isEdit) {
      await companyApi.update(company._id, values);
      enqueueSnackbar('Company updated', { variant: 'success' });
    } else {
      await companyApi.create(values);
      enqueueSnackbar('Company created', { variant: 'success' });
    }
    reset();
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit Company' : 'New Company'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Company name" error={!!errors.name} {...register('name', { required: true })} autoFocus placeholder="e.g. 10xEngineers" />
          <TextField label="Address (optional)" {...register('address')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>{isEdit ? 'Save Changes' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function OfficeDialog({ open, office, companies, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!office;
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit ? { name: office.name, company: office.company?._id || office.company, location: office.location } : undefined
  });

  const submit = async (values) => {
    if (isEdit) {
      await officeApi.update(office._id, values);
      enqueueSnackbar('Office updated', { variant: 'success' });
    } else {
      await officeApi.create(values);
      enqueueSnackbar('Office created', { variant: 'success' });
    }
    reset();
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit Office' : 'New Office'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Controller
            name="company"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} select label="Company" error={!!errors.company} fullWidth>
                {(companies || []).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
              </TextField>
            )}
          />
          <TextField label="Office name" error={!!errors.name} {...register('name', { required: true })} placeholder="e.g. Lahore Office" />
          <TextField
            label="Location"
            error={!!errors.location}
            {...register('location', { required: true })}
            placeholder="e.g. Lahore, Pakistan"
            helperText="This is auto-applied as the location for every asset registered under this office"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>{isEdit ? 'Save Changes' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
