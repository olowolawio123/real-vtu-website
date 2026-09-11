import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { toast } from "react-toastify";

function Beneficiaries() {
  const [user, setUser] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [service, setService] = useState("both");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setBeneficiaries([]);
      return;
    }

    const beneficiariesRef = collection(
      db,
      "users",
      user.uid,
      "beneficiaries"
    );

    const beneficiariesQuery = query(
      beneficiariesRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      beneficiariesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setBeneficiaries(items);
      },
      (error) => {
        console.error("Beneficiary listener error:", error);
        toast.error("Unable to load beneficiaries.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setNetwork("MTN");
    setService("both");
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setName("");
    setPhone("");
    setNetwork("MTN");
    setService("both");
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (beneficiary) => {
    setName(beneficiary.name || "");
    setPhone(beneficiary.phone || "");
    setNetwork(beneficiary.network || "MTN");
    setService(beneficiary.service || "both");
    setEditingId(beneficiary.id);
    setShowForm(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\s+/g, "").trim();

    if (cleanName.length < 2) {
      toast.error("Enter a valid beneficiary name.");
      return;
    }

    if (!/^(0|\+234)\d{10}$/.test(cleanPhone)) {
      toast.error("Enter a valid Nigerian phone number.");
      return;
    }

    if (!user) {
      toast.error("Please log in again.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const beneficiaryRef = doc(
          db,
          "users",
          user.uid,
          "beneficiaries",
          editingId
        );

        await updateDoc(beneficiaryRef, {
          name: cleanName,
          phone: cleanPhone,
          network,
          service,
          updatedAt: serverTimestamp(),
        });

        toast.success("Beneficiary updated successfully.");
      } else {
        const beneficiariesRef = collection(
          db,
          "users",
          user.uid,
          "beneficiaries"
        );

        await addDoc(beneficiariesRef, {
          name: cleanName,
          phone: cleanPhone,
          network,
          service,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast.success("Beneficiary saved successfully.");
      }

      resetForm();
    } catch (error) {
      console.error("Save beneficiary error:", error);
      toast.error("Unable to save beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (beneficiaryId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this beneficiary?"
    );

    if (!confirmed || !user) return;

    try {
      await deleteDoc(
        doc(db, "users", user.uid, "beneficiaries", beneficiaryId)
      );

      toast.success("Beneficiary deleted.");
    } catch (error) {
      console.error("Delete beneficiary error:", error);
      toast.error("Unable to delete beneficiary.");
    }
  };

  const formatPhone = (value) => {
    if (!value) return "";

    if (value.startsWith("+234")) {
      return value.replace(
        /^(\+234)(\d{3})(\d{3})(\d{4})$/,
        "$1 $2 $3 $4"
      );
    }

    return value.replace(
      /^(\d{4})(\d{3})(\d{4})$/,
      "$1 $2 $3 $4"
    );
  };

  const serviceLabel = (value) => {
    if (value === "airtime") return "Airtime";
    if (value === "data") return "Data";
    return "Airtime & Data";
  };

  return (
    <div className="beneficiaries-page">
      <style>{`
        .beneficiaries-page {
          width: 100%;
          min-height: 100vh;
          box-sizing: border-box;
          padding: 32px 24px 120px;
          background: #f6f8fb;
          color: #111827;
        }

        .beneficiaries-container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .beneficiaries-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .beneficiaries-title {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .beneficiaries-subtitle {
          margin: 7px 0 0;
          color: #6b7280;
          font-size: 15px;
        }

        .add-beneficiary-button {
          border: none;
          border-radius: 12px;
          padding: 13px 18px;
          background: #111827;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 8px 20px rgba(17, 24, 39, 0.14);
        }

        .add-beneficiary-button:hover {
          background: #1f2937;
        }

        .beneficiaries-empty {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 50px 25px;
          text-align: center;
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.05);
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eef2ff;
          font-size: 28px;
        }

        .empty-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
        }

        .empty-text {
          max-width: 430px;
          margin: 8px auto 22px;
          color: #6b7280;
          line-height: 1.6;
          font-size: 14px;
        }

        .beneficiary-list {
          display: grid;
          gap: 14px;
        }

        .beneficiary-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          box-shadow: 0 7px 25px rgba(15, 23, 42, 0.045);
        }

        .beneficiary-main {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .beneficiary-avatar {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111827;
          color: white;
          font-weight: 800;
          font-size: 17px;
        }

        .beneficiary-info {
          min-width: 0;
        }

        .beneficiary-name {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .beneficiary-phone {
          margin: 4px 0 0;
          color: #4b5563;
          font-size: 14px;
        }

        .beneficiary-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 8px;
        }

        .beneficiary-tag {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 9px;
          background: #f3f4f6;
          color: #374151;
          font-size: 11px;
          font-weight: 700;
        }

        .beneficiary-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .beneficiary-action {
          border: 1px solid #e5e7eb;
          background: white;
          color: #374151;
          border-radius: 9px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .beneficiary-action:hover {
          background: #f9fafb;
        }

        .beneficiary-action.delete {
          color: #dc2626;
        }

        .beneficiary-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }

        .beneficiary-modal {
          width: 100%;
          max-width: 480px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-sizing: border-box;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 22px;
        }

        .modal-title {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
        }

        .modal-close {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 50%;
          background: #f3f4f6;
          color: #374151;
          font-size: 20px;
          cursor: pointer;
        }

        .beneficiary-form {
          display: grid;
          gap: 16px;
        }

        .form-group {
          display: grid;
          gap: 7px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 700;
          color: #374151;
        }

        .form-input,
        .form-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 11px;
          padding: 12px 13px;
          background: white;
          color: #111827;
          font-size: 14px;
          outline: none;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .modal-cancel,
        .modal-save {
          flex: 1;
          border: none;
          border-radius: 11px;
          padding: 13px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .modal-cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .modal-save {
          background: #111827;
          color: white;
        }

        .modal-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          .beneficiaries-page {
            padding: 22px 12px 120px;
          }

          .beneficiaries-header {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 20px;
          }

          .beneficiaries-title {
            font-size: 25px;
          }

          .add-beneficiary-button {
            width: 100%;
          }

          .beneficiary-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .beneficiary-main {
            width: 100%;
          }

          .beneficiary-actions {
            width: 100%;
          }

          .beneficiary-action {
            flex: 1;
          }

          .beneficiary-modal-overlay {
            align-items: flex-end;
            padding: 0;
          }

          .beneficiary-modal {
            max-width: none;
            max-height: 90vh;
            border-radius: 20px 20px 0 0;
            padding: 22px 16px 28px;
          }
        }

        @media (max-width: 380px) {
          .beneficiary-main {
            gap: 10px;
          }

          .beneficiary-avatar {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
          }
        }
      `}</style>

      <div className="beneficiaries-container">
        <div className="beneficiaries-header">
          <div>
            <h1 className="beneficiaries-title">Saved Beneficiaries</h1>
            <p className="beneficiaries-subtitle">
              Save frequently used phone numbers for faster purchases.
            </p>
          </div>

          <button
            type="button"
            className="add-beneficiary-button"
            onClick={openAddForm}
          >
            + Add Beneficiary
          </button>
        </div>

        {beneficiaries.length === 0 ? (
          <div className="beneficiaries-empty">
            <div className="empty-icon">👤</div>

            <h2 className="empty-title">No beneficiaries yet</h2>

            <p className="empty-text">
              Save a customer's or family member's phone number here so you
              don't have to type it every time you buy airtime or data.
            </p>

            <button
              type="button"
              className="add-beneficiary-button"
              onClick={openAddForm}
            >
              Add Your First Beneficiary
            </button>
          </div>
        ) : (
          <div className="beneficiary-list">
            {beneficiaries.map((beneficiary) => {
              const firstLetter =
                beneficiary.name?.charAt(0)?.toUpperCase() || "?";

              return (
                <div className="beneficiary-card" key={beneficiary.id}>
                  <div className="beneficiary-main">
                    <div className="beneficiary-avatar">
                      {firstLetter}
                    </div>

                    <div className="beneficiary-info">
                      <h3 className="beneficiary-name">
                        {beneficiary.name}
                      </h3>

                      <p className="beneficiary-phone">
                        {formatPhone(beneficiary.phone)}
                      </p>

                      <div className="beneficiary-tags">
                        <span className="beneficiary-tag">
                          {beneficiary.network || "Network"}
                        </span>

                        <span className="beneficiary-tag">
                          {serviceLabel(beneficiary.service)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="beneficiary-actions">
                    <button
                      type="button"
                      className="beneficiary-action"
                      onClick={() => openEditForm(beneficiary)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="beneficiary-action delete"
                      onClick={() => handleDelete(beneficiary.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="beneficiary-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              resetForm();
            }
          }}
        >
          <div className="beneficiary-modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? "Edit Beneficiary" : "Add Beneficiary"}
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form className="beneficiary-form" onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Name</label>

                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. John Doe"
                  maxLength={60}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>

                <input
                  className="form-input"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="08012345678"
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Network</label>

                <select
                  className="form-select"
                  value={network}
                  onChange={(event) => setNetwork(event.target.value)}
                >
                  <option value="MTN">MTN</option>
                  <option value="GLO">GLO</option>
                  <option value="Airtel">Airtel</option>
                  <option value="9mobile">9mobile</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Service</label>

                <select
                  className="form-select"
                  value={service}
                  onChange={(event) => setService(event.target.value)}
                >
                  <option value="both">Airtime & Data</option>
                  <option value="airtime">Airtime only</option>
                  <option value="data">Data only</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={resetForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-save"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Beneficiary"
                    : "Save Beneficiary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Beneficiaries;