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
import Account from "./components/Account/Account";
import FundWallet from "./components/Dashboard/FundWallet";
import DataPurchase from "./components/Dashboard/DataPurchase";
import AirtimePurchase from "./components/Dashboard/AirtimePurchase";
import ElectricityPurchase from "./components/Dashboard/ElectricityPurchase";
import CableTvPurchase from "./components/Dashboard/CableTvPurchase";
import TransactionHistory from "./components/Dashboard/TransactionHistory";
import Security from "./components/Account/Security";
import Profile from "./components/Account/Profile";
import Beneficiaries from "./components/Account/Beneficiaries";
import HelpSupport from "./components/Account/HelpSupport";

import AdminDashboard from "./components/Admin/AdminDashboard";

import UserLayout from "./components/Navigation/UserLayout";

import { ToastContainer } from "react-toastify";

function App() {
  return (
    <Router>
      <Routes>

        {/* =========================
            AUTHENTICATION
        ========================== */}

        <Route
          path="/"
          element={<Signup />}
        />

        <Route
          path="/signup"
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


        {/* =========================
            USER AREA
            Bottom navigation is added
            ONCE through UserLayout.
        ========================== */}

        <Route element={<UserLayout />}>


        <Route  path="/beneficiaries"
         element={<Beneficiaries />} 
         />

         <Route path="/help-support" 
         element={<HelpSupport />} 
         />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/account"
            element={<Account />}
          />

          <Route
  path="/profile"
  element={<Profile />}
/>

          <Route
            path="/security"
            element={<Security />}
          />

          <Route
            path="/fund-wallet"
            element={<FundWallet />}
          />

          <Route
            path="/buy-data"
            element={<DataPurchase />}
          />

          <Route
            path="/buy-airtime"
            element={<AirtimePurchase />}
          />

          <Route
            path="/buy-electricity"
            element={<ElectricityPurchase />}
          />

          <Route
            path="/electricity"
            element={<ElectricityPurchase />}
          />

          <Route
            path="/buy-cable-tv"
            element={<CableTvPurchase />}
          />

          <Route
            path="/tv"
            element={<CableTvPurchase />}
          />

          <Route
            path="/transactions"
            element={<TransactionHistory />}
          />

        </Route>


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