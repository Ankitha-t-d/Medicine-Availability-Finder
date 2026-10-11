import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapCenter({ position }) {
  const map = useMap();
  if (position) map.setView(position, 15);
  return null;
}

function App() {
  const [page, setPage] = useState("home");
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
const [authMode, setAuthMode] = useState("login");

useEffect(() => {
  const timer = setTimeout(() => {
    setShowSplash(false);
  }, 2500);

  return () => clearTimeout(timer);
}, []);
  const [medicine, setMedicine] = useState("");
  const [location, setLocation] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
const [cameraStream, setCameraStream] = useState(null);
const [error, setError] = useState("");
const [medicineAvailability, setMedicineAvailability] = useState(null);

const videoRef = useRef(null);

const identifyMedicine = async (ocrText) => {
  try {
    const response = await fetch(
      "http://localhost:5000/api/identify-medicine",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: ocrText,
        }),
      }
    );

    const data = await response.json();

    console.log("Medicine identification:", data);

    if (data.success && data.found) {
      setMedicine(data.medicine);
      return data.medicine;
    }

    setMedicine("");
    return "";

  } catch (error) {
    console.error("Medicine identification failed:", error);
    setMedicine(ocrText);
    return ocrText;
  }
};

  const stopCamera = () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }

  if (videoRef.current) {
    videoRef.current.pause();
    videoRef.current.srcObject = null;
  }

  setCameraStream(null);
  setCameraOpen(false);
};

  const startCamera = async () => {
  setError("");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    setCameraStream(stream);
    setCameraOpen(true);
  } catch (err) {
    console.error("Camera error:", err);
    setError(
      "Could not open the webcam. Check camera permission in Chrome."
    );
  }
};

  useEffect(() => {
  const video = videoRef.current;

  if (!cameraOpen || !cameraStream || !video) {
    return;
  }

  video.srcObject = cameraStream;
  video.muted = true;
  video.playsInline = true;

  const startVideo = async () => {
    try {
      await video.play();
      console.log("Camera video started");
      console.log("Video size:", video.videoWidth, video.videoHeight);
    } catch (error) {
      console.error("Video playback error:", error);
    }
  };

  if (video.readyState >= 1) {
    startVideo();
  } else {
    video.onloadedmetadata = startVideo;
  }

  return () => {
    video.onloadedmetadata = null;
  };
}, [cameraOpen, cameraStream]);

  const capturePhoto = async () => {
    const video = videoRef.current;

    if (!video || video.readyState < 2) {
      setError("Camera is not ready yet. Please wait a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError("Could not capture the photo.");
        return;
      }

      stopCamera();
      setShowScanner(false);
      setOcrLoading(true);
      setError("");

      try {
        const result = await Tesseract.recognize(blob, "eng", {
          logger: (info) => console.log(info),
        });

        const text = result.data.text.trim();

        console.log("OCR TEXT:", text);

        if (text) {
          await identifyMedicine(text);
        } else {
          setError(
            "Could not read the medicine name. Please take a clearer photo."
          );
        }
      } catch (err) {
        console.error(err);
        setError("Unable to scan the captured image.");
      }

      setOcrLoading(false);
    }, "image/jpeg", 0.9);
  };

  

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setShowScanner(false);
    setError("");

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (info) => console.log(info),
      });

      const text = result.data.text.trim();
      console.log("OCR TEXT:", text);

      if (text) {
        await identifyMedicine(text);
      } else {
        setError(
          "Could not read the medicine name. Please use a clearer image."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Unable to scan the image.");
    }

    setOcrLoading(false);
  };

  const getMyLocation = () => {
    setError("");
    setLoadingLocation(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setUserLocation([lat, lon]);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await response.json();

          if (data.display_name) {
            setLocation(data.display_name);
          } else {
            setLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
          }
        } catch (err) {
          console.error(err);
          setLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        }

        setLoadingLocation(false);
      },
      (err) => {
        console.error(err);
        setError(
          "Unable to get your location. Please allow location permission."
        );
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const findNearbyPharmacies = async () => {
    console.log("SEARCH CLICKED", { medicine, userLocation });
    setError("");

    if (!medicine.trim()) {
      setError("Please enter or scan a medicine name.");
      return;
    }

    let currentLocation = userLocation;

    if (!currentLocation) {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        return;
      }

      setLoadingLocation(true);

      try {
        currentLocation = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = [
                position.coords.latitude,
                position.coords.longitude,
              ];
              setUserLocation(coords);
              resolve(coords);
            },
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        });
        setLoadingLocation(false);
      } catch (err) {
        console.error(err);
        setLoadingLocation(false);
        setError(
          "Please allow location access so we can find nearby pharmacies."
        );
        return;
      }
    }

    setLoadingPharmacies(true);

    const lat = currentLocation[0];
    const lon = currentLocation[1];

    try {
      const availabilityResponse = await fetch(
    `http://localhost:5000/api/availability?medicine=${encodeURIComponent(
      medicine.trim()
    )}`
  );

      const availabilityData = await availabilityResponse.json();

    setMedicineAvailability(availabilityData);
  } catch (err) {
  console.error("Availability check failed:", err);
  setMedicineAvailability(null);
}

    try {
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="pharmacy"](around:5000,${lat},${lon});
          way["amenity"="pharmacy"](around:5000,${lat},${lon});
          relation["amenity"="pharmacy"](around:5000,${lat},${lon});
        );
        out center;
      `;

      const overpassServers = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

let response = null;

for (const server of overpassServers) {
  try {
    response = await fetch(server, {
      method: "POST",
      body: query
    });

    if (response.ok) {
      break;
    }

    response = null;
  } catch (error) {
    console.log("Overpass server failed:", server);
  }
}

if (!response || !response.ok) {
  throw new Error("All pharmacy search servers failed. Please try again.");
}

      const data = await response.json();

      const results = data.elements
        .map((item) => {
          const itemLat = item.lat ?? item.center?.lat;
          const itemLon = item.lon ?? item.center?.lon;

          if (!itemLat || !itemLon) return null;

          const tags = item.tags || {};
          const name = tags.name || tags["name:en"] || "Pharmacy";

          const addressParts = [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:suburb"],
            tags["addr:city"],
            tags["addr:postcode"],
          ].filter(Boolean);

          const address =
            addressParts.length > 0
              ? addressParts.join(", ")
              : "Address available on map";

          const distance = calculateDistance(
            lat,
            lon,
            itemLat,
            itemLon
          );

          return {
            id: item.id,
            name,
            address,
            lat: itemLat,
            lon: itemLon,
            distance,
            availability: "Check availability",
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance);

      setPharmacies(results);
      setPage("results");

      if (results.length === 0) {
        setError(
          "No pharmacies were found within 5 km of your location."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Could not load nearby pharmacies. Please try again.");
    }

    setLoadingPharmacies(false);
  };

  const handleSearch = () => {
    findNearbyPharmacies();
  };

  const openPharmacy = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setPage("details");
  };

  const getDirections = (pharmacy) => {
    if (!userLocation) {
      alert("Please get your location first.");
      return;
    }

    const [userLat, userLon] = userLocation;

    const url =
      `https://www.openstreetmap.org/directions?` +
      `engine=fossgis_osrm_car&route=` +
      `${userLat},${userLon};${pharmacy.lat},${pharmacy.lon}`;

    window.open(url, "_blank");
  };

  const Home = () => (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1>
            Find Your Medicine.
            <br />
            <span>Find It Nearby.</span>
          </h1>

          <p>
            Search for medicines and discover nearby pharmacies
            using your real location.
          </p>

          <div className="search-box">
            <div className="input-group">
              <span>💊</span>
              <input
                type="text"
                placeholder="Enter medicine name"
                value={medicine}
                onChange={(e) => setMedicine(e.target.value)}
              />
              <button
                className="camera-btn"
                onClick={() => setShowScanner(true)}
                title="Scan medicine"
              >
                📷
              </button>
            </div>

            <div className="input-group">
              <span>📍</span>
              <input
                type="text"
                placeholder="Your location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <button className="location-btn" onClick={getMyLocation}>
                {loadingLocation ? "Getting..." : "My Location"}
              </button>
            </div>

            <button
              className="search-btn"
              onClick={handleSearch}
              disabled={loadingPharmacies}
            >
              {loadingPharmacies ? "Finding Pharmacies..." : "Search"}
            </button>
          </div>

          {ocrLoading && (
            <p className="status-message">
              🔍 Reading medicine package...
            </p>
          )}

          {error && <p className="error-message">⚠️ {error}</p>}
        </div>
      </section>

      <section className="features">
        <h2>Why Use MedFind?</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">📷</div>
            <h3>Scan Medicine</h3>
            <p>
              Take a photo of your medicine package and extract
              the visible text using OCR.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Real Location</h3>
            <p>
              Use your device GPS to find pharmacies near your
              actual location.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏥</div>
            <h3>Nearby Pharmacies</h3>
            <p>
              Discover real pharmacy locations from OpenStreetMap.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💊</div>
            <h3>Availability</h3>
            <p>
              Check medicine availability through the MedFind
              inventory system.
            </p>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <h2>How MedFind Works</h2>

        <div className="steps">
          <div className="step">
            <span>1</span>
            <h3>Scan</h3>
            <p>Scan your medicine package.</p>
          </div>

          <div className="step">
            <span>2</span>
            <h3>Locate</h3>
            <p>Get your current location.</p>
          </div>

          <div className="step">
            <span>3</span>
            <h3>Search</h3>
            <p>Find nearby pharmacies.</p>
          </div>

          <div className="step">
            <span>4</span>
            <h3>Check</h3>
            <p>Check medicine availability.</p>
          </div>
        </div>
      </section>
    </>
  );

  const Results = () => (
    <section className="results-page">
      <div className="results-header">
        <button className="back-btn" onClick={() => setPage("home")}>
          ← Back
        </button>

        <div>
          <h2>Nearby Pharmacies</h2>
          <p>Showing pharmacies near your current location</p>

          {medicine && (
            <p>
              Medicine: <strong>{medicine}</strong>
            </p>
          )}
        </div>
      </div>

      {userLocation && (
        <div className="map-container">
          <MapContainer
            center={userLocation}
            zoom={14}
            style={{
              height: "450px",
              width: "100%",
              borderRadius: "15px",
            }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapCenter position={userLocation} />

            <Marker position={userLocation}>
              <Popup>
                <strong>Your Location</strong>
              </Popup>
            </Marker>

            {pharmacies.map((pharmacy) => (
              <Marker
                key={pharmacy.id}
                position={[pharmacy.lat, pharmacy.lon]}
              >
                <Popup>
                  <strong>{pharmacy.name}</strong>
                  <br />
                  {pharmacy.distance.toFixed(2)} km away
                  <br />
                  <button onClick={() => openPharmacy(pharmacy)}>
                    View Details
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="pharmacy-list">
        {pharmacies.length > 0 ? (
          pharmacies.map((pharmacy) => (
            <div className="pharmacy-card" key={pharmacy.id}>
              <div className="pharmacy-icon">🏥</div>

              <div className="pharmacy-info">
                <h3>{pharmacy.name}</h3>
                <p>📍 {pharmacy.address}</p>
                <p>
                  📏 {pharmacy.distance.toFixed(2)} km away
                </p>

                <span className="availability pending">
                  💊 {pharmacy.availability}
                </span>

                <div className="card-buttons">
                  <button onClick={() => openPharmacy(pharmacy)}>
                    View Details
                  </button>

                  <button onClick={() => getDirections(pharmacy)}>
                    Get Directions
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <h3>No pharmacies found</h3>
            <p>Try getting your location again and search.</p>
          </div>
        )}
      </div>
    </section>
  );

  const PharmacyDetails = () => {
    if (!selectedPharmacy) return null;

    return (
      <section className="details-page">
        <button
          className="back-btn"
          onClick={() => setPage("results")}
        >
          ← Back to Results
        </button>

        <div className="details-card">
          <div className="details-icon">🏥</div>

          <h2>{selectedPharmacy.name}</h2>

          <p>📍 {selectedPharmacy.address}</p>

          <p>
            📏 {selectedPharmacy.distance.toFixed(2)} km from
            your location
          </p>

          <div className="medicine-availability">
            <h3>Medicine Availability</h3>

            <p>
              Medicine searched:
              <strong> {medicine}</strong>
            </p>

            {medicineAvailability?.found ? (
          medicineAvailability.available ? (
    <div className="availability available">
      🟢 Available — {medicineAvailability.quantity} in stock
    </div>
  ) : (
    <div className="availability unavailable">
      🔴 Not Available
    </div>
  )
) : (
  <div className="availability pending">
    ⚪ Medicine not found in inventory
  </div>
)}

            
          </div>

          <button
            className="directions-btn"
            onClick={() => getDirections(selectedPharmacy)}
          >
            🗺️ Get Directions
          </button>
        </div>
      </section>
    );
  };

  const ScannerPopup = () => {
    if (!showScanner) return null;

    return (
      <div className="modal-overlay">
        <div className="scanner-modal">
          <button
            className="close-btn"
            onClick={() => {
              stopCamera();
              setShowScanner(false);
            }}
          >
            ×
          </button>

          <h2>Scan Medicine</h2>

          <p>
            Take a photo of your medicine package or choose
            an existing image.
          </p>

          {!cameraOpen ? (
            <>
              <button
                className="scan-option"
                onClick={startCamera}
              >
                📷 Open Camera
              </button>

              <label className="scan-option">
                🖼️ Choose Gallery
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  hidden
                />
              </label>
            </>
          ) : (
            <>
              <div className="camera-preview">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                />
              </div>

              <button
                className="scan-option"
                onClick={capturePhoto}
              >
                📸 Take Photo
              </button>

              <button
                className="cancel-btn"
                onClick={stopCamera}
              >
                Stop Camera
              </button>
            </>
          )}

          <button
            className="cancel-btn"
            onClick={() => {
              stopCamera();
              setShowScanner(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
  <>
    {showSplash && (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">💊</div>
          <h1>MedFind</h1>
          <p>Find Your Medicine. Find It Nearby.</p>
        </div>
      </div>
    )}

{!showSplash && !isLoggedIn && (
  <div className="login-container">
    <div className="login-card">
      <div className="login-logo">💊</div>

      <h1>Welcome to MedFind</h1>
      <p>Find your medicine. Find it nearby.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sessionStorage.setItem("medfind_logged_in", "true");
          setIsLoggedIn(true);
        }}
      >
        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          required
        />

        <button type="submit" className="login-button">
          Login
        </button>
      </form>

      <p className="signup-text">
        Don't have an account?{" "}
        <button
          type="button"
          className="signup-link"
          onClick={() => setAuthMode("signup")}
        >
          Create an account
        </button>
      </p>
    </div>
  </div>
)}

{!showSplash && isLoggedIn && (
  <div className="app">
      <header className="navbar">
        <div className="logo" onClick={() => setPage("home")}>
          💊 MedFind
        </div>

        <nav>
          <button onClick={() => setPage("home")}>Home</button>

          <button
            onClick={() => {
              setPage("home");
              setTimeout(() => {
                document
                  .getElementById("about")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          >
            About
          </button>

          <button
            onClick={() => {
              setPage("home");
              setTimeout(() => {
                document
                  .getElementById("contact")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          >
            Contact
          </button>
        </nav>
      </header>

      <main>
        {page === "home" && Home ()}
        {page === "results" && Results ()}
        {page === "details" && PharmacyDetails ()}
      </main>

      <footer id="contact">
        <div>
          <h3>💊 MedFind</h3>
          <p>
            Find medicines and nearby pharmacies with ease.
          </p>
        </div>

        <p>© 2026 MedFind. All rights reserved.</p>
      </footer>

      {ScannerPopup()}
    </div>
)}
    </>
  );
}

export default App;
