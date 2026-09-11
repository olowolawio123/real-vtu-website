import React, { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Security = () => {
  const navigate = useNavigate();

  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [currentPin, setCurrentPin] = useState("");
  const [changeNewPin, setChangeNewPin] = useState("");
  const [changeConfirmPin, setChangeConfirmPin] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const apiUrl =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    checkPinStatus();
  }, []);

  const getToken = async () => {
    if (!auth.currentUser) {
      throw new Error("You are not logged in.");
    }

    return await auth.currentUser.getIdToken();
  };

  const checkPinStatus = async () => {
    try {
      const token = await getToken();

      const response = await fetch(
        `${apiUrl}/api/transaction-pin/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to check transaction PIN."
        );
      }

      setHasPin(Boolean(data.hasPin));
    } catch (error) {
      console.error("PIN status error:", error);
      toast.error(error.message || "Unable to check PIN status.");
    } finally {
      setLoading(false);
    }
  };

  const createPin = async (e) => {
    e.preventDefault();

    if (!/^\d{4}$/.test(newPin)) {
      toast.error("Transaction PIN must be exactly 4 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("Transaction PINs do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const token = await getToken();

      const response = await fetch(
        `${apiUrl}/api/transaction-pin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pin: newPin,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create transaction PIN."
        );
      }

      toast.success("Transaction PIN created successfully.");

      setHasPin(true);
      setShowCreatePin(false);
      setNewPin("");
      setConfirmPin("");
    } catch (error) {
      console.error("Create PIN error:", error);
      toast.error(error.message || "Unable to create transaction PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  const changePin = async (e) => {
    e.preventDefault();

    if (!/^\d{4}$/.test(currentPin)) {
      toast.error("Current PIN must be exactly 4 digits.");
      return;
    }

    if (!/^\d{4}$/.test(changeNewPin)) {
      toast.error("New PIN must be exactly 4 digits.");
      return;
    }

    if (changeNewPin !== changeConfirmPin) {
      toast.error("New PINs do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const token = await getToken();

      const response = await fetch(
        `${apiUrl}/api/transaction-pin`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPin,
            newPin: changeNewPin,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to change transaction PIN."
        );
      }

      toast.success("Transaction PIN changed successfully.");

      setShowChangePin(false);
      setCurrentPin("");
      setChangeNewPin("");
      setChangeConfirmPin("");
    } catch (error) {
      console.error("Change PIN error:", error);
      toast.error(error.message || "Unable to change transaction PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="security-page">
      <style>{`
        .security-page {
          min-height: 100vh;
          background: #f6f8fb;
          padding: 24px;
          box-sizing: border-box;
        }

        .security-container {
          max-width: 760px;
          margin: 0 auto;
        }

        .security-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .security-back {
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 12px;
          background: #ffffff;
          cursor: pointer;
          font-size: 20px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.06);
        }

        .security-title {
          margin: 0;
          font-size: 27px;
          font-weight: 800;
          color: #111827;
        }

        .security-subtitle {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .security-card {
          background: #ffffff;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 16px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.05);
        }

        .security-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .security-card-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .security-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #eefbf4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .security-card h3 {
          margin: 0 0 5px;
          color: #111827;
          font-size: 17px;
        }

        .security-card p {
          margin: 0;
          color: #6b7280;
          font-size: 13px;
        }

        .security-status {
          color: #16a34a;
          font-size: 12px;
          font-weight: 700;
          margin-top: 6px;
        }

        .security-button {
          border: none;
          border-radius: 10px;
          padding: 11px 17px;
          background: #0f9d58;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .security-button.secondary {
          background: #eef2f7;
          color: #374151;
        }

        .security-form {
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid #edf0f4;
        }

        .security-form label {
          display: block;
          margin-bottom: 7px;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
        }

        .security-form input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid #d9dee7;
          border-radius: 10px;
          outline: none;
          font-size: 18px;
          letter-spacing: 5px;
          margin-bottom: 14px;
        }

        .security-form input:focus {
          border-color: #0f9d58;
        }

        .security-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 5px;
        }

        .security-loading {
          background: #ffffff;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #6b7280;
        }

        @media (max-width: 600px) {
          .security-page {
            padding: 16px;
          }

          .security-title {
            font-size: 23px;
          }

          .security-card {
            padding: 18px;
          }

          .security-card-header {
            align-items: flex-start;
          }

          .security-button {
            padding: 10px 13px;
            white-space: nowrap;
          }

          .security-form-actions {
            flex-direction: column;
          }

          .security-form-actions button {
            width: 100%;
          }
        }
      `}</style>

      <div className="security-container">
        <div className="security-header">
          <button
            className="security-back"
            onClick={() => navigate("/account")}
          >
            ←
          </button>

          <div>
            <h1 className="security-title">Security</h1>
            <p className="security-subtitle">
              Protect your account and transactions
            </p>
          </div>
        </div>

        {loading ? (
          <div className="security-loading">
            Checking your security settings...
          </div>
        ) : (
          <>
            <div className="security-card">
              <div className="security-card-header">
                <div className="security-card-left">
                  <div className="security-icon">🔐</div>

                  <div>
                    <h3>Transaction PIN</h3>

                    <p>
                      Required to authorize VTU transactions.
                    </p>

                    {hasPin && (
                      <div className="security-status">
                        ✓ Transaction PIN is active
                      </div>
                    )}
                  </div>
                </div>

                {!hasPin && !showCreatePin && (
                  <button
                    className="security-button"
                    onClick={() => setShowCreatePin(true)}
                  >
                    Create PIN
                  </button>
                )}

                {hasPin && !showChangePin && (
                  <button
                    className="security-button"
                    onClick={() => setShowChangePin(true)}
                  >
                    Change PIN
                  </button>
                )}
              </div>

              {showCreatePin && !hasPin && (
                <form
                  className="security-form"
                  onSubmit={createPin}
                >
                  <label>New Transaction PIN</label>

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="••••"
                  />

                  <label>Confirm Transaction PIN</label>

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={confirmPin}
                    onChange={(e) =>
                      setConfirmPin(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="••••"
                  />

                  <div className="security-form-actions">
                    <button
                      type="submit"
                      className="security-button"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Creating..."
                        : "Create PIN"}
                    </button>

                    <button
                      type="button"
                      className="security-button secondary"
                      onClick={() => {
                        setShowCreatePin(false);
                        setNewPin("");
                        setConfirmPin("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {showChangePin && hasPin && (
                <form
                  className="security-form"
                  onSubmit={changePin}
                >
                  <label>Current Transaction PIN</label>

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={currentPin}
                    onChange={(e) =>
                      setCurrentPin(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="••••"
                  />

                  <label>New Transaction PIN</label>

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={changeNewPin}
                    onChange={(e) =>
                      setChangeNewPin(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="••••"
                  />

                  <label>Confirm New Transaction PIN</label>

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={changeConfirmPin}
                    onChange={(e) =>
                      setChangeConfirmPin(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="••••"
                  />

                  <div className="security-form-actions">
                    <button
                      type="submit"
                      className="security-button"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Changing..."
                        : "Change PIN"}
                    </button>

                    <button
                      type="button"
                      className="security-button secondary"
                      onClick={() => {
                        setShowChangePin(false);
                        setCurrentPin("");
                        setChangeNewPin("");
                        setChangeConfirmPin("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="security-card">
              <div className="security-card-header">
                <div className="security-card-left">
                  <div className="security-icon">🔑</div>

                  <div>
                    <h3>Password</h3>
                    <p>
                      Change the password used to sign in.
                    </p>
                  </div>
                </div>

                <button
                  className="security-button secondary"
                  onClick={() =>
                    toast.info(
                      "Password change will be added next."
                    )
                  }
                >
                  Change
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Security;