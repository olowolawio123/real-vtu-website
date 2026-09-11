import React, { useState } from "react";
import { toast } from "react-toastify";

function HelpSupport() {
  const [openFaq, setOpenFaq] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const faqs = [
    {
      question: "How do I fund my wallet?",
      answer:
        "Open Fund Wallet from your dashboard, enter the amount you want to fund, and complete the Paystack payment. Your wallet balance will be updated after successful verification.",
    },
    {
      question: "How do I buy data or airtime?",
      answer:
        "Choose Buy Data or Buy Airtime from your dashboard, enter the required details, review the amount, and confirm the transaction with your transaction PIN.",
    },
    {
      question: "My transaction failed. What should I do?",
      answer:
        "Check your transaction history first. If your wallet was debited but the transaction failed, contact support with the transaction reference so the issue can be investigated.",
    },
    {
      question: "I was debited but did not receive my data or airtime.",
      answer:
        "Do not immediately make another purchase. Check your transaction history and contact support with the transaction reference and phone number used for the transaction.",
    },
    {
      question: "How do I change my transaction PIN?",
      answer:
        "Go to Account, open Security, and use the transaction PIN options available there.",
    },
    {
      question: "How do I save a beneficiary?",
      answer:
        "Go to Account → Saved Beneficiaries and add the name, phone number, network, and service you frequently use.",
    },
    {
      question: "Can I cancel a transaction?",
      answer:
        "Transactions are processed electronically and may not be cancellable after they have been submitted. Contact support immediately if you believe a transaction was made incorrectly.",
    },
    {
      question: "What happens when a transaction is pending?",
      answer:
        "A pending transaction means the provider has not yet returned a final result. Please allow the transaction to update before attempting another purchase.",
    },
    {
      question: "What if I entered the wrong phone number?",
      answer:
        "Always confirm the phone number before completing a purchase. Transactions sent to the wrong number may not be reversible.",
    },
    {
      question: "How do I contact INSTANT LOAD support?",
      answer:
        "You can call or WhatsApp our support number at 08132893350, or send an email to OLOWOLAWIO@GMAIL.COM.",
    },
  ];

  const toggleFaq = (index) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (cleanMessage.length < 10) {
      toast.error("Please describe your issue in more detail.");
      return;
    }

    setSending(true);

    try {
      /*
        The support-ticket backend can be connected here later.

        For now, we do not pretend that a support ticket has
        actually been sent to an admin.
      */

      await new Promise((resolve) => setTimeout(resolve, 700));

      toast.success(
        "Please contact INSTANT LOAD support using the details below."
      );

      setMessage("");
    } catch (error) {
      console.error("Support request error:", error);
      toast.error("Unable to process your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="help-support-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .help-support-page {
          width: 100%;
          min-height: 100vh;
          padding: 32px 24px 120px;
          background: #f6f8fb;
          color: #111827;
          overflow-x: hidden;
        }

        .help-support-container {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
        }

        .help-support-header {
          margin-bottom: 28px;
        }

        .help-support-title {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .help-support-subtitle {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 15px;
          line-height: 1.6;
        }

        /* QUICK HELP */

        .support-section {
          margin-bottom: 30px;
        }

        .support-section-title {
          margin: 0 0 14px;
          font-size: 20px;
          font-weight: 800;
        }

        .quick-help-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .quick-help-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          padding: 18px 15px;
          box-shadow: 0 7px 25px rgba(15, 23, 42, 0.045);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .quick-help-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        .quick-help-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          font-size: 21px;
          margin-bottom: 12px;
        }

        .quick-help-title {
          margin: 0 0 5px;
          font-size: 14px;
          font-weight: 800;
        }

        .quick-help-text {
          margin: 0;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.55;
        }

        /* TRANSACTION HELP */

        .transaction-help-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .transaction-help-item {
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          background: white;
          padding: 15px;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
        }

        .transaction-help-item::before {
          content: "•";
          margin-right: 8px;
          color: #111827;
        }

        /* FAQ */

        .faq-list {
          display: grid;
          gap: 9px;
        }

        .faq-item {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          overflow: hidden;
        }

        .faq-question {
          width: 100%;
          border: none;
          background: white;
          color: #111827;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          text-align: left;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .faq-question:hover {
          background: #f9fafb;
        }

        .faq-arrow {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f3f4f6;
          color: #374151;
          font-size: 17px;
        }

        .faq-answer {
          padding: 0 16px 17px;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.7;
        }

        /* CONTACT */

        .contact-card {
          background: #111827;
          color: white;
          border-radius: 19px;
          padding: 25px;
          margin-bottom: 28px;
          box-shadow: 0 12px 35px rgba(17, 24, 39, 0.18);
        }

        .contact-title {
          margin: 0 0 7px;
          font-size: 21px;
          font-weight: 800;
        }

        .contact-text {
          margin: 0;
          max-width: 650px;
          color: #d1d5db;
          font-size: 13px;
          line-height: 1.65;
        }

        .contact-details {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .contact-link {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: background 0.2s ease;
        }

        .contact-link:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .contact-link span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* SUPPORT MESSAGE */

        .support-form-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 7px 25px rgba(15, 23, 42, 0.045);
          margin-bottom: 28px;
        }

        .support-form {
          display: grid;
          gap: 13px;
        }

        .support-textarea {
          width: 100%;
          min-height: 135px;
          resize: vertical;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 13px;
          font-family: inherit;
          font-size: 14px;
          color: #111827;
          outline: none;
        }

        .support-textarea:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        .support-submit {
          width: 100%;
          border: none;
          border-radius: 11px;
          padding: 13px 18px;
          background: #111827;
          color: white;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .support-submit:hover {
          background: #1f2937;
        }

        .support-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .support-note {
          margin: 0;
          color: #9ca3af;
          font-size: 11px;
          line-height: 1.5;
        }

        /* SECURITY */

        .security-notice {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 17px;
          border: 1px solid #fde68a;
          border-radius: 14px;
          background: #fffbeb;
          margin-bottom: 28px;
        }

        .security-notice-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .security-notice-title {
          margin: 0 0 4px;
          color: #92400e;
          font-size: 13px;
          font-weight: 800;
        }

        .security-notice-text {
          margin: 0;
          color: #92400e;
          font-size: 12px;
          line-height: 1.6;
        }

        /* TRANSACTION STATUS */

        .status-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 9px;
        }

        .status-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          padding: 13px;
        }

        .status-name {
          margin: 0 0 5px;
          font-size: 12px;
          font-weight: 800;
        }

        .status-description {
          margin: 0;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.5;
        }

        @media (max-width: 850px) {
          .quick-help-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .status-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .contact-details {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .help-support-page {
            padding: 22px 12px 120px;
          }

          .help-support-title {
            font-size: 25px;
          }

          .help-support-subtitle {
            font-size: 14px;
          }

          .quick-help-grid {
            grid-template-columns: 1fr 1fr;
          }

          .transaction-help-list {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: 1fr 1fr;
          }

          .contact-card {
            padding: 20px;
          }

          .support-form-card {
            padding: 18px;
          }
        }

        @media (max-width: 420px) {
          .quick-help-grid {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: 1fr;
          }

          .contact-link {
            font-size: 11px;
          }
        }
      `}</style>

      <div className="help-support-container">

        {/* HEADER */}

        <div className="help-support-header">
          <h1 className="help-support-title">Help & Support</h1>

          <p className="help-support-subtitle">
            Find quick answers or get help with your INSTANT LOAD account,
            wallet, and transactions.
          </p>
        </div>

        {/* QUICK HELP */}

        <section className="support-section">
          <h2 className="support-section-title">
            How can we help you?
          </h2>

          <div className="quick-help-grid">

            <div className="quick-help-card">
              <div className="quick-help-icon">💰</div>

              <h3 className="quick-help-title">
                Wallet & Funding
              </h3>

              <p className="quick-help-text">
                Get help with wallet funding, payments, credits and refunds.
              </p>
            </div>

            <div className="quick-help-card">
              <div className="quick-help-icon">📱</div>

              <h3 className="quick-help-title">
                Airtime & Data
              </h3>

              <p className="quick-help-text">
                Get help with airtime, data purchases and failed transactions.
              </p>
            </div>

            <div className="quick-help-card">
              <div className="quick-help-icon">⚡</div>

              <h3 className="quick-help-title">
                Electricity
              </h3>

              <p className="quick-help-text">
                Get help with electricity payments, meters and tokens.
              </p>
            </div>

            <div className="quick-help-card">
              <div className="quick-help-icon">📺</div>

              <h3 className="quick-help-title">
                Cable TV
              </h3>

              <p className="quick-help-text">
                Get help with cable subscriptions and payment issues.
              </p>
            </div>

          </div>
        </section>

        {/* TRANSACTION PROBLEMS */}

        <section className="support-section">
          <h2 className="support-section-title">
            Having a transaction problem?
          </h2>

          <div className="transaction-help-list">
            <div className="transaction-help-item">
              Wallet debited but service missing
            </div>

            <div className="transaction-help-item">
              Transaction failed
            </div>

            <div className="transaction-help-item">
              Transaction is pending
            </div>

            <div className="transaction-help-item">
              Payment completed but wallet wasn't credited
            </div>

            <div className="transaction-help-item">
              Airtime or data was not received
            </div>

            <div className="transaction-help-item">
              I entered the wrong phone number
            </div>
          </div>
        </section>

        {/* TRANSACTION STATUS */}

        <section className="support-section">
          <h2 className="support-section-title">
            Transaction status guide
          </h2>

          <div className="status-grid">

            <div className="status-card">
              <h3 className="status-name">Successful</h3>

              <p className="status-description">
                Your transaction was completed successfully.
              </p>
            </div>

            <div className="status-card">
              <h3 className="status-name">Pending</h3>

              <p className="status-description">
                The provider is still processing the transaction.
              </p>
            </div>

            <div className="status-card">
              <h3 className="status-name">Failed</h3>

              <p className="status-description">
                The transaction was not completed.
              </p>
            </div>

            <div className="status-card">
              <h3 className="status-name">Refunded</h3>

              <p className="status-description">
                The transaction amount was returned to your wallet.
              </p>
            </div>

            <div className="status-card">
              <h3 className="status-name">Unknown</h3>

              <p className="status-description">
                The provider result needs further investigation.
              </p>
            </div>

          </div>
        </section>

        {/* FAQ */}

        <section className="support-section">
          <h2 className="support-section-title">
            Frequently Asked Questions
          </h2>

          <div className="faq-list">

            {faqs.map((faq, index) => (
              <div
                className="faq-item"
                key={faq.question}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>

                  <span className="faq-arrow">
                    {openFaq === index ? "−" : "+"}
                  </span>
                </button>

                {openFaq === index && (
                  <div className="faq-answer">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}

          </div>
        </section>

        {/* CONTACT SUPPORT */}

        <div className="contact-card">

          <h2 className="contact-title">
            Still need help?
          </h2>

          <p className="contact-text">
            Our support team is available to assist you with wallet funding,
            failed transactions, airtime, data, electricity and cable issues.
            Please keep your transaction reference available when contacting
            support about a transaction.
          </p>

          <div className="contact-details">

            <a
              href="tel:08132893350"
              className="contact-link"
            >
              <span>📞</span>
              <span>08132893350</span>
            </a>

            <a
              href="https://wa.me/2348132893350"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <span>💬</span>
              <span>WhatsApp Support</span>
            </a>

            <a
              href="mailto:OLOWOLAWIO@GMAIL.COM"
              className="contact-link"
            >
              <span>✉️</span>
              <span>OLOWOLAWIO@GMAIL.COM</span>
            </a>

          </div>

        </div>

        {/* MESSAGE FORM */}

        <div className="support-form-card">

          <h2 className="support-section-title">
            Send a Message
          </h2>

          <form
            className="support-form"
            onSubmit={handleSubmit}
          >
            <textarea
              className="support-textarea"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Describe the issue you're experiencing..."
              maxLength={1000}
            />

            <button
              type="submit"
              className="support-submit"
              disabled={sending}
            >
              {sending ? "Preparing..." : "Send Message"}
            </button>

            <p className="support-note">
              Never include your transaction PIN, password, OTP, or full
              payment card details in a support message.
            </p>
          </form>

        </div>

        {/* SECURITY WARNING */}

        <div className="security-notice">

          <div className="security-notice-icon">
            🔒
          </div>

          <div>
            <h3 className="security-notice-title">
              Stay safe
            </h3>

            <p className="security-notice-text">
              INSTANT LOAD will never ask you to provide your transaction PIN,
              password, OTP, or full card details through WhatsApp, email, or
              support.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default HelpSupport;