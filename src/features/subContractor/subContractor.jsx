// src/features/subContractor/subContractor.jsx
import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import Loader from "../../components/common/Loader";
import {
  fetchSubcontractorEntries,
  createSubcontractorEntry,
  updateSubcontractorEntry,
  deleteSubcontractorEntry,
  setSelectedPeriod,
} from "./subContractorSlice";

import { fetchVendors } from "../vendorMaster/VendorSlice";

// Lazy load heavy table & modal
const ReusableTable = lazy(() => import("../../components/common/ReusableTable"));
const MonthlyEntryModal = lazy(() => import("./MonthlyEntryModal"));

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const SubContractor = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { entries = [], loading, error, selectedYear, selectedMonth } =
    useSelector((s) => s.subcontractor);
  // vendors slice and loading flag
  const { items: vendors = [], loading: vendorsLoading = false } = useSelector((s) => s.vendors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    dispatch(fetchSubcontractorEntries({ year: selectedYear, month: selectedMonth }));

    // ensure vendors are loaded so modal Autocomplete works
    if (!vendors || vendors.length === 0) {
      dispatch(fetchVendors());
    }
  }, [dispatch, selectedYear, selectedMonth, vendors]);

  const scVendors = useMemo(() => vendors.filter((v) => v.type === "SC"), [vendors]);

  const formatCurrency = useCallback((a) => (a ? `₹${a.toLocaleString("en-IN")}` : "₹0"), []);

  const tableData = useMemo(
    () =>
      (entries || []).map((e) => {
        const v = vendors.find((v) => v.vendor_code === e.vendor_code);
        return { ...e, vendor_name: v?.vendor_name || e.vendor_code, work_type: v?.work_type || "" };
      }),
    [entries, vendors]
  );

  // handlers
  const handleEdit = useCallback((entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!id) return;
      if (window.confirm("Are you sure you want to delete this entry?")) {
        const res = await dispatch(deleteSubcontractorEntry(id));
        if (res?.payload || res?.meta?.requestStatus === "fulfilled") {
          dispatch(fetchSubcontractorEntries({ year: selectedYear, month: selectedMonth }));
        }
      }
    },
    [dispatch, selectedYear, selectedMonth]
  );

  const handleAdd = useCallback(() => {
    setEditingEntry(null);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (entryData) => {
      if (editingEntry) {
        await dispatch(updateSubcontractorEntry({ id: editingEntry.id, ...entryData }));
      } else {
        await dispatch(createSubcontractorEntry({ ...entryData, year: selectedYear, month: selectedMonth }));
      }
      setModalOpen(false);
      setEditingEntry(null);
      dispatch(fetchSubcontractorEntries({ year: selectedYear, month: selectedMonth }));
    },
    [dispatch, editingEntry, selectedYear, selectedMonth]
  );

  const handlePeriodChange = useCallback(
    (field, value) =>
      dispatch(
        setSelectedPeriod({
          year: field === "year" ? value : selectedYear,
          month: field === "month" ? value : selectedMonth,
        })
      ),
    [dispatch, selectedYear, selectedMonth]
  );

  // columns - include handlers in deps so closures are fresh
  const columns = useMemo(
    () => [
      {
        accessorKey: "vendor_code",
        header: "Vendor Code",
        minSize: 80,
        maxSize: 140,
        muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
        Cell: ({ row }) => <Chip label={row.original.vendor_code} color="primary" size="small" />,
      },
      {
        accessorKey: "vendor_name",
        header: "Vendor Name",
        minSize: 180,
        size: 250,
        grow: 2,
        muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
      },
      {
        accessorKey: "particular",
        header: "Particular",
        minSize: 180,
        grow: 2,
        muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
      },
      { accessorKey: "bill_type", header: "Bill Type", minSize: 120, size: 120 },
      // numeric fields (right-aligned)
      ...[
        { key: "gross_amount", header: "GROSS" },
        { key: "gst_amount", header: "GST 18%" },
        { key: "total_amount", header: "TOTAL" },
        { key: "tds", header: "TDS" },
        { key: "debit_deduction", header: "Debit/Deduction" },
        { key: "retention", header: "Retention 5%" },
        { key: "gst_hold", header: "GST Hold" },
        { key: "net_total", header: "NET TOTAL" },
        { key: "advances", header: "Advances" },
        { key: "part_paid", header: "Part Paid" },
        { key: "payables", header: "Payables" },
      ].map((col) => ({
        accessorKey: col.key,
        header: col.header,
        minSize: 120,
        size: 130,
        muiTableBodyCellProps: {
          sx: {
            textAlign: "right",
            whiteSpace: "nowrap",
            fontWeight: col.key === "net_total" || col.key === "payables" ? 700 : 500,
            color:
              col.key === "gst_amount"
                ? "orange.main"
                : col.key === "tds"
                ? "error.main"
                : col.key === "retention"
                ? "warning.main"
                : col.key === "net_total"
                ? "success.main"
                : undefined,
          },
        },
        Cell: ({ row }) => {
          if (col.key === "payables") {
            const v = row.original.payables || 0;
            return (
              <Box sx={{ textAlign: "right", fontWeight: 700, color: v > 0 ? "error.main" : "success.main" }}>
                {formatCurrency(v)}
              </Box>
            );
          }
          return <Box sx={{ textAlign: "right" }}>{formatCurrency(row.original[col.key])}</Box>;
        },
      })),
      // actions for admin
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              enableSorting: false,
              minSize: 100,
              size: 100,
              muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
              Cell: ({ row }) => (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <IconButton size="small" color="primary" onClick={() => handleEdit(row.original)} aria-label="edit">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.original.id)} aria-label="delete">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ),
            },
          ]
        : []),
    ],
    [isAdmin, handleEdit, handleDelete, formatCurrency]
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600, color: "primary.main", mb: 1 }}
        >
          Sub Contractor Monthly Entries
        </Typography>

        {/* Period selection + add button */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select value={selectedYear} label="Year" onChange={(e) => handlePeriodChange("year", e.target.value)}>
                {[2024, 2025, 2026].map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select value={selectedMonth} label="Month" onChange={(e) => handlePeriodChange("month", e.target.value)}>
                {monthNames.map((m, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="h6" sx={{ ml: 2 }}>
              {monthNames[selectedMonth - 1]} {selectedYear}
            </Typography>
          </Box>

          <Button variant="contained" onClick={handleAdd}>
            + Add Entry
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table container */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, overflow: "hidden", boxShadow: 1 }}>
        <Suspense fallback={<Loader message="Loading table..." />}>
          <ReusableTable
            columns={columns}
            data={tableData}
            options={{
              getRowId: (row) => row.id ?? `${row.vendor_code}-${row.particular ?? ""}`,
              maxHeight: "60vh",
              enableColumnResizing: true,
              columnResizeMode: "onEnd",
              layoutMode: "grid",
              enableStickyHeader: true,
              enablePagination: true,
              enableSorting: true,
              enableColumnFilters: true,
              enableGlobalFilter: true,
              initialState: { pagination: { pageSize: 15 }, density: "compact" },
              state: { isLoading: loading },
              muiTableContainerProps: { sx: { maxHeight: "calc(100vh - 260px)", overflowX: "auto" } },
              muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
              muiTableProps: { sx: { tableLayout: "fixed", "& .MuiTableCell-root": { fontSize: "0.875rem", px: 1 } } },
            }}
          />
        </Suspense>
      </Box>

      {/* Modal */}
      <Suspense fallback={<Loader message="Loading dialog..." />}>
        <MonthlyEntryModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingEntry(null);
          }}
          type="SC"
          vendors={scVendors}
          vendorsLoading={vendorsLoading}
          initialData={editingEntry || {}}
          onSave={handleSave}
        />
      </Suspense>
    </Box>
  );
};

export default React.memo(SubContractor);
