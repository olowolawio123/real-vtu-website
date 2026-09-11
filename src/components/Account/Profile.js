import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../firebase";
import { toast } from "react-toastify";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // LOAD AUTHENTICATED USER
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (authUser) => {
        setUser(authUser);

        if (authUser) {
          setDisplayName(
            authUser.displayName || ""
          );
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const handleSave = async () => {
    try {
      if (!user) {
        toast.error(
          "Please log in again."
        );
        return;
      }

      const cleanName =
        displayName.trim();

      if (!cleanName) {
        toast.error(
          "Please enter your name."
        );
        return;
      }

      if (cleanName.length < 2) {
        toast.error(
          "Name must be at least 2 characters."
        );
        return;
      }

      if (cleanName.length > 60) {
        toast.error(
          "Name cannot be longer than 60 characters."
        );
        return;
      }

      setSaving(true);

      await updateProfile(user, {
        displayName: cleanName,
      });

      setUser({
        ...user,
        displayName: cleanName,
      });

      toast.success(
        "Profile updated successfully."
      );
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      toast.error(
        "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // GET INITIALS
  // =====================================================

  const getInitials = () => {
    const name =
      user?.displayName?.trim();

    if (name) {
      const parts =
        name.split(/\s+/);

      if (parts.length >= 2) {
        return (
          parts[0][0] +
          parts[parts.length - 1][0]
        ).toUpperCase();
      }

      return name
        .substring(0, 2)
        .toUpperCase();
    }

    if (user?.email) {
      return user.email
        .substring(0, 2)
        .toUpperCase();
    }

    return "IL";
  };

  // =====================================================
  // ACCOUNT DATE
  // =====================================================

  const getAccountDate = () => {
    if (!user?.metadata?.creationTime) {
      return "Not available";
    }

    return new Date(
      user.metadata.creationTime
    ).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>
            Loading your profile...
          </p>
        </div>

        <ResponsiveStyles />
      </div>
    );
  }

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>
            🔐
          </div>

          <h2 style={styles.emptyTitle}>
            Login required
          </h2>

          <p style={styles.emptyText}>
            Please log in to view your profile.
          </p>
        </div>

        <ResponsiveStyles />
      </div>
    );
  }

  // =====================================================
  // PROFILE
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* =================================================
            HEADER
        ================================================= */}

        <div style={styles.header}>

          <div>
            <span style={styles.badge}>
              INSTANT LOAD
            </span>

            <h1 style={styles.title}>
              My Profile
            </h1>

            <p style={styles.subtitle}>
              Manage your personal account
              information.
            </p>
          </div>

        </div>


        {/* =================================================
            PROFILE HERO
        ================================================= */}

        <div style={styles.profileHero}>

          <div style={styles.avatar}>
            {getInitials()}
          </div>

          <div style={styles.profileHeroInfo}>

            <h2 style={styles.profileName}>
              {user.displayName ||
                "INSTANT LOAD User"}
            </h2>

            <p style={styles.profileEmail}>
              {user.email ||
                "No email address"}
            </p>

            <div style={styles.verifiedBadge}>
              <span>
                ✓
              </span>

              <span>
                Account verified
              </span>
            </div>

          </div>

        </div>


        {/* =================================================
            PERSONAL INFORMATION
        ================================================= */}

        <div style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              👤
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Personal Information
              </h2>

              <p style={styles.cardSubtitle}>
                Update the name shown on your
                INSTANT LOAD account.
              </p>
            </div>

          </div>


          {/* NAME */}

          <div style={styles.field}>

            <label style={styles.label}>
              Full Name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) =>
                setDisplayName(
                  e.target.value
                )
              }
              placeholder="Enter your full name"
              maxLength={60}
              style={styles.input}
            />

          </div>


          {/* EMAIL */}

          <div style={styles.field}>

            <label style={styles.label}>
              Email Address
            </label>

            <div
              style={styles.readOnlyField}
            >

              <span>
                ✉️
              </span>

              <span
                style={styles.readOnlyValue}
              >
                {user.email ||
                  "No email address"}
              </span>

              <span
                style={styles.lockedText}
              >
                Locked
              </span>

            </div>

            <p style={styles.fieldHint}>
              Your login email is managed
              securely by Firebase.
            </p>

          </div>


          {/* PHONE */}

          <div style={styles.field}>

            <label style={styles.label}>
              Phone Number
            </label>

            <div
              style={styles.readOnlyField}
            >

              <span>
                📱
              </span>

              <span
                style={styles.readOnlyValue}
              >
                {user.phoneNumber ||
                  "Not added"}
              </span>

              <span
                style={styles.lockedText}
              >
                {user.phoneNumber
                  ? "Verified"
                  : "Not added"}
              </span>

            </div>

            <p style={styles.fieldHint}>
              Phone number changes are not
              enabled here yet.
            </p>

          </div>


          {/* SAVE */}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              ...styles.saveButton,
              ...(saving
                ? styles.saveButtonDisabled
                : {}),
            }}
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

        </div>


        {/* =================================================
            ACCOUNT INFORMATION
        ================================================= */}

        <div style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              🛡️
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Account Information
              </h2>

              <p style={styles.cardSubtitle}>
                Basic information about your
                INSTANT LOAD account.
              </p>
            </div>

          </div>


          <div style={styles.infoList}>

            <div style={styles.infoRow}>

              <div style={styles.infoLeft}>
                <span style={styles.infoIcon}>
                  🆔
                </span>

                <span>
                  Account ID
                </span>
              </div>

              <span style={styles.infoValue}>
                {user.uid.substring(0, 12)}
                ...
              </span>

            </div>


            <div style={styles.infoRow}>

              <div style={styles.infoLeft}>
                <span style={styles.infoIcon}>
                  📅
                </span>

                <span>
                  Member since
                </span>
              </div>

              <span style={styles.infoValue}>
                {getAccountDate()}
              </span>

            </div>


            <div style={styles.infoRow}>

              <div style={styles.infoLeft}>
                <span style={styles.infoIcon}>
                  🔒
                </span>

                <span>
                  Account security
                </span>
              </div>

              <span style={styles.secureStatus}>
                Protected
              </span>

            </div>

          </div>

        </div>


        {/* =================================================
            PROFILE PHOTO NOTICE
        ================================================= */}

        <div style={styles.notice}>

          <div style={styles.noticeIcon}>
            ℹ️
          </div>

          <div>

            <strong style={styles.noticeTitle}>
              Profile photo
            </strong>

            <p style={styles.noticeText}>
              Your profile currently uses your
              initials. Photo upload will be
              added later without affecting
              your account or payment system.
            </p>

          </div>

        </div>


        {/* =================================================
            HELP
        ================================================= */}

        <div style={styles.help}>
          Your profile information is secured
          through your Firebase account.
        </div>

      </div>

      <ResponsiveStyles />
    </div>
  );
};


// =====================================================
// RESPONSIVE CSS
// =====================================================

const ResponsiveStyles = () => (
  <style>{`

    * {
      box-sizing: border-box;
    }

    html,
    body,
    #root {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }

    .instant-profile-page {
      width: 100%;
    }

    @media (max-width: 768px) {

      .instant-profile-page {
        padding:
          20px
          12px
          110px !important;
      }

      .instant-profile-title {
        font-size: 28px !important;
      }

      .instant-profile-hero {
        padding: 20px !important;
      }

      .instant-profile-avatar {
        width: 68px !important;
        height: 68px !important;
        min-width: 68px !important;
        font-size: 23px !important;
      }

      .instant-profile-name {
        font-size: 19px !important;
      }

      .instant-profile-card {
        padding: 18px !important;
        border-radius: 19px !important;
      }

      .instant-profile-readonly {
        min-width: 0 !important;
      }

      .instant-profile-readonly-value {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .instant-profile-locked {
        flex-shrink: 0 !important;
      }

      .instant-profile-info-row {
        align-items: flex-start !important;
      }

      .instant-profile-info-value {
        max-width: 48% !important;
        text-align: right !important;
        word-break: break-word !important;
      }

    }

    @media (max-width: 480px) {

      .instant-profile-page {
        padding:
          16px
          8px
          110px !important;
      }

      .instant-profile-title {
        font-size: 25px !important;
      }

      .instant-profile-hero {
        padding: 16px !important;
        gap: 13px !important;
      }

      .instant-profile-avatar {
        width: 58px !important;
        height: 58px !important;
        min-width: 58px !important;
        font-size: 20px !important;
      }

      .instant-profile-name {
        font-size: 17px !important;
      }

      .instant-profile-card {
        padding: 15px !important;
      }

      .instant-profile-card-header {
        align-items: flex-start !important;
      }

      .instant-profile-card-icon {
        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;
      }

      .instant-profile-info-row {
        flex-direction: column !important;
        gap: 7px !important;
      }

      .instant-profile-info-value {
        max-width: 100% !important;
        text-align: left !important;
      }

    }

  `}</style>
);


// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f8ff 0%, #eef3ff 100%)",
    padding: "35px 20px 100px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "850px",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  header: {
    marginBottom: "25px",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 11px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1px",
    marginBottom: "9px",
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: "34px",
    fontWeight: 800,
    letterSpacing: "-0.8px",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  profileHero: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "25px",
    marginBottom: "20px",
    background:
      "linear-gradient(135deg, #111827, #1e3a8a)",
    borderRadius: "22px",
    color: "#fff",
    boxSizing: "border-box",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.12)",
  },

  avatar: {
    width: "82px",
    height: "82px",
    minWidth: "82px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #60a5fa, #2563eb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "28px",
    fontWeight: 800,
    border:
      "3px solid rgba(255,255,255,0.25)",
  },

  profileHeroInfo: {
    minWidth: 0,
    flex: 1,
  },

  profileName: {
    margin: 0,
    fontSize: "23px",
    fontWeight: 800,
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  profileEmail: {
    margin: "6px 0 10px",
    color: "#cbd5e1",
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background:
      "rgba(255,255,255,0.10)",
    border:
      "1px solid rgba(255,255,255,0.15)",
    color: "#dbeafe",
    borderRadius: "20px",
    padding: "5px 9px",
    fontSize: "10px",
    fontWeight: 700,
  },

  card: {
    width: "100%",
    background: "#fff",
    borderRadius: "22px",
    padding: "26px",
    marginBottom: "18px",
    boxShadow:
      "0 12px 40px rgba(15,23,42,0.07)",
    boxSizing: "border-box",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },

  cardIcon: {
    width: "43px",
    height: "43px",
    minWidth: "43px",
    borderRadius: "13px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },

  cardTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "16px",
    fontWeight: 800,
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#9ca3af",
    fontSize: "12px",
    lineHeight: 1.4,
  },

  field: {
    width: "100%",
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    height: "52px",
    border:
      "1.5px solid #dbe3ef",
    borderRadius: "13px",
    padding: "0 15px",
    outline: "none",
    background: "#fff",
    color: "#111827",
    fontSize: "14px",
    fontWeight: 600,
    boxSizing: "border-box",
  },

  readOnlyField: {
    width: "100%",
    minHeight: "52px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    border:
      "1px solid #e5e7eb",
    borderRadius: "13px",
    padding: "10px 13px",
    background: "#f8fafc",
    boxSizing: "border-box",
  },

  readOnlyValue: {
    flex: 1,
    minWidth: 0,
    color: "#374151",
    fontSize: "13px",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  lockedText: {
    color: "#9ca3af",
    fontSize: "10px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  fieldHint: {
    margin: "6px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
    lineHeight: 1.4,
  },

  saveButton: {
    width: "100%",
    height: "54px",
    border: "none",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 9px 22px rgba(37,99,235,0.20)",
  },

  saveButtonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  infoList: {
    width: "100%",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "15px 0",
    borderBottom:
      "1px solid #f1f5f9",
    color: "#475569",
    fontSize: "13px",
  },

  infoLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: 600,
  },

  infoIcon: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    background: "#f8fafc",
  },

  infoValue: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 600,
    textAlign: "right",
    wordBreak: "break-word",
  },

  secureStatus: {
    color: "#16a34a",
    background: "#f0fdf4",
    borderRadius: "20px",
    padding: "5px 9px",
    fontSize: "10px",
    fontWeight: 800,
  },

  notice: {
    width: "100%",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    background: "#eff6ff",
    border:
      "1px solid #dbeafe",
    borderRadius: "16px",
    padding: "16px",
    boxSizing: "border-box",
  },

  noticeIcon: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "10px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  noticeTitle: {
    display: "block",
    color: "#1e40af",
    fontSize: "13px",
  },

  noticeText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  help: {
    width: "100%",
    textAlign: "center",
    marginTop: "18px",
    color: "#9ca3af",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  loadingCard: {
    width: "100%",
    maxWidth: "500px",
    margin: "80px auto",
    background: "#fff",
    borderRadius: "20px",
    padding: "40px 25px",
    textAlign: "center",
    boxShadow:
      "0 12px 40px rgba(15,23,42,0.07)",
  },

  spinner: {
    width: "36px",
    height: "36px",
    margin: "0 auto",
    border:
      "4px solid #dbeafe",
    borderTop:
      "4px solid #2563eb",
    borderRadius: "50%",
    animation:
      "instantProfileSpin 0.8s linear infinite",
  },

  loadingText: {
    margin: "15px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  emptyCard: {
    width: "100%",
    maxWidth: "500px",
    margin: "80px auto",
    background: "#fff",
    borderRadius: "20px",
    padding: "40px 25px",
    textAlign: "center",
    boxShadow:
      "0 12px 40px rgba(15,23,42,0.07)",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "21px",
  },

  emptyText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },
};

export default Profile;