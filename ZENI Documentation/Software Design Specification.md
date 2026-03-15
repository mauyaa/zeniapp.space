# Software Design Specification (SDS)



---

## Table of Contents
1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Web Application](#3-web-application)
4. [Engine](#4-engine)
5. [Customize Item Explorer](#5-customize-item-explorer)
6. [Algorithms](#6-algorithms)
7. [Database](#7-database)

---

## 1. Introduction

### 1.1 Purpose
This document contains the implementation designs and rationales explaining why the Online Real Estate Management Information System (MIS) was architected in its current form. This document serves as a blueprint to help new developers spin up on the project and remind current developers why specific design and security decisions were implemented.

### 1.2 Overview
The System Architecture section of this document contains a bird’s-eye view of the architecture for the project. This is a streamlined architecture established up front to guide the design for all application features while maintaining agility and the capacity to evolve. 

Subsequent sections break down the specific components and modules utilized within the project. This document acts as the definitive source for design rationale and potential future work across all components.

---

## 2. System Architecture

### 2.1 Architectural Design
The project employs a modern **MERN architecture** (MongoDB, Express.js, React, Node.js), augmented with real-time capabilities and mobile cross-platform packaging. 
*   A **React 18** web client communicates with a **Node.js/Express.js REST API**.
*   **MongoDB Atlas (NoSQL)** stores persistent application data including users, listings, favourites, and chat messages.
*   Listing media (images) are managed via external cloud image storage (**Cloudinary**) and saved in the MongoDB collections as optimized URLs.
*   Real-time chat functionality is powered by **Socket.IO**.
*   The frontend is wrapped into native iOS and Android applications utilizing **Ionic Capacitor**.

### 2.2 Decomposition Description
The three primary pillars of the architecture are the **Web/Mobile Application (Client)**, the **Engine (Backend API Server)**, and the **Database**. 
This separation of concerns ensures that the client application can operate autonomously for public viewing while the strict engine enforces rigorous security and business logic for all protected transactions.

The Engine is exclusively responsible for routing authentication (JWT/Google OAuth), role-based authorization (User/Agent/Admin), geospatial query validation, and messaging operations. The Database stores all persistent records, leveraging geospatial indexing to support high-speed `$geoWithin` map retrieval and filtered pagination.

### 2.3 Design Rationale
*   **Web Application:** A component-based approach using React was selected. This allows for the high reuse of UI elements (property cards, advanced filters, GSAP animated sliders) across diverse pages and maintains a cohesive, responsive user experience on both Desktop and Mobile environments (via Capacitor). High-end aesthetic styling is driven by functional **Tailwind CSS**.
*   **Engine:** The modular API design cleanly separates routes, controllers, services, and middlewares. This isolation makes testing and maintenance significantly easier. Authentication, Multi-Factor Authentication (Admin OTP), and RBAC are unconditionally enforced at the API boundary, guaranteeing that protected routes cannot be circumvented from the client.
*   **Database:** MongoDB was selected because its flexible document structure perfectly accommodates complex entity arrays (like dynamic amenities and Cloudinary image arrays on listings). Furthermore, MongoDB natively supports critical `2dsphere` indexes required for the platform's core map-based search functionality.

---

## 3. Web Application

### 3.1 Implementation Design
The web application operates as a responsive, Single Page Application (SPA) driven by React Router DOM v6. It features role-aware routing logic that dynamically provides distinct dashboard layouts for Users, Agents, and Administrators.

**Core Views Include:**
*   **Public Exploratory Pages:** Home (Landing), Exploratory Map Search (Leaflet/Geospatial), and detailed Property Listing Views.
*   **Authentication Portal:** JWT Login, Google OAuth, and secure Registration forms.
*   **User Dashboard:** Management of favourite properties and active tenant-agent message threads.
*   **Agent Dashboard:** Tools for CRUD listing management and responding to tenant inquiries.
*   **Admin Dashboard:** Restricted platform health overview, User/Agent KYC verification queues, and system-wide moderation tooling.

### 3.2 Rationale and Breakdown
The UI uses reusable components precisely so that complex layouts (e.g., filter sidebars, listing grids, paginated result tables) exist as single sources of truth. 
Role-based dashboards ensure cognitive focus: buyers/tenants only see viewing tools, agents focus on inventory and lead handling, and administrators are strictly isolated to zero-trust moderation and verification duties, improving platform safety.

---

## 4. Engine

### 4.1 Implementation Design
The engine is a purely stateless RESTful API powered by Node.js and Express. It is logically isolated into specific feature modules:
*   Authentication & Identity Control
*   Geospatial Property Listings
*   Search & Analytics
*   User Favourites
*   Real-Time Messaging (Socket.IO + REST fallbacks)
*   Administrative Actions

Crucial Middleware injections evaluate JWT session tokens, verify role permissions, calculate IP Allowlisting for Admin routes, validate payload requests against strict schemas, and enforce global Rate Limiting. Controllers ingest HTTP connections while underlying Services execute complex business logic (e.g., checking if an agent is EARB verified before allowing them to post a listing).

### 4.2 Rationale and Breakdown
Decoupling core business logic and zero-trust security measures from the frontend UI guarantees that protected actions (like creating listings or verifying users) are rigorously evaluated on the server.
This strong decoupling directly facilitates the generation of the native Mobile App via Capacitor, as well as any future third-party integrations, as the Engine remains completely agnostic of the client consuming its APIs.

---

## 5. Customize Item Explorer

### 5.1 Implementation Design
The system's dashboard architectures are built to seamlessly support state customization and preference retention across user sessions. This state management includes retaining active map boundary coordinates (saved location bounds), persisting complex search filters (price ranges, bed/bath counts), and maintaining preferred column layouts in the administrative review queues.

To facilitate this without heavily burdening the database, the localized standard `UserPreference` or structured browser `localStorage` states exist to remember last-used tabs, map centers, or chat thread views dynamically.

### 5.2 Rationale and Breakdown
By persisting specific contextual settings (e.g., defaulting to the exact map bounding box the user previously zoomed into), repetitive configuration work is drastically reduced. This deeply impacts overall usability metrics, accelerating both property discovery for tenants and moderation efficiency for Admins processing large KYC verification queues.

---

## 6. Algorithms

### 6.1 Action Workflows
While standard diagramming is omitted here, the system's workflows operate strictly synchronously via asynchronous Promise chaining:

*   **Search & Filter Workflow:** Client captures Map Bounds + Filters -> API validates input -> MongoDB executes `$geoWithin` intersection -> API formats geo-JSON response -> Client renders map markers.
*   **Messaging Workflow:** Client opens thread -> Socket.IO establishes WebSocket room -> User types message -> Socket validates token and emits to room -> Receiver's UI updates instantaneously -> Background service persists message synchronously to MongoDB.

### 6.2 Rationale and Breakdown
*   **Search:** Geospatial indexing paired with strict pagination on the API layer guarantees payloads remain lightweight, preserving critical sub-second render speeds on bandwidth-constrained mobile devices.
*   **Messaging:** The decision to group discrete messages into "Threads" based on specific Listing ID and Participant IDs ensures highly organized chat history, massively improving query performance against the database compared to querying all raw messages globally.

---

## 7. Database

### 7.1 Implementation Design
MongoDB Atlas handles all persistent data requirements. The core NoSQL collections established are:
*   **Users:** Identity, Role (User/Agent/Admin), Verification Status (KYC/EARB).
*   **Listings:** Property details, Coordinates (GeoJSON formatted), Cloudinary Image arrays, Price, and Metadata.
*   **Favourites:** Relational document linking User IDs to Listing IDs.
*   **Threads & Messages:** Communication storage grouped logically for optimal retrieval.

Listings offload large binary data storage entirely. They store pre-computed Image URLs directly, facilitating incredibly fast data serialization to the client.

### 7.2 Rationale and Breakdown
A strict relational schema form (like SQL) was deliberately avoided. MongoDB's highly flexible document structures align flawlessly with the often varied and dynamic nature of real estate listings (where properties may possess uniquely nested arrays of non-standard amenities). 
Furthermore, splitting threads and individual messages into distinct collections drastically reduces document bloat and ensures long-running conversations do not inhibit query performance. Auditing features maintain a necessary paper trail for all elevated Admin verification actions.
