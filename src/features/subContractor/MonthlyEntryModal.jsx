import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalculateIcon from "@mui/icons-material/Calculate";
import { calculateEntryTotals } from "./subContractorSlice";

// Small utility: parse percent-like input into number or empty string
const parsePercentInput = (input) => {
  if (input === "" || input == null) return "";
  const s = String(input)
    .trim()
    .replace(/[,\s%]+/g, "");
  const n = Number(s);
  return Number.isNaN(n) ? "" : n;
};

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "92vw",
  maxWidth: 900,
  maxHeight: "90vh",
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 0,
  outline: "none",
  overflow: "hidden",
};

export default function MonthlyEntryModal({
  open,
  onClose,
  type = "SC",
  vendors = [],
  initialData = {},
  onSave,
}) {
  // create a quick lookup map keyed by vendor_code / pan / contact / name (uppercased)
  const vendorMap = useMemo(() => {
    const m = new Map();
    (vendors || []).forEach((v) => {
      if (v && v.vendor_code) m.set(String(v.vendor_code).toUpperCase(), v);
      if (v && v.pan_no) m.set(String(v.pan_no).toUpperCase(), v);
      if (v && v.contact_no) m.set(String(v.contact_no).toUpperCase(), v);
      if (v && v.vendor_name) m.set(String(v.vendor_name).toUpperCase(), v);
    });
    return m;
  }, [vendors]);

  const [formData, setFormData] = useState({});
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorLookupError, setVendorLookupError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // internal states to manage fetched left part and narration
  const [fetchedPart, setFetchedPart] = useState(""); // vendor.work_type
  const [narration, setNarration] = useState(""); // text after hyphen

  // initialize when modal opens or when initialData changes
  useEffect(() => {
    if (!open) return;
    const defaults = {
      vendor_code: "",
      particular: "",
      bill_type: "H/Soft Copy",
      gross_amount: "",
      gst_rate: 5,
      tds_rate: 1,
      debit_deduction: "",
      gst_hold: "",
      other_deductions: "",
      advances: "",
      part_paid: "",
      notes: "",
      ...initialData,
    };
    setFormData(defaults);

    // pre-select vendor if initialData.vendor_code exists
    if (initialData.vendor_code) {
      const v = vendorMap.get(String(initialData.vendor_code).toUpperCase());
      setSelectedVendor(v || null);
      setVendorLookupError(v ? "" : "Vendor not found in Vendor Master");
      setFetchedPart(v?.work_type || "");

      if (v && defaults.particular) {
        const wt = v.work_type || "";
        if (defaults.particular.startsWith(wt)) {
          const rest = defaults.particular
            .slice(wt.length)
            .replace(/^\s*-\s*/, "");
          setNarration(rest);
          setFormData((prev) => ({
            ...prev,
            particular: rest ? `${wt} - ${rest}` : wt,
          }));
        } else {
          setNarration(defaults.particular || "");
          setFormData((prev) => ({
            ...prev,
            particular: defaults.particular || "",
          }));
        }
      }
    } else {
      setSelectedVendor(null);
      setVendorLookupError("");
      setFetchedPart("");
      setNarration(defaults.particular || "");
      setFormData((prev) => ({
        ...prev,
        particular: defaults.particular || "",
      }));
    }
  }, [open, initialData, vendorMap]);

  // calculated values memoized
  const calculatedValues = useMemo(() => {
    const normalized = {
      ...formData,
      gross_amount:
        formData.gross_amount === "" ? "" : Number(formData.gross_amount) || 0,
      gst_rate: formData.gst_rate === "" ? "" : Number(formData.gst_rate) || 0,
      tds_rate: formData.tds_rate === "" ? "" : Number(formData.tds_rate) || 0,
      debit_deduction:
        formData.debit_deduction === ""
          ? 0
          : Number(formData.debit_deduction) || 0,
      gst_hold: formData.gst_hold === "" ? 0 : Number(formData.gst_hold) || 0,
      other_deductions:
        formData.other_deductions === ""
          ? 0
          : Number(formData.other_deductions) || 0,
      advances: formData.advances === "" ? 0 : Number(formData.advances) || 0,
      part_paid:
        formData.part_paid === "" ? 0 : Number(formData.part_paid) || 0,
    };

    if (normalized.gross_amount === "" || normalized.gross_amount == null)
      return {};
    try {
      return calculateEntryTotals(normalized) || {};
    } catch (err) {
      console.error("Calculation error", err);
      return {};
    }
  }, [
    formData.gross_amount,
    formData.gst_rate,
    formData.tds_rate,
    formData.debit_deduction,
    formData.gst_hold,
    formData.other_deductions,
    formData.advances,
    formData.part_paid,
  ]);

  // generic field setter
  const setField = useCallback(
    (field, value) => setFormData((prev) => ({ ...prev, [field]: value })),
    []
  );

  // Vendor lookup only on Enter keypress (so typing 1 letter won't fetch)
  const handleVendorKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = String(formData.vendor_code || "").trim();
        if (!raw) return;

        const key = raw.toUpperCase();
        let v = vendorMap.get(key);

        if (!v) {
          // try exact equals for vendor_name/pan/contact first
          v = vendors.find(
            (opt) =>
              (opt.vendor_code && opt.vendor_code.toUpperCase() === key) ||
              (opt.vendor_name && opt.vendor_name.toUpperCase() === key) ||
              (opt.pan_no && opt.pan_no.toUpperCase() === key) ||
              (opt.contact_no && opt.contact_no.toUpperCase() === key)
          );
        }

        if (!v) {
          // fallback: contains match (only if exact didn't match)
          const iv = raw.toLowerCase();
          v = vendors.find(
            (opt) =>
              (opt.vendor_code && opt.vendor_code.toLowerCase().includes(iv)) ||
              (opt.vendor_name && opt.vendor_name.toLowerCase().includes(iv)) ||
              (opt.pan_no && opt.pan_no.toLowerCase().includes(iv)) ||
              (opt.contact_no && opt.contact_no.toLowerCase().includes(iv))
          );
        }

        if (v) {
          setSelectedVendor(v);
          setVendorLookupError("");
          setFetchedPart(v.work_type || "");
          if (!initialData.id) {
            setNarration("");
            setField("particular", v.work_type || "");
          }
        } else {
          setSelectedVendor(null);
          setVendorLookupError("Vendor not found in Vendor Master");
          setFetchedPart("");
        }
      }
    },
    [formData.vendor_code, vendorMap, vendors, setField, initialData.id]
  );

  const handleInputChange = useCallback(
    (field) => (e) => setField(field, e.target.value),
    [setField]
  );

  const handleNumberChange = useCallback(
    (field) => (e) => {
      const raw = e.target.value;
      const value = raw === "" ? "" : Number(raw) || 0;
      setField(field, value);
    },
    [setField]
  );

  const handlePercentChange = useCallback(
    (field) => (e) => {
      const parsed = parsePercentInput(e.target.value);
      setField(field, parsed);
    },
    [setField]
  );

  const formatCurrency = useCallback((amount) => {
    if (amount === "" || amount == null || Number.isNaN(amount)) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  }, []);

  // Particular handling
  const handleParticularChange = useCallback(
    (e) => {
      const raw = e.target.value || "";
      if (selectedVendor && fetchedPart) {
        const left = fetchedPart;
        const hyphenIndex = raw.indexOf(" - ");
        if (hyphenIndex >= 0) {
          const right = raw.slice(hyphenIndex + 3).trim();
          setNarration(right);
          setField("particular", right ? `${left} - ${right}` : left);
        } else {
          if (raw.length < left.length) {
            setNarration("");
            setField("particular", left);
          } else if (raw.startsWith(left)) {
            const trailing = raw
              .slice(left.length)
              .replace(/^\s*-\s*/, "")
              .trim();
            setNarration(trailing);
            setField("particular", trailing ? `${left} - ${trailing}` : left);
          } else {
            const trailing = raw
              .replace(left, "")
              .replace(/^\s*-\s*/, "")
              .trim();
            setNarration(trailing);
            setField("particular", trailing ? `${left} - ${trailing}` : left);
          }
        }
      } else {
        setField("particular", raw);
        setNarration("");
        setFetchedPart("");
      }
    },
    [selectedVendor, fetchedPart, setField]
  );

  // combineParticular for final payload
  const combinedParticular = useMemo(() => {
    if (selectedVendor && fetchedPart) {
      const r = (narration || "").trim();
      return r ? `${fetchedPart} - ${r}` : fetchedPart;
    }
    return formData.particular || "";
  }, [selectedVendor, fetchedPart, narration, formData.particular]);

  const handleSubmit = useCallback(
    async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (!selectedVendor) {
        setVendorLookupError("Please select a valid vendor");
        return;
      }
      if (formData.gross_amount === "" || formData.gross_amount == null) {
        alert("Please fill in Gross Amount");
        return;
      }
      if (!combinedParticular) {
        alert("Please fill in Particular");
        return;
      }

      const payload = {
        ...formData,
        particular: combinedParticular,
        vendor_id: selectedVendor.id,
        vendor_code: selectedVendor.vendor_code,
        ...calculatedValues,
      };

      try {
        setSubmitting(true);
        await onSave(payload);
        onClose();
      } catch (err) {
        console.error("Save failed", err);
      } finally {
        setSubmitting(false);
      }
    },
    [
      selectedVendor,
      formData,
      combinedParticular,
      calculatedValues,
      onSave,
      onClose,
    ]
  );

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Box sx={modalStyle}>
        <Box
          sx={{
            p: 3,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">
            {initialData.id ? "Edit" : "Add"}{" "}
            {type === "SC" ? "Subcontractor" : "Hiring Service"} Entry
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{ maxHeight: "calc(90vh - 140px)", overflow: "auto", p: 3 }}
          component="form"
          onSubmit={handleSubmit}
        >
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Vendor Information
              </Typography>
              <Stack spacing={2}>
                {/* TextField: user types full code/name then presses Enter to lookup */}
                <TextField
                  label="Vendor (code / name / PAN / contact)"
                  size="small"
                  placeholder={`Search ${type}_XX or name`}
                  required
                  value={formData.vendor_code || ""}
                  onChange={(e) => setField("vendor_code", e.target.value)}
                  onKeyDown={handleVendorKeyDown}
                  error={!!vendorLookupError}
                  helperText={
                    vendorLookupError ||
                    `Type vendor code or name (then press Enter)`
                  }
                  InputProps={{
                    endAdornment: selectedVendor ? (
                      <InputAdornment position="end">
                        <Chip label="Found" size="small" />
                      </InputAdornment>
                    ) : undefined,
                  }}
                />

                {selectedVendor && (
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>Vendor:</strong> {selectedVendor.vendor_name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Work Type:</strong> {selectedVendor.work_type}
                    </Typography>
                    <Typography variant="body2">
                      <strong>PAN:</strong>{" "}
                      {selectedVendor.pan_no || "Not provided"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Contact:</strong>{" "}
                      {selectedVendor.contact_no || "Not provided"}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Invoice Details
              </Typography>
              <Stack spacing={2}>
                {/* SINGLE Particular field that keeps fetchedPart before hyphen */}
                <TextField
                  label={type === "SC" ? "Particular" : "Machinery/Vehicle"}
                  size="small"
                  value={formData.particular || ""}
                  onChange={handleParticularChange}
                  placeholder={
                    type === "SC"
                      ? fetchedPart
                        ? `${fetchedPart} - narration (optional)`
                        : "Work description"
                      : "Vehicle/Equipment details"
                  }
                  required
                  helperText={
                    selectedVendor
                      ? `Fetched: "${fetchedPart}". Add narration after " - " (optional).`
                      : ""
                  }
                />

                <FormControl size="small">
                  <InputLabel>Bill Type</InputLabel>
                  <Select
                    value={formData.bill_type || "H/Soft Copy"}
                    label="Bill Type"
                    onChange={handleInputChange("bill_type")}
                  >
                    <MenuItem value="H/Soft Copy">H/Soft Copy</MenuItem>
                    <MenuItem value="Hard Copy">Hard Copy</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
                gutterBottom
              >
                <CalculateIcon fontSize="small" /> Financial Calculations
              </Typography>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Gross Amount"
                    type="number"
                    size="small"
                    required
                    value={formData.gross_amount || ""}
                    onChange={handleNumberChange("gross_amount")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="GST Rate"
                    size="small"
                    value={
                      formData.gst_rate === "" || formData.gst_rate == null
                        ? ""
                        : String(formData.gst_rate)
                    }
                    onChange={handlePercentChange("gst_rate")}
                    placeholder="e.g. 5 or 5%"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="GST Amount"
                    size="small"
                    value={formatCurrency(calculatedValues.gst_amount)}
                    InputProps={{ readOnly: true }}
                    sx={{
                      "& input": { color: "orange.main", fontWeight: 500 },
                    }}
                  />
                  <TextField
                    label="Total Amount"
                    size="small"
                    value={formatCurrency(calculatedValues.total_amount)}
                    InputProps={{ readOnly: true }}
                    sx={{
                      "& input": { color: "primary.main", fontWeight: 600 },
                    }}
                  />

                  <FormControl size="small">
                    <InputLabel>TDS Rate</InputLabel>
                    <Select
                      value={formData.tds_rate || 1}
                      label="TDS Rate"
                      onChange={(e) =>
                        setField("tds_rate", Number(e.target.value))
                      }
                    >
                      <MenuItem value={1}>1%</MenuItem>
                      <MenuItem value={2}>2%</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Deductions & Withholdings
              </Typography>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="TDS"
                    size="small"
                    value={formatCurrency(calculatedValues.tds)}
                    InputProps={{ readOnly: true }}
                    sx={{ "& input": { color: "error.main", fontWeight: 500 } }}
                  />
                  <TextField
                    label="Debit/Deduction"
                    type="number"
                    size="small"
                    value={formData.debit_deduction || ""}
                    onChange={handleNumberChange("debit_deduction")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Retention (5%)"
                    size="small"
                    value={formatCurrency(calculatedValues.retention)}
                    InputProps={{ readOnly: true }}
                    sx={{
                      "& input": { color: "warning.main", fontWeight: 500 },
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="GST Hold"
                    type="number"
                    size="small"
                    value={
                      formData.gst_hold || calculatedValues.gst_amount || ""
                    }
                    onChange={handleNumberChange("gst_hold")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Other Deductions"
                    type="number"
                    size="small"
                    value={formData.other_deductions || ""}
                    onChange={handleNumberChange("other_deductions")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Final Settlement
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="NET TOTAL"
                  size="small"
                  value={formatCurrency(calculatedValues.net_total)}
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& input": {
                      color: "success.main",
                      fontWeight: 700,
                      fontSize: "1.05rem",
                    },
                  }}
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Advances"
                    type="number"
                    size="small"
                    value={formData.advances || ""}
                    onChange={handleNumberChange("advances")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Part Paid"
                    type="number"
                    size="small"
                    value={formData.part_paid || ""}
                    onChange={handleNumberChange("part_paid")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="PAYABLES"
                    size="small"
                    value={formatCurrency(calculatedValues.payables)}
                    InputProps={{ readOnly: true }}
                    sx={{
                      "& input": {
                        color:
                          calculatedValues.payables > 0
                            ? "error.main"
                            : "success.main",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                      },
                    }}
                  />
                </Box>

                <TextField
                  label="Notes"
                  value={formData.notes || ""}
                  onChange={handleInputChange("notes")}
                  multiline
                  rows={2}
                  size="small"
                  placeholder="Optional notes or comments"
                />
              </Stack>
            </Box>

            {calculatedValues.payables < 0 && (
              <Alert severity="warning">
                <strong>Warning:</strong> Payable amount is negative. Please
                check advances and part paid amounts.
              </Alert>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !selectedVendor}
          >
            {submitting
              ? "Saving..."
              : initialData.id
              ? "Update Entry"
              : "Create Entry"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

MonthlyEntryModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(["SC", "HS"]),
  vendors: PropTypes.array,
  initialData: PropTypes.object,
  onSave: PropTypes.func.isRequired,
};
