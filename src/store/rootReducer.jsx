// src/store/rootReducer.jsx
import { combineReducers } from "redux";

// match: src/features/auth/loginSlice.jsx
import authReducer from "../features/auth/loginslice";

// match: src/features/vendorMaster/VendorSlice.js
import vendorReducer from "../features/vendorMaster/VendorSlice";

// match: src/features/subContractor/subContractorSlice.js
import subcontractorReducer from "../features/subContractor/subContractorSlice";

// match: src/features/hiring/hiringSlice.js
import hiringReducer from "../features/hiring/hiringSlice";

// match: src/features/reports/reportsSlice.js
import reportsReducer from "../features/reports/reportsSlice";

// match: src/features/payments/paymentSlice.js
import paymentsReducer from "../features/payments/paymentSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  vendors: vendorReducer,
  subcontractor: subcontractorReducer,
  hiring: hiringReducer,
  reports: reportsReducer,
  payments: paymentsReducer,
});

export default rootReducer;
