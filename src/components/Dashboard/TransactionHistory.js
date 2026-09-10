import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { auth } from "../../firebase";
import { toast } from "react-toastify";

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error(
          "Please log in to view your transactions."
        );
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await axios.get(
        `${apiUrl}/api/transactions`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.data.success) {
        setTransactions(response.data.data || []);
      } else {
        toast.error(
          response.data.message ||
            "Unable to load transactions."
        );
      }
    } catch (error) {
      console.error(
        "Transaction history error:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to load transaction history."
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const getServiceName = (transaction) => {
    const service = String(
      transaction.service ||
        transaction.category ||
        ""
    ).toLowerCase();

    if (
      service.includes("cable") ||
      service.includes("cablesub") ||
      service === "tv"
    ) {
      return "Cable TV";
    }

    if (service.includes("electric")) {
      return "Electricity";
    }

    if (service.includes("airtime")) {
      return "Airtime";
    }

    if (service.includes("data")) {
      return "Data";
    }

    if (
      service.includes("wallet") ||
      transaction.category === "wallet"
    ) {
      return "Wallet";
    }

    if (
      transaction.type === "refund" ||
      service.includes("refund")
    ) {
      return "Refund";
    }

    return (
      transaction.title ||
      transaction.service ||
      "Transaction"
    );
  };

  const getCategory = (transaction) => {
    const service = String(
      transaction.service || ""
    ).toLowerCase();

    if (
      service.includes("cable") ||
      service.includes("cablesub") ||
      service === "tv"
    ) {
      return "cabletv";
    }

    if (service.includes("electric")) {
      return "electricity";
    }

    if (service.includes("airtime")) {
      return "airtime";
    }

    if (service.includes("data")) {
      return "data";
    }

    if (
      transaction.type === "refund" ||
      service.includes("refund")
    ) {
      return "refund";
    }

    if (
      service.includes("wallet") ||
      transaction.category === "wallet"
    ) {
      return "wallet";
    }

    return "";
  };

  const filteredTransactions =
    transactions.filter((transaction) => {
      const category = getCategory(transaction);

      if (filter === "all") {
        return true;
      }

      if (filter === "wallet") {
        return category === "wallet";
      }

      if (filter === "data") {
        return category === "data";
      }

      if (filter === "airtime") {
        return category === "airtime";
      }

      if (filter === "electricity") {
        return category === "electricity";
      }

      if (filter === "cabletv") {
        return category === "cabletv";
      }

      if (filter === "refund") {
        return category === "refund";
      }

      return true;
    });

  const formatAmount = (amount) => {
    return `₦${Math.abs(
      Number(amount || 0)
    ).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    try {
      return new Date(date).toLocaleString(
        "en-NG",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );
    } catch {
      return "Date unavailable";
    }
  };

  const getStatusClass = (status) => {
    switch (
      String(status || "").toLowerCase()
    ) {
      case "successful":
      case "success":
        return "bg-success";

      case "refunded":
        return "bg-info text-dark";

      case "failed":
        return "bg-danger";

      case "processing":
      case "pending":
        return "bg-warning text-dark";

      default:
        return "bg-secondary";
    }
  };

  const getStatusText = (status) => {
    switch (
      String(status || "").toLowerCase()
    ) {
      case "successful":
      case "success":
        return "Successful";

      case "refunded":
        return "Refunded";

      case "failed":
        return "Failed";

      case "processing":
        return "Processing";

      case "pending":
        return "Pending";

      default:
        return "Unknown";
    }
  };

  const getField = (
    transaction,
    fields,
    fallback = ""
  ) => {
    for (const field of fields) {
      const value = transaction[field];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }

    return fallback;
  };

  const openReceipt = (transaction) => {
    const receiptWindow = window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

    if (!receiptWindow) {
      toast.error(
        "Please allow pop-ups to print receipts."
      );
      return;
    }

    const customerEmail =
      auth.currentUser?.email || "";

    const amount = Number(
      transaction.amount || 0
    );

    const receiptNumber =
      transaction.reference ||
      transaction.id ||
      "N/A";

    const service =
      getServiceName(transaction);

    const status =
      getStatusText(transaction.status);

    const network = getField(
      transaction,
      ["network"]
    );

    const phone = getField(
      transaction,
      [
        "mobileNumber",
        "mobile_number",
        "phone",
        "phoneNumber",
      ]
    );

    const plan = getField(
      transaction,
      [
        "plan",
        "planName",
        "plan_name",
        "package",
        "packageName",
        "package_name",
        "size",
      ]
    );

    const requestId = getField(
      transaction,
      [
        "requestId",
        "request_id",
      ]
    );

    const providerReference =
      getField(transaction, [
        "providerReference",
        "provider_reference",
        "providerRef",
        "provider_ref",
      ]);

    const cableProvider = getField(
      transaction,
      [
        "cableName",
        "cable_name",
        "cableProvider",
        "cable_provider",
        "cableTvProvider",
        "cable_tv_provider",
        "provider",
        "providerName",
        "the_cabletv_name",
      ]
    );

    const smartCardNumber = getField(
      transaction,
      [
        "smartCardNumber",
        "smart_card_number",
        "smartcardNumber",
        "smartcard_number",
        "iucNumber",
        "iuc_number",
        "smartCard",
        "smart_card",
        "iuc",
      ]
    );

    const duration = getField(
      transaction,
      [
        "duration",
        "durationDays",
        "duration_days",
      ]
    );

    const electricityToken = getField(
      transaction,
      [
        "token",
        "electricityToken",
        "electricity_token",
        "meterToken",
        "meter_token",
      ]
    );

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaction Receipt</title>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 30px;
            background: #f2f2f2;
            font-family: Arial, Helvetica, sans-serif;
            color: #222;
          }

          .receipt {
            width: 100%;
            max-width: 700px;
            margin: 0 auto;
            background: #ffffff;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #222;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }

          .business-name {
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .receipt-title {
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 10px 0;
            border-bottom: 1px solid #eeeeee;
          }

          .label {
            color: #666;
          }

          .value {
            font-weight: 600;
            text-align: right;
            word-break: break-word;
          }

          .amount {
            margin: 25px 0;
            padding: 20px;
            background: #f7f7f7;
            text-align: center;
          }

          .amount-label {
            font-size: 14px;
            color: #666;
          }

          .amount-value {
            font-size: 32px;
            font-weight: bold;
            margin-top: 5px;
          }

          .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            background: #198754;
            color: white;
            font-size: 13px;
          }

          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 13px;
          }

          .print-button {
            display: block;
            margin: 25px auto 0;
            padding: 12px 25px;
            border: none;
            border-radius: 6px;
            background: #0d6efd;
            color: white;
            font-size: 16px;
            cursor: pointer;
          }

          .token {
            padding: 15px;
            margin-top: 15px;
            border: 2px dashed #198754;
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            word-break: break-all;
          }

          @media print {
            body {
              background: white;
              padding: 0;
            }

            .receipt {
              max-width: none;
              box-shadow: none;
              padding: 20px;
            }

            .print-button {
              display: none;
            }
          }

          @media (max-width: 600px) {
            body {
              padding: 10px;
            }

            .receipt {
              padding: 20px;
            }

            .row {
              flex-direction: column;
              gap: 4px;
            }

            .value {
              text-align: left;
            }
          }
        </style>
      </head>

      <body>
        <div class="receipt">

          <div class="header">
            <div class="business-name">
              VTU BUSINESS
            </div>

            <div class="receipt-title">
              Transaction Receipt
            </div>
          </div>

          <div class="row">
            <div class="label">
              Transaction Reference
            </div>

            <div class="value">
              ${receiptNumber}
            </div>
          </div>

          <div class="row">
            <div class="label">
              Date
            </div>

            <div class="value">
              ${formatDate(transaction.createdAt)}
            </div>
          </div>

          <div class="row">
            <div class="label">
              Customer
            </div>

            <div class="value">
              ${customerEmail}
            </div>
          </div>

          <div class="row">
            <div class="label">
              Transaction Type
            </div>

            <div class="value">
              ${service}
            </div>
          </div>

          ${
            network
              ? `
                <div class="row">
                  <div class="label">
                    Network
                  </div>

                  <div class="value">
                    ${network}
                  </div>
                </div>
              `
              : ""
          }

          ${
            phone
              ? `
                <div class="row">
                  <div class="label">
                    Phone Number
                  </div>

                  <div class="value">
                    ${phone}
                  </div>
                </div>
              `
              : ""
          }

          ${
            service === "Cable TV" &&
            cableProvider
              ? `
                <div class="row">
                  <div class="label">
                    Cable Provider
                  </div>

                  <div class="value">
                    ${cableProvider}
                  </div>
                </div>
              `
              : ""
          }

          ${
            service === "Cable TV" &&
            smartCardNumber
              ? `
                <div class="row">
                  <div class="label">
                    Smart Card / IUC
                  </div>

                  <div class="value">
                    ${smartCardNumber}
                  </div>
                </div>
              `
              : ""
          }

          ${
            plan
              ? `
                <div class="row">
                  <div class="label">
                    Plan / Package
                  </div>

                  <div class="value">
                    ${plan}
                  </div>
                </div>
              `
              : ""
          }

          ${
            service === "Cable TV" &&
            duration
              ? `
                <div class="row">
                  <div class="label">
                    Duration
                  </div>

                  <div class="value">
                    ${duration} days
                  </div>
                </div>
              `
              : ""
          }

          ${
            service === "Electricity" &&
            transaction.discoName
              ? `
                <div class="row">
                  <div class="label">
                    Disco
                  </div>

                  <div class="value">
                    ${transaction.discoName}
                  </div>
                </div>
              `
              : ""
          }

          ${
            service === "Electricity" &&
            transaction.meterNumber
              ? `
                <div class="row">
                  <div class="label">
                    Meter Number
                  </div>

                  <div class="value">
                    ${transaction.meterNumber}
                  </div>
                </div>
              `
              : ""
          }

          ${
            requestId
              ? `
                <div class="row">
                  <div class="label">
                    Request ID
                  </div>

                  <div class="value">
                    ${requestId}
                  </div>
                </div>
              `
              : ""
          }

          ${
            providerReference
              ? `
                <div class="row">
                  <div class="label">
                    Provider Reference
                  </div>

                  <div class="value">
                    ${providerReference}
                  </div>
                </div>
              `
              : ""
          }

          <div class="amount">
            <div class="amount-label">
              Amount
            </div>

            <div class="amount-value">
              ${formatAmount(amount)}
            </div>
          </div>

          ${
            electricityToken
              ? `
                <div class="row">
                  <div class="label">
                    Electricity Token
                  </div>

                  <div class="value">
                    ${electricityToken}
                  </div>
                </div>

                <div class="token">
                  ${electricityToken}
                </div>
              `
              : ""
          }

          <div class="row">
            <div class="label">
              Status
            </div>

            <div class="value">
              <span class="status">
                ${status}
              </span>
            </div>
          </div>

          <div class="footer">
            <div>
              ${transaction.description || ""}
            </div>

            <br />

            Thank you for using our service.
          </div>

          <button
            class="print-button"
            onclick="window.print()"
          >
            Print Receipt
          </button>

        </div>
      </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();
  };

  return (
    <div className="container mt-4 mb-5">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">
            Transaction History
          </h3>

          <p className="text-muted mb-0">
            View and print your data, airtime,
            electricity, cable TV and wallet
            transactions.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={loadTransactions}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="mb-4">

        <div
          className="btn-group w-100"
          role="group"
        >

          <button
            type="button"
            className={`btn ${
              filter === "all"
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            type="button"
            className={`btn ${
              filter === "wallet"
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() => setFilter("wallet")}
          >
            Wallet
          </button>

          <button
            type="button"
            className={`btn ${
              filter === "data"
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() => setFilter("data")}
          >
            Data
          </button>

          <button
            type="button"
            className={`btn ${
              filter === "airtime"
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() => setFilter("airtime")}
          >
            Airtime
          </button>

          <button
            type="button"
            className={`btn ${
              filter === "electricity"
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() =>
              setFilter("electricity")
            }
          >
            Electricity
          </button>

          <button
            type="button"
            className={`btn ${
              filter === "cabletv"
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() => setFilter("cabletv")}
          >
            Cable TV
          </button>

          <button
            type="button"
            className={`btn ${
              filter === "refund"
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() => setFilter("refund")}
          >
            Refunds
          </button>

        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">

          <div
            className="spinner-border"
            role="status"
          />

          <p className="mt-3">
            Loading transactions...
          </p>

        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="card shadow-sm">

          <div className="card-body text-center py-5">

            <h5>
              No transactions found
            </h5>

            <p className="text-muted mb-0">
              Your transactions will appear here.
            </p>

          </div>

        </div>
      ) : (
        <div className="row">

          {filteredTransactions.map(
            (transaction) => {

              const service =
                getServiceName(transaction);

              const cableProvider =
                getField(transaction, [
                  "cableName",
                  "cable_name",
                  "cableProvider",
                  "cable_provider",
                  "cableTvProvider",
                  "cable_tv_provider",
                  "provider",
                  "providerName",
                  "the_cabletv_name",
                ]);

              const smartCardNumber =
                getField(transaction, [
                  "smartCardNumber",
                  "smart_card_number",
                  "smartcardNumber",
                  "smartcard_number",
                  "iucNumber",
                  "iuc_number",
                  "smartCard",
                  "smart_card",
                  "iuc",
                ]);

              const cablePlan =
                getField(transaction, [
                  "plan",
                  "planName",
                  "plan_name",
                  "package",
                  "packageName",
                  "package_name",
                  "cablePlan",
                  "cable_plan",
                  "cableplan",
                  "size",
                ]);

              const duration =
                getField(transaction, [
                  "duration",
                  "durationDays",
                  "duration_days",
                ]);

              return (
                <div
                  className="col-12 mb-3"
                  key={transaction.id}
                >

                  <div className="card shadow-sm">

                    <div className="card-body">

                      <div className="d-flex justify-content-between align-items-start gap-3">

                        <div>

                          <h5 className="mb-1">
                            {transaction.title ||
                              service}
                          </h5>

                          <small className="text-muted">
                            {formatDate(
                              transaction.createdAt
                            )}
                          </small>

                        </div>

                        <span
                          className={`badge ${getStatusClass(
                            transaction.status
                          )}`}
                        >
                          {getStatusText(
                            transaction.status
                          )}
                        </span>

                      </div>

                      <hr />

                      <div className="row">

                        <div className="col-md-4 mb-2">

                          <small className="text-muted d-block">
                            Amount
                          </small>

                          <strong
                            className={
                              Number(
                                transaction.amountSigned ||
                                  0
                              ) >= 0
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {Number(
                              transaction.amountSigned ||
                                0
                            ) >= 0
                              ? "+"
                              : "-"}

                            {formatAmount(
                              transaction.amountSigned
                            )}
                          </strong>

                        </div>

                        <div className="col-md-4 mb-2">

                          <small className="text-muted d-block">
                            Reference
                          </small>

                          <span className="text-break">
                            {transaction.reference ||
                              transaction.id}
                          </span>

                        </div>

                        <div className="col-md-4 mb-2">

                          <small className="text-muted d-block">
                            Service
                          </small>

                          <span>
                            {service}
                          </span>

                        </div>

                      </div>

                      {transaction.network && (
                        <div className="mt-2">

                          <small className="text-muted">
                            Network:
                          </small>{" "}

                          <strong>
                            {transaction.network}
                          </strong>

                          {transaction.mobileNumber && (
                            <>
                              {" • "}

                              <small className="text-muted">
                                Number:
                              </small>{" "}

                              <strong>
                                {
                                  transaction.mobileNumber
                                }
                              </strong>
                            </>
                          )}

                        </div>
                      )}

                      {service === "Cable TV" && (
                        <div className="mt-3">

                          {cableProvider && (
                            <div className="mb-1">

                              <small className="text-muted">
                                Provider:
                              </small>{" "}

                              <strong>
                                {cableProvider}
                              </strong>

                            </div>
                          )}

                          {smartCardNumber && (
                            <div className="mb-1">

                              <small className="text-muted">
                                Smart Card / IUC:
                              </small>{" "}

                              <strong>
                                {smartCardNumber}
                              </strong>

                            </div>
                          )}

                          {cablePlan && (
                            <div className="mb-1">

                              <small className="text-muted">
                                Package:
                              </small>{" "}

                              <strong>
                                {cablePlan}
                              </strong>

                            </div>
                          )}

                          {duration && (
                            <div className="mb-1">

                              <small className="text-muted">
                                Duration:
                              </small>{" "}

                              <strong>
                                {duration} days
                              </strong>

                            </div>
                          )}

                        </div>
                      )}

                      {service === "Electricity" && (
                        <div className="mt-3">

                          {transaction.discoName && (
                            <div className="mb-1">

                              <small className="text-muted">
                                Disco:
                              </small>{" "}

                              <strong>
                                {
                                  transaction.discoName
                                }
                              </strong>

                            </div>
                          )}

                          {transaction.meterNumber && (
                            <div className="mb-1">

                              <small className="text-muted">
                                Meter Number:
                              </small>{" "}

                              <strong>
                                {
                                  transaction.meterNumber
                                }
                              </strong>

                            </div>
                          )}

                          {transaction.token && (
                            <div className="mb-1">

                              <small className="text-muted">
                                Token:
                              </small>{" "}

                              <strong className="text-break">
                                {
                                  transaction.token
                                }
                              </strong>

                            </div>
                          )}

                        </div>
                      )}

                      {transaction.plan &&
                        service !== "Cable TV" && (
                          <div className="mt-2">

                            <small className="text-muted">
                              Plan:
                            </small>{" "}

                            <strong>
                              {transaction.plan}
                            </strong>

                          </div>
                        )}

                      <div className="mt-3">

                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() =>
                            openReceipt(
                              transaction
                            )
                          }
                        >
                          View / Print Receipt
                        </button>

                      </div>

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
};

export default TransactionHistory;