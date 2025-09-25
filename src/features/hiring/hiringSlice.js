// src/features/hiring/hiringslice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { initialMonthlyEntries } from "../vendorMaster/dummyData";

// Helper function for calculations (similar to subcontractor but with different retention logic)
export const calculateHiringEntryTotals = (values) => {
  const gross = parseFloat(values.gross_amount) || 0;
  const gstRate = parseFloat(values.gst_rate) || 0.18;
  const tdsRate = parseFloat(values.tds_rate) || 0.02; // Default 2% for hiring services

  const gst = Math.round(gross * gstRate);
  const total = gross + gst;
  const tds = Math.round(gross * tdsRate);
  const retention = parseFloat(values.retention) || 0; // No default retention for HS

  const debit = parseFloat(values.debit_deduction) || 0;
  const gstHold = parseFloat(values.gst_hold) || gst;
  const others = parseFloat(values.other_deductions) || 0;

  const sumDeductions = tds + debit + retention + gstHold + others;
  const netTotal = total - sumDeductions;

  const advances = parseFloat(values.advances) || 0;
  const partPaid = parseFloat(values.part_paid) || 0;
  const payables = netTotal - advances - partPaid;

  return {
    gst_amount: gst,
    total_amount: total,
    tds,
    retention,
    net_total: netTotal,
    payables,
  };
};

// Async thunks
export const fetchHiringEntries = createAsyncThunk(
  "hiring/fetchEntries",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const entries = initialMonthlyEntries.filter(
        (entry) =>
          entry.type === "HS" && entry.year === year && entry.month === month
      );

      return entries;
    } catch (error) {
      return rejectWithValue("Failed to fetch hiring entries");
    }
  }
);

export const createHiringEntry = createAsyncThunk(
  "hiring/createEntry",
  async (entryData, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const calculatedValues = calculateHiringEntryTotals(entryData);

      const newEntry = {
        id: `entry-hs-${Date.now()}`,
        type: "HS",
        ...entryData,
        ...calculatedValues,
      };

      return newEntry;
    } catch (error) {
      return rejectWithValue("Failed to create hiring entry");
    }
  }
);

export const updateHiringEntry = createAsyncThunk(
  "hiring/updateEntry",
  async ({ id, ...entryData }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const calculatedValues = calculateHiringEntryTotals(entryData);

      return {
        id,
        ...entryData,
        ...calculatedValues,
      };
    } catch (error) {
      return rejectWithValue("Failed to update hiring entry");
    }
  }
);

export const deleteHiringEntry = createAsyncThunk(
  "hiring/deleteEntry",
  async (entryId, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return entryId;
    } catch (error) {
      return rejectWithValue("Failed to delete hiring entry");
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

const hiringslice = createSlice({
  name: "hiring",
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
      .addCase(fetchHiringEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHiringEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchHiringEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createHiringEntry.fulfilled, (state, action) => {
        state.entries.unshift(action.payload);
      })

      .addCase(updateHiringEntry.fulfilled, (state, action) => {
        const index = state.entries.findIndex(
          (e) => e.id === action.payload.id
        );
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })

      .addCase(deleteHiringEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((e) => e.id !== action.payload);
      });
  },
});

export const { setSelectedPeriod, clearError } = hiringslice.actions;
export default hiringslice.reducer;
