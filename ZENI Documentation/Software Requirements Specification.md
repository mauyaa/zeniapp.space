# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)



---

## 1. Introduction

### 1.1 Purpose
This document specifies the minimum mandatory requirements for a web and mobile-based Online Real Estate MIS that supports trusted property listing, highly-performant geospatial search, secure access control, real-time user–agent communication, and strict administrative verification and moderation protocols. 

### 1.2 Document Conventions
*   Requirements are written using **“shall”** statements. 
*   Each requirement is uniquely identified (e.g., **REQ-AUTH-01**). 
*   **“User”** refers to a buyer/tenant; **“Agent”** refers to a landlord/estate agent; **“Admin”** refers to a system administrator operating under Zero-Trust constraints. 

### 1.3 Intended Audience and Reading Suggestions
*   **Supervisors/Examiners:** Read Sections 1–2 for scope and context, then Section 3 for functional requirements. 
*   **Developers:** Focus on Sections 3–5 for implementation targets and constraints. 
*   **Testers:** Use Section 3 and Section 5 as a checklist for User Acceptance Testing (UAT) and system verification. 

### 1.4 Project Scope
The system centralizes property discovery and listing management in Kenya, massively reducing fraud and delays caused by informal, fragmented channels (social media, posters). It enables robustly verified listings, secure real-time messaging, and multi-factor admin moderation for drastically improved trust. The application is cross-platform (Web desktop and Native Mobile) and highly low-cost to maintain via serverless and PaaS architecture. 

### 1.5 References
*   Project proposal/slide deck for Online Real Estate MIS (internal). 
*   Lecturer’s SRS template guidelines. 

---

## 2. Overall Description

### 2.1 Product Perspective
The product is a centralized real estate marketplace and MIS, replacing scattered legacy methods (physical posts, informal groups, word-of-mouth) with highly structured digital listings, strictly controlled role access, and continuously moderated verification queues. 

### 2.2 Product Features
**High-level features:** 
*   Account registration/login and JWT session handling.
*   Role-based access control (User/Agent/Admin) with specific step-up MFA for Admins.
*   Property listing CRUD for agents with Cloudinary image array support. 
*   Geospatial map-based search and filtering (location bounds, price range, bedrooms) with API pagination. 
*   Detailed Listing views tailored for conversion. 
*   Favourites / Saved listings relationship mapping. 
*   Real-time (Socket.IO) Messaging / Enquiry threads between users and property agents. 
*   Internal Admin verification queues (KYC/EARB) and moderation of user/listing suspensions. 

### 2.3 User Classes and Characteristics
*   **Guest:** Can freely browse maps, execute searches, and view public listing details. 
*   **Buyer/Tenant (User):** Can create an authenticated account, save properties to favourites, and securely message verified agents. 
*   **Agent/Landlord (Agent):** Must undergo approval to gain elevated rights to create and manage listings, and actively respond to tenant enquiries via their dashboard. 
*   **Administrator (Admin):** Wields system-wide control. Can verify agents/listings and hide/remove suspicious content or suspend rogue accounts. 

### 2.4 Operating Environment
*   Responsive web application operating on modern browsers across desktop and mobile form factors.
*   Native Mobile application wrappers generated via **Ionic Capacitor**.
*   Backend RESTful APIs and WebSockets operating over secure **HTTPS**. 
*   Data persistence via **MongoDB Atlas** (combining standard NoSQL documents and 2dsphere indexes). 
*   Media persistence via Cloud-based image storage (**Cloudinary**) storing strictly optimized URLs. 

### 2.5 Design and Implementation Constraints
*   Must be rigidly implemented utilizing the **MERN** architecture. 
*   Must be deployable on budget-friendly or free-tier hosting (e.g., Render, Koyeb, Vercel). 
*   Must absolutely enforce role separation and the secure cryptographic handling of user credentials (bcrypt hashing). 

### 2.6 User Documentation
*   **Basic User Guide:** Navigation covering Home, Map Search, and Listing detail views. 
*   **Agent Guide:** Workflows for Create/Edit/Deactivate listings, and interpreting the messaging UI. 
*   **Admin Guide:** Documentation on executing Zero-Trust verification of agents and acting upon the moderation queues. 

### 2.7 Assumptions and Dependencies
*   End users and agents possess reliable baseline internet access. 
*   Critical third-party microservices (Cloudinary for media, Google OAuth for identity) remain available with acceptable SLAs. 
*   The MongoDB Atlas cluster remains accessible and securely networked to the production API environments. 

---

## 3. System Features

### 3.1 Authentication & Role Management
#### 3.1.1 Description and Priority
Provides secure cryptographic account access and fundamentally separates executing permissions for Users, Agents, and Admins.
**Priority:** High 

#### 3.1.2 Stimulus/Response Sequences
1.  User opens Register/Login page → system dynamically displays authentication form. 
2.  User submits credentials → system validates payload and authentically resolves identity. 
3.  System mints a JWT session token determining role-based permissions (and challenges for OTP if Admin). 
4.  Unauthorized access attempt → API aggressively denies request (HTTP 401/403) and throws localized error messages. 

#### 3.1.3 Functional Requirements
*   **REQ-AUTH-01:** The system shall allow users to securely register utilizing an email and password. 
*   **REQ-AUTH-02:** The system shall allow users to authenticate login using registered credentials or Google OAuth. 
*   **REQ-AUTH-03:** The system shall maintain authenticated sessions utilizing secure JWT tokenization. 
*   **REQ-AUTH-04:** The system shall rigorously implement Role-Based Access Control enforcing specific rights across roles: user, agent, admin. 
*   **REQ-AUTH-05:** The API layer shall universally restrict protected routes and database actions based strictly on the derived user role. 

### 3.2 User Profile Management
#### 3.2.1 Description and Priority
Allows registered standard users to asynchronously view and actively update their basic profile metadata.
**Priority:** High 

#### 3.2.2 Stimulus/Response Sequences
1.  User opens their profile view → frontend retrieves and heavily caches current profile data. 
2.  User edits string parameters and executes save → API payload validation occurs before updating the MongoDB document. 

#### 3.2.3 Functional Requirements
*   **REQ-PROFILE-01:** The system shall allow successfully authenticated users to view their profile payload. 
*   **REQ-PROFILE-02:** The system shall allow a registered user to mutate basic profile information safely. 

### 3.3 Agent/Landlord Profile Management
#### 3.3.1 Description and Priority
Allows specialized agents to curate their professional public-facing profiles utilized across properties and enquiry threads.
**Priority:** High 

#### 3.3.2 Functional Requirements
*   **REQ-AGENT-01:** The system shall securely allow an agent to view their professional profile structure. 
*   **REQ-AGENT-02:** The system shall allow an agent to update their professional details, provided they conform to verification standards. 

### 3.4 Property Listing Management (Agent/Landlord)
#### 3.4.1 Description and Priority
Empowers active agents to Create, Read, Update, and Delete (CRUD) property listings containing extensive metadata, geographical bounds, and rich media sets.
**Priority:** High 

#### 3.4.2 Functional Requirements
*   **REQ-LIST-01:** The system shall exclusively allow authorized agents to initialize a new property listing. 
*   **REQ-LIST-02:** The system shall enable agents to upload an array of images tightly bonded to a listing (via Cloudinary APIs). 
*   **REQ-LIST-03:** The system shall natively allow an agent to mutate/edit strictly the property listings that they own contextually. 
*   **REQ-LIST-04:** The system shall allow an agent to toggle listing states (e.g., deactivate, archive). 
*   **REQ-LIST-05:** The backend API shall aggressively prevent an agent from modifying listing ID objects that they are not the mathematical owner of. 

### 3.5 Listing Discovery (Search, Filter, View)
#### 3.5.1 Description and Priority
Enables guests and general users to conduct comprehensive searches across property inventories, leveraging precise geospatial data filtering and attribute filtering to return highly specific results.
**Priority:** High 

#### 3.5.2 Functional Requirements
*   **REQ-SEARCH-01:** The system shall universally permit guests and users to query the listings index. 
*   **REQ-SEARCH-02:** The system shall process API filtering arguments based concurrently on location boundaries (Map Box), distinct price ranges, bedroom configurations, and operational types (rent/sale). 
*   **REQ-SEARCH-03:** The system shall respond to listing queries exclusively with structured pagination payload limits to maintain rapid performance. 
*   **REQ-SEARCH-04:** The system shall dynamically construct exhaustive listing detail views upon user request. 

### 3.6 Favourites / Saved Listings
#### 3.6.1 Description and Priority
Permits authenticated users to bookmark complex listings for immediate subsequent access.
**Priority:** High 

#### 3.6.2 Functional Requirements
*   **REQ-FAV-01:** The system shall permit authenticated users to store a referential map to a specific listing entity. 
*   **REQ-FAV-02:** The system shall provide a compiled index of a user's saved listings upon dashboard request. 
*   **REQ-FAV-03:** The system shall support the deletion of specific favorite mapping indices. 

### 3.7 Messaging / Enquiries
#### 3.7.1 Description and Priority
Facilitates direct, bidirectional communication between prospective tenants/buyers and verified selling agents, persisting the dialog within highly structured threads.
**Priority:** High 

#### 3.7.2 Functional Requirements
*   **REQ-MSG-01:** The system shall empower a registered user to securely initialize a communication thread targeting an agent specific to an active listing context. 
*   **REQ-MSG-02:** The system shall persist message sequences within discrete mathematical threads. 
*   **REQ-MSG-03:** The system shall broadcast threads to both participants safely. 
*   **REQ-MSG-04:** The system shall utilize duplex real-time methodologies (Socket.IO) to append ongoing replies within the targeted thread context. 

### 3.8 Admin Verification & Moderation
#### 3.8.1 Description and Priority
Grants hyper-privileged Administrators the operational tooling to scrutinize user operations, manually verify agent KYC documents, and forcibly moderate/suspend toxic system elements to preserve absolute trust.
**Priority:** High 

#### 3.8.2 Functional Requirements
*   **REQ-ADMIN-01:** The system shall generate queued views reflecting agents pending explicit manual verification. 
*   **REQ-ADMIN-02:** The system shall empower administrators to definitively toggle the verification status (`Boolean`) of agent accounts. 
*   **REQ-ADMIN-03:** The system shall generate comprehensive queues reflecting listings earmarked for deep moderation. 
*   **REQ-ADMIN-04:** The system shall structurally allow administrators to enforce "hide" or "delete" functions against any database entity deemed suspicious. 
*   **REQ-ADMIN-05:** Frontends shall conditionally render global trust badges predicated on the verification objects assigned by Admins. 

---

## 4. External Interface Requirements

### 4.1 User Interfaces
*   Responsive React UI structured entirely with Tailwind CSS detailing specific component routes for Exploratory Maps, Search Result Grids, Comprehensive Listing Details, and Secure Authentication forms.
*   **Role Dashboards:** Highly tailored logic for User Dashboard (focusing on active communication threads and favourites), Agent Dashboard (focusing on inventory analytics and active listings), and Admin Dashboard (focusing tightly on platform telemetry and moderation controls). 
*   Standardized UX paradigms regarding error toasting, map panning operations, dropdown filtering, and image-upload pipelines. 

### 4.2 Hardware Interfaces
*   Operates purely in browser or OS sandboxes; no specialized proprietary hardware needed beyond internet-capable smartphones, tablets, or traditional desktop hardware. 

### 4.3 Software Interfaces
*   **MongoDB Atlas Cluster:** Main database interaction via Mongoose Object Data Modeling (ODM). 
*   **Cloudinary APIs:** Exclusively used for robust image uploading, transformation, and rapid CDN delivery to the React frontend. 
*   **Google OAuth2 Providers:** Interfacing securely to generate authentic identities on behalf of users. 

### 4.4 Communications Interfaces
*   **HTTPS (TLS 1.2+):** Exclusive protocol for all client-to-server data manipulation to prevent packet sniffing. 
*   **REST JSON APIs:** For standard CRUD operational requests.
*   **WebSockets (wss://):** Dedicated concurrent connection protocol to satisfy requirements for instantaneous read-receipts and messaging updates without expensive HTTP polling overhead. 

---

## 5. Other Nonfunctional Requirements

### 5.1 Performance Requirements
*   The API explicitly supports strict pagination metadata for listing queries guaranteeing payloads remain structurally small (< 2MB) reducing application latency globally. 
*   MongoDB geospatial `$geoWithin` requests must be backed by specialized `2dsphere` indices. 

### 5.2 Safety Requirements
*   The system actively prevents database injection vectors fundamentally through Mongoose ODM casting. The architecture prevents human safety hazards entirely by digitizing the property communication pipeline. 

### 5.3 Security Requirements
*   The API enforces Role-Based Access Control independently against every protected endpoint definition. 
*   User passwords never persist as plaintext; they are actively hashed via powerful hashing permutations (bcrypt). 
*   Tokens uniquely contain mathematical expiration bounds requiring users to constantly revalidate state over lengthy operations. 

### 5.4 Software Quality Attributes
*   Sentry SDK ensures exhaustive unhandled exception telemetry recording, accelerating the MTTR (Mean Time to Resolution) of production faults. 
*   The API utilizes centralized Error Controllers, resulting in absolute consistency of HTTP Failure Codes/JSON structure returned to the frontend. 

---

## 6. Other Requirements
*   Listings explicitly abstain from hosting heavy binary blob data within MongoDB, heavily relying strictly on pointer URLs targeting edge Cloudinary reservoirs. 
*   Crucial Administrator modifications construct internal Audit Log traces containing an immutable record mapping the acting Admin UUID, the modified target UUID, and detailed event timestamp parameters. 

---

## Appendix A: Glossary
*   **MIS:** Management Information System.
*   **MERN:** MongoDB, Express.js, React, Node.js architectural stack.
*   **RBAC:** Role-Based Access Control.
*   **JWT:** JSON Web Token (RFC 7519 cryptographic token profile).
*   **CRUD:** Create, Read, Update, Delete operational behaviors.
*   **EARB:** Estate Agents Registration Board (Kenya).
*   **KYC:** Know Your Customer protocols.

## Appendix B: Analysis Models
*Refers to independent use case diagrams, architectural entity-relationship diagrams (ERDs), and sequence diagrams located in the formal final thesis documentation submission.*

## Appendix C: Issues List
1.  Formalization of Data Retention Policies for suspended or unverified Agent Accounts.
2.  Legal clarification over the required duration necessary to archive active Administrative Audit Trail Logs.
