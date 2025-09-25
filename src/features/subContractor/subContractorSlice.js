// src/features/subContractor/subContractorSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { initialMonthlyEntries } from "../vendorMaster/dummyData";

/**
 * Utility to normalize a rate that may be provided as:
 *  - 5    -> means 5%  -> returns 0.05
 *  - 0.05 -> already decimal -> returns 0.05
 *  - 1    -> means 1%  -> returns 0.01
 *  - "", null -> returns 0
 */
function normalizeRate(rate) {
  const r = Number(rate);
  // if not a finite number or it's 0 -> return 0
  if (!isFinite(r) || r === 0) return 0;
  // treat any value >= 1 as a percent entered as an integer (e.g., 1 => 1% => 0.01)
  // so divide by 100 for values >= 1, otherwise assume it's already a decimal (e.g., 0.01).
  return r >= 1 ? r / 100 : r;
}
function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// Helper function for calculations (updated to normalize percent inputs)
export const calculateEntryTotals = (values = {}) => {
  const gross = parseFloat(values.gross_amount) || 0;

  // normalize gst and tds rates (accept 5 or 0.05)
  const gstRate = normalizeRate(values.gst_rate);
  const tdsRate = normalizeRate(values.tds_rate);

  const gst = round2(gross * gstRate);
  const total = round2(gross + gst);

  const tds = round2(gross * tdsRate);
  const retention = round2(gross * 0.05); // 5% default retention

  const debit = parseFloat(values.debit_deduction) || 0;
  // If user provided gst_hold (non-empty), use it. Otherwise default to calculated gst.
  const gstHold =
    values.gst_hold !== "" &&
    values.gst_hold !== undefined &&
    values.gst_hold !== null
      ? round2(parseFloat(values.gst_hold) || 0)
      : gst;

  const others = parseFloat(values.other_deductions) || 0;

  // In your previous logic you did: netTotal = total - sumDeductions
  const sumDeductions = tds + debit + retention + gstHold + others;
  const netTotal = round2(total - sumDeductions);

  const advances = parseFloat(values.advances) || 0;
  const partPaid = parseFloat(values.part_paid) || 0;
  const payables = round2(netTotal - advances - partPaid);

  return {
    gst_amount: gst,
    total_amount: total,
    tds,
    retention,
    gst_hold: gstHold,
    net_total: netTotal,
    payables,
  };
};

// Async thunks
export const fetchSubcontractorEntries = createAsyncThunk(
  "subcontractor/fetchEntries",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      // Fake delay to simulate API
      await new Promise((resolve) => setTimeout(resolve, 500));

      const entries = initialMonthlyEntries.filter(
        (entry) =>
          entry.type === "SC" && entry.year === year && entry.month === month
      );

      return entries;
    } catch (error) {
      return rejectWithValue("Failed to fetch subcontractor entries");
    }
  }
);

export const createSubcontractorEntry = createAsyncThunk(
  "subcontractor/createEntry",
  async (entryData, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const calculatedValues = calculateEntryTotals(entryData);

      const newEntry = {
        id: `entry-${Date.now()}`,
        type: "SC",
        ...entryData,
        ...calculatedValues,
      };

      return newEntry;
    } catch (error) {
      return rejectWithValue("Failed to create entry");
    }
  }
);

export const updateSubcontractorEntry = createAsyncThunk(
  "subcontractor/updateEntry",
  async ({ id, ...entryData }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const calculatedValues = calculateEntryTotals(entryData);

      return {
        id,
        ...entryData,
        ...calculatedValues,
      };
    } catch (error) {
      return rejectWithValue("Failed to update entry");
    }
  }
);

export const deleteSubcontractorEntry = createAsyncThunk(
  "subcontractor/deleteEntry",
  async (entryId, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return entryId;
    } catch (error) {
      return rejectWithValue("Failed to delete entry");
    }
  }
);

const initialState = {
  entries: [],
  loading: false,
  error: null,
  selectedYear: 2025,
  selectedMonth: 7,
};

const subContractorSlice = createSlice({
  name: "subcontractor",
  initialState,
  reducers: {
    setSelectedPeriod: (state, action) => {
      state.selectedYear = action.payload.year;
      state.selectedMonth = action.payload.month;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubcontractorEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubcontractorEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchSubcontractorEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createSubcontractorEntry.fulfilled, (state, action) => {
        state.entries.unshift(action.payload);
      })

      .addCase(updateSubcontractorEntry.fulfilled, (state, action) => {
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })

      .addCase(deleteSubcontractorEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((e) => e.id !== action.payload);
      });
  },
});

export const { setSelectedPeriod, clearError } = subContractorSlice.actions;
export default subContractorSlice.reducer;
