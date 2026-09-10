import React, {
  useCallback,
  useEffect,
  useMemo,
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
      if (filter === "all") {
        return true;
      }

      return (
        getCategory(transaction) === filter
      );
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
        return "status-success";

      case "refunded":
        return "status-refunded";

      case "failed":
        return "status-failed";

      case "processing":
      case "pending":
        return "status-pending";

      default:
        return "status-unknown";
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

  const getServiceIcon = (service) => {
    switch (service) {
      case "Wallet":
        return "₦";

      case "Data":
        return "▦";

      case "Airtime":
        return "☎";

      case "Electricity":
        return "⚡";

      case "Cable TV":
        return "▣";

      case "Refund":
        return "↩";

      default:
        return "₦";
    }
  };

  const getServiceAccent = (service) => {
    switch (service) {
      case "Wallet":
        return "service-wallet";

      case "Data":
        return "service-data";

      case "Airtime":
        return "service-airtime";

      case "Electricity":
        return "service-electricity";

      case "Cable TV":
        return "service-cable";

      case "Refund":
        return "service-refund";

      default:
        return "service-default";
    }
  };

  const stats = useMemo(() => {
    const successful =
      transactions.filter((transaction) => {
        const status = String(
          transaction.status || ""
        ).toLowerCase();

        return (
          status === "success" ||
          status === "successful"
        );
      }).length;

    const pending =
      transactions.filter((transaction) => {
        const status = String(
          transaction.status || ""
        ).toLowerCase();

        return (
          status === "pending" ||
          status === "processing"
        );
      }).length;

    const failed =
      transactions.filter((transaction) => {
        const status = String(
          transaction.status || ""
        ).toLowerCase();

        return status === "failed";
      }).length;

    return {
      total: transactions.length,
      successful,
      pending,
      failed,
    };
  }, [transactions]);

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

    const safe = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>INSTANT LOAD Transaction Receipt</title>

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
            background: #eef3f8;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            color: #142033;
          }

          .receipt {
            width: 100%;
            max-width: 720px;
            margin: 0 auto;
            background: #ffffff;
            padding: 42px;
            border-radius: 18px;
            box-shadow:
              0 10px 35px
              rgba(15, 31, 52, 0.10);
          }

          .header {
            text-align: center;
            padding-bottom: 24px;
            margin-bottom: 26px;
            border-bottom: 2px solid #e9eef4;
          }

          .business-name {
            color: #0b1f3a;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }

          .business-name span {
            color: #19b36b;
          }

          .receipt-title {
            color: #657286;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 12px 0;
            border-bottom: 1px solid #edf1f5;
          }

          .label {
            color: #718096;
            font-size: 14px;
          }

          .value {
            color: #172235;
            font-weight: 700;
            text-align: right;
            word-break: break-word;
          }

          .amount {
            margin: 28px 0;
            padding: 24px;
            background: #f3faf7;
            border: 1px solid #d9f1e5;
            border-radius: 14px;
            text-align: center;
          }

          .amount-label {
            font-size: 13px;
            color: #66758a;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .amount-value {
            color: #0b1f3a;
            font-size: 34px;
            font-weight: 800;
            margin-top: 7px;
          }

          .status {
            display: inline-block;
            padding: 7px 13px;
            border-radius: 30px;
            background: #e7f8ef;
            color: #087a43;
            font-size: 13px;
            font-weight: 700;
          }

          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 22px;
            border-top: 1px solid #e2e8ef;
            color: #718096;
            font-size: 13px;
            line-height: 1.6;
          }

          .print-button {
            display: block;
            margin: 25px auto 0;
            padding: 13px 26px;
            border: none;
            border-radius: 10px;
            background: #0b1f3a;
            color: white;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
          }

          .token {
            padding: 18px;
            margin-top: 18px;
            border: 2px dashed #19b36b;
            border-radius: 12px;
            background: #f4fbf7;
            color: #087a43;
            text-align: center;
            font-size: 22px;
            font-weight: 800;
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
              border-radius: 0;
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
              padding: 22px;
              border-radius: 12px;
            }

            .row {
              flex-direction: column;
              gap: 5px;
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
              INSTANT <span>LOAD</span>
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
              ${safe(receiptNumber)}
            </div>
          </div>

          <div class="row">
            <div class="label">
              Date
            </div>

            <div class="value">
              ${safe(
                formatDate(
                  transaction.createdAt
                )
              )}
            </div>
          </div>

          <div class="row">
            <div class="label">
              Customer
            </div>

            <div class="value">
              ${safe(customerEmail)}
            </div>
          </div>

          <div class="row">
            <div class="label">
              Transaction Type
            </div>

            <div class="value">
              ${safe(service)}
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
                    ${safe(network)}
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
                    ${safe(phone)}
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
                    ${safe(cableProvider)}
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
                    ${safe(smartCardNumber)}
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
                    ${safe(plan)}
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
                    ${safe(duration)} days
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
                    ${safe(
                      transaction.discoName
                    )}
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
                    ${safe(
                      transaction.meterNumber
                    )}
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
                    ${safe(requestId)}
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
                    ${safe(
                      providerReference
                    )}
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
              ${safe(formatAmount(amount))}
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
                    ${safe(electricityToken)}
                  </div>
                </div>

                <div class="token">
                  ${safe(electricityToken)}
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
                ${safe(status)}
              </span>
            </div>
          </div>

          <div class="footer">
            <div>
              ${safe(
                transaction.description || ""
              )}
            </div>

            <br />

            Thank you for using INSTANT LOAD.
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

  const filterOptions = [
    {
      key: "all",
      label: "All",
    },
    {
      key: "wallet",
      label: "Wallet",
    },
    {
      key: "data",
      label: "Data",
    },
    {
      key: "airtime",
      label: "Airtime",
    },
    {
      key: "electricity",
      label: "Electricity",
    },
    {
      key: "cabletv",
      label: "Cable TV",
    },
    {
      key: "refund",
      label: "Refunds",
    },
  ];

  return (
    <>
      <style>
        {`
          .history-page {
            min-height: 100vh;
            background: #f5f8fb;
            padding: 28px 0 55px;
          }

          .history-shell {
            max-width: 1180px;
            margin: 0 auto;
            padding: 0 20px;
          }

          .history-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 25px;
          }

          .history-eyebrow {
            color: #19a968;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 7px;
          }

          .history-title {
            color: #0b1f3a;
            font-size: 30px;
            font-weight: 800;
            margin: 0;
          }

          .history-subtitle {
            color: #6b7789;
            font-size: 14px;
            margin: 7px 0 0;
            max-width: 600px;
            line-height: 1.6;
          }

          .refresh-button {
            border: 1px solid #dce4ed;
            background: white;
            color: #0b1f3a;
            min-width: 105px;
            padding: 11px 17px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s ease;
            box-shadow:
              0 3px 12px
              rgba(11, 31, 58, 0.04);
          }

          .refresh-button:hover:not(:disabled) {
            border-color: #19a968;
            color: #19a968;
          }

          .refresh-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .history-stats {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 24px;
          }

          .history-stat {
            background: white;
            border: 1px solid #e7edf3;
            border-radius: 15px;
            padding: 17px;
            box-shadow:
              0 4px 18px
              rgba(11, 31, 58, 0.035);
          }

          .history-stat-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }

          .history-stat-label {
            color: #718096;
            font-size: 12px;
            font-weight: 700;
          }

          .history-stat-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: 800;
            background: #f1f6fb;
            color: #0b1f3a;
          }

          .history-stat-value {
            color: #0b1f3a;
            font-size: 24px;
            font-weight: 800;
            margin-top: 10px;
          }

          .history-stat-success
            .history-stat-icon {
            background: #e8f8f0;
            color: #0b9b5b;
          }

          .history-stat-pending
            .history-stat-icon {
            background: #fff6df;
            color: #a46b00;
          }

          .history-stat-failed
            .history-stat-icon {
            background: #fff0f0;
            color: #d53b3b;
          }

          .filter-card {
            background: white;
            border: 1px solid #e7edf3;
            border-radius: 15px;
            padding: 7px;
            margin-bottom: 22px;
            box-shadow:
              0 4px 18px
              rgba(11, 31, 58, 0.035);
          }

          .filter-scroll {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .filter-scroll::-webkit-scrollbar {
            display: none;
          }

          .filter-button {
            flex: 0 0 auto;
            border: none;
            background: transparent;
            color: #66758a;
            padding: 10px 15px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s ease;
          }

          .filter-button:hover {
            background: #f2f6fa;
            color: #0b1f3a;
          }

          .filter-button.active {
            background: #0b1f3a;
            color: white;
          }

          .transaction-list {
            display: flex;
            flex-direction: column;
            gap: 13px;
          }

          .transaction-card {
            background: white;
            border: 1px solid #e5ebf1;
            border-radius: 16px;
            padding: 18px;
            box-shadow:
              0 4px 18px
              rgba(11, 31, 58, 0.035);
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease;
          }

          .transaction-card:hover {
            transform: translateY(-1px);
            box-shadow:
              0 8px 25px
              rgba(11, 31, 58, 0.07);
          }

          .transaction-main {
            display: flex;
            align-items: flex-start;
            gap: 14px;
          }

          .service-icon {
            width: 48px;
            height: 48px;
            flex: 0 0 48px;
            border-radius: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 19px;
            font-weight: 800;
          }

          .service-wallet {
            background: #eaf7f1;
            color: #0a9a59;
          }

          .service-data {
            background: #edf4ff;
            color: #3676d5;
          }

          .service-airtime {
            background: #fff1e8;
            color: #dc6b28;
          }

          .service-electricity {
            background: #fff8dc;
            color: #a57900;
          }

          .service-cable {
            background: #f3edff;
            color: #7850c9;
          }

          .service-refund {
            background: #e9f7f8;
            color: #278b91;
          }

          .service-default {
            background: #edf2f7;
            color: #536276;
          }

          .transaction-content {
            min-width: 0;
            flex: 1;
          }

          .transaction-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
          }

          .transaction-title {
            color: #172235;
            font-size: 15px;
            font-weight: 800;
            margin: 0 0 4px;
          }

          .transaction-date {
            color: #8995a5;
            font-size: 12px;
          }

          .transaction-amount {
            text-align: right;
            white-space: nowrap;
          }

          .amount-positive {
            color: #0b9b5b;
          }

          .amount-negative {
            color: #d54646;
          }

          .amount-neutral {
            color: #172235;
          }

          .amount-value {
            font-size: 17px;
            font-weight: 800;
          }

          .amount-label {
            color: #9aa5b3;
            font-size: 11px;
            margin-top: 2px;
          }

          .transaction-divider {
            border: none;
            border-top: 1px solid #edf1f5;
            margin: 14px 0;
          }

          .transaction-meta {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 15px;
          }

          .meta-label {
            display: block;
            color: #8995a5;
            font-size: 11px;
            margin-bottom: 4px;
          }

          .meta-value {
            color: #364357;
            font-size: 13px;
            font-weight: 700;
            word-break: break-word;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 800;
          }

          .status-badge::before {
            content: "";
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
          }

          .status-success {
            background: #e8f8f0;
            color: #087a43;
          }

          .status-refunded {
            background: #e7f6f7;
            color: #237d82;
          }

          .status-failed {
            background: #fff0f0;
            color: #c73737;
          }

          .status-pending {
            background: #fff5dc;
            color: #9b6b00;
          }

          .status-unknown {
            background: #edf1f5;
            color: #647286;
          }

          .transaction-extra {
            margin-top: 14px;
            padding: 12px 14px;
            background: #f8fafc;
            border-radius: 10px;
          }

          .extra-line {
            color: #66758a;
            font-size: 12px;
            line-height: 1.7;
          }

          .extra-line strong {
            color: #364357;
          }

          .receipt-button {
            margin-top: 14px;
            border: 1px solid #dce5ed;
            background: white;
            color: #0b1f3a;
            padding: 9px 13px;
            border-radius: 9px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            transition: 0.2s ease;
          }

          .receipt-button:hover {
            border-color: #19a968;
            color: #0a9a59;
            background: #f4fbf7;
          }

          .empty-card {
            background: white;
            border: 1px solid #e5ebf1;
            border-radius: 17px;
            padding: 60px 20px;
            text-align: center;
            box-shadow:
              0 4px 18px
              rgba(11, 31, 58, 0.035);
          }

          .empty-icon {
            width: 58px;
            height: 58px;
            margin: 0 auto 16px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #edf3f8;
            color: #647286;
            font-size: 22px;
            font-weight: 800;
          }

          .empty-title {
            color: #172235;
            font-size: 17px;
            font-weight: 800;
            margin-bottom: 7px;
          }

          .empty-text {
            color: #8793a3;
            font-size: 13px;
            margin: 0;
          }

          .loading-card {
            background: white;
            border: 1px solid #e5ebf1;
            border-radius: 17px;
            padding: 65px 20px;
            text-align: center;
          }

          .loading-spinner {
            width: 38px;
            height: 38px;
            border: 3px solid #e2e9f0;
            border-top-color: #19a968;
            border-radius: 50%;
            animation:
              instantLoadSpin 0.8s
              linear infinite;
            margin: 0 auto 14px;
          }

          .loading-text {
            color: #6e7b8d;
            font-size: 13px;
            margin: 0;
          }

          @keyframes instantLoadSpin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 900px) {
            .history-stats {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .transaction-meta {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 650px) {
            .history-page {
              padding-top: 20px;
            }

            .history-shell {
              padding: 0 14px;
            }

            .history-header {
              flex-direction: column;
            }

            .history-title {
              font-size: 25px;
            }

            .refresh-button {
              width: 100%;
            }

            .history-stats {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
              gap: 9px;
            }

            .history-stat {
              padding: 14px;
            }

            .history-stat-value {
              font-size: 21px;
            }

            .transaction-card {
              padding: 14px;
            }

            .transaction-main {
              gap: 11px;
            }

            .service-icon {
              width: 43px;
              height: 43px;
              flex-basis: 43px;
              border-radius: 11px;
              font-size: 17px;
            }

            .transaction-heading {
              gap: 8px;
            }

            .transaction-title {
              font-size: 14px;
            }

            .transaction-amount {
              min-width: 90px;
            }

            .amount-value {
              font-size: 15px;
            }

            .transaction-meta {
              grid-template-columns: 1fr;
              gap: 10px;
            }
          }
        `}
      </style>

      <div className="history-page">
        <div className="history-shell">

          <div className="history-header">
            <div>
              <div className="history-eyebrow">
                INSTANT LOAD
              </div>

              <h1 className="history-title">
                Transaction History
              </h1>

              <p className="history-subtitle">
                Track your wallet funding,
                airtime, data, electricity and
                cable TV transactions in one
                place.
              </p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={loadTransactions}
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : "↻ Refresh"}
            </button>
          </div>

          <div className="history-stats">

            <div className="history-stat">
              <div className="history-stat-top">
                <span className="history-stat-label">
                  Total
                </span>

                <div className="history-stat-icon">
                  ≡
                </div>
              </div>

              <div className="history-stat-value">
                {stats.total}
              </div>
            </div>

            <div className="history-stat history-stat-success">
              <div className="history-stat-top">
                <span className="history-stat-label">
                  Successful
                </span>

                <div className="history-stat-icon">
                  ✓
                </div>
              </div>

              <div className="history-stat-value">
                {stats.successful}
              </div>
            </div>

            <div className="history-stat history-stat-pending">
              <div className="history-stat-top">
                <span className="history-stat-label">
                  Pending
                </span>

                <div className="history-stat-icon">
                  …
                </div>
              </div>

              <div className="history-stat-value">
                {stats.pending}
              </div>
            </div>

            <div className="history-stat history-stat-failed">
              <div className="history-stat-top">
                <span className="history-stat-label">
                  Failed
                </span>

                <div className="history-stat-icon">
                  !
                </div>
              </div>

              <div className="history-stat-value">
                {stats.failed}
              </div>
            </div>

          </div>

          <div className="filter-card">
            <div className="filter-scroll">

              {filterOptions.map(
                (option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`filter-button ${
                      filter === option.key
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setFilter(option.key)
                    }
                  >
                    {option.label}
                  </button>
                )
              )}

            </div>
          </div>

          {loading ? (
            <div className="loading-card">

              <div className="loading-spinner" />

              <p className="loading-text">
                Loading your transactions...
              </p>

            </div>
          ) : filteredTransactions.length ===
            0 ? (
            <div className="empty-card">

              <div className="empty-icon">
                ≡
              </div>

              <div className="empty-title">
                No transactions found
              </div>

              <p className="empty-text">
                Your transactions will appear
                here once you start using
                INSTANT LOAD.
              </p>

            </div>
          ) : (
            <div className="transaction-list">

              {filteredTransactions.map(
                (transaction) => {

                  const service =
                    getServiceName(
                      transaction
                    );

                  const amountSigned =
                    Number(
                      transaction.amountSigned ??
                        transaction.amount ??
                        0
                    );

                  const isPositive =
                    amountSigned > 0;

                  const isNegative =
                    amountSigned < 0;

                  const cableProvider =
                    getField(
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

                  const smartCardNumber =
                    getField(
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

                  const cablePlan =
                    getField(
                      transaction,
                      [
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
                      ]
                    );

                  const duration =
                    getField(
                      transaction,
                      [
                        "duration",
                        "durationDays",
                        "duration_days",
                      ]
                    );

                  const amountClass =
                    isPositive
                      ? "amount-positive"
                      : isNegative
                      ? "amount-negative"
                      : "amount-neutral";

                  return (
                    <div
                      className="transaction-card"
                      key={
                        transaction.id ||
                        transaction.reference
                      }
                    >

                      <div className="transaction-main">

                        <div
                          className={`service-icon ${getServiceAccent(
                            service
                          )}`}
                        >
                          {getServiceIcon(
                            service
                          )}
                        </div>

                        <div className="transaction-content">

                          <div className="transaction-heading">

                            <div>
                              <h3 className="transaction-title">
                                {transaction.title ||
                                  service}
                              </h3>

                              <div className="transaction-date">
                                {formatDate(
                                  transaction.createdAt
                                )}
                              </div>
                            </div>

                            <div className="transaction-amount">

                              <div
                                className={`amount-value ${amountClass}`}
                              >
                                {isPositive
                                  ? "+"
                                  : isNegative
                                  ? "-"
                                  : ""}

                                {formatAmount(
                                  amountSigned
                                )}
                              </div>

                              <div className="amount-label">
                                Amount
                              </div>

                            </div>

                          </div>

                          <hr className="transaction-divider" />

                          <div className="transaction-meta">

                            <div>
                              <span className="meta-label">
                                Service
                              </span>

                              <span className="meta-value">
                                {service}
                              </span>
                            </div>

                            <div>
                              <span className="meta-label">
                                Reference
                              </span>

                              <span className="meta-value">
                                {transaction.reference ||
                                  transaction.id ||
                                  "N/A"}
                              </span>
                            </div>

                            <div>
                              <span className="meta-label">
                                Status
                              </span>

                              <span
                                className={`status-badge ${getStatusClass(
                                  transaction.status
                                )}`}
                              >
                                {getStatusText(
                                  transaction.status
                                )}
                              </span>
                            </div>

                          </div>

                          {transaction.network && (
                            <div className="transaction-extra">

                              <div className="extra-line">
                                <strong>
                                  Network:
                                </strong>{" "}
                                {
                                  transaction.network
                                }

                                {transaction.mobileNumber && (
                                  <>
                                    {" • "}

                                    <strong>
                                      Number:
                                    </strong>{" "}
                                    {
                                      transaction.mobileNumber
                                    }
                                  </>
                                )}
                              </div>

                            </div>
                          )}

                          {service ===
                            "Cable TV" && (
                            <div className="transaction-extra">

                              {cableProvider && (
                                <div className="extra-line">
                                  <strong>
                                    Provider:
                                  </strong>{" "}
                                  {
                                    cableProvider
                                  }
                                </div>
                              )}

                              {smartCardNumber && (
                                <div className="extra-line">
                                  <strong>
                                    Smart Card / IUC:
                                  </strong>{" "}
                                  {
                                    smartCardNumber
                                  }
                                </div>
                              )}

                              {cablePlan && (
                                <div className="extra-line">
                                  <strong>
                                    Package:
                                  </strong>{" "}
                                  {cablePlan}
                                </div>
                              )}

                              {duration && (
                                <div className="extra-line">
                                  <strong>
                                    Duration:
                                  </strong>{" "}
                                  {duration} days
                                </div>
                              )}

                            </div>
                          )}

                          {service ===
                            "Electricity" && (
                            <div className="transaction-extra">

                              {transaction.discoName && (
                                <div className="extra-line">
                                  <strong>
                                    Disco:
                                  </strong>{" "}
                                  {
                                    transaction.discoName
                                  }
                                </div>
                              )}

                              {transaction.meterNumber && (
                                <div className="extra-line">
                                  <strong>
                                    Meter Number:
                                  </strong>{" "}
                                  {
                                    transaction.meterNumber
                                  }
                                </div>
                              )}

                              {transaction.token && (
                                <div className="extra-line">
                                  <strong>
                                    Token:
                                  </strong>{" "}
                                  <span
                                    style={{
                                      wordBreak:
                                        "break-all",
                                    }}
                                  >
                                    {
                                      transaction.token
                                    }
                                  </span>
                                </div>
                              )}

                            </div>
                          )}

                          {transaction.plan &&
                            service !==
                              "Cable TV" && (
                              <div className="transaction-extra">

                                <div className="extra-line">
                                  <strong>
                                    Plan:
                                  </strong>{" "}
                                  {
                                    transaction.plan
                                  }
                                </div>

                              </div>
                            )}

                          <button
                            type="button"
                            className="receipt-button"
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
                  );
                }
              )}

            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default TransactionHistory;