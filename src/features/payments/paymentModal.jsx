import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Box, Typography, TextField, Button, IconButton, Stack,
  InputAdornment, Chip, Divider, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

const modalStyle = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: '92vw', maxWidth: 800, maxHeight: '90vh', bgcolor: 'background.paper', borderRadius: 2,
  boxShadow: 24, p: 0, outline: 'none', overflow: 'hidden'
};

export default function PaymentModal({ open, onClose, vendors = [], initialData = {}, onSave }) {
  const vendorMap = useMemo(() => {
    const m = new Map();
    (vendors || []).forEach(v => {
      if (v && v.vendor_code) m.set(String(v.vendor_code).toUpperCase(), v);
      if (v && v.pan_no) m.set(String(v.pan_no).toUpperCase(), v);
      if (v && v.contact_no) m.set(String(v.contact_no).toUpperCase(), v);
      if (v && v.vendor_name) m.set(String(v.vendor_name).toUpperCase(), v);
    });
    return m;
  }, [vendors]);

  const [formData, setFormData] = useState({});
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorLookupError, setVendorLookupError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaults = {
      vendorCode: '',
      date: new Date().toISOString().split('T')[0],
      actualAmount: '',
      advance: '',
      netAmount: '',
      ifsc: '',
      accountNo: '',
      narration: '',
      site: '',
      reqBy: '',
      status: 'unpaid',
      ...initialData
    };
    setFormData(defaults);

    if (initialData.vendorCode) {
      const v = vendorMap.get(String(initialData.vendorCode).toUpperCase());
      setSelectedVendor(v || null);
      setVendorLookupError(v ? '' : 'Vendor not found in Vendor Master');
    } else {
      setSelectedVendor(null);
      setVendorLookupError('');
    }
  }, [open, initialData, vendorMap]);

  const calculatedNetAmount = useMemo(() => {
    const actual = Number(formData.actualAmount) || 0;
    const advance = Number(formData.advance) || 0;
    return actual - advance;
  }, [formData.actualAmount, formData.advance]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, netAmount: calculatedNetAmount }));
  }, [calculatedNetAmount]);

  const setField = useCallback((field, value) => setFormData(prev => ({ ...prev, [field]: value })), []);

  const handleVendorKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = String(formData.vendorCode || '').trim();
      if (!raw) return;

      const key = raw.toUpperCase();
      let v = vendorMap.get(key);

      if (!v) {
        const iv = raw.toLowerCase();
        v = vendors.find(opt => (
          (opt.vendor_code && opt.vendor_code.toLowerCase() === iv) ||
          (opt.vendor_name && opt.vendor_name.toLowerCase() === iv) ||
          (opt.pan_no && opt.pan_no.toLowerCase() === iv) ||
          (opt.contact_no && opt.contact_no.toLowerCase() === iv)
        ));
      }

      if (v) {
        setSelectedVendor(v);
        setVendorLookupError('');
        if (!initialData.id) {
          if (v.site) setField('site', v.site);
          if (v.contact_person) setField('reqBy', v.contact_person);
        }
      } else {
        setSelectedVendor(null);
        setVendorLookupError('Vendor not found in Vendor Master');
      }
    }
  }, [formData.vendorCode, vendorMap, vendors, setField, initialData.id]);

  const handleInputChange = useCallback((field) => (e) => setField(field, e.target.value), [setField]);

  const handleNumberChange = useCallback((field) => (e) => {
    const raw = e.target.value;
    const value = raw === '' ? '' : Number(raw) || 0;
    setField(field, value);
  }, [setField]);

  const formatCurrency = useCallback((amount) => {
    if (amount === '' || amount == null || Number.isNaN(amount)) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }, []);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!selectedVendor) {
      setVendorLookupError('Please select a valid vendor');
      return;
    }
    if (formData.actualAmount === '' || formData.actualAmount == null) {
      alert('Please fill in Actual Amount');
      return;
    }
    if (!formData.narration) {
      alert('Please fill in Narration');
      return;
    }

    if (Number(formData.advance) > Number(formData.actualAmount)) {
      const confirmed = window.confirm(
        'Warning: Advance amount is greater than actual amount. Do you want to continue?'
      );
      if (!confirmed) return;
    }

    const payload = {
      ...formData,
      vendorId: selectedVendor.id,
      vendorCode: selectedVendor.vendor_code || formData.vendorCode,
      actualAmount: Number(formData.actualAmount),
      advance: Number(formData.advance) || 0,
      netAmount: calculatedNetAmount,
      status: formData.status || 'unpaid'
    };

    try {
      setSubmitting(true);
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSubmitting(false);
    }
  }, [selectedVendor, formData, calculatedNetAmount, onSave, onClose]);

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Box sx={modalStyle}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon />
            {initialData.id ? 'Edit' : 'Add'} Payment
          </Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ maxHeight: 'calc(90vh - 140px)', overflow: 'auto', p: 3 }} component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Vendor Information</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Vendor (code / name / PAN / contact)"
                  size="small"
                  placeholder="Search HS_XX or SC_XX or vendor name"
                  required
                  value={formData.vendorCode || ''}
                  onChange={(e) => setField('vendorCode', e.target.value)}
                  onKeyDown={handleVendorKeyDown}
                  error={!!vendorLookupError}
                  helperText={vendorLookupError || `Type vendor code or name (then press Enter)`}
                  InputProps={{
                    endAdornment: selectedVendor ? (
                      <InputAdornment position="end"><Chip label="Found" size="small" color="success" /></InputAdornment>
                    ) : undefined
                  }}
                />

                {selectedVendor && (
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2"><strong>Vendor:</strong> {selectedVendor.vendor_name}</Typography>
                    <Typography variant="body2"><strong>Type:</strong> {selectedVendor.type === 'HS' ? 'Hiring Service' : 'Subcontractor'}</Typography>
                    <Typography variant="body2"><strong>PAN:</strong> {selectedVendor.pan_no || 'Not provided'}</Typography>
                    <Typography variant="body2"><strong>Contact:</strong> {selectedVendor.contact_no || 'Not provided'}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Other sections (Payment Details, Bank Details, Additional Info) remain unchanged */}

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Payment Details</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Date"
                  type="date"
                  size="small"
                  value={formData.date || ''}
                  onChange={handleInputChange('date')}
                  required
                  InputLabelProps={{ shrink: true }}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Actual Amount"
                    type="number"
                    size="small"
                    required
                    value={formData.actualAmount || ''}
                    onChange={handleNumberChange('actualAmount')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />

                  <TextField
                    label="Advance"
                    type="number"
                    size="small"
                    value={formData.advance || ''}
                    onChange={handleNumberChange('advance')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    helperText="Amount already paid in advance (optional)"
                  />
                </Box>

                <TextField
                  label="NET AMOUNT"
                  size="small"
                  value={formatCurrency(calculatedNetAmount)}
                  InputProps={{ readOnly: true }}
                  sx={{ '& input': { color: 'success.main', fontWeight: 700, fontSize: '1.05rem' } }}
                  helperText="Auto-calculated: Actual Amount - Advance"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Bank Details</Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="IFSC Code"
                    size="small"
                    value={formData.ifsc || ''}
                    onChange={handleInputChange('ifsc')}
                    placeholder="e.g., SBIN0000123"
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                  />

                  <TextField
                    label="Account Number"
                    size="small"
                    value={formData.accountNo || ''}
                    onChange={handleInputChange('accountNo')}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                  />
                </Box>

                <TextField
                  label="Narration"
                  value={formData.narration || ''}
                  onChange={handleInputChange('narration')}
                  size="small"
                  placeholder="Brief description of payment purpose"
                  required
                  helperText="One-line description (e.g., 'September deployment', 'Material supply')"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Additional Information</Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Site"
                    size="small"
                    value={formData.site || ''}
                    onChange={handleInputChange('site')}
                    placeholder="Project site or location"
                  />

                  <TextField
                    label="Requested By"
                    size="small"
                    value={formData.reqBy || ''}
                    onChange={handleInputChange('reqBy')}
                    placeholder="Person who requested payment"
                  />
                </Box>
              </Stack>
            </Box>

            {calculatedNetAmount < 0 && (
              <Alert severity="warning">
                <strong>Warning:</strong> Net amount is negative. Please check the advance amount.
              </Alert>
            )}

          </Stack>
        </Box>

        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !selectedVendor}
          >
            {submitting ? 'Saving...' : initialData.id ? 'Update Payment' : 'Create Payment'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

PaymentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  vendors: PropTypes.array,
  initialData: PropTypes.object,
  onSave: PropTypes.func.isRequired
};
