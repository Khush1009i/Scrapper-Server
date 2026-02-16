# 🗺️ Scraper Server API Documentation

This backend provides a real-time Google Maps scraping service, authenticated via JWT.

## 🚀 Base URL

```
http://localhost:3000
```

---

## 🔐 1. Authentication

### **1. Send Verification Code**
Sends a 6-digit OTP to the user's email.

- **Endpoint:** `POST /auth/send-otp`
- **Auth Required:** No

#### **Request Body**
```json
{
  "email": "dev@example.com",
  "name": "Dev User" // Optional
}
}
```

---

### **2. Register (Verify OTP & Create Account)**
Verifies the OTP and creates the account.

- **Endpoint:** `POST /auth/register`
- **Auth Required:** No

#### **Request Body**
```json
{
  "email": "dev@example.com",
  "password": "securepassword123",
  "otp": "123456",
  "name": "Dev User" // Optional (Overrides name provided in Send OTP)
}
}
```

#### **Success Response (201 Created)**
```json
{
  "message": "User verification successful and account created.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123...",
    "name": "Dev User",
    "email": "dev@example.com"
  }
}
```

---

### **Login**
Authenticates a user and returns a JWT token.

- **Endpoint:** `POST /auth/login`
- **Auth Required:** No

#### **Request Body (`application/json`)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | ✅ Yes | Registered email |
| `password` | `string` | ✅ Yes | User password |

**Example:**
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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **Get User Profile**
Retrieves the currently logged-in user's details.

- **Endpoint:** `GET /auth/me`
- **Auth Required:** ✅ Yes (Bearer Token)

#### **Success Response (200 OK)**
```json
{
  "id": "17382910...",
  "email": "dev@example.com",
  "name": "Dev User",
  "joinedAt": "2024-02-16T12:00:00.000Z"
}
```

---

## 🔍 2. Search & Scraping
**⚠️ Rate Limit:** 5 requests per minute per user.

### **Search Businesses**
Scrapes Google Maps for businesses matching the query at the specific location.

- **Endpoint:** `GET /search`
- **Auth Required:** ✅ Yes (Bearer Token)

#### **Headers**
| Key | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <your_token>` | The JWT token received from login |

#### **Query Parameters**
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | ✅ Yes | Check query term | `salon`, `gym` |
| `lat` | `float` | ❌ No* | Latitude (*Required if no location) | `25.34` |
| `lng` | `float` | ❌ No* | Longitude (*Required if no location) | `74.64` |
| `location` | `string` | ❌ No* | City/Address (*Required if no lat/lng) | `Bhilwara, Rajasthan` |

**Example URLs:**
- By Coords: `http://localhost:3000/search?q=gym&lat=25.34&lng=74.64`
- By Location: `http://localhost:3000/search?q=gym&location=Bhilwara`

#### **Success Response (200 OK)**
```json
{
  "query": "gym",
  "location": "Bhilwara",
  "center": {
    "lat": 25.34,
    "lng": 74.64
  },
  "results": [
    {
      "name": "Gold's Gym",
      "rating": 4.5,
      "reviews": 320,
      "address": "123 Fitness St...",
      "phone": "+91 9876543210",
      "website": "http://goldsgym.com",
      "latitude": 25.3412,
      "longitude": 74.6412,
      "image": "https://lh5.googleusercontent.com/p/AF1Qip..."
    }
  ],
  "count": 1
}
```

#### **Error Responses**
- **400 Bad Request:** Missing parameters or invalid coordinates.
- **401 Unauthorized:** Missing token.
- **403 Forbidden:** Invalid token.
- **429 Too Many Requests:** Rate limit exceeded.
- **500 Server Error:** Scraper failure.

---

## 🔥 3. Popular Searches
Get a list of trending or most searched categories.

- **Endpoint:** `GET /search/popular`
- **Auth Required:** ❌ No

#### **Success Response (200 OK)**
```json
{
  "categories": [
    "Restaurants",
    "Tech",
    "IT Company",
    "Tea & Coffee"
  ]
}
```

---

## 🛠️ Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure `.env` exists:
   ```env
   PORT=3000
   JWT_SECRET=supersecretbackendkey
   MONGO_URI=mongodb://localhost:27017/scrapper-server
   ```

3. **Database**
   - Install **MongoDB Community Server**.
   - Make sure MongoDB is running locally on port `27017`.

4. **Start Server**
   ```bash
   npm run dev
   ```
