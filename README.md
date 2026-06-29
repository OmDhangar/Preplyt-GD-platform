# Preplyt GD — Group Discussion Evaluation Platform

Preplyt GD is a production-quality, real-time Group Discussion evaluation platform designed for instructors, administrators, and students. It features role-based dashboards, dynamic evaluation rubric templates, Socket.IO real-time synchronization, and Razorpay payment integration for paid sessions.

This repository is structured as a monorepo containing both the frontend and backend applications.

---

## ── Monorepo Structure ─────────────────────────────────────────────────────────

```
gd-eval-platform-backend/
├── backend/                  # Express.js REST & WebSocket Server
│   ├── server.js             # Bootstrap HTTP/WS Server
│   ├── src/                  # Controllers, Models, Routes, Sockets, Services
│   └── README.md             # Backend-specific Documentation
├── frontend/                 # Vite + React Single Page Application (SPA)
│   ├── src/                  # Components, Routes (TanStack Router), Hooks, Lib
│   └── vite.config.ts        # Frontend Build & Dev Server Config
├── implementation_plan.md    # Detailed Strategy & Implementation Plan
└── walkthrough.md            # Summary of Resolved UX Bugs & Verification
```

---

## ── Technology Stack ──────────────────────────────────────────────────────────

### Frontend
- **Framework**: React with TypeScript
- **Routing**: TanStack Router (file-based routing)
- **State Management & Querying**: TanStack Query (React Query)
- **Styling**: Tailwind CSS & Lucide Icons
- **Real-Time Sync**: Socket.IO Client

### Backend
- **Framework**: Node.js & Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Real-Time Sync**: Socket.IO Server (rooms-based sync)
- **Email Service**: Nodemailer (SMTP-driven)
- **Task Scheduling**: Node-cron (cron-based email reminders)
- **Payment Gateway**: Razorpay API Integration

---

## ── Newly Implemented Features & Enhancements ─────────────────────────────────

Recently, several critical user experience bugs and database integrity issues were resolved across the platform. Below is an overview of these features:

### 1. Batch Save & Publish Flow
* **The Problem**: Instructors were required to manually save and submit draft evaluations one student at a time, creating a tedious workflow. Furthermore, once a session ended/completed, instructors were blocked from editing evaluations.
* **The Solution**: 
  - Updated the backend batch evaluation endpoint to allow edits on both `active` and `completed` sessions.
  - Revamped the publish evaluation endpoint to find all session participants, auto-create draft records for anyone missing a record, calculate scores on the fly for remaining drafts, transition all records to `published`, and automatically update the session's `evaluatedCount` in a single action.
  - Blocked editing of evaluations once they are published to maintain data immutability.

### 2. Results Summary Dashboard & Validation Badges
* **The Problem**: Instructors lacked a unified view to check the completeness of all student evaluations (e.g., missing required fields or missing comments) before publishing, risking half-filled evaluations being sent to students.
* **The Solution**:
  - Built a central **Results Summary** dashboard in the evaluation workspace, listing all candidates, their current scores, comment status, and required field validation.
  - Implemented red badges showing the number of missing required criteria next to each student's name in the left sidebar list.
  - Added a **Publish All Results** panel at the bottom of the summary view to flush all drafts, publish the session's results, and redirect back to the session lobby with a single click.

### 3. Universal Back Navigation
* **The Problem**: The app lacked structured back-navigation controls, leaving users trapped on sub-pages or relying on browser back buttons.
* **The Solution**:
  - Enhanced the central `PageHeader` component with support for `backUrl` (TanStack Router link) and `showBack` (browser history navigation fallback) props.
  - Added back buttons to all critical creation, evaluation, edit, lobby, and result screens.

### 4. Public GD Listing & Access Control
* **The Problem**: Carried-out (completed) GD sessions were not displayed on the public upcoming list. Additionally, the frontend query crashed due to a mismatch in the backend API response wrapper format (`resp.data.sessions` vs. `resp.data`).
* **The Solution**:
  - Fixed the query helper to read from `resp.data` directly.
  - Updated the backend public session filter to include completed sessions.
  - Styled completed sessions with distinct badges and a disabled "Completed" button.
  - Secured session details by deleting `googleMeetUrl` and `joinCode` from the API response for students who are not registered/subscribed.

---

## ── Setup & Running the Application ──────────────────────────────────────────

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or a cloud URI)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables and configure them:
   ```bash
   cp .env.example .env
   ```
4. (Optional) Seed the database with demo users (admins, instructors, students, templates):
   ```bash
   npm run seed
   ```
5. Run the server in development mode:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

Open `http://localhost:5173` in your browser to view the application. Check the demo credentials in `backend/README.md` to log in.
