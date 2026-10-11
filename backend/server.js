const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    message: "Medicine Finder API is running!"
  });
});
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "PostgreSQL connected!",
      time: result.rows[0].now
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});


// Smart medicine name matching with fuzzy matching
app.post("/api/identify-medicine", async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: "OCR text is required"
    });
  }

  try {
    const result = await pool.query(
      "SELECT name FROM medicines ORDER BY name"
    );

    const medicines = result.rows.map(row => row.name);

    const normalize = (value) => {
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    };

    const ocrText = text.toLowerCase();

    console.log("OCR TEXT:", text);

    /*
      Common OCR corrections.
      These are applied only when the corrected
      medicine exists in the PostgreSQL database.
    */
    const corrections = {
      "pacetacmol": "paracetamol",
      "paracetmol": "paracetamol",
      "paracitamol": "paracetamol",
      "paracitamol": "paracetamol",
      "paracetemol": "paracetamol",
      "paracetemol": "paracetamol",
      "amoxcillin": "amoxicillin",
      "amoxycillin": "amoxicillin",
      "amoxillin": "amoxicillin",
      "ibuprofin": "ibuprofen",
      "ibuprophen": "ibuprofen",
      "cetirizne": "cetirizine",
      "cetrazine": "cetirizine",
      "azithromicin": "azithromycin",
      "azithromycin": "azithromycin"
    };

    for (const medicine of medicines) {
      const normalizedMedicine = normalize(medicine);

      for (const [wrong, correct] of Object.entries(corrections)) {
        if (
          normalizedMedicine === correct &&
          ocrText.includes(wrong)
        ) {
          console.log("CORRECTED OCR:", wrong, "->", medicine);

          return res.json({
            success: true,
            found: true,
            medicine: medicine,
            confidence: 95
          });
        }
      }
    }

    /*
      Levenshtein distance
    */
    const levenshtein = (a, b) => {
      const matrix = [];

      for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;

          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }

      return matrix[a.length][b.length];
    };

    const similarity = (a, b) => {
      if (a === b) {
        return 1;
      }

      if (a.includes(b) || b.includes(a)) {
        return 0.9;
      }

      const distance = levenshtein(a, b);
      const maxLength = Math.max(a.length, b.length);

      if (maxLength === 0) {
        return 0;
      }

      return 1 - distance / maxLength;
    };

    const words = ocrText
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length >= 4);

    let bestMedicine = null;
    let bestScore = 0;

    for (const medicine of medicines) {
      const medicineName = normalize(medicine);

      for (const word of words) {
        const wordName = normalize(word);

        const score = similarity(
          wordName,
          medicineName
        );

        if (score > bestScore) {
          bestScore = score;
          bestMedicine = medicine;
        }
      }
    }

    console.log("BEST MATCH:", bestMedicine);
    console.log(
      "MATCH SCORE:",
      Math.round(bestScore * 100) + "%"
    );

    if (bestMedicine && bestScore >= 0.60) {
      return res.json({
        success: true,
        found: true,
        medicine: bestMedicine,
        confidence: Math.round(bestScore * 100)
      });
    }

    return res.json({
      success: true,
      found: false,
      medicine: null,
      confidence: Math.round(bestScore * 100)
    });

  } catch (error) {
    console.error(
      "Medicine identification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Medicine identification failed"
    });
  }
});

// Medicine availability from PostgreSQL
app.get("/api/availability", async (req, res) => {
  const { medicine } = req.query;

  if (!medicine) {
    return res.status(400).json({
      success: false,
      message: "Medicine name is required"
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, availability, quantity
       FROM medicines
       WHERE LOWER(name) = LOWER($1)`,
      [medicine.trim()]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: "Medicine not found in database"
      });
    }

    const medicineData = result.rows[0];

    res.json({
      success: true,
      found: true,
      medicine: medicineData.name,
      available: medicineData.availability,
      quantity: medicineData.quantity
    });

  } catch (error) {
    console.error("Medicine availability error:", error);

    res.status(500).json({
      success: false,
      message: "Database query failed"
    });
  }
});

// Medicine search
app.post("/api/search", (req, res) => {
  const { medicine, location } = req.body;

  if (!medicine || !location) {
    return res.status(400).json({
      message: "Medicine and location are required"
    });
  }

  // Sample pharmacy data for our prototype
  const pharmacies = [
    {
      name: "Apollo Pharmacy",
      location: location,
      medicine: medicine,
      available: true,
      distance: "1.2 km"
    },
    {
      name: "MedPlus",
      location: location,
      medicine: medicine,
      available: true,
      distance: "2.1 km"
    },
    {
      name: "Wellness Forever",
      location: location,
      medicine: medicine,
      available: false,
      distance: "3.4 km"
    }
  ];

  res.json({
    success: true,
    medicine,
    location,
    pharmacies
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});