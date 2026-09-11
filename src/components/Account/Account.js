import React, { useEffect, useRef, useState } from "react";
import {
  auth,
  db,
  storage,
} from "../../firebase";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Account = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    profilePhoto: "",
  });

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  useEffect(() => {
    let unsubscribeProfile;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (authUser) => {
        setUser(authUser);

        if (!authUser) {
          setProfile({
            name: "",
            email: "",
            phone: "",
            profilePhoto: "",
          });

          return;
        }

        const userRef = doc(
          db,
          "users",
          authUser.uid
        );

        unsubscribeProfile = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();

              setProfile({
                name:
                  data.name ||
                  authUser.displayName ||
                  authUser.email?.split("@")[0] ||
                  "",

                email:
                  authUser.email || "",

                phone:
                  data.phone || "",

                profilePhoto:
                  data.profilePhoto || "",
              });
            } else {
              setProfile({
                name:
                  authUser.displayName ||
                  authUser.email?.split("@")[0] ||
                  "",

                email:
                  authUser.email || "",

                phone: "",

                profilePhoto: "",
              });
            }
          },
          (error) => {
            console.error(
              "Profile listener error:",
              error
            );
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = () => {
    const name =
      profile.name ||
      user?.email?.split("@")[0] ||
      "U";

    const parts =
      name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) +
        parts[1].charAt(0)
      ).toUpperCase();
    }

    return name
      .substring(0, 2)
      .toUpperCase();
  };

  // =====================================================
  // PROFILE PHOTO
  // =====================================================

  const handleProfilePhotoClick = () => {
    if (uploadingPhoto) {
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoUpload = async (event) => {
    const file =
      event.target.files?.[0];

    if (!file || !user) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(
        "Please select an image file."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        "Profile photo must be smaller than 5MB."
      );
      return;
    }

    try {
      setUploadingPhoto(true);

      const fileExtension =
        file.name.split(".").pop() ||
        "jpg";

      const storageRef = ref(
        storage,
        `profilePhotos/${user.uid}/profile.${fileExtension}`
      );

      await uploadBytes(
        storageRef,
        file
      );

      const downloadURL =
        await getDownloadURL(
          storageRef
        );

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      await updateDoc(userRef, {
        profilePhoto:
          downloadURL,
      });

      setProfile((current) => ({
        ...current,
        profilePhoto:
          downloadURL,
      }));

      toast.success(
        "Profile photo updated successfully."
      );
    } catch (error) {
      console.error(
        "Profile photo upload error:",
        error
      );

      toast.error(
        "Unable to upload profile photo."
      );
    } finally {
      setUploadingPhoto(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      toast.success(
        "Logged out successfully."
      );

      navigate("/login");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      toast.error(
        "Unable to log out."
      );
    }
  };

  // =====================================================
  // OPEN PROFILE
  // =====================================================

  const handleOpenProfile = () => {
    navigate("/profile");
  };

  // =====================================================
  // OPEN SECURITY
  // =====================================================

  const handleOpenSecurity = () => {
    navigate("/security");
  };

  // =====================================================
  // ACCOUNT PAGE
  // =====================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F7FB",
        fontFamily:
          "'Inter', 'Segoe UI', Arial, sans-serif",
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        style={{
          background: "#071A3D",
          color: "#ffffff",
          padding: "16px 20px",
          boxShadow:
            "0 4px 20px rgba(7, 26, 61, 0.15)",
        }}
      >
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              border:
                "1px solid rgba(255,255,255,0.18)",
              background:
                "rgba(255,255,255,0.08)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            <i className="bi bi-arrow-left"></i>
          </button>

          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "800",
              }}
            >
              Account
            </div>

            <div
              style={{
                color: "#AFC4E8",
                fontSize: "11px",
                marginTop: "2px",
              }}
            >
              Manage your INSTANT LOAD account
            </div>
          </div>

        </div>
      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding:
            "30px 20px 120px",
        }}
      >

        {/* =================================================
            PROFILE CARD
        ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "30px 25px",
            border:
              "1px solid #E7EDF5",
            boxShadow:
              "0 10px 30px rgba(20, 50, 90, 0.07)",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >

          <div
            style={{
              position: "relative",
              width: "108px",
              height: "108px",
              margin:
                "0 auto 15px",
            }}
          >

            <button
              type="button"
              onClick={
                handleProfilePhotoClick
              }
              disabled={
                uploadingPhoto
              }
              style={{
                width: "108px",
                height: "108px",
                borderRadius: "50%",
                border:
                  "4px solid #EAF2FF",
                padding: 0,
                overflow: "hidden",
                background:
                  "linear-gradient(135deg, #0A6CFF, #00B8FF)",
                color: "#ffffff",
                cursor:
                  uploadingPhoto
                    ? "wait"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                position: "relative",
              }}
            >

              {profile.profilePhoto ? (
                <img
                  src={
                    profile.profilePhoto
                  }
                  alt="Profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "30px",
                    fontWeight: "800",
                  }}
                >
                  {getInitials()}
                </span>
              )}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "rgba(0,0,0,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  opacity:
                    uploadingPhoto
                      ? 1
                      : 0,
                  transition:
                    "opacity 0.2s ease",
                }}
              >
                <i
                  className="bi bi-arrow-repeat"
                  style={{
                    fontSize: "25px",
                  }}
                ></i>
              </div>

            </button>

            <div
              style={{
                position: "absolute",
                right: "-2px",
                bottom: "2px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background:
                  "#0A6CFF",
                color: "#ffffff",
                border:
                  "3px solid #ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                pointerEvents:
                  "none",
              }}
            >
              <i
                className="bi bi-camera-fill"
                style={{
                  fontSize: "13px",
                }}
              ></i>
            </div>

          </div>


          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={
              handlePhotoUpload
            }
            style={{
              display: "none",
            }}
          />


          <h2
            style={{
              margin: 0,
              color: "#071A3D",
              fontSize: "21px",
              fontWeight: "800",
            }}
          >
            {profile.name ||
              "Your Name"}
          </h2>


          <p
            style={{
              margin:
                "6px 0 0",
              color: "#718096",
              fontSize: "13px",
            }}
          >
            {profile.email ||
              "No email available"}
          </p>


          <button
            type="button"
            onClick={
              handleProfilePhotoClick
            }
            disabled={
              uploadingPhoto
            }
            style={{
              marginTop: "17px",
              border: "none",
              background:
                "#EAF2FF",
              color: "#0A6CFF",
              borderRadius: "10px",
              padding:
                "9px 15px",
              fontSize: "12px",
              fontWeight: "700",
              cursor:
                uploadingPhoto
                  ? "wait"
                  : "pointer",
            }}
          >
            <i className="bi bi-camera me-1"></i>

            {uploadingPhoto
              ? "Uploading..."
              : "Change profile photo"}
          </button>

        </div>


        {/* =================================================
            ACCOUNT OPTIONS
        ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            border:
              "1px solid #E7EDF5",
            boxShadow:
              "0 8px 25px rgba(20, 50, 90, 0.05)",
            overflow: "hidden",
          }}
        >

          {/* =================================================
              MY PROFILE
          ================================================= */}

          <button
            type="button"
            onClick={
              handleOpenProfile
            }
            className="account-option"
          >
            <div className="account-option-icon">
              <i className="bi bi-person"></i>
            </div>

            <div className="account-option-content">
              <div className="account-option-title">
                My Profile
              </div>

              <div className="account-option-description">
                Name, phone number and email
              </div>
            </div>

            <i className="bi bi-chevron-right account-option-arrow"></i>
          </button>


          {/* =================================================
              SECURITY
          ================================================= */}

          <button
            type="button"
            onClick={
              handleOpenSecurity
            }
            className="account-option"
          >
            <div className="account-option-icon">
              <i className="bi bi-shield-lock"></i>
            </div>

            <div className="account-option-content">
              <div className="account-option-title">
                Security
              </div>

              <div className="account-option-description">
                Password and transaction PIN
              </div>
            </div>

            <i className="bi bi-chevron-right account-option-arrow"></i>
          </button>


          {/* =================================================
              SAVED BENEFICIARIES
          ================================================= */}

          <button
            type="button"
           onClick={() => navigate("/beneficiaries")}
            className="account-option"
          >
            <div className="account-option-icon">
              <i className="bi bi-people"></i>
            </div>

            <div className="account-option-content">
              <div className="account-option-title">
                Saved Beneficiaries
              </div>

              <div className="account-option-description">
                Manage your saved recipients
              </div>
            </div>

            <i className="bi bi-chevron-right account-option-arrow"></i>
          </button>


          {/* =================================================
              HELP & SUPPORT
          ================================================= */}

          <button
            type="button"
            onClick={() => navigate("/help-support")}
            className="account-option"
          >
            <div className="account-option-icon">
              <i className="bi bi-headset"></i>
            </div>

            <div className="account-option-content">
              <div className="account-option-title">
                Help & Support
              </div>

              <div className="account-option-description">
                Get help with your account
              </div>
            </div>

            <i className="bi bi-chevron-right account-option-arrow"></i>
          </button>

        </div>


        {/* =================================================
            LOGOUT
        ================================================= */}

        <button
          type="button"
          onClick={
            handleLogout
          }
          style={{
            width: "100%",
            marginTop: "18px",
            border:
              "1px solid #F1C8C8",
            background:
              "#FFF7F7",
            color: "#D64545",
            borderRadius: "16px",
            padding:
              "15px 18px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            gap: "8px",
          }}
        >
          <i className="bi bi-box-arrow-right"></i>
          Logout
        </button>


        {/* =================================================
            BRANDING
        ================================================= */}

        <div
          style={{
            textAlign: "center",
            marginTop: "25px",
            color: "#9AA8BA",
            fontSize: "11px",
          }}
        >
          INSTANT LOAD

          <div
            style={{
              marginTop: "3px",
            }}
          >
            Fast • Secure • Reliable
          </div>
        </div>

      </main>


      {/* =================================================
          ACCOUNT STYLING
      ================================================= */}

      <style>
        {`

          .account-option {
            width: 100%;
            border: none;
            border-bottom: 1px solid #EDF1F6;
            background: #ffffff;
            padding: 19px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            text-align: left;
            cursor: pointer;
            transition: background 0.2s ease;
          }

          .account-option:hover {
            background: #F8FAFD;
          }

          .account-option:last-child {
            border-bottom: none;
          }

          .account-option-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: #EAF2FF;
            color: #0A6CFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 19px;
            flex-shrink: 0;
          }

          .account-option-content {
            flex: 1;
            min-width: 0;
          }

          .account-option-title {
            color: #172B4D;
            font-size: 14px;
            font-weight: 700;
          }

          .account-option-description {
            margin-top: 4px;
            color: #718096;
            font-size: 11px;
            line-height: 1.4;
          }

          .account-option-arrow {
            color: #9AA8BA;
            font-size: 13px;
          }

          @media (max-width: 576px) {

            header {
              padding: 13px 16px !important;
            }

            main {
              padding:
                20px 16px 120px !important;
            }

            main > div:first-child {
              padding:
                25px 20px !important;
            }

            .account-option {
              padding: 17px 15px;
            }

            .account-option-icon {
              width: 42px;
              height: 42px;
            }

          }

        `}
      </style>

    </div>
  );
};

export default Account;