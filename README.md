# DreamHome Admin Dashboard

> Powerful administrative portal for staff to manage properties, task allocations, hiring portals, tenant leases, and financial operations.

---

## 📋 Project Overview

The **DreamHome Admin Dashboard** is a secure, role-restricted internal tool designed to streamline property management operations. It connects directly with the backend API to handle staff directory registers, task status monitoring, property inspections, viewings scheduling, and contract processing.

---

## 🛠️ Tech Stack

* **Framework:** React & Next.js 13+
* **Icons:** `lucide-react`
* **Styling:** TailwindCSS & Custom CSS
* **Forms & Validation:** Custom `useForm` hooks with schema-based input validators
* **HTTP Client:** Extended `apiClient` with token-based automatic refreshing

---

## 🚀 Key Features

* **Staff Directory & Team Assignments:** Manage corporate staff, allocate subordinates to supervisors (enforcing a maximum of 10), and track typing speeds for secretarial staff.
* **Property Inspections & Gating:** Record inspection notes and track statuses (`Scheduled`, `Completed`, `Cancelled`). Only properties with at least one `Completed` inspection can be approved for rent.
* **Interactive Viewing Planner:** Record client viewings and match active properties with renters. Property selection is restricted to approved (`Available`) listings.
* **Lease Agreements & Payments:** Log lease details with auto-filling monthly rent pricing and track balances with regex-guaranteed sequential ID tracking.
* **Marketing Campaigns:** Build advertisements (popups, banners, sections) and toggle display status.

---

## 🔐 Access Control & Roles

> ⚠️ **Access Notice:** This repository is restricted to corporate roles. Standard client accounts (Renters and Owners) cannot sign in to this portal. 
> Access permissions are enforced hierarchically:
> * **ADMIN:** Full system access, including activity logs, database operations, and system settings.
> * **Manager / Supervisor:** Assign tasks, review team performance, manage branch resources, and register clients.
> * **Secretary / Staff:** Standard CRUD operations on listings, recordings of inspections, viewings, and tenant balances.

---

## 🏁 Getting Started

### 1. Prerequisites
* **Node.js 18+** installed.
* Running **DreamHome Backend API** instance.

### 2. Environment Variables (`.env.local`)
Create a `.env.local` file in the root of the project pointing to the backend API:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

### 3. Installation and Development Runs

Clone the repository and run the following commands inside the dashboard folder:

```bash
# Install node packages
npm install

# Start the local development server
npm run dev

# Run development server with host configuration (for network testing)
# npm run dev -- -H 192.168.1.67
```

Once running, navigate to `http://localhost:3001` (or your assigned port) to access the Admin login portal.
```
Admin Login Credentials:
- Username: [Staff Email Address]
- Password: [Assigned Password]
```

### 4. Build and Production Run
```bash
# Build the production bundle
npm run build

# Start the production Next.js server
npm run start
```
