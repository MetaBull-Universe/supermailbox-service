# Deployment Guide: Vercel (Frontend) & Render (Backend)

This guide walks you through deploying the `supermailbox-cpaas-monorepo` project. Since this is a monorepo, we will deploy the `client` directory to **Vercel** and the `server` directory to **Render**. Both platforms offer seamless CI/CD (Continuous Integration / Continuous Deployment) by directly linking your GitHub repository, meaning they will automatically rebuild and deploy whenever you push to your `main` branch.

---

## Part 1: Preparing Your Code for Deployment

1. **Commit and Push to GitHub:**
   Make sure your code is pushed to a GitHub repository.
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Environment Variables:**
   Gather all the variables from your `client/.env` and `server/.env` files. You will need to input these into the Vercel and Render dashboards during setup.

---

## Part 2: Deploying the Frontend (`client`) to Vercel

Vercel is optimized for frontend frameworks like Vite and React. It natively supports monorepos.

1. **Sign in to Vercel:** Go to [vercel.com](https://vercel.com/) and log in with your GitHub account.
2. **Add New Project:** Click the **"Add New..."** button and select **"Project"**.
3. **Import Repository:** Find your GitHub repository in the list and click **"Import"**.
4. **Configure Project:**
   - **Project Name:** `supermailbox-client` (or your preferred name)
   - **Framework Preset:** Vite
   - **Root Directory:** Click "Edit", select the `client` folder, and save.
5. **Environment Variables:**
   - Expand the "Environment Variables" section.
   - Add all variables from your `client/.env` file. (Make sure your backend API URL points to the production Render URL once you have it, e.g., `VITE_API_URL=https://your-backend.onrender.com`).
6. **Deploy:** Click the **"Deploy"** button. Vercel will automatically build and deploy your frontend.
7. **CI/CD Pipeline:** From now on, any push to the `main` branch will automatically trigger a new build and deployment on Vercel.

---

## Part 3: Deploying the Backend (`server`) to Render

Render is an excellent platform for Node.js backends.

1. **Sign in to Render:** Go to [render.com](https://render.com/) and log in with your GitHub account.
2. **Create New Web Service:** Click the **"New"** button and select **"Web Service"**.
3. **Connect Repository:** Select "Build and deploy from a Git repository", then connect your GitHub repository.
4. **Configure Web Service:**
   - **Name:** `supermailbox-server`
   - **Root Directory:** `server`
   - **Environment:** Node
   - **Region:** (Choose the one closest to your users or your database)
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start` (or `node dist/index.js`, depending on your server's package.json setup)
5. **Instance Type:** Select the Free tier (or a paid tier if you require more resources/no sleep).
6. **Environment Variables:**
   - Click "Advanced" -> "Add Environment Variable".
   - Add all variables from your `server/.env` file (e.g., `DATABASE_URL`, `JWT_SECRET`, etc.).
7. **Deploy:** Click **"Create Web Service"**. Render will start building and deploying your backend.
8. **CI/CD Pipeline:** Render will now automatically rebuild and redeploy your server whenever you push to the `main` branch.

> **Important:** Once Render gives you your live backend URL (e.g., `https://supermailbox-server.onrender.com`), make sure to go back to Vercel and update your `VITE_API_URL` environment variable, then redeploy Vercel.

---

## Part 4: Optional - Strict CI/CD with GitHub Actions

If you want to run tests, linting, or formatting *before* allowing a deployment to happen, you can set up a GitHub Actions workflow.

### 1. Disable Auto-Deployments
- **Vercel:** Go to Project Settings -> Git -> "Ignored Build Step" and set it up so it doesn't build on every push, OR use Vercel's GitHub Action for manual deployments.
- **Render:** Go to Web Service Settings -> Auto-Deploy -> Set to **No**.

### 2. Create the GitHub Actions Workflow

Create a file in your project root at `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Run Linting and Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies (Root)
        run: npm install

      - name: Install dependencies (Server)
        working-directory: ./server
        run: npm install

      - name: Install dependencies (Client)
        working-directory: ./client
        run: npm install

      # Add your test or lint scripts here if you have them configured
      # - name: Run tests
      #   run: npm run test --prefix server && npm run test --prefix client

  deploy:
    name: Trigger Deployments
    runs-on: ubuntu-latest
    needs: test # Only run if tests pass
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Trigger Render Deploy
        # Go to Render Settings -> Deploy Hook and paste the URL in GitHub Secrets as RENDER_DEPLOY_HOOK_URL
        run: curl ${{ secrets.RENDER_DEPLOY_HOOK_URL }}

      # Vercel deployment via CLI Action (Requires VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID in GitHub Secrets)
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./client
```

### 3. Add GitHub Secrets
If you use the GitHub Actions method, go to your GitHub repository -> Settings -> Secrets and variables -> Actions, and add:
- `RENDER_DEPLOY_HOOK_URL`: Found in Render Web Service Settings -> Deploy Hook.
- `VERCEL_TOKEN`: Generated from your Vercel Account Settings -> Tokens.
- `VERCEL_ORG_ID` & `VERCEL_PROJECT_ID`: Found by running `npx vercel link` locally and checking the `.vercel/project.json` file.

---
**Summary:** For 90% of projects, **Parts 1-3** (native git integrations) are the easiest and most reliable way to set up CI/CD. Use **Part 4** only if you need a gated pipeline (e.g. running automated tests before deploying).
