import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";

function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M3 7V5a2 2 0 0 1 2-2h13" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" />
    </svg>
  );
}

function UserLayout() {
  const location = useLocation();

  const isHome =
    location.pathname === "/dashboard";

  const isWallet =
    location.pathname === "/fund-wallet";

  const isAccount =
    location.pathname === "/account" ||
    location.pathname === "/security";

  return (
    <>
      <Outlet />

      <nav className="instant-mobile-bottom-nav">

        <NavLink
          to="/dashboard"
          className={`instant-mobile-nav-item ${
            isHome ? "active" : ""
          }`}
        >
          <span className="instant-mobile-nav-icon">
            <HomeIcon />
          </span>

          <span>Home</span>
        </NavLink>


        <NavLink
          to="/fund-wallet"
          className={`instant-mobile-nav-item ${
            isWallet ? "active" : ""
          }`}
        >
          <span className="instant-mobile-nav-icon">
            <WalletIcon />
          </span>

          <span>Wallet</span>
        </NavLink>


        <NavLink
          to="/account"
          className={`instant-mobile-nav-item ${
            isAccount ? "active" : ""
          }`}
        >
          <span className="instant-mobile-nav-icon">
            <AccountIcon />
          </span>

          <span>Account</span>
        </NavLink>

      </nav>


      <style>{`

        /* =========================================
           INSTANT LOAD MOBILE BOTTOM NAV
           Hidden completely on desktop
        ========================================= */

        .instant-mobile-bottom-nav {
          display: none;
        }


        @media (max-width: 768px) {

          .instant-mobile-bottom-nav {
            position: fixed;

            left: 12px;
            right: 12px;
            bottom: 12px;

            height: 68px;

            display: flex;

            align-items: center;
            justify-content: space-around;

            padding: 6px;

            background: rgba(255, 255, 255, 0.97);

            border: 1px solid rgba(0, 0, 0, 0.07);

            border-radius: 22px;

            box-shadow:
              0 12px 35px rgba(0, 0, 0, 0.12),
              0 3px 10px rgba(0, 0, 0, 0.05);

            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);

            z-index: 99999;
          }


          .instant-mobile-nav-item {
            flex: 1;

            height: 56px;

            display: flex;

            flex-direction: column;

            align-items: center;
            justify-content: center;

            gap: 4px;

            color: #777;

            text-decoration: none;

            border-radius: 17px;

            font-size: 11px;

            font-weight: 600;

            transition:
              color 0.2s ease,
              background 0.2s ease,
              transform 0.2s ease;
          }


          .instant-mobile-nav-icon {
            display: flex;

            align-items: center;
            justify-content: center;

            transition:
              transform 0.2s ease;
          }


          .instant-mobile-nav-item.active {
            color: #0d6efd;

            background: rgba(13, 110, 253, 0.10);
          }


          .instant-mobile-nav-item.active
          .instant-mobile-nav-icon {
            transform: translateY(-1px);
          }


          .instant-mobile-nav-item:active {
            transform: scale(0.94);
          }


          /*
             Give the page enough bottom space so
             buttons/content aren't hidden behind
             the fixed navigation.
          */

          body {
            padding-bottom: 92px;
          }
        }


        @media (min-width: 769px) {

          .instant-mobile-bottom-nav {
            display: none !important;
          }

          body {
            padding-bottom: 0;
          }
        }

      `}</style>
    </>
  );
}

export default UserLayout;