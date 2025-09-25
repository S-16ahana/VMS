import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { dummyPayments } from "./dummyPayment";

// Async thunks
export const fetchPayments = createAsyncThunk(
  "payments/fetchPayments",
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return dummyPayments;
    } catch (error) {
      return rejectWithValue("Failed to fetch payments");
    }
  }
);

export const createPayment = createAsyncThunk(
  "payments/createPayment",
  async (paymentData, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const newPayment = {
        id: `pay-${Date.now()}`,
        ...paymentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return newPayment;
    } catch (error) {
      return rejectWithValue("Failed to create payment");
    }
  }
);

export const updatePayment = createAsyncThunk(
  "payments/updatePayment",
  async ({ id, ...paymentData }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedPayment = {
        id,
        ...paymentData,
        updatedAt: new Date().toISOString(),
      };

      return updatedPayment;
    } catch (error) {
      return rejectWithValue("Failed to update payment");
    }
  }
);

export const deletePayment = createAsyncThunk(
  "payments/deletePayment",
  async (paymentId, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return paymentId;
    } catch (error) {
      return rejectWithValue("Failed to delete payment");
    }
  }
);

export const markPaymentPaid = createAsyncThunk(
  "payments/markPaymentPaid",
  async (paymentId, { getState, rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const payment = getState().payments.payments.find(p => p.id === paymentId);
      const newStatus = payment?.status === 'paid' ? 'unpaid' : 'paid';
      return { id: paymentId, status: newStatus };
    } catch (error) {
      return rejectWithValue("Failed to update payment status");
    }
  }
);

const initialState = {
  payments: [],
  loading: false,
  error: null,
  netAmount: 0,
};

const paymentslice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    calculateNetAmount: (state, action) => {
      const { actualAmount = 0, advance = 0 } = action.payload || {};
      const actual = Number(actualAmount) || 0;
      const adv = Number(advance) || 0;
      state.netAmount = actual - adv;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createPayment.fulfilled, (state, action) => {
        const payload = {
          ...action.payload,
          netAmount: Number(action.payload.netAmount ?? (Number(action.payload.actualAmount || 0) - Number(action.payload.advance || 0)))
        };
        state.payments.unshift(payload);
      })

      .addCase(updatePayment.fulfilled, (state, action) => {
        const index = state.payments.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = {
            ...action.payload,
            netAmount: Number(action.payload.netAmount ?? (Number(action.payload.actualAmount || 0) - Number(action.payload.advance || 0)))
          };
        }
      })

      .addCase(deletePayment.fulfilled, (state, action) => {
        state.payments = state.payments.filter((p) => p.id !== action.payload);
      })

      .addCase(markPaymentPaid.fulfilled, (state, action) => {
        const index = state.payments.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index].status = action.payload.status;
          state.payments[index].updatedAt = new Date().toISOString();
        }
      });
  },
});

export const { clearError, calculateNetAmount } = paymentslice.actions;
export default paymentslice.reducer;
 