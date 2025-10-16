# Railway.app Setup Guide for Nexus VTT

This guide explains how to deploy Nexus VTT to Railway using the multi-container Docker setup.

## Overview

The application is deployed as three separate services on Railway:
1.  **frontend:** A static Nginx server for the React UI.
2.  **backend:** The Node.js WebSocket server.
3.  **postgres:** A PostgreSQL database for session persistence.

Railway will build and deploy these services automatically based on the `railway.json` configuration file.

## Deployment Steps

### 1. Create the Project
1.  Go to [Railway.app](https://railway.app) and log in with GitHub.
2.  Click "New Project" -> "Deploy from GitHub repo".
3.  Select your `nexus-vtt` repository.
4.  **Immediately after creation, go to the project "Settings" tab and check "Private Networking".** This allows the services to communicate with each other.

Railway will begin deploying the `frontend` and `backend` services as defined in `railway.json`.

### 2. Add a Database
1.  In your Railway project, click "New" -> "Database" -> "Add PostgreSQL".
2.  Railway will create a new `postgres` service.

### 3. Link the Database to the Backend
1.  Go to your `backend` service in Railway.
2.  Go to the "Variables" tab.
3.  You should see a `DATABASE_URL` variable has been automatically added. Railway does this when it detects a database and a service that can use it.
4.  If it's not there, you can add it manually by referencing the postgres service.

### 4. Configure Environment Variables
The `backend` service needs one more environment variable to function correctly.

1.  In the `backend` service "Variables" tab, add a new variable:
    *   `CORS_ORIGIN`: Set this to the public URL of your `frontend` service (e.g., `https://nexus-frontend-production.up.railway.app`). You can get this URL from the "Settings" tab of the `frontend` service.

The `frontend` service does not require any additional environment variables.

### 5. Accessing Your Application
Once everything is deployed:
- The URL for your application is the public domain of the **`frontend`** service.
- The `backend` service does not need a public domain, as the frontend will communicate with it over the private network.

---

## Troubleshooting

### Services Can't Connect
- **Symptom:** Frontend loads, but can't connect to the WebSocket.
- **Fix:** Ensure you have enabled "Private Networking" in the project's settings tab.

### Backend Fails to Deploy
- **Symptom:** The `backend` service shows a deployment error.
- **Fix:** Check the deployment logs. The most common issue is a missing `DATABASE_URL`. Ensure the PostgreSQL service is running and linked correctly.

### Frontend/Backend Naming
- If your services are not named `frontend` and `backend`, you may need to adjust the `CORS_ORIGIN` variable and any other inter-service communication URLs.