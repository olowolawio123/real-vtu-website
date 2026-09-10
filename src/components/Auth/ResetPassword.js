import React, { useState } from "react";
import { auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(auth, email.trim());

      toast.success("Password reset email sent!");

      setEmail("");
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #071A3D 0%, #0B2B63 50%, #0A6CFF 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              margin: "0 auto 16px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #0A6CFF, #00B8FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "25px",
              fontWeight: "800",
              boxShadow:
                "0 10px 25px rgba(10, 108, 255, 0.3)",
            }}
          >
            IL
          </div>

          <h1
            style={{
              margin: 0,
              color: "#071A3D",
              fontSize: "28px",
              fontWeight: "800",
            }}
          >
            INSTANT LOAD
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#718096",
              fontSize: "14px",
            }}
          >
            Fast. Secure. Reliable.
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              margin: 0,
              color: "#172B4D",
              fontSize: "23px",
              fontWeight: "700",
            }}
          >
            Reset your password
          </h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#718096",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            Enter your email address and we'll send you
            a password reset link.
          </p>
        </div>

        <form onSubmit={handleReset}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#344563",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Email address
          </label>

          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              border: "1px solid #D9E2EC",
              borderRadius: "12px",
              fontSize: "15px",
              outline: "none",
              marginBottom: "18px",
              color: "#172B4D",
              background: loading ? "#F5F7FA" : "#ffffff",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              background: loading
                ? "#9BBCEB"
                : "linear-gradient(135deg, #0A6CFF, #0062E6)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading
                ? "none"
                : "0 8px 20px rgba(10, 108, 255, 0.25)",
            }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              border: "none",
              background: "transparent",
              color: "#0A6CFF",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ← Back to Login
          </button>
        </div>

        <div
          style={{
            marginTop: "28px",
            padding: "14px",
            borderRadius: "12px",
            background: "#F4F8FF",
            color: "#526581",
            fontSize: "12px",
            lineHeight: "1.6",
            textAlign: "center",
          }}
        >
          Your account security is important to us.
          Never share your password or reset link with
          anyone.
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;