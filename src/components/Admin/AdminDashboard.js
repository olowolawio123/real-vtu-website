import React, { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";

const API_URL = "http://localhost:5000";

function formatMoney(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-NG");
  } catch {
    return "-";
  }
}

function getStatusStyle(status) {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("success") ||
    value.includes("completed")
  ) {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (
    value.includes("fail") ||
    value.includes("cancel") ||
    value.includes("error")
  ) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    background: "#fef3c7",
    color: "#92400e",
  };
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoadingAuth(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getToken = useCallback(async () => {
    if (!user) {
      throw new Error("You are not logged in.");
    }

    return user.getIdToken();
  }, [user]);

  const adminFetch = useCallback(
    async (endpoint) => {
      const token = await getToken();

      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "Admin access required."
          );
        }

        throw new Error(
          result.message ||
            "Unable to load admin data."
        );
      }

      return result;
    },
    [getToken]
  );

  const loadAdminData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        dashboardResult,
        usersResult,
        ordersResult,
        walletResult,
      ] = await Promise.all([
        adminFetch("/api/admin/dashboard"),
        adminFetch("/api/admin/users"),
        adminFetch("/api/admin/orders"),
        adminFetch(
          "/api/admin/wallet-transactions"
        ),
      ]);

      setDashboard(
        dashboardResult.data || null
      );

      setUsers(
        dashboardResult.data?.users
          ? usersResult.data || []
          : usersResult.data || []
      );

      setOrders(
        ordersResult.data || []
      );

      setWalletTransactions(
        walletResult.data || []
      );
    } catch (err) {
      console.error(
        "Admin dashboard error:",
        err
      );

      setError(
        err.message ||
          "Failed to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [user, adminFetch]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadAdminData();
  }, [user, loadAdminData]);

  if (loadingAuth) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.loadingText}>
          Checking authentication...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.messageCard}>
          <h2 style={styles.messageTitle}>
            Admin Dashboard
          </h2>

          <p style={styles.messageText}>
            Please log in with your admin
            account to continue.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.loadingText}>
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.errorCard}>
          <h2 style={styles.messageTitle}>
            Unable to load dashboard
          </h2>

          <p style={styles.messageText}>
            {error}
          </p>

          <button
            style={styles.primaryButton}
            onClick={loadAdminData}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard || {};

  const totalUsers =
    stats.users?.total || 0;

  const walletFunding =
    stats.wallet?.successfulFunding || 0;

  const walletDebits =
    stats.wallet?.totalDebits || 0;

  const walletRefunds =
    stats.wallet?.totalRefunds || 0;

  const dataOrders =
    stats.services?.data?.total || 0;

  const airtimeOrders =
    stats.services?.airtime?.total || 0;

  const electricityOrders =
    stats.services?.electricity?.total || 0;

  const cableTvOrders =
    stats.services?.cableTv?.total || 0;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.smallLabel}>
              ADMIN PANEL
            </div>

            <h1 style={styles.title}>
              VTU Dashboard
            </h1>

            <p style={styles.subtitle}>
              Welcome,{" "}
              {user.email ||
                "Administrator"}
            </p>
          </div>

          <button
            style={styles.refreshButton}
            onClick={loadAdminData}
          >
            Refresh
          </button>
        </div>

        {/* TABS */}
        <div style={styles.tabs}>
          <button
            onClick={() =>
              setActiveTab("overview")
            }
            style={{
              ...styles.tab,
              ...(activeTab === "overview"
                ? styles.activeTab
                : {}),
            }}
          >
            Overview
          </button>

          <button
            onClick={() =>
              setActiveTab("users")
            }
            style={{
              ...styles.tab,
              ...(activeTab === "users"
                ? styles.activeTab
                : {}),
            }}
          >
            Users
          </button>

          <button
            onClick={() =>
              setActiveTab("orders")
            }
            style={{
              ...styles.tab,
              ...(activeTab === "orders"
                ? styles.activeTab
                : {}),
            }}
          >
            Orders
          </button>

          <button
            onClick={() =>
              setActiveTab("wallet")
            }
            style={{
              ...styles.tab,
              ...(activeTab === "wallet"
                ? styles.activeTab
                : {}),
            }}
          >
            Wallet Transactions
          </button>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <div style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={totalUsers}
                icon="👥"
              />

              <StatCard
                title="Wallet Funding"
                value={formatMoney(
                  walletFunding
                )}
                icon="💰"
              />

              <StatCard
                title="Wallet Debits"
                value={formatMoney(
                  walletDebits
                )}
                icon="💳"
              />

              <StatCard
                title="Wallet Refunds"
                value={formatMoney(
                  walletRefunds
                )}
                icon="↩️"
              />

              <StatCard
                title="Data Orders"
                value={dataOrders}
                icon="📊"
              />

              <StatCard
                title="Airtime Orders"
                value={airtimeOrders}
                icon="📱"
              />

              <StatCard
                title="Electricity Orders"
                value={electricityOrders}
                icon="⚡"
              />

              <StatCard
                title="Cable TV Orders"
                value={cableTvOrders}
                icon="📺"
              />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  Recent Orders
                </h2>

                <button
                  style={styles.textButton}
                  onClick={() =>
                    setActiveTab("orders")
                  }
                >
                  View All
                </button>
              </div>

              <OrdersTable
                orders={orders.slice(0, 10)}
              />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  Recent Users
                </h2>

                <button
                  style={styles.textButton}
                  onClick={() =>
                    setActiveTab("users")
                  }
                >
                  View All
                </button>
              </div>

              <UsersTable
                users={users.slice(0, 10)}
              />
            </div>
          </>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                All Users ({users.length})
              </h2>
            </div>

            <UsersTable users={users} />
          </div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                All Orders ({orders.length})
              </h2>
            </div>

            <OrdersTable orders={orders} />
          </div>
        )}

        {/* WALLET TRANSACTIONS */}
        {activeTab === "wallet" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                Wallet Transactions (
                {walletTransactions.length})
              </h2>
            </div>

            <WalletTable
              transactions={
                walletTransactions
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <div style={styles.statTitle}>
          {title}
        </div>

        <div style={styles.statValue}>
          {value}
        </div>
      </div>
    </div>
  );
}

function UsersTable({ users }) {
  if (!users.length) {
    return (
      <div style={styles.empty}>
        No users found.
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              Email
            </th>

            <th style={styles.th}>
              Wallet
            </th>

            <th style={styles.th}>
              Created
            </th>
          </tr>
        </thead>

        <tbody>
          {users.map((item) => (
            <tr
              key={
                item.id ||
                item.uid
              }
            >
              <td style={styles.td}>
                <strong>
                  {item.email ||
                    "No email"}
                </strong>
              </td>

              <td style={styles.td}>
                {formatMoney(
                  item.wallet
                )}
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
    </div>
  );
}

function OrdersTable({ orders }) {
  if (!orders.length) {
    return (
      <div style={styles.empty}>
        No orders found.
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              Service
            </th>

            <th style={styles.th}>
              User
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
          {orders.map(
            (item, index) => (
              <tr
                key={
                  item.id ||
                  `${item.service}-${index}`
                }
              >
                <td style={styles.td}>
                  <strong>
                    {item.service ||
                      "Service"}
                  </strong>
                </td>

                <td style={styles.td}>
                  {item.email ||
                    item.uid ||
                    "-"}
                </td>

                <td style={styles.td}>
                  {formatMoney(
                    item.amount
                  )}
                </td>

                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.status,
                      ...getStatusStyle(
                        item.status
                      ),
                    }}
                  >
                    {item.status ||
                      "Unknown"}
                  </span>
                </td>

                <td style={styles.td}>
                  {formatDate(
                    item.createdAt
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function WalletTable({
  transactions,
}) {
  if (!transactions.length) {
    return (
      <div style={styles.empty}>
        No wallet transactions
        found.
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              User
            </th>

            <th style={styles.th}>
              Type
            </th>

            <th style={styles.th}>
              Service
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
          {transactions.map(
            (item, index) => (
              <tr
                key={
                  item.id ||
                  index
                }
              >
                <td style={styles.td}>
                  {item.email ||
                    item.uid ||
                    "-"}
                </td>

                <td style={styles.td}>
                  {item.type ||
                    "-"}
                </td>

                <td style={styles.td}>
                  {item.service ||
                    "-"}
                </td>

                <td style={styles.td}>
                  {formatMoney(
                    item.amount
                  )}
                </td>

                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.status,
                      ...getStatusStyle(
                        item.status
                      ),
                    }}
                  >
                    {item.status ||
                      "Unknown"}
                  </span>
                </td>

                <td style={styles.td}>
                  {formatDate(
                    item.createdAt
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "30px 20px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  smallLabel: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    color: "#64748b",
    marginBottom: "5px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    color: "#111827",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
  },

  refreshButton: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },

  tabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "25px",
    background: "#fff",
    padding: "8px",
    borderRadius: "12px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
  },

  tab: {
    border: "none",
    background: "transparent",
    padding: "11px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#64748b",
    fontWeight: "600",
  },

  activeTab: {
    background: "#111827",
    color: "#fff",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "25px",
  },

  statCard: {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  statTitle: {
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "5px",
  },

  statValue: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
  },

  section: {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "25px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
    overflow: "hidden",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
    gap: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#111827",
  },

  textButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "600",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "750px",
  },

  th: {
    textAlign: "left",
    padding: "13px 12px",
    borderBottom:
      "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  td: {
    padding: "15px 12px",
    borderBottom:
      "1px solid #f1f5f9",
    color: "#334155",
    fontSize: "14px",
  },

  status: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
  },

  empty: {
    padding: "35px",
    textAlign: "center",
    color: "#64748b",
  },

  centerPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
    padding: "20px",
  },

  loadingText: {
    color: "#64748b",
    fontSize: "16px",
  },

  messageCard: {
    background: "#fff",
    padding: "35px",
    borderRadius: "14px",
    maxWidth: "450px",
    width: "100%",
    textAlign: "center",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
  },

  errorCard: {
    background: "#fff",
    padding: "35px",
    borderRadius: "14px",
    maxWidth: "500px",
    width: "100%",
    textAlign: "center",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
  },

  messageTitle: {
    marginTop: 0,
    color: "#111827",
  },

  messageText: {
    color: "#64748b",
    lineHeight: 1.6,
    marginBottom: "20px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    padding: "12px 20px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
};