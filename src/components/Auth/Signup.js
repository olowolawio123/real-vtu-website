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

  const handleChange = (e) =>
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      // Create Firebase Authentication account
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // Create the user's Firestore account/wallet document
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

      // Send verification email
      await sendEmailVerification(userCred.user);

      toast.success("Check your email to verify your account.");
      navigate("/login");
    } catch (err) {
      console.error("Signup error:", err);
      toast.error(err.message);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      // Sign in with Google
      const result = await signInWithPopup(auth, googleProvider);

      // Create/update the user's Firestore account/wallet document
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

      toast.success("Signup successful with Google!");
      navigate("/login");
    } catch (err) {
      console.error("Google signup error:", err);
      toast.error(err.message);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div
        className="card p-4 shadow-lg"
        style={{ maxWidth: 400, width: "100%" }}
      >
        <h3 className="text-center mb-3">
          Create Your VTU Account
        </h3>

        <form onSubmit={handleSignup}>
          <input
            type="email"
            name="email"
            className="form-control mb-3"
            placeholder="Enter Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            className="form-control mb-3"
            placeholder="Create Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            className="btn btn-primary w-100 mb-2"
          >
            Sign Up
          </button>
        </form>

        <button
          onClick={handleGoogleSignup}
          className="btn btn-danger w-100 mb-3"
        >
          Sign up with Google
        </button>

        <p className="text-center">
          Already have an account?{" "}
          <a href="/login">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;