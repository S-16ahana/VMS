import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Tooltip,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import ReusableTable from "../../components/common/ReusableTable";
import PaymentModal from "./paymentModal";
import {
  fetchPayments,
  createPayment,
  updatePayment,
  deletePayment,
  markPaymentPaid,
} from "./paymentSlice";
import { fetchVendors } from "../vendorMaster/VendorSlice";

/* -------------------------
   Helper: vendor code normalization & lookup
   ------------------------- */
const normalizeVendorCode = (code) => {
  if (!code) return "";
  const raw = String(code).trim();
  const parts = raw.split(/[_\s-]+/);
  if (parts.length === 1) return parts[0].toUpperCase();
  const prefix = parts[0].toUpperCase();
  const numPart = parts.slice(1).join("");
  const num = parseInt(numPart.replace(/\D/g, ""), 10);
  return isNaN(num) ? `${prefix}_${numPart}` : `${prefix}_${num}`;
};

const sameVendorCode = (a = "", b = "") => {
  if (!a || !b) return false;
  const na = normalizeVendorCode(a);
  const nb = normalizeVendorCode(b);
  const pa = na.split("_");
  const pb = nb.split("_");
  if (pa[0] !== pb[0]) return false;
  if (pa.length === 1 && pb.length === 1) return pa[0] === pb[0];
  const naNum = pa[1] ? Number(pa[1]) : NaN;
  const nbNum = pb[1] ? Number(pb[1]) : NaN;
  if (!isNaN(naNum) && !isNaN(nbNum)) return naNum === nbNum;
  return na === nb;
};

const findVendorByCode = (vendors = [], code) => {
  if (!code || !vendors || vendors.length === 0) return null;
  const exact = vendors.find(
    (v) =>
      String(v.vendor_code || "")
        .trim()
        .toUpperCase() === String(code).trim().toUpperCase()
  );
  if (exact) return exact;
  return vendors.find((v) => sameVendorCode(v.vendor_code, code));
};

/* -------------------------
   CSV export helper
   ------------------------- */
const toCsvRow = (arr) =>
  arr
    .map((cell) => {
      if (cell == null) return "";
      const str = String(cell);
      // escape double quotes and wrap fields that contain comma/newline/quote in quotes
      const needsQuotes = /[,"\n\r]/.test(str);
      const escaped = str.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    })
    .join(",");

const downloadFile = (filename, content, mime = "text/csv;charset=utf-8;") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* -------------------------
   Payments component
   ------------------------- */
const Payments = () => {
  const dispatch = useDispatch();
  const {
    payments = [],
    loading,
    error,
  } = useSelector((s) => s.payments || {});
  const { items: vendors = [], loading: vendorsLoading } = useSelector(
    (s) => s.vendors || { items: [], loading: false }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchPayments());
  }, [dispatch]);

  const formatCurrency = (a) =>
    a || a === 0 ? `₹${Number(a).toLocaleString("en-IN")}` : "₹0";
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "";

  const getVendorName = useCallback(
    (vendorCode) => {
      const v = findVendorByCode(vendors, vendorCode);
      return v?.vendor_name || vendorCode || "";
    },
    [vendors]
  );

  const tableData = useMemo(
    () =>
      (payments || []).map((payment) => ({
        ...payment,
        vendor_name: getVendorName(payment.vendorCode || payment.vendor_code),
      })),
    [payments, getVendorName]
  );

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?"))
      return;
    await dispatch(deletePayment(id));
  };

  const handleMarkPaid = async (id) => {
    await dispatch(markPaymentPaid(id));
  };

  const handleAdd = () => {
    setEditingPayment(null);
    setModalOpen(true);
  };

  const handleSave = async (paymentData) => {
    if (editingPayment) {
      await dispatch(updatePayment({ id: editingPayment.id, ...paymentData }));
    } else {
      await dispatch(createPayment(paymentData));
    }
    dispatch(fetchPayments());
  };

  // EXPORT: include requested fields (and a few niceties)
  const exportCsv = useCallback(() => {
    if (!tableData || tableData.length === 0) {
      alert("No data to export");
      return;
    }

    // define headers (the order and labels you want in CSV)
    const headers = [
      "Date",
      "Vendor Code",
      "Vendor Name",
      "Actual Amount",
      "Advance",
      "Net Amount",
      "Status",
      "Narration",
      "IFSC",
      "Account Number",
      "Site",
      "Requested By",
      "Created At",
      "Updated At",
    ];

    // build rows
    const rows = tableData.map((r) => [
      r.date ? formatDate(r.date) : "",
      r.vendorCode || r.vendor_code || "",
      r.vendor_name || "",
      r.actualAmount != null ? Number(r.actualAmount).toString() : "",
      r.advance != null ? Number(r.advance).toString() : "",
      r.netAmount != null ? Number(r.netAmount).toString() : "",
      r.status || "",
      r.narration || "",
      r.ifsc || "",
      r.accountNo || r.account_no || "",
      r.site || "",
      r.reqBy || r.req_by || "",
      r.createdAt || "",
      r.updatedAt || "",
    ]);

    const csvContent = [toCsvRow(headers), ...rows.map(toCsvRow)].join("\r\n");
    const filename = `payments_export_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    downloadFile(filename, csvContent);
  }, [tableData]);

  const renderWithTooltip = (value, maxLen = 40) => {
    if (!value && value !== 0) return "";
    const str = String(value);
    if (str.length <= maxLen) return str;
    const truncated = `${str.slice(0, maxLen - 3)}...`;
    return (
      <Tooltip title={str} arrow>
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "inline-block",
            maxWidth: 360,
          }}
        >
          {truncated}
        </span>
      </Tooltip>
    );
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        size: 110,
        Cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "vendorCode",
        header: "Vendor Code",
        size: 140,
        Cell: ({ row }) =>
          row.original.vendorCode || row.original.vendor_code || "",
      },
      {
        accessorKey: "vendor_name",
        header: "Vendor Name",
        size: 200,
      },
      {
        accessorKey: "actualAmount",
        header: "Actual Amount",
        size: 130,
        Cell: ({ row }) => formatCurrency(row.original.actualAmount),
      },
      {
        accessorKey: "advance",
        header: "Advance",
        size: 110,
        Cell: ({ row }) => formatCurrency(row.original.advance),
      },
      {
        accessorKey: "netAmount",
        header: "Net Amount",
        size: 120,
        Cell: ({ row }) => formatCurrency(row.original.netAmount),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
      },
      {
        accessorKey: "narration",
        header: "Narration",
        size: 300,
        Cell: ({ row }) => renderWithTooltip(row.original.narration, 60),
      },
      {
        accessorKey: "ifsc",
        header: "IFSC",
        size: 120,
        Cell: ({ row }) => row.original.ifsc || "",
      },
      {
        accessorKey: "accountNo",
        header: "Account No",
        size: 160,
        Cell: ({ row }) =>
          row.original.accountNo || row.original.account_no || "",
      },
      {
        accessorKey: "site",
        header: "Site",
        size: 180,
        Cell: ({ row }) => renderWithTooltip(row.original.site, 40),
      },
      {
        accessorKey: "reqBy",
        header: "Requested By",
        size: 160,
        Cell: ({ row }) => row.original.reqBy || row.original.req_by || "",
      },
      {
        accessorKey: "actions",
        header: "Actions",
        size: 160,
        enableSorting: false,
        Cell: ({ row }) => {
          const p = row.original;
          return (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleEdit(p)}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(p.id)}
                title="Delete"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [handleEdit, handleDelete, handleMarkPaid]
  );

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 1 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: 600,
            color: "primary.main",
            mb: 0,
          }}
        >
          Vendor Payments
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" color="text.secondary">
            Manage payments to vendors and subcontractors
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="contained" onClick={handleAdd}>
              + Add Payment
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 1,
        }}
      >
        <ReusableTable
          columns={columns}
          data={tableData}
          options={{
            enableColumnResizing: true,
            columnResizeMode: "onEnd",
            layoutMode: "grid",
            enableStickyHeader: true,
            enablePagination: true,
            enableSorting: true,
            enableColumnFilters: true,
            enableGlobalFilter: true,
            initialState: {
              pagination: { pageSize: 20 },
              density: "compact",
              sorting: [{ id: "date", desc: true }],
            },
            state: { isLoading: loading || vendorsLoading },
            muiTableContainerProps: {
              sx: { maxHeight: "calc(100vh - 260px)", overflowX: "auto" },
            },
          }}
        />
      </Box>

      <PaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPayment(null);
        }}
        vendors={vendors}
        initialData={editingPayment || {}}
        onSave={handleSave}
      />
    </Box>
  );
};

export default Payments;
