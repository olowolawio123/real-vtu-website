import React, { useEffect, useState } from "react";
import axios from "axios";
import { PaystackButton } from "react-paystack";
import { auth } from "../../firebase";
import { toast } from "react-toastify";

const FundWallet = () => {
  const [amount, setAmount] = useState("");
  const [user, setUser] = useState(null);

  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

  const apiUrl =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Get the authenticated Firebase user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
    });

    return () => unsubscribe();
  }, []);

  const handleSuccess = async (reference) => {
    try {
      if (!user) {
        toast.error("Please log in again.");
        return;
      }

      const paymentReference =
        reference?.reference || reference;

      if (!paymentReference) {
        toast.error("Payment reference was not received.");
        return;
      }

      console.log("Payment reference:", paymentReference);
      console.log("Firebase UID:", user.uid);

      const response = await axios.post(
        `${apiUrl}/api/verify-payment`,
        {
          reference: paymentReference,
          uid: user.uid,
        }
      );

      if (response.data.success) {
        toast.success(
          `Wallet funded successfully with ₦${Number(
            response.data.amount
          ).toLocaleString()}`
        );

        setAmount("");
      }
    } catch (error) {
      console.error(
        "Verification error:",
        error.response?.data || error.message
      );

      toast.error(
        "Payment completed, but wallet verification failed. Do not pay again."
      );
    }
  };

  const handleClose = () => {
    toast.info("Payment window closed.");
  };

  const config = {
    reference: new Date().getTime().toString(),

    email: user?.email || "",

    // Paystack uses kobo
    amount: Number(amount) * 100,

    publicKey,

    currency: "NGN",

    // This connects the Paystack payment
    // to the Firebase user
    metadata: {
      uid: user?.uid || "",
      name: user?.displayName || "",
    },

    onSuccess: handleSuccess,
    onClose: handleClose,
  };

  return (
    <div className="container mt-4">
      <h3>Fund Wallet</h3>

      <div className="mb-3">
        <label className="form-label">
          Amount (₦)
        </label>

        <input
          type="number"
          className="form-control"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
        />
      </div>

      {amount > 0 && user && publicKey && (
        <PaystackButton
          {...config}
          className="btn btn-primary"
          text={`Fund ₦${Number(amount).toLocaleString()}`}
        />
      )}

      {!user && (
        <p className="text-danger">
          Please log in to fund your wallet.
        </p>
      )}

      {!publicKey && (
        <p className="text-danger">
          Paystack public key is not configured.
        </p>
      )}
    </div>
  );
};

export default FundWallet;