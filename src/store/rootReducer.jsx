// src/store/rootReducer.js
import { combineReducers } from "redux";
import authReducer from "../features/auth/loginslice";
import vendorReducer from "../features/vendorMaster/vendorslice";
import subcontractorReducer from "../features/subContractor/subcontractorslice";
import hiringReducer from "../features/hiring/hiringslice";
import reportsReducer from "../features/reports/reportsslice";
import paymentsReducer from "../features/payments/paymentslice"; // <- new

const rootReducer = combineReducers({
  auth: authReducer,
  vendors: vendorReducer,
  subcontractor: subcontractorReducer,
  hiring: hiringReducer,
  reports: reportsReducer,
  payments: paymentsReducer, // <- added
});

export default rootReducer;
