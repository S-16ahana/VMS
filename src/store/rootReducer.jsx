// src/store/rootReducer.jsx
import { combineReducers } from "redux";

// auth → file is loginSlice.jsx
import authReducer from "../features/auth/loginslice";

// vendorMaster → file is VendorSlice.js
import vendorReducer from "../features/vendorMaster/vendorslice";

// subContractor → file is subContractorSlice.js
import subcontractorReducer from "../features/subContractor/subcontractorslice";

// hiring → file is hiringSlice.js
import hiringReducer from "../features/hiring/hiringslice";

// reports → file is reportsSlice.js
import reportsReducer from "../features/reports/reportsslice";

// payments → file is paymentSlice.js
import paymentsReducer from "../features/payments/paymentslice";

const rootReducer = combineReducers({
  auth: authReducer,
  vendors: vendorReducer,
  subcontractor: subcontractorReducer,
  hiring: hiringReducer,
  reports: reportsReducer,
  payments: paymentsReducer,
});

export default rootReducer;
