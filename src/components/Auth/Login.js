import React, { useState } from "react";
import { auth, googleProvider } from "../../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);

      const userCred =
        await signInWithEmailAndPassword(
          auth,
          form.email.trim(),
          form.password
        );

      if (!userCred.user.emailVerified) {
        toast.warning(
          "Please verify your email before logging in."
        );
        return;
      }

      toast.success("Login successful");
      navigate("/Dashboard");
    } catch (err) {
      console.error("Login error:", err);

      toast.error(
        err.code === "auth/invalid-credential"
          ? "Incorrect email or password."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);

      await signInWithPopup(
        auth,
        googleProvider
      );

      toast.success(
        "Logged in with Google!"
      );

      navigate("/Dashboard");
    } catch (err) {
      console.error(
        "Google login error:",
        err
      );

      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .login-page {
            min-height: 100vh;
            min-height: 100dvh;
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
            padding: 30px 18px;
            font-family:
              Inter,
              "Segoe UI",
              Arial,
              sans-serif;
          }

          .login-shell {
            width: 100%;
            max-width: 1100px;
            min-height: 650px;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            box-shadow:
              0 25px 70px
              rgba(0, 0, 0, 0.25);
          }

          .login-brand {
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

          .brand-circle-one {
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

          .brand-circle-two {
            position: absolute;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background:
              rgba(0, 136, 255, 0.12);
            top: -80px;
            left: -60px;
          }

          .brand-content {
            position: relative;
            z-index: 2;
          }

          .brand-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 60px;
          }

          .brand-lightning {
            font-size: 50px;
            line-height: 1;
            color: #1687ff;
            font-weight: 900;
          }

          .brand-name {
            font-size: 27px;
            font-weight: 800;
            letter-spacing: -1px;
          }

          .brand-name span {
            color: #1687ff;
          }

          .brand-tagline {
            font-size: 13px;
            color: #c8d8f2;
            margin-top: 4px;
            letter-spacing: 1px;
          }

          .brand-title {
            font-size: 42px;
            line-height: 1.15;
            margin: 0 0 18px;
            font-weight: 800;
          }

          .brand-title span {
            color: #1687ff;
          }

          .brand-description {
            font-size: 17px;
            line-height: 1.7;
            color: #d7e5fa;
            max-width: 430px;
            margin: 0 0 40px;
          }

          .brand-services {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .brand-service {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .brand-service-icon {
            width: 44px;
            height: 44px;
            flex: 0 0 44px;
            border-radius: 50%;
            background:
              rgba(22, 135, 255, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 21px;
            border:
              1px solid
              rgba(255, 255, 255, 0.12);
          }

          .brand-service-title {
            font-weight: 700;
            font-size: 15px;
          }

          .brand-service-text {
            font-size: 12px;
            color: #b8cce9;
            margin-top: 2px;
          }

          .brand-footer {
            position: relative;
            z-index: 2;
            margin-top: 35px;
            font-size: 13px;
            color: #a9c0e2;
          }

          .login-panel {
            flex: 1;
            padding: 45px 55px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
          }

          .login-top-link {
            text-align: right;
            font-size: 13px;
            color: #71809c;
            margin-bottom: 30px;
          }

          .text-button {
            border: none;
            background: transparent;
            color: #0877f9;
            font-weight: 700;
            cursor: pointer;
            padding: 0;
            font-size: 13px;
          }

          .login-heading {
            margin-bottom: 32px;
          }

          .login-heading h2 {
            margin: 0 0 10px;
            color: #092552;
            font-size: 34px;
            line-height: 1.2;
            font-weight: 800;
          }

          .login-heading p {
            margin: 0;
            color: #72819b;
            font-size: 15px;
            line-height: 1.6;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-label {
            display: block;
            font-size: 13px;
            font-weight: 700;
            color: #132b52;
            margin-bottom: 8px;
          }

          .input-wrapper {
            position: relative;
          }

          .input-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
            color: #6c83a7;
            z-index: 2;
            pointer-events: none;
          }

          .form-input {
            width: 100%;
            height: 54px;
            border:
              1px solid #dce5f2;
            border-radius: 11px;
            padding: 0 16px 0 48px;
            font-size: 14px;
            outline: none;
            color: #10284c;
            background: #fbfdff;
            transition:
              border-color 0.2s ease,
              box-shadow 0.2s ease;
          }

          .form-input:focus {
            border-color: #0877f9;
            box-shadow:
              0 0 0 3px
              rgba(8, 119, 249, 0.10);
          }

          .password-input {
            padding-right: 50px;
          }

          .password-toggle {
            position: absolute;
            right: 13px;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 16px;
            color: #6c83a7;
            padding: 7px;
          }

          .forgot-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 24px;
          }

          .forgot-button {
            border: none;
            background: transparent;
            color: #0877f9;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            padding: 0;
          }

          .primary-button {
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
              box-shadow 0.2s ease;
          }

          .primary-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow:
              0 11px 25px
              rgba(8, 119, 249, 0.28);
          }

          .primary-button:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 25px 0;
            color: #9aa8bd;
            font-size: 12px;
          }

          .divider-line {
            height: 1px;
            background: #e3e9f2;
            flex: 1;
          }

          .google-button {
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
            transition:
              background 0.2s ease,
              border-color 0.2s ease;
          }

          .google-button:hover:not(:disabled) {
            background: #f7faff;
            border-color: #cbd8e8;
          }

          .google-button:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .google-icon {
            font-size: 19px;
            font-weight: 800;
          }

          .security-box {
            margin-top: 30px;
            padding: 14px;
            border-radius: 10px;
            background: #f4f8ff;
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }

          .security-icon {
            font-size: 17px;
          }

          .security-title {
            font-size: 12px;
            font-weight: 700;
            color: #16355f;
            margin-bottom: 3px;
          }

          .security-text {
            font-size: 11px;
            color: #71809a;
            line-height: 1.5;
          }

          /*
           * TABLET
           */
          @media (max-width: 900px) {
            .login-page {
              padding: 24px 16px;
            }

            .login-brand {
              flex-basis: 42%;
              padding: 42px 32px;
            }

            .login-panel {
              padding: 38px 34px;
            }

            .brand-title {
              font-size: 34px;
            }

            .login-heading h2 {
              font-size: 30px;
            }
          }

          /*
           * MOBILE
           */
          @media (max-width: 700px) {
            .login-page {
              min-height: 100dvh;
              background: #f4f7fb;
              padding: 0;
              align-items: stretch;
            }

            .login-shell {
              min-height: 100dvh;
              min-height: 100dvh;
              max-width: none;
              border-radius: 0;
              display: block;
              background: #ffffff;
              box-shadow: none;
            }

            .login-brand {
              display: none;
            }

            .login-panel {
              width: 100%;
              min-height: 100dvh;
              padding:
                32px
                24px
                38px;
              display: block;
            }

            .login-top-link {
              text-align: center;
              margin-bottom: 34px;
              font-size: 14px;
            }

            .text-button {
              font-size: 14px;
            }

            .login-heading {
              margin-bottom: 30px;
            }

            .login-heading h2 {
              font-size: 32px;
              line-height: 1.15;
              letter-spacing: -0.5px;
            }

            .login-heading p {
              font-size: 15px;
              line-height: 1.65;
              max-width: 430px;
            }

            .form-group {
              margin-bottom: 22px;
            }

            .form-label {
              font-size: 14px;
              margin-bottom: 9px;
            }

            .form-input {
              height: 60px;
              border-radius: 13px;
              font-size: 16px;
              padding-left: 52px;
            }

            .password-input {
              padding-right: 55px;
            }

            .input-icon {
              left: 17px;
              font-size: 19px;
            }

            .password-toggle {
              right: 13px;
              font-size: 17px;
            }

            .forgot-row {
              margin-top: -2px;
              margin-bottom: 25px;
            }

            .forgot-button {
              font-size: 14px;
            }

            .primary-button {
              height: 60px;
              border-radius: 13px;
              font-size: 16px;
            }

            .divider {
              margin: 28px 0;
              font-size: 12px;
            }

            .google-button {
              height: 60px;
              border-radius: 13px;
              font-size: 15px;
            }

            .security-box {
              margin-top: 25px;
              padding: 15px;
              border-radius: 12px;
            }
          }

          /*
           * SMALL PHONES
           */
          @media (max-width: 420px) {
            .login-panel {
              padding:
                25px
                18px
                32px;
            }

            .login-top-link {
              margin-bottom: 29px;
            }

            .login-heading {
              margin-bottom: 27px;
            }

            .login-heading h2 {
              font-size: 29px;
            }

            .login-heading p {
              font-size: 14px;
            }

            .form-input {
              height: 58px;
              font-size: 16px;
            }

            .primary-button,
            .google-button {
              height: 58px;
            }
          }
        `}
      </style>

      <div className="login-page">
        <div className="login-shell">

          {/* DESKTOP BRAND PANEL */}
          <div className="login-brand">

            <div className="brand-circle-one" />
            <div className="brand-circle-two" />

            <div className="brand-content">

              <div className="brand-logo">
                <div className="brand-lightning">
                  ⚡
                </div>

                <div>
                  <div className="brand-name">
                    INSTANT{" "}
                    <span>LOAD</span>
                  </div>

                  <div className="brand-tagline">
                    Fast • Secure • Reliable
                  </div>
                </div>
              </div>

              <h1 className="brand-title">
                Welcome{" "}
                <span>Back!</span>
              </h1>

              <p className="brand-description">
                Your one-stop VTU platform for
                airtime, data, electricity bills
                and Cable TV payments.
              </p>

              <div className="brand-services">

                <div className="brand-service">
                  <div className="brand-service-icon">
                    📱
                  </div>

                  <div>
                    <div className="brand-service-title">
                      Airtime Recharge
                    </div>

                    <div className="brand-service-text">
                      Stay connected
                    </div>
                  </div>
                </div>

                <div className="brand-service">
                  <div className="brand-service-icon">
                    📶
                  </div>

                  <div>
                    <div className="brand-service-title">
                      Data Subscription
                    </div>

                    <div className="brand-service-text">
                      Browse without limits
                    </div>
                  </div>
                </div>

                <div className="brand-service">
                  <div className="brand-service-icon">
                    ⚡
                  </div>

                  <div>
                    <div className="brand-service-title">
                      Electricity Bills
                    </div>

                    <div className="brand-service-text">
                      Power your life
                    </div>
                  </div>
                </div>

                <div className="brand-service">
                  <div className="brand-service-icon">
                    📺
                  </div>

                  <div>
                    <div className="brand-service-title">
                      Cable TV
                    </div>

                    <div className="brand-service-text">
                      Entertainment for all
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="brand-footer">
              ⚡ Top Up • Pay Bills • Live Better
            </div>

          </div>

          {/* LOGIN PANEL */}
          <div className="login-panel">

            <div className="login-top-link">
              Don't have an account?{" "}
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  navigate("/signup")
                }
              >
                Sign Up →
              </button>
            </div>

            <div className="login-heading">

              <h2>
                Login to Your Account
              </h2>

              <p>
                Enter your details to access
                your wallet and start enjoying
                our services.
              </p>

            </div>

            <form onSubmit={handleLogin}>

              {/* EMAIL */}
              <div className="form-group">

                <label className="form-label">
                  Email Address
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    className="form-input"
                  />

                </div>

              </div>

              {/* PASSWORD */}
              <div className="form-group">

                <label className="form-label">
                  Password
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
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
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="form-input password-input"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword
                      ? "🙈"
                      : "👁"}
                  </button>

                </div>

              </div>

              {/* FORGOT PASSWORD */}
              <div className="forgot-row">

                <button
                  type="button"
                  className="forgot-button"
                  onClick={() =>
                    navigate("/reset")
                  }
                >
                  Forgot Password?
                </button>

              </div>

              {/* LOGIN */}
              <button
                type="submit"
                disabled={loading}
                className="primary-button"
              >
                {loading
                  ? "Please wait..."
                  : "Login →"}
              </button>

            </form>

            {/* DIVIDER */}
            <div className="divider">

              <div className="divider-line" />

              OR

              <div className="divider-line" />

            </div>

            {/* GOOGLE */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="google-button"
            >
              <span className="google-icon">
                G
              </span>

              Continue with Google
            </button>

            {/* SECURITY */}
            <div className="security-box">

              <span className="security-icon">
                🛡️
              </span>

              <div>

                <div className="security-title">
                  Your data is safe with us.
                </div>

                <div className="security-text">
                  We use secure authentication
                  to protect your account.
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </>
  );
};

export default Login;