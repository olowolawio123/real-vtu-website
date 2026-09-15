import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { auth } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

function AdminDashboard() {
  const navigate = useNavigate();

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  const [dashboard, setDashboard] = useState(null);
  const profit = dashboard?.profit || {};

  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [walletTransactions, setWalletTransactions] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [search, setSearch] = useState("");

  const [currentUser, setCurrentUser] = useState(null);

  const getAuthHeaders = async (user) => {
    if (!user) {
      throw new Error("Admin is not logged in");
    }

    const token = await user.getIdToken(true);

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const loadAdminData = async (user = currentUser) => {
    try {
      setLoading(true);
      setError("");

      const headers = await getAuthHeaders(user);

      const [
        dashboardResponse,
        usersResponse,
        ordersResponse,
        walletResponse,
      ] = await Promise.all([
        axios.get(
          `${apiUrl}/api/admin/dashboard`,
          { headers }
        ),

        axios.get(
          `${apiUrl}/api/admin/users`,
          { headers }
        ),

        axios.get(
          `${apiUrl}/api/admin/orders`,
          { headers }
        ),

        axios.get(
          `${apiUrl}/api/admin/wallet-transactions`,
          { headers }
        ),
      ]);

      if (dashboardResponse.data?.success) {
        setDashboard(
          dashboardResponse.data.data
        );
      }

      if (usersResponse.data?.success) {
        setUsers(
          usersResponse.data.data || []
        );
      }

      if (ordersResponse.data?.success) {
        setOrders(
          ordersResponse.data.data || []
        );
      }

      if (walletResponse.data?.success) {
        setWalletTransactions(
          walletResponse.data.data || []
        );
      }
    } catch (err) {
      console.error(
        "Admin dashboard loading error:",
        err
      );

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        setError(
          "Admin authentication failed. Please log in again."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load admin dashboard."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          console.error(
            "Admin dashboard: No authenticated user"
          );

          navigate("/login");
          return;
        }

        setCurrentUser(user);

        try {
          await loadAdminData(user);
        } catch (error) {
          console.error(
            "Admin dashboard loading error:",
            error
          );
        }
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error(
        "Admin logout error:",
        error
      );
    }
  };

  const formatMoney = (amount) => {
    return `₦${Number(amount || 0).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const statusClass = (status) => {
    switch (
      String(status || "").toLowerCase()
    ) {
      case "successful":
        return styles.statusSuccess;

      case "failed":
        return styles.statusFailed;

      case "refunded":
        return styles.statusRefunded;

      case "processing":
      case "pending":
        return styles.statusProcessing;

      default:
        return styles.statusUnknown;
    }
  };

  const filteredUsers = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) return users;

    return users.filter((user) =>
      [
        user.email,
        user.uid,
        user.id,
      ]
        .filter(Boolean)
        .some((item) =>
          String(item)
            .toLowerCase()
            .includes(value)
        )
    );
  }, [users, search]);

  const filteredOrders = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) return orders;

    return orders.filter((order) =>
      [
        order.uid,
        order.mobileNumber,
        order.network,
        order.service,
        order.reference,
        order.requestId,
        order.cableProvider,
        order.smartCardNumber,
        order.electricityProvider,
        order.meterNumber,
      ]
        .filter(Boolean)
        .some((item) =>
          String(item)
            .toLowerCase()
            .includes(value)
        )
    );
  }, [orders, search]);

  const totalServiceTransactions =
    dashboard?.services
      ? Object.values(
          dashboard.services
        ).reduce(
          (total, service) =>
            total + Number(service.total || 0),
          0
        )
      : 0;

  const successfulServiceTransactions =
    dashboard?.services
      ? Object.values(
          dashboard.services
        ).reduce(
          (total, service) =>
            total +
            Number(service.successful || 0),
          0
        )
      : 0;

  const totalSuccessfulFunding =
    Number(
      dashboard?.wallet?.successfulFunding || 0
    );

  const totalDebits =
    Number(
      dashboard?.wallet?.totalDebits || 0
    );

  const totalRefunds =
    Number(
      dashboard?.wallet?.totalRefunds || 0
    );

  const renderDashboard = () => (
    <>
      <section
        style={styles.cards}
        className="instant-admin-cards"
      >
        <StatCard
          icon="👥"
          label="Total Users"
          value={
            dashboard?.users?.total ?? 0
          }
          hint="Registered customers"
        />

        <StatCard
          icon="💰"
          label="Total Sales"
          value={formatMoney(
            profit.totalSales ?? 0
          )}
          hint="Successful service sales"
        />

        <StatCard
          icon="🏷️"
          label="Provider Cost"
          value={formatMoney(
            profit.totalProviderCost ?? 0
          )}
          hint="Estimated provider cost"
        />

        <StatCard
          icon="📈"
          label="Total Profit"
          value={formatMoney(
            profit.totalProfit ?? 0
          )}
          hint={`Margin ${
            profit.profitMargin ?? 0
          }%`}
        />

        <StatCard
          icon="📅"
          label="Today's Profit"
          value={formatMoney(
            profit.todayProfit ?? 0
          )}
          hint="Profit generated today"
        />
      </section>

      <section
        style={styles.grid}
        className="instant-admin-grid"
      >
        <div
          style={styles.panel}
          className="panel"
        >
          <div
            style={styles.panelHeader}
            className="panelHeader"
          >
            <div>
              <h3 style={styles.panelTitle}>
                Service Overview
              </h3>

              <p style={styles.panelDescription}>
                Current platform transaction activity.
              </p>
            </div>

            <button
              onClick={() =>
                loadAdminData()
              }
              style={styles.secondaryButton}
            >
              ↻ Refresh
            </button>
          </div>

          <div
            style={styles.serviceGrid}
            className="serviceGrid"
          >
            <ServiceBox
              icon="🌐"
              name="Data"
              data={dashboard?.services?.data}
            />

            <ServiceBox
              icon="📱"
              name="Airtime"
              data={dashboard?.services?.airtime}
            />

            <ServiceBox
              icon="⚡"
              name="Electricity"
              data={
                dashboard?.services?.electricity
              }
            />

            <ServiceBox
              icon="📺"
              name="Cable TV"
              data={
                dashboard?.services?.cableTv
              }
            />
          </div>
        </div>

        <div
          style={styles.panel}
          className="panel"
        >
          <div
            style={styles.panelHeader}
            className="panelHeader"
          >
            <div>
              <h3 style={styles.panelTitle}>
                Platform Status
              </h3>

              <p style={styles.panelDescription}>
                Current system status.
              </p>
            </div>
          </div>

          <div style={styles.statusList}>
            <StatusRow
              label="Website"
              value="Online"
              color="green"
            />

            <StatusRow
              label="Wallet System"
              value="Online"
              color="green"
            />

            <StatusRow
              label="Paystack"
              value="Connected"
              color="green"
            />

            <StatusRow
              label="VTU Provider"
              value="Live"
              color="green"
            />

            <StatusRow
              label="Admin API"
              value="Connected"
              color="green"
            />
          </div>
        </div>
      </section>

      <section
        style={styles.panel}
        className="panel"
      >
        <div
          style={styles.panelHeader}
          className="panelHeader"
        >
          <div>
            <h3 style={styles.panelTitle}>
              Recent Transactions
            </h3>

            <p style={styles.panelDescription}>
              Latest customer service transactions.
            </p>
          </div>

          <button
            onClick={() =>
              setActiveSection("transactions")
            }
            style={styles.secondaryButton}
          >
            View All
          </button>
        </div>

        <TransactionTable
          orders={orders.slice(0, 8)}
          formatMoney={formatMoney}
          formatDate={formatDate}
          statusClass={statusClass}
        />
      </section>
    </>
  );

  const renderUsers = () => (
    <section
      style={styles.panel}
      className="panel"
    >
      <div
        style={styles.panelHeader}
        className="panelHeader"
      >
        <div>
          <h3 style={styles.panelTitle}>
            Users
          </h3>

          <p style={styles.panelDescription}>
            Manage registered INSTANT LOAD customers.
          </p>
        </div>

        <span style={styles.countBadge}>
          {users.length} users
        </span>
      </div>

      <div style={styles.searchRow}>
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search by email or user ID..."
          style={styles.searchInput}
          className="searchInput"
        />
      </div>

      <div
        style={styles.tableWrapper}
        className="tableWrapper"
      >
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>User ID</th>
              <th style={styles.th}>Wallet</th>
              <th style={styles.th}>Joined</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td style={styles.td}>
                  {user.email || "—"}
                </td>

                <td style={styles.td}>
                  <span style={styles.mono}>
                    {user.uid || user.id}
                  </span>
                </td>

                <td style={styles.td}>
                  <strong>
                    {formatMoney(user.wallet)}
                  </strong>
                </td>

                <td style={styles.td}>
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <EmptyState text="No users found." />
        )}
      </div>
    </section>
  );

  const renderTransactions = () => (
    <section
      style={styles.panel}
      className="panel"
    >
      <div
        style={styles.panelHeader}
        className="panelHeader"
      >
        <div>
          <h3 style={styles.panelTitle}>
            Transactions
          </h3>

          <p style={styles.panelDescription}>
            Airtime, data, electricity and cable transactions.
          </p>
        </div>

        <span style={styles.countBadge}>
          {orders.length} transactions
        </span>
      </div>

      <div style={styles.searchRow}>
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search transactions..."
          style={styles.searchInput}
          className="searchInput"
        />
      </div>

      <TransactionTable
        orders={filteredOrders}
        formatMoney={formatMoney}
        formatDate={formatDate}
        statusClass={statusClass}
      />
    </section>
  );

  const renderDeposits = () => {
    const deposits =
      walletTransactions.filter(
        (item) =>
          String(item.type || "").toLowerCase() ===
          "credit"
      );

    return (
      <section
        style={styles.panel}
        className="panel"
      >
        <div
          style={styles.panelHeader}
          className="panelHeader"
        >
          <div>
            <h3 style={styles.panelTitle}>
              Wallet Deposits
            </h3>

            <p style={styles.panelDescription}>
              Wallet funding activity.
            </p>
          </div>

          <span style={styles.countBadge}>
            {deposits.length} deposits
          </span>
        </div>

        <div
          style={styles.tableWrapper}
          className="tableWrapper"
        >
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>

            <tbody>
              {deposits
                .slice(0, 100)
                .map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <span style={styles.mono}>
                        {item.uid || "—"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <strong>
                        {formatMoney(
                          Math.abs(item.amount)
                        )}
                      </strong>
                    </td>

                    <td style={styles.td}>
                      <span
                        style={statusClass(
                          item.status
                        )}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {item.reference || "—"}
                    </td>

                    <td style={styles.td}>
                      {formatDate(
                        item.createdAt
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {deposits.length === 0 && (
            <EmptyState text="No deposits found." />
          )}
        </div>
      </section>
    );
  };

  const renderReferrals = () => (
    <section
      style={styles.panel}
      className="panel"
    >
      <div
        style={styles.panelHeader}
        className="panelHeader"
      >
        <div>
          <h3 style={styles.panelTitle}>
            Referrals & Bonuses
          </h3>

          <p style={styles.panelDescription}>
            Referral activity and wallet bonuses.
          </p>
        </div>
      </div>

      <div
        style={styles.referralGrid}
        className="referralGrid"
      >
        <div style={styles.referralCard}>
          <span style={styles.cardLabel}>
            Referral Data
          </span>

          <strong style={styles.referralValue}>
            Available through referral system
          </strong>
        </div>

        <div style={styles.referralCard}>
          <span style={styles.cardLabel}>
            Wallet Refunds
          </span>

          <strong style={styles.referralValue}>
            {formatMoney(totalRefunds)}
          </strong>
        </div>
      </div>
    </section>
  );

  const renderSettings = () => (
    <section
      style={styles.panel}
      className="panel"
    >
      <div
        style={styles.panelHeader}
        className="panelHeader"
      >
        <div>
          <h3 style={styles.panelTitle}>
            Admin Settings
          </h3>

          <p style={styles.panelDescription}>
            Current platform configuration.
          </p>
        </div>
      </div>

      <div style={styles.settingsList}>
        <SettingRow
          label="VTU Provider"
          value="CheapDataHub"
        />

        <SettingRow
          label="Payment Gateway"
          value="Paystack"
        />

        <SettingRow
          label="Platform"
          value="INSTANT LOAD"
        />

        <SettingRow
          label="Environment"
          value="Live"
        />
      </div>
    </section>
  );

  const renderContent = () => {
    if (activeSection === "users") {
      return renderUsers();
    }

    if (activeSection === "deposits") {
      return renderDeposits();
    }

    if (activeSection === "transactions") {
      return renderTransactions();
    }

    if (activeSection === "referrals") {
      return renderReferrals();
    }

    if (activeSection === "settings") {
      return renderSettings();
    }

    return renderDashboard();
  };

  return (
    <div
      style={styles.page}
      className="instant-admin-page"
    >
      <aside
        style={styles.sidebar}
        className="instant-admin-sidebar"
      >
        <div>
          <div
            style={styles.logo}
            className="logo"
          >
            <div style={styles.logoIcon}>
              ⚡
            </div>

            <div>
              <div style={styles.logoTitle}>
                INSTANT LOAD
              </div>

              <div style={styles.logoSub}>
                ADMIN PANEL
              </div>
            </div>
          </div>

          <nav
            style={styles.nav}
            className="nav"
          >
            <NavButton
              active={
                activeSection === "dashboard"
              }
              icon="📊"
              label="Dashboard"
              onClick={() => {
                setActiveSection("dashboard");
                setSearch("");
              }}
            />

            <NavButton
              active={
                activeSection === "users"
              }
              icon="👥"
              label="Users"
              onClick={() => {
                setActiveSection("users");
                setSearch("");
              }}
            />

            <NavButton
              active={
                activeSection === "deposits"
              }
              icon="💰"
              label="Deposits"
              onClick={() => {
                setActiveSection("deposits");
                setSearch("");
              }}
            />

            <NavButton
              active={
                activeSection === "transactions"
              }
              icon="🔄"
              label="Transactions"
              onClick={() => {
                setActiveSection("transactions");
                setSearch("");
              }}
            />

            <NavButton
              active={
                activeSection === "referrals"
              }
              icon="🎁"
              label="Referrals & Bonuses"
              onClick={() => {
                setActiveSection("referrals");
                setSearch("");
              }}
            />

            <NavButton
              active={
                activeSection === "settings"
              }
              icon="⚙️"
              label="Settings"
              onClick={() => {
                setActiveSection("settings");
                setSearch("");
              }}
            />
          </nav>
        </div>

        <button
          onClick={handleLogout}
          style={styles.logoutButton}
          className="logoutButton"
        >
          <span>🚪</span>
          Logout
        </button>
      </aside>

      <main
        style={styles.main}
        className="instant-admin-main"
      >
        <header
          style={styles.header}
          className="instant-admin-header"
        >
          <div>
            <h1 style={styles.heading}>
              {activeSection === "dashboard"
                ? "Admin Dashboard"
                : activeSection === "users"
                ? "Users"
                : activeSection === "deposits"
                ? "Deposits"
                : activeSection ===
                  "transactions"
                ? "Transactions"
                : activeSection === "referrals"
                ? "Referrals & Bonuses"
                : "Settings"}
            </h1>

            <p style={styles.subtitle}>
              Manage INSTANT LOAD and monitor
              platform activity.
            </p>
          </div>

          <div
            style={styles.adminBadge}
            className="adminBadge"
          >
            <div style={styles.adminAvatar}>
              A
            </div>

            <div>
              <strong
                style={{
                  display: "block",
                }}
              >
                Administrator
              </strong>

              <span style={styles.adminText}>
                System Admin
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div
            style={styles.errorBox}
            className="errorBox"
          >
            <strong>Admin error:</strong>{" "}
            {error}

            <button
              onClick={() =>
                loadAdminData()
              }
              style={styles.errorButton}
              className="errorButton"
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>
            <div style={styles.loadingIcon}>
              ⚡
            </div>

            <h3>Loading admin data...</h3>

            <p>
              Connecting to the INSTANT LOAD
              platform.
            </p>
          </div>
        ) : (
          renderContent()
        )}

        <footer style={styles.footer}>
          INSTANT LOAD Admin Panel • Secure
          platform management
        </footer>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        body {
          -webkit-text-size-adjust: 100%;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        input {
          max-width: 100%;
        }

        .instant-admin-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .instant-admin-main {
          width: calc(100% - 250px);
        }

        .instant-admin-cards {
          width: 100%;
        }

        .instant-admin-grid {
          width: 100%;
        }

        .tableWrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .tableWrapper::-webkit-scrollbar {
          height: 6px;
        }

        .tableWrapper::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .tableWrapper::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }

        @media (max-width: 1100px) {
          .instant-admin-cards {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .instant-admin-grid {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 850px) {
          .instant-admin-sidebar {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            bottom: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            padding: 12px !important;
            display: block !important;
          }

          .instant-admin-sidebar > div:first-child {
            width: 100%;
          }

          .instant-admin-sidebar .logo {
            padding: 4px 6px 14px !important;
          }

          .instant-admin-sidebar .nav {
            display: grid !important;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 6px !important;
          }

          .instant-admin-sidebar .nav button {
            justify-content: center !important;
            text-align: center !important;
            padding: 10px 5px !important;
            font-size: 11px !important;
            gap: 4px !important;
            min-width: 0 !important;
            line-height: 1.25 !important;
          }

          .instant-admin-sidebar .logoutButton {
            margin-top: 10px !important;
          }

          .instant-admin-main {
            width: 100% !important;
            margin-left: 0 !important;
            padding: 20px 14px 40px !important;
          }

          .instant-admin-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 15px !important;
            margin-bottom: 20px !important;
          }

          .instant-admin-header h1 {
            font-size: 25px !important;
          }

          .instant-admin-header .adminBadge {
            width: 100% !important;
          }

          .instant-admin-cards {
            grid-template-columns:
              1fr !important;
            gap: 10px !important;
          }

          .instant-admin-grid {
            grid-template-columns:
              1fr !important;
            gap: 12px !important;
          }

          .instant-admin-main .panel {
            width: 100% !important;
          }

          .instant-admin-main .panelHeader {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .instant-admin-main .panelHeader > button {
            width: 100% !important;
          }

          .instant-admin-main .serviceGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .instant-admin-main .referralGrid {
            grid-template-columns:
              1fr !important;
          }

          .instant-admin-main .searchInput {
            max-width: 100% !important;
            width: 100% !important;
          }
        }

        @media (max-width: 600px) {
          .instant-admin-sidebar {
            padding: 10px !important;
          }

          .instant-admin-sidebar .nav {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .instant-admin-sidebar .nav button {
            min-height: 44px !important;
            font-size: 11px !important;
          }

          .instant-admin-main {
            padding: 14px 10px 30px !important;
          }

          .instant-admin-header {
            margin-bottom: 16px !important;
          }

          .instant-admin-header h1 {
            font-size: 22px !important;
            line-height: 1.2 !important;
          }

          .instant-admin-header p {
            font-size: 12px !important;
          }

          .instant-admin-main .panel {
            padding: 15px !important;
            border-radius: 12px !important;
            margin-bottom: 12px !important;
          }

          .instant-admin-main .panelTitle {
            font-size: 16px !important;
          }

          .instant-admin-main .panelDescription {
            font-size: 11px !important;
          }

          .instant-admin-main .serviceGrid {
            grid-template-columns:
              1fr !important;
          }

          .instant-admin-main .serviceNumbers {
            grid-template-columns:
              repeat(3, minmax(0, 1fr)) !important;
          }

          .instant-admin-main .tableWrapper {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .instant-admin-main table {
            min-width: 700px !important;
          }

          .instant-admin-main .errorBox {
            font-size: 12px !important;
          }

          .instant-admin-main .errorButton {
            display: block !important;
            margin: 10px 0 0 !important;
            width: 100% !important;
          }

          .instant-admin-main .settingRow {
            gap: 15px !important;
          }

          .instant-admin-main .settingRow strong {
            text-align: right !important;
          }

          .instant-admin-main .footer {
            font-size: 10px !important;
          }
        }

        @media (max-width: 380px) {
          .instant-admin-sidebar .nav {
            grid-template-columns:
              1fr 1fr !important;
          }

          .instant-admin-main {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .instant-admin-main .panel {
            padding: 12px !important;
          }

          .instant-admin-main .card {
            padding: 15px !important;
          }

          .instant-admin-header h1 {
            font-size: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}) {
  return (
    <div
      style={styles.card}
      className="card"
    >
      <div style={styles.cardIcon}>
        {icon}
      </div>

      <div
        style={{
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <p style={styles.cardLabel}>
          {label}
        </p>

        <h2
          style={{
            ...styles.cardValue,
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </h2>

        <span style={styles.cardHint}>
          {hint}
        </span>
      </div>
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navItem,
        ...(active
          ? styles.activeNav
          : {}),
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ServiceBox({
  icon,
  name,
  data,
}) {
  const service = data || {};

  return (
    <div style={styles.serviceBox}>
      <div style={styles.serviceTop}>
        <span style={styles.serviceIcon}>
          {icon}
        </span>

        <strong>{name}</strong>
      </div>

      <div
        style={styles.serviceNumbers}
        className="serviceNumbers"
      >
        <div>
          <span style={styles.miniLabel}>
            Total
          </span>

          <strong>
            {service.total || 0}
          </strong>
        </div>

        <div>
          <span style={styles.miniLabel}>
            Successful
          </span>

          <strong style={{ color: "#059669" }}>
            {service.successful || 0}
          </strong>
        </div>

        <div>
          <span style={styles.miniLabel}>
            Failed
          </span>

          <strong style={{ color: "#dc2626" }}>
            {service.failed || 0}
          </strong>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  color,
}) {
  return (
    <div style={styles.statusRow}>
      <span>{label}</span>

      <span
        style={
          color === "green"
            ? styles.online
            : styles.sandbox
        }
      >
        ● {value}
      </span>
    </div>
  );
}

function TransactionTable({
  orders,
  formatMoney,
  formatDate,
  statusClass,
}) {
  return (
    <div
      style={styles.tableWrapper}
      className="tableWrapper"
    >
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              Service
            </th>

            <th style={styles.th}>
              Customer
            </th>

            <th style={styles.th}>
              Details
            </th>

            <th style={styles.th}>
              Amount
            </th>

            <th style={styles.th}>
              Status
            </th>

            <th style={styles.th}>
              Date
            </th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr
              key={`${order.service}-${order.id}`}
            >
              <td style={styles.td}>
                <strong>
                  {order.service === "cabletv"
                    ? "Cable TV"
                    : order.service
                      ? order.service
                          .charAt(0)
                          .toUpperCase() +
                        order.service.slice(1)
                      : "—"}
                </strong>
              </td>

              <td style={styles.td}>
                <span style={styles.mono}>
                  {order.mobileNumber ||
                    order.uid ||
                    "—"}
                </span>
              </td>

              <td style={styles.td}>
                {order.service ===
                "electricity"
                  ? order.meterNumber ||
                    order.electricityProvider ||
                    "Electricity"
                  : order.service ===
                    "cabletv"
                  ? order.smartCardNumber ||
                    order.cableProvider ||
                    "Cable TV"
                  : order.plan ||
                    order.network ||
                    "—"}
              </td>

              <td style={styles.td}>
                <strong>
                  {formatMoney(
                    order.amount
                  )}
                </strong>
              </td>

              <td style={styles.td}>
                <span
                  style={statusClass(
                    order.status
                  )}
                >
                  {order.status}
                </span>
              </td>

              <td style={styles.td}>
                {formatDate(
                  order.createdAt
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && (
        <EmptyState text="No transactions found." />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>
        📋
      </div>

      <h3 style={styles.emptyTitle}>
        {text}
      </h3>
    </div>
  );
}

function SettingRow({
  label,
  value,
}) {
  return (
    <div
      style={styles.settingRow}
      className="settingRow"
    >
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  sidebar: {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    background: "#111827",
    color: "#fff",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    zIndex: 100,
    overflowY: "auto",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 10px 30px",
  },

  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#fff",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    flexShrink: 0,
  },

  logoTitle: {
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: 0.5,
  },

  logoSub: {
    fontSize: 10,
    opacity: 0.55,
    marginTop: 3,
    letterSpacing: 1.5,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  navItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#cbd5e1",
    padding: "13px 14px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 14,
    textAlign: "left",
    cursor: "pointer",
    minWidth: 0,
  },

  activeNav: {
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
  },

  logoutButton: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "13px 14px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 14,
    cursor: "pointer",
  },

  main: {
    marginLeft: 250,
    minHeight: "100vh",
    padding: "34px 34px 50px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 30,
  },

  heading: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: 14,
  },

  adminBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    padding: "9px 13px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    flexShrink: 0,
  },

  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#111827",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },

  adminText: {
    fontSize: 11,
    color: "#64748b",
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 20,
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
    overflow: "hidden",
  },

  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 21,
    flexShrink: 0,
  },

  cardLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
  },

  cardValue: {
    margin: "4px 0",
    fontSize: 23,
    fontWeight: 800,
  },

  cardHint: {
    color: "#94a3b8",
    fontSize: 10,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "1.2fr 0.8fr",
    gap: 20,
    marginBottom: 20,
  },

  panel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    minWidth: 0,
    overflow: "hidden",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 15,
    minWidth: 0,
  },

  panelTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 750,
  },

  panelDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 12,
  },

  countBadge: {
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: 20,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  secondaryButton: {
    border: "1px solid #dbe2ea",
    background: "#fff",
    color: "#172033",
    padding: "9px 13px",
    borderRadius: 9,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  serviceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 20,
  },

  serviceBox: {
    background: "#f8fafc",
    border: "1px solid #eef2f7",
    borderRadius: 12,
    padding: 15,
    minWidth: 0,
  },

  serviceTop: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 15,
  },

  serviceIcon: {
    fontSize: 19,
  },

  serviceNumbers: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 8,
  },

  miniLabel: {
    display: "block",
    fontSize: 9,
    color: "#94a3b8",
    marginBottom: 3,
  },

  statusList: {
    marginTop: 18,
  },

  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 0",
    borderBottom:
      "1px solid #f1f5f9",
    fontSize: 13,
  },

  online: {
    color: "#059669",
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  sandbox: {
    color: "#d97706",
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  tableWrapper: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    marginTop: 20,
    WebkitOverflowScrolling: "touch",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 750,
  },

  th: {
    textAlign: "left",
    padding: "12px 10px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
    borderBottom:
      "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 10px",
    fontSize: 12,
    borderBottom:
      "1px solid #f1f5f9",
    whiteSpace: "nowrap",
  },

  mono: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11,
  },

  statusSuccess: {
    display: "inline-block",
    background: "#ecfdf5",
    color: "#047857",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
  },

  statusFailed: {
    display: "inline-block",
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
  },

  statusRefunded: {
    display: "inline-block",
    background: "#fff7ed",
    color: "#c2410c",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
  },

  statusProcessing: {
    display: "inline-block",
    background: "#fffbeb",
    color: "#b45309",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
  },

  statusUnknown: {
    display: "inline-block",
    background: "#f1f5f9",
    color: "#475569",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
  },

  searchRow: {
    marginTop: 20,
    display: "flex",
    gap: 10,
    width: "100%",
  },

  searchInput: {
    width: "100%",
    maxWidth: 450,
    border:
      "1px solid #dbe2ea",
    borderRadius: 10,
    padding: "11px 13px",
    outline: "none",
    fontSize: 13,
    background: "#fff",
  },

  referralGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 15,
    marginTop: 20,
  },

  referralCard: {
    background: "#f8fafc",
    borderRadius: 12,
    padding: 20,
    border:
      "1px solid #eef2f7",
    minWidth: 0,
  },

  referralValue: {
    display: "block",
    marginTop: 8,
    fontSize: 17,
    overflowWrap: "anywhere",
  },

  settingsList: {
    marginTop: 20,
  },

  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    padding: "15px 0",
    borderBottom:
      "1px solid #f1f5f9",
    fontSize: 13,
  },

  loading: {
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "70px 20px",
    textAlign: "center",
  },

  loadingIcon: {
    fontSize: 35,
  },

  errorBox: {
    background: "#fef2f2",
    border:
      "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 13,
  },

  errorButton: {
    marginLeft: 10,
    border: "none",
    background: "#991b1b",
    color: "#fff",
    borderRadius: 7,
    padding: "7px 10px",
    cursor: "pointer",
  },

  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
  },

  emptyIcon: {
    fontSize: 30,
  },

  emptyTitle: {
    margin: "7px 0",
    fontSize: 15,
  },

  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 30,
  },
};

export default AdminDashboard;