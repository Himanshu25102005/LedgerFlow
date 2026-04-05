# LedgerFlow

*Role-Based Financial Data Management and Analytics Platform*

---

## Overview

LedgerFlow is a comprehensive full-stack project designed to streamline financial record management. It provides robust role-based access control to ensure secure data handling across different permission levels. With built-in analytics and interactive dashboard insights, LedgerFlow empowers users to monitor financial health effectively. 

---

## Features

### Core Features:
- **Financial record management**: Complete CRUD (Create, Read, Update, Delete) operations for financial data.
- **Role-based access control**: Specialized roles including Admin, Analyst, and Viewer.
- **Dashboard analytics**: Summaries, category breakdowns, and financial trend visualizations.
- **Filtering and pagination**: Efficient data browsing and search capabilities.
- **Secure authentication**: Google OAuth integration coupled with session management.
- **Admin user management**: Centralized control over user permissions and accounts.
- **Soft delete for records**: Safe data removal with recovery options.

---

## Tech Stack

### Backend:
- Node.js
- Express.js
- MongoDB + Mongoose

### Frontend:
- Next.js
- Tailwind CSS
- Framer Motion

---

## Architecture Overview

**Backend handles:**
- Core business logic and validation
- Data persistence and database queries
- Secure authentication flows
- Strict role enforcement and authorization

**Frontend handles:**
- Responsive and interactive UI rendering
- Efficient API consumption and state management
- Dynamic role-based component display

---

## Role-Based Access System

LedgerFlow implements a strict role hierarchy to protect sensitive financial data:

- **Admin**
  - Full system access
  - Manage users and records
  - View global data

- **Analyst**
  - Access to aggregated insights
  - No modification permissions

- **Viewer**
  - Read-only access to personal data

---

## How Frontend and Backend Communicate

The application utilizes REST APIs for robust client-server communication.

- **Examples:**
  - `/auth/me` - Retrieves current user session and role.
  - `/api/records` - Handles financial record transactions.
  - `/api/dashboard/*` - Serves aggregated data for analytics.
- **Session-based authentication**: Secure HTTP-only cookies are used to manage user sessions reliably.
- **Conditional Rendering**: The frontend dynamically renders data and UI components based on the role-specific responses provided by the backend.

---

## Project Structure

```bash
ledgerflow/
  ├── frontend/
  └── backend/
```

---

## Setup Instructions

### Backend:

```bash
cd backend
npm install
npm run dev
```

### Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

## 📄 Detailed Documentation

For an in-depth look at specific parts of the project, please refer to the detailed documentation:

- **Backend README**: [`./backend/README.md`](./backend/README.md)
  - Covers API design, database schemas, and business logic.
- **Frontend README**: [`./frontend/README.md`](./frontend/README.md)
  - Covers UI architecture, component structure, and API integration.

---

## Design Decisions

- **Role-based data scoping**: Ensures users only access data pertinent to their authorization level.
- **Separation of concerns**: Clear distinction between the frontend rendering layer and the backend logic processing.
- **Use of aggregation**: MongoDB aggregation pipelines are utilized for efficient complex data analytics.

---

## Future Improvements

- Enhanced data validation rules
- Advanced predictive analytics
- Increased automated testing coverage
