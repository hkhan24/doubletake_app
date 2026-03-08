# DoubleTake Application

DoubleTake is a news application built to prevent media bias and echo chambers by presenting two different perspectives on a single daily global event. It pairs an article from a Western news outlet with an article from a non-Western news outlet, utilizing a custom bias-check functionality.

## Architecture
- **Backend**: Node.js, Express, Axios. Secures API paths and handles the `bias-check` mechanism.
- **Frontend**: Flutter. Minimalist web/mobile application focusing on a premium glassmorphism split-screen design.

---

## 1. Backend Setup

### Prerequisites
- Node.js (v18+)

### Installation & Configuration
1. Navigate to the `backend` directory:
   ```bash
   cd c:/github/doubletake_app/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your API Keys inside `backend/.env`. (If you do not provide a `NEWS_API_KEY`, the application will fall back to using static mock data for demonstration purposes).

### Running the Server
```bash
npm start
```
*The server will run on `http://localhost:3000`.*

---

## 2. Frontend Setup

### Prerequisites
- Flutter SDK (Ensure `flutter` is in your `PATH`)

### Installation
1. Navigate to the `frontend` directory:
   ```bash
   cd c:/github/doubletake_app/frontend
   ```
2. Fetch dependencies:
   ```bash
   flutter pub get
   ```

### Running the App (Web / Chrome)
```bash
flutter run -d web-server --web-port=8080
```
*The web app will run on `http://localhost:8080`, communicating directly with your local backend on port 3000.*

---

## Key Features
- **Bias Check Utility**: The backend groups sources into Western (CNN, BBC, Reuters, etc.) and Non-Western (Al Jazeera, SCMP, TASS, etc.). Our validation layer strictly requires one perspective from each region.
- **Glassmorphism Design**: An aesthetically pleasing, blurred translucent interface that elevates the reading experience without distracting from the headlines.
- **Graceful Degradation**: Built-in mock data pool for immediate testing without API key dependencies.
