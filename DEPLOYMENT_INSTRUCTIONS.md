# 🚀 Policy Chatbot Deployment Guide (Option 2)

This guide documents the steps to deploy your **Policy Chatbot** using modern cloud platforms: **Vercel** for the React frontend and **Render** for the Flask backend.

---

## 1. 📂 Repository Preparation
Your project is now primed for cloud deployment. Ensure these files are in your repository:

- **Frontend**:
    - `frontend/vercel.json` — Configures SPA routing (for `react-router`).
    - API URLs are updated to use `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`.

- **Backend**:
    - `backend/Dockerfile` — Handles building the `bitnet.cpp` server and setting up the Python environment.
    - `backend/requirements.txt` — Lists all Python dependencies.

---

## 2. 🌐 Frontend: Vercel (React)
1. **Push your code** to a GitHub/GitLab/Bitbucket repository.
2. **Connect to Vercel**: Log in to [vercel.com](https://vercel.com) and click "Add New Project."
3. **Select Frontend Folder**: During the setup, point the root directory to your `frontend` folder.
4. **Environment Variables**: In Vercel, add a new environment variable:
   - `REACT_APP_API_URL` = `https://your-backend-url.onrender.com` (Get this from Render after the next step).
5. **Deploy**: Click deploy. Your frontend will be live on a `.vercel.app` domain.

---

## 3. ⚙️ Backend: Render (Flask + BitNet)
Since your backend requires custom binaries (`bitnet.cpp`) and a specific model file, we use **Docker**.

1. **New Web Service**: In [render.com](https://dashboard.render.com), click **"New" > "Web Service"**.
2. **Repository**: Connect your repo and set the "Root Directory" to `backend`.
3. **Runtime**: Select **"Docker"**.
4. **Instance Type**: 
   > [!IMPORTANT]
   > The BitNet model and `sentence-transformers` require significant memory. Choose a **"Starter"** or **"Pro"** instance (at least 2GB RAM). The Free tier may crash during model loading.
5. **Environment Variables**:
   - `BITNET_MODEL_PATH` = `/app/backend/BitNet/models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf`
   - `ADMIN_USERNAME` = `your_admin_name`
   - `ADMIN_PASSWORD` = `secure_password`
6. **Persistent Storage (Recommended)**:
   Render's file system is ephemeral. For your `policy_hub.db` and uploaded PDFs to persist between restarts:
   - Add a **Disk** to your Web Service (e.g., Mount Path: `/app/data`).
   - Update your `DATABASE` path in `backend/app.py` or via an env var to point to the mounted disk.

---

## 4. 🗄️ Database & Model Handling
- **Database**: If you don't use a Render Disk, your SQL database will reset on every deploy. For production, consider using Render's PostgreSQL service.
- **Model Files**: The Docker image currently expects the `.gguf` file to be present in the `backend/BitNet/models` path. Ensure you've downloaded it if you're building locally, or use a script in the Dockerfile to download it on build (be careful with build timeouts).

---

## 5. ✅ Post-Deployment Checks
1. **Update Frontend API URL**: Once Render provides your backend URL (e.g. `https://chatbot-api.onrender.com`), go back to your Vercel project and update `REACT_APP_API_URL`.
2. **CORS**: The backend is already configured to allow CORS, so your frontend should communicate seamlessly.
3. **Admin Login**: Access `/admin` on your Vercel URL and log in using the credentials you set.

---

> [!TIP]
> Since **MLX** only runs on Mac, the cloud deployment (on Linux) will automatically use the **Tesseract/EasyOCR** fallback for PDF processing as configured in your `app.py`.
