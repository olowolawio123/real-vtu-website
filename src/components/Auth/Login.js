import React, { useState } from "react";
import { auth, googleProvider } from "../../firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
      if (!userCred.user.emailVerified) {
        toast.warning("Please verify your email before logging in.");
      } else {
        toast.success("Login successful");
        navigate("/Dashboard");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in with Google!");
      navigate("/Dashboard");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-white">
      <div className="card p-4 shadow-lg" style={{ maxWidth: 400, width: "100%" }}>
        <h3 className="text-center mb-3">Login to Your Account</h3>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            name="email"
            className="form-control mb-3"
            placeholder="Email"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            className="form-control mb-3"
            placeholder="Password"
            onChange={handleChange}
            required
          />
          <button className="btn btn-success w-100 mb-2">Login</button>
        </form>
        <button onClick={handleGoogleLogin} className="btn btn-danger w-100 mb-3">
          Login with Google
        </button>
        <p className="text-center">
          Forgot password? <a href="/reset">Reset</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
