 **MedFind — Medicine Availability Finder**

MedFind is a full-stack web application designed to help users identify medicines from their packaging, discover nearby pharmacies, and check medicine availability through an inventory database.

The application combines camera-based text recognition, location services, mapping, and database integration to simplify medicine discovery.

 Features

-  Camera-Based Medicine Scanning: Capture a medicine package using the device camera.
-  Image Upload:Upload an existing medicine image for text extraction.
-  OCR Text Recognition: Extract visible text from medicine packaging using Tesseract.js.
-  Medicine Name Identification: Normalize OCR text and use rule-based corrections and fuzzy matching to identify supported medicine names.
-  Current Location Detection: Use browser geolocation to obtain the user's coordinates.
-  Nearby Pharmacy Discovery: Find pharmacy locations within approximately 5 km using OpenStreetMap data.
-  Interactive Map: Display pharmacy locations using Leaflet and React Leaflet.
- Directions: Open OpenStreetMap directions to help users navigate to a selected pharmacy.
-  PostgreSQL Integration: Store medicine records and query availability and quantity.
-  Availability Status: Display whether a medicine is available in the project's inventory, including the recorded quantity when available.

 Technologies Used

Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Leaflet
- React Leaflet
- Tesseract.js

 Backend
- Node.js
- Express.js
- JavaScript
- PostgreSQL Node.js client (`pg`)
- dotenv
- CORS

 Database
- PostgreSQL

 Maps and Location
- OpenStreetMap
- Overpass API
- Nominatim Reverse Geocoding
- Browser Geolocation API
- OpenStreetMap Directions

 Development Tools
- Visual Studio Code
- Git
- GitHub
- npm
- PostgreSQL SQL Shell (psql)

 System Architecture

The application uses a React frontend, an Express backend, and a PostgreSQL database.

1. The user enters a medicine name or scans a medicine package.
2. Tesseract.js extracts visible text from the image.
3. The extracted text is sent to the backend for medicine-name matching.
4. Browser geolocation obtains the user's coordinates.
5. The frontend queries OpenStreetMap data to discover nearby pharmacies.
6. The backend queries PostgreSQL for the medicine's inventory record.
7. The frontend displays pharmacy locations, map information, and the inventory availability result.

Application Workflow

Scan Medicine → Extract Text → Identify Medicine → Detect Location → Find Nearby Pharmacies → Check Inventory → View Map and Directions

 Database

MedFind uses PostgreSQL to store medicine information.

The current `medicines` table contains the following fields:

| Column | Description |
|---|---|
| `id` | Medicine record identifier |
| `name` | Medicine name |
| `availability` | Boolean availability status |
| `quantity` | Recorded quantity |

Example medicine records include:

- Paracetamol
- Amoxicillin
- Ibuprofen
- Cetirizine
- Azithromycin

The application retrieves medicine availability from PostgreSQL through a backend API.

*Important:* The current medicine quantities are prototype inventory records, not verified stock from nearby pharmacies. OpenStreetMap provides pharmacy location information but does not provide live medicine inventory. Pharmacy-specific stock verification is a future improvement.

 Backend API Endpoints

The backend provides the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check whether the backend is running |
| GET | `/api/db-test` | Test the PostgreSQL connection |
| GET | `/api/availability?medicine=Paracetamol` | Retrieve a medicine's inventory status |
| POST | `/api/identify-medicine` | Identify a medicine from extracted OCR text |
| POST | `/api/search` | Search endpoint for the prototype |

 Medicine Identification Request

Example request:

```json
{
  "text": "Pacetacmol Tbs IP 650mg"
}
```

Example response:

```json
{
  "success": true,
  "found": true,
  "medicine": "Paracetamol",
  "confidence": 95
}
```

The confidence value is an approximate matching score, not a medically validated probability.

 Project Structure

```text
Medicine-Availability-Finder/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── package-lock.json
│
├── screenshots/
│   ├── 01_Welcome_Screen.png
│   ├── 02_Homepage.png
│   ├── 03_Login_Page.png
│   ├── 04_Medicine_Search_Page.png
│   ├── 05_Detects_Original_Location.png
│   ├── 06_Near_by_Pharmacies.png
│   ├── 07_OpenStreetMap.png
│   ├── 08_Real_Direction.png
│   └── 09_Availability_Check.png
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

 Installation and Setup

 Prerequisites

Install the following tools before running the project:

- Node.js and npm
- PostgreSQL
- Git
- Visual Studio Code

 1. Clone the Repository

```bash
git clone https://github.com/Ankitha-t-d/Medicine-Availability-Finder.git
```

Navigate into the project directory:

```bash
cd Medicine-Availability-Finder
```

 2. Install Backend Dependencies

```bash
cd backend
npm install
```

 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

Add your local PostgreSQL configuration:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=medicine_finder
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_PORT=5432
```



 4. Prepare the Database

Create a PostgreSQL database named `medicine_finder`.

Create the `medicines` table with the following structure:

```sql
CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    availability BOOLEAN NOT NULL DEFAULT FALSE,
    quantity INTEGER NOT NULL DEFAULT 0
);
```

Add sample inventory records for development and testing.

If you already have this database and table, do not recreate them.

 5. Start the Backend

From the `backend` directory, run:

```bash
node server.js
```

The backend runs at:

`http://localhost:5000`

 6. Install Frontend Dependencies

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

7. Start the Frontend

```bash
npm run dev
```

Open the local address displayed by Vite, typically:

`http://localhost:5173`

Allow location access when prompted and use a supported browser to test the camera and location features.

 Security and Privacy

- Database credentials are stored in environment variables.
- Environment files and dependency folders are excluded through `.gitignore`.
- Browser location access requires user permission.
- Medicine identification should be verified against the original packaging.
- Inventory availability should be confirmed with the pharmacy before travelling.

 Future Enhancements

- Pharmacy-specific inventory management.
- Live stock integration with participating pharmacies.
- User authentication and profile management.
- Improved OCR for different medicine packaging and languages.
- More robust medicine-name matching.
- Medicine expiry-date recognition.
- Search filters based on distance and availability.
- Improved error handling and accessibility.
- Deployment of the frontend, backend, and database.

 Project Objective

The objective of MedFind is to simplify medicine discovery by combining image-based text recognition, location-aware pharmacy discovery, mapping, and database-backed inventory checks in a single web application.

 Project Status

**Status:** Prototype under development.

MedFind currently integrates OCR, medicine-name matching, browser geolocation, nearby pharmacy discovery, mapping, and PostgreSQL-based inventory lookup.

Live pharmacy-specific stock verification is not yet implemented.

---

**Built with React, Node.js, Express, PostgreSQL, Tesseract.js, and OpenStreetMap.**
