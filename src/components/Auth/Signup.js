import React, { useState } from "react";
import { auth, googleProvider, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);

      const userCred =
        await createUserWithEmailAndPassword(
          auth,
          form.email.trim(),
          form.password
        );

      await setDoc(
        doc(db, "users", userCred.user.uid),
        {
          uid: userCred.user.uid,
          email: userCred.user.email || "",
          wallet: 0,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      await sendEmailVerification(
        userCred.user
      );

      toast.success(
        "Account created successfully. Please check your email to verify your account."
      );

      navigate("/login");
    } catch (err) {
      console.error("Signup error:", err);

      let message =
        "Unable to create account. Please try again.";

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {
        message =
          "This email is already registered. Please login.";
      }

      if (
        err.code === "auth/weak-password"
      ) {
        message =
          "Password should contain at least 6 characters.";
      }

      if (
        err.code ===
        "auth/invalid-email"
      ) {
        message =
          "Please enter a valid email address.";
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      await setDoc(
        doc(db, "users", result.user.uid),
        {
          uid: result.user.uid,
          email: result.user.email || "",
          wallet: 0,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast.success(
        "Signup successful with Google!"
      );

      navigate("/Dashboard");
    } catch (err) {
      console.error(
        "Google signup error:",
        err
      );

      toast.error(
        err.message ||
          "Google signup failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">

        {/* LEFT BRAND PANEL */}
        <div className="signup-brand-panel">

          <div className="signup-circle-large" />

          <div className="signup-circle-small" />

          <div className="signup-brand-content">

            {/* BRAND */}
            <div className="signup-logo">
              <div className="signup-logo-icon">
                ⚡
              </div>

              <div>
                <div className="signup-logo-title">
                  INSTANT{" "}
                  <span>
                    LOAD
                  </span>
                </div>

                <div className="signup-logo-subtitle">
                  Fast • Secure • Reliable
                </div>
              </div>
            </div>

            {/* HERO */}
            <h1 className="signup-hero-title">
              Join{" "}
              <span>
                INSTANT LOAD
              </span>
            </h1>

            <p className="signup-hero-text">
              Create your account and enjoy
              fast, secure and reliable VTU
              services from one place.
            </p>

            {/* BENEFITS */}
            <div className="signup-benefits">

              <div className="signup-benefit">
                <div className="signup-benefit-icon">
                  ⚡
                </div>

                <div>
                  <div className="signup-benefit-title">
                    Instant Transactions
                  </div>

                  <div className="signup-benefit-text">
                    Fast and reliable service
                  </div>
                </div>
              </div>

              <div className="signup-benefit">
                <div className="signup-benefit-icon">
                  🔒
                </div>

                <div>
                  <div className="signup-benefit-title">
                    Secure Account
                  </div>

                  <div className="signup-benefit-text">
                    Your information stays protected
                  </div>
                </div>
              </div>

              <div className="signup-benefit">
                <div className="signup-benefit-icon">
                  💰
                </div>

                <div>
                  <div className="signup-benefit-title">
                    Easy Wallet Funding
                  </div>

                  <div className="signup-benefit-text">
                    Fund and pay with ease
                  </div>
                </div>
              </div>

              <div className="signup-benefit">
                <div className="signup-benefit-icon">
                  📱
                </div>

                <div>
                  <div className="signup-benefit-title">
                    All Your Services
                  </div>

                  <div className="signup-benefit-text">
                    Airtime, data, bills and TV
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="signup-brand-footer">
            ⚡ Top Up • Pay Bills • Live Better
          </div>
        </div>

        {/* RIGHT SIGNUP PANEL */}
        <div className="signup-form-panel">

          {/* MOBILE LOGO */}
          <div className="signup-mobile-logo">
            <span>⚡</span>
            INSTANT{" "}
            <strong>LOAD</strong>
          </div>

          {/* LOGIN LINK */}
          <div className="signup-login-link">
            Already have an account?{" "}

            <button
              type="button"
              onClick={() =>
                navigate("/login")
              }
            >
              Login →
            </button>
          </div>

          {/* HEADING */}
          <div className="signup-heading">
            <h2>
              Create Your Account
            </h2>

            <p>
              Sign up today and start enjoying
              fast and reliable VTU services.
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleSignup}
            className="signup-form"
          >

            {/* EMAIL */}
            <div className="signup-field">
              <label>
                Email Address
              </label>

              <div className="signup-input-wrapper">
                <span className="signup-input-icon">
                  ✉
                </span>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="signup-field">
              <label>
                Create Password
              </label>

              <div className="signup-input-wrapper">
                <span className="signup-input-icon">
                  🔒
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                  minLength="6"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁"}
                </button>
              </div>

              <small className="signup-password-help">
                Password must contain at least
                6 characters.
              </small>
            </div>

            {/* CREATE ACCOUNT */}
            <button
              type="submit"
              disabled={loading}
              className="signup-submit-button"
            >
              {loading
                ? "Creating Account..."
                : "Create Account →"}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="signup-divider">
            <div />

            <span>
              OR
            </span>

            <div />
          </div>

          {/* GOOGLE */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="signup-google-button"
          >
            <span className="signup-google-icon">
              G
            </span>

            Continue with Google
          </button>

          {/* NOTICE */}
          <div className="signup-notice">
            <span>
              📧
            </span>

            <div>
              <strong>
                Verify your email
              </strong>

              <p>
                We'll send you a verification
                email after creating your
                account.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .signup-page {
            min-height: 100vh;
            width: 100%;
            background:
              linear-gradient(
                135deg,
                #031b49 0%,
                #063b91 50%,
                #0877f9 100%
              );
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 30px 20px;
            font-family:
              'Inter',
              'Segoe UI',
              Arial,
              sans-serif;
          }

          .signup-card {
            width: 100%;
            max-width: 1100px;
            min-height: 650px;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow:
              0 25px 70px
              rgba(0, 0, 0, 0.25);
            display: flex;
          }

          /* LEFT PANEL */

          .signup-brand-panel {
            flex: 0 0 46%;
            background:
              linear-gradient(
                160deg,
                #031b49 0%,
                #052f73 55%,
                #006cff 100%
              );
            color: #ffffff;
            padding: 55px 48px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
          }

          .signup-circle-large {
            position: absolute;
            width: 320px;
            height: 320px;
            border-radius: 50%;
            border:
              35px solid
              rgba(0, 136, 255, 0.18);
            right: -130px;
            bottom: -100px;
          }

          .signup-circle-small {
            position: absolute;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background:
              rgba(0, 136, 255, 0.12);
            top: -80px;
            left: -60px;
          }

          .signup-brand-content {
            position: relative;
            z-index: 2;
          }

          .signup-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 60px;
          }

          .signup-logo-icon {
            font-size: 50px;
            line-height: 1;
            color: #1687ff;
            font-weight: 900;
          }

          .signup-logo-title {
            font-size: 27px;
            font-weight: 800;
            letter-spacing: -1px;
          }

          .signup-logo-title span {
            color: #1687ff;
          }

          .signup-logo-subtitle {
            font-size: 13px;
            color: #c8d8f2;
            margin-top: 4px;
            letter-spacing: 1px;
          }

          .signup-hero-title {
            font-size: 42px;
            line-height: 1.15;
            margin: 0 0 18px;
            font-weight: 800;
          }

          .signup-hero-title span {
            color: #1687ff;
          }

          .signup-hero-text {
            font-size: 17px;
            line-height: 1.7;
            color: #d7e5fa;
            max-width: 430px;
            margin: 0 0 40px;
          }

          .signup-benefits {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .signup-benefit {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .signup-benefit-icon {
            width: 44px;
            height: 44px;
            min-width: 44px;
            border-radius: 50%;
            background:
              rgba(22, 135, 255, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            border:
              1px solid
              rgba(255, 255, 255, 0.12);
          }

          .signup-benefit-title {
            font-weight: 700;
            font-size: 15px;
          }

          .signup-benefit-text {
            font-size: 12px;
            color: #b8cce9;
            margin-top: 2px;
          }

          .signup-brand-footer {
            position: relative;
            z-index: 2;
            margin-top: 35px;
            font-size: 13px;
            color: #a9c0e2;
          }

          /* RIGHT PANEL */

          .signup-form-panel {
            flex: 1;
            padding: 45px 55px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
          }

          .signup-mobile-logo {
            display: none;
          }

          .signup-login-link {
            text-align: right;
            font-size: 13px;
            color: #71809c;
            margin-bottom: 30px;
          }

          .signup-login-link button {
            border: none;
            background: transparent;
            color: #0877f9;
            font-weight: 700;
            cursor: pointer;
            padding: 0;
            font-size: 13px;
          }

          .signup-heading {
            margin-bottom: 32px;
          }

          .signup-heading h2 {
            margin: 0 0 10px;
            color: #092552;
            font-size: 34px;
            font-weight: 800;
            line-height: 1.2;
          }

          .signup-heading p {
            margin: 0;
            color: #72819b;
            font-size: 15px;
            line-height: 1.6;
          }

          .signup-field {
            margin-bottom: 20px;
          }

          .signup-field label {
            display: block;
            font-size: 13px;
            font-weight: 700;
            color: #132b52;
            margin-bottom: 8px;
          }

          .signup-input-wrapper {
            position: relative;
            width: 100%;
          }

          .signup-input-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform:
              translateY(-50%);
            font-size: 18px;
            z-index: 1;
          }

          .signup-input-wrapper input {
            width: 100%;
            height: 54px;
            border:
              1px solid #dce5f2;
            border-radius: 11px;
            padding:
              0 50px 0 48px;
            font-size: 14px;
            outline: none;
            color: #10284c;
            background: #fbfdff;
            transition:
              border 0.2s ease,
              box-shadow 0.2s ease;
          }

          .signup-input-wrapper input:focus {
            border-color: #0877f9;
            box-shadow:
              0 0 0 3px
              rgba(8, 119, 249, 0.1);
          }

          .signup-password-toggle {
            position: absolute;
            right: 14px;
            top: 50%;
            transform:
              translateY(-50%);
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 16px;
            padding: 5px;
          }

          .signup-password-help {
            display: block;
            margin-top: 7px;
            color: #71809a;
            font-size: 11px;
          }

          .signup-submit-button {
            width: 100%;
            height: 54px;
            border: none;
            border-radius: 11px;
            background:
              linear-gradient(
                90deg,
                #0877f9,
                #1268e8
              );
            color: #ffffff;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow:
              0 8px 20px
              rgba(8, 119, 249, 0.22);
            transition:
              transform 0.2s ease,
              opacity 0.2s ease;
          }

          .signup-submit-button:hover:not(:disabled) {
            transform:
              translateY(-1px);
          }

          .signup-submit-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .signup-divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 25px 0;
            color: #9aa8bd;
            font-size: 12px;
          }

          .signup-divider div {
            height: 1px;
            background: #e3e9f2;
            flex: 1;
          }

          .signup-google-button {
            width: 100%;
            height: 54px;
            border:
              1px solid #dce5f2;
            border-radius: 11px;
            background: #ffffff;
            color: #17315a;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .signup-google-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .signup-google-icon {
            font-size: 19px;
            font-weight: 800;
          }

          .signup-notice {
            margin-top: 30px;
            padding: 14px;
            border-radius: 10px;
            background: #f4f8ff;
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }

          .signup-notice > span {
            font-size: 17px;
          }

          .signup-notice strong {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: #16355f;
            margin-bottom: 3px;
          }

          .signup-notice p {
            margin: 0;
            font-size: 11px;
            color: #71809a;
            line-height: 1.5;
          }

          /* TABLET */

          @media (max-width: 900px) {
            .signup-page {
              padding: 20px;
            }

            .signup-card {
              max-width: 700px;
            }

            .signup-brand-panel {
              display: none;
            }

            .signup-form-panel {
              width: 100%;
              padding: 45px 55px;
            }

            .signup-mobile-logo {
              display: block;
              text-align: center;
              font-size: 22px;
              font-weight: 800;
              color: #092552;
              margin-bottom: 28px;
              letter-spacing: -0.5px;
            }

            .signup-mobile-logo span {
              color: #0877f9;
              margin-right: 5px;
            }

            .signup-mobile-logo strong {
              color: #0877f9;
            }
          }

          /* MOBILE */

          @media (max-width: 600px) {
            .signup-page {
              min-height: 100vh;
              padding: 0;
              align-items: stretch;
              background: #ffffff;
            }

            .signup-card {
              width: 100%;
              min-height: 100vh;
              border-radius: 0;
              box-shadow: none;
              display: block;
              overflow: visible;
            }

            .signup-brand-panel {
              display: none !important;
            }

            .signup-form-panel {
              width: 100%;
              min-height: 100vh;
              padding:
                30px 20px 40px;
              justify-content: flex-start;
            }

            .signup-mobile-logo {
              display: block;
              font-size: 22px;
              margin-bottom: 25px;
            }

            .signup-login-link {
              text-align: center;
              font-size: 14px;
              margin-bottom: 28px;
            }

            .signup-login-link button {
              font-size: 14px;
            }

            .signup-heading {
              margin-bottom: 28px;
              text-align: center;
            }

            .signup-heading h2 {
              font-size: 30px;
            }

            .signup-heading p {
              font-size: 14px;
              max-width: 330px;
              margin: 0 auto;
            }

            .signup-field {
              margin-bottom: 20px;
            }

            .signup-field label {
              font-size: 14px;
            }

            .signup-input-wrapper input {
              height: 56px;
              font-size: 16px;
              border-radius: 12px;
            }

            .signup-submit-button {
              height: 56px;
              font-size: 16px;
              border-radius: 12px;
            }

            .signup-google-button {
              height: 56px;
              font-size: 15px;
              border-radius: 12px;
            }

            .signup-notice {
              margin-top: 25px;
              padding: 14px;
            }
          }

          /* VERY SMALL SCREENS */

          @media (max-width: 380px) {
            .signup-form-panel {
              padding:
                25px 16px 35px;
            }

            .signup-heading h2 {
              font-size: 27px;
            }

            .signup-mobile-logo {
              font-size: 20px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Signup;