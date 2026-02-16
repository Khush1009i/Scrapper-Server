# 🗺️ Scraper Server API Documentation

This backend system provides a stable, asynchronous scraping service for Google Maps, utilizing a job queue architecture to handle high concurrency and ensure reliability.

## 🚀 Base URL

```
http://localhost:3000/api/v1
```

---

## 🏗️ Architecture: Asynchronous Job Queue

The system now uses a **Job Queue Pattern** to decouple user requests from the heavy scraping process.

1.  **Request**: User sends a scraping request (`POST /search`).
2.  **Queue**: Server accepts request, creates a job in SQLite, and returns a `jobId` immediately (202 Accepted).
3.  **Process**: A background worker picks up the job, performs the scrape (with retries and timeouts), and updates the database.
4.  **Poll**: User polls the status endpoint (`GET /search/status/:id`) to get the results.

### **Benefits**
- **Stability**: Server never hangs waiting for a scrape.
- **Concurrency**: Controlled worker pool (default 2-5 concurrent scrapes).
- **Persistence**: Jobs are saved in SQLite, so they survive server restarts (until processed).

---

## 🔐 Authentication

### **1. Send Verification Code**
Sends a 6-digit OTP to the user's email.

- **Endpoint:** `POST /api/v1/auth/send-otp`
- **Auth Required:** No

#### **Request Body**
```json
{
  "email": "dev@example.com",
  "name": "Dev User"
}
```

#### **Success Response**
```json
{
  "message": "Verification code sent to your email."
}
```

---

### **2. Register (Verify OTP & Create Account)**
Verifies the OTP and creates the account.

- **Endpoint:** `POST /api/v1/auth/register`
- **Auth Required:** No

#### **Request Body**
```json
{
  "email": "dev@example.com",
  "password": "securepassword123",
  "otp": "123456",
  "name": "Dev User"
}
```

#### **Success Response (201 Created)**
```json
{
  "message": "User verification successful and account created.",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 1,
    "name": "Dev User",
    "email": "dev@example.com"
  }
}
```

---

### **3. Login**
Authenticates a user and returns a JWT token.

- **Endpoint:** `POST /api/v1/auth/login`
- **Auth Required:** No

#### **Request Body**
```json
{
  "email": "dev@example.com",
  "password": "securepassword123"
}
```

#### **Success Response (200 OK)**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

---

### **4. Get User Profile**
Retrieves the currently logged-in user's details.

- **Endpoint:** `GET /api/v1/auth/me`
- **Auth Required:** ✅ Yes (Bearer Token)

#### **Success Response (200 OK)**
```json
{
  "id": 1,
  "email": "dev@example.com",
  "name": "Dev User",
  "joinedAt": "2024-02-16T12:00:00Z"
}
```
---

## 🔍 Search API (Async workflow)

### **1. Initiate Search Job**
Creates a new scraping job.

- **Endpoint:** `POST /api/v1/search`
- **Auth Required:** ✅ Yes (Bearer Token)
- **Content-Type:** `application/json`

#### **Request Body**
```json
{
  "q": "gym",
  "location": "Bhilwara"
}
```

#### **Success Response (202 Accepted)**
```json
{
  "success": true,
  "message": "Search job accepted. Please poll the status endpoint for results.",
  "jobId": 15,
  "statusUrl": "/api/v1/search/status/15"
}
```

### **2. Check Job Status & Get Results**
Poll this endpoint every few seconds until `status` is `"completed"`.

- **Endpoint:** `GET /api/v1/search/status/:jobId`
- **Auth Required:** ✅ Yes (Bearer Token)

#### **Response (Pending/Processing)**
```json
{
  "success": true,
  "status": "processing",
  "data": null,
  "created_at": "2024-02-16T12:00:00Z"
}
```

#### **Response (Completed)**
```json
{
  "success": true,
  "status": "completed",
  "data": {
    "query": "gym",
    "location": "Bhilwara, Rajasthan, India",
    "results": [
      {
        "name": "Gold's Gym",
        "rating": 4.5,
        ...
      }
    ],
    "count": 5
  }
}
```

#### **Response (Failed)**
```json
{
  "success": true,
  "status": "failed",
  "error": "Scraper timeout exceeded."
}
```

---

## 🛠️ Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Server (and Worker)**
   ```bash
   npm run dev
   ```
   The server will automatically start the background queue worker.
