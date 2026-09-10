import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import Signup from "./components/Auth/Signup";
import Login from "./components/Auth/Login";
import ResetPassword from "./components/Auth/ResetPassword";

import Dashboard from "./components/Dashboard/Dashboard";
import FundWallet from "./components/Dashboard/FundWallet";
import DataPurchase from "./components/Dashboard/DataPurchase";
import AirtimePurchase from "./components/Dashboard/AirtimePurchase";
import ElectricityPurchase from "./components/Dashboard/ElectricityPurchase";
import CableTvPurchase from "./components/Dashboard/CableTvPurchase";
import TransactionHistory from "./components/Dashboard/TransactionHistory";

import AdminDashboard from "./components/Admin/AdminDashboard";

import { ToastContainer } from "react-toastify";

function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication */}
        <Route
          path="/"
          element={<Signup />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/reset"
          element={<ResetPassword />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* Wallet */}
        <Route
          path="/fund-wallet"
          element={<FundWallet />}
        />

        {/* Data */}
        <Route
          path="/buy-data"
          element={<DataPurchase />}
        />

        {/* Airtime */}
        <Route
          path="/buy-airtime"
          element={<AirtimePurchase />}
        />

        {/* Electricity */}
        <Route
          path="/buy-electricity"
          element={<ElectricityPurchase />}
        />

        <Route
          path="/electricity"
          element={<ElectricityPurchase />}
        />

        {/* Cable TV */}
        <Route
          path="/buy-cable-tv"
          element={<CableTvPurchase />}
        />

        <Route
          path="/tv"
          element={<CableTvPurchase />}
        />

        {/* Transactions */}
        <Route
          path="/transactions"
          element={<TransactionHistory />}
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />
      </Routes>

      <ToastContainer position="top-right" />
    </Router>
  );
}

export default App;