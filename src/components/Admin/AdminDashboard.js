import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";

function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Admin logout error:", error);
    }
  };

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>⚡</div>
            <div>
              <div style={styles.logoTitle}>INSTANT LOAD</div>
              <div style={styles.logoSub}>ADMIN PANEL</div>
            </div>
          </div>

          <nav style={styles.nav}>
            <button style={{ ...styles.navItem, ...styles.activeNav }}>
              <span>📊</span>
              Dashboard
            </button>

            <button style={styles.navItem}>
              <span>👥</span>
              Users
            </button>

            <button style={styles.navItem}>
              <span>💰</span>
              Deposits
            </button>

            <button style={styles.navItem}>
              <span>🔄</span>
              Transactions
            </button>

            <button style={styles.navItem}>
              <span>🎁</span>
              Referrals & Bonuses
            </button>

            <button style={styles.navItem}>
              <span>⚙️</span>
              Settings
            </button>
          </nav>
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          <span>🚪</span>
          Logout
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>Admin Dashboard</h1>
            <p style={styles.subtitle}>
              Manage INSTANT LOAD and monitor platform activity.
            </p>
          </div>

          <div style={styles.adminBadge}>
            <div style={styles.adminAvatar}>A</div>
            <div>
              <strong style={{ display: "block" }}>Administrator</strong>
              <span style={styles.adminText}>System Admin</span>
            </div>
          </div>
        </header>

        <section style={styles.cards}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>👥</div>
            <div>
              <p style={styles.cardLabel}>Total Users</p>
              <h2 style={styles.cardValue}>—</h2>
              <span style={styles.cardHint}>Coming from Firebase</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>💳</div>
            <div>
              <p style={styles.cardLabel}>Total Deposits</p>
              <h2 style={styles.cardValue}>₦0</h2>
              <span style={styles.cardHint}>Awaiting live data</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>🎁</div>
            <div>
              <p style={styles.cardLabel}>Referral Bonuses</p>
              <h2 style={styles.cardValue}>₦0</h2>
              <span style={styles.cardHint}>Referral system</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>🔄</div>
            <div>
              <p style={styles.cardLabel}>Transactions</p>
              <h2 style={styles.cardValue}>—</h2>
              <span style={styles.cardHint}>All platform transactions</span>
            </div>
          </div>
        </section>

        <section style={styles.grid}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h3 style={styles.panelTitle}>Referral Program</h3>
                <p style={styles.panelDescription}>
                  Configure and monitor customer referral rewards.
                </p>
              </div>

              <div style={styles.statusBadge}>
                ● Ready
              </div>
            </div>

            <div style={styles.referralBox}>
              <div>
                <span style={styles.smallLabel}>Current Bonus</span>
                <strong style={styles.bonusAmount}>₦0</strong>
              </div>

              <button style={styles.primaryButton}>
                Configure Bonus
              </button>
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h3 style={styles.panelTitle}>Platform Status</h3>
                <p style={styles.panelDescription}>
                  Current service status.
                </p>
              </div>
            </div>

            <div style={styles.statusList}>
              <div style={styles.statusRow}>
                <span>Website</span>
                <span style={styles.online}>● Online</span>
              </div>

              <div style={styles.statusRow}>
                <span>Wallet System</span>
                <span style={styles.online}>● Online</span>
              </div>

              <div style={styles.statusRow}>
                <span>Paystack</span>
                <span style={styles.online}>● Connected</span>
              </div>

              <div style={styles.statusRow}>
                <span>VTU Provider</span>
                <span style={styles.sandbox}>● Sandbox</span>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>Recent Activity</h3>
              <p style={styles.panelDescription}>
                Latest activity will appear here.
              </p>
            </div>

            <button style={styles.secondaryButton}>
              View All
            </button>
          </div>

          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <h3 style={styles.emptyTitle}>No activity yet</h3>
            <p style={styles.emptyText}>
              Once users start making deposits and transactions,
              their activity will appear here.
            </p>
          </div>
        </section>

        <footer style={styles.footer}>
          INSTANT LOAD Admin Panel • Secure platform management
        </footer>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        button {
          font-family: inherit;
        }

        @media (max-width: 850px) {
          .instant-admin-sidebar {
            display: none !important;
          }

          .instant-admin-main {
            margin-left: 0 !important;
            padding: 20px 14px 40px !important;
          }

          .instant-admin-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .instant-admin-cards {
            grid-template-columns: 1fr !important;
          }

          .instant-admin-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
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
  },

  adminText: {
    fontSize: 11,
    color: "#64748b",
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 20,
    marginBottom: 20,
  },

  panel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 15,
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

  statusBadge: {
    background: "#ecfdf5",
    color: "#047857",
    borderRadius: 20,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
  },

  referralBox: {
    marginTop: 22,
    padding: 18,
    borderRadius: 12,
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },

  smallLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    marginBottom: 4,
  },

  bonusAmount: {
    fontSize: 25,
  },

  primaryButton: {
    border: "none",
    background: "#111827",
    color: "#fff",
    padding: "11px 15px",
    borderRadius: 9,
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #dbe2ea",
    background: "#fff",
    color: "#172033",
    padding: "9px 13px",
    borderRadius: 9,
    fontWeight: 600,
    cursor: "pointer",
  },

  statusList: {
    marginTop: 18,
  },

  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
  },

  online: {
    color: "#059669",
    fontWeight: 700,
    fontSize: 12,
  },

  sandbox: {
    color: "#d97706",
    fontWeight: 700,
    fontSize: 12,
  },

  emptyState: {
    textAlign: "center",
    padding: "45px 20px",
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },

  emptyTitle: {
    margin: "5px 0",
    fontSize: 16,
  },

  emptyText: {
    maxWidth: 450,
    margin: "7px auto 0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
  },

  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 30,
  },
};

export default AdminDashboard;