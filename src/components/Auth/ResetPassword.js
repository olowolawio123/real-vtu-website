import React, { useState } from "react";
import { auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "react-toastify";

const ResetPassword = () => {
  const [email, setEmail] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset email sent!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="container mt-5">
      <h3>Reset Password</h3>
      <form onSubmit={handleReset}>
        <input type="email" className="form-control my-2" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-warning w-100">Send Reset Link</button>
      </form>
    </div>
  );
};

export default ResetPassword;
