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

        {/* =========================
            AUTHENTICATION
        ========================== */}

        {/* Default page */}
        <Route
          path="/"
          element={<Signup />}
        />

        {/* Signup */}
        <Route
          path="/signup"
          element={<Signup />}
        />

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Password Reset */}
        <Route
          path="/reset"
          element={<ResetPassword />}
        />


        {/* =========================
            DASHBOARD
        ========================== */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        {/* =========================
            WALLET
        ========================== */}

        <Route
          path="/fund-wallet"
          element={<FundWallet />}
        />


        {/* =========================
            DATA
        ========================== */}

        <Route
          path="/buy-data"
          element={<DataPurchase />}
        />


        {/* =========================
            AIRTIME
        ========================== */}

        <Route
          path="/buy-airtime"
          element={<AirtimePurchase />}
        />


        {/* =========================
            ELECTRICITY
        ========================== */}

        <Route
          path="/buy-electricity"
          element={<ElectricityPurchase />}
        />

        <Route
          path="/electricity"
          element={<ElectricityPurchase />}
        />


        {/* =========================
            CABLE TV
        ========================== */}

        <Route
          path="/buy-cable-tv"
          element={<CableTvPurchase />}
        />

        <Route
          path="/tv"
          element={<CableTvPurchase />}
        />


        {/* =========================
            TRANSACTIONS
        ========================== */}

        <Route
          path="/transactions"
          element={<TransactionHistory />}
        />


        {/* =========================
            ADMIN
        ========================== */}

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

      </Routes>

      <ToastContainer
        position="top-right"
      />
    </Router>
  );
}

export default App;