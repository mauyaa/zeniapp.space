# Project Proposal: Online Real Estate Management Information System (MIS)



---

## 1. Introduction
* Finding or renting property in Kenya is often slow and risky. People search in many places—WhatsApp, Facebook, roadside posters, and word of mouth. Listings may be outdated or fake, and it is hard to compare options. This project proposes a Management Information System (MIS)—a modern real estate marketplace built with the MERN stack (MongoDB, Express.js, React, Node.js). 
* The system will help users find verified properties faster, allow secure communication with agents, and support admin verification to reduce fraud. The solution is mobile-friendly (powered by Ionic Capacitor) and low-cost to run. 

## 2. Background
* Existing local platforms have gaps: limited filters, weak verification, poor mobile experience, and manual workflows for agents. 
* Full-stack JavaScript (MERN) allows one language across the stack, faster iteration, and a smooth learning curve. The MIS approach ensures structured data capture, controlled access, and reporting for decision making. Emphasizing on practical, secure, and data-driven systems. 

## 3. Problem Statement
* Kenya lacks a simple, trusted, and mobile-friendly real estate MIS where buyers/tenants can quickly find properties that meet budget, location, and needs, while landlords/agents can easily post, update, and track listings and leads under proper verification and moderation. 

## 4. Aims and Objectives

### Main Objective 
* Design and develop a secure, user-friendly real-estate management system that streamlines listing management, property search, and stakeholder communication, with admin verification to increase trust. 

### Specific Objectives 
* **Auth & Roles:** Implement Google OAuth + JWT with Role-Based Access Control (RBAC) (User / Agent / Admin) and Zero-Trust Multi-Factor Authentication (OTP) for elevated admin access.
* **Listings Core:** Build CRUD functionality for properties, image uploading via Cloudinary, and dynamic geospatial map-based search (`$geoWithin`) with extensive filters. 
* **Trust & Safety:** Enforce Admin verification and moderation queues for user KYC and Estate Agents Registration Board (EARB) credentials. 
* **User Interactions:** Establish real-time WebSockets (Socket.IO) agent-tenant messaging and functionality to save/favourite listings. 
* **Evaluation:** Measure system performance, mobile accessibility, and usability; iterate on improvements through Error Tracking (Sentry). 

## 5. Literature Review
* **PropTech Marketplaces (Trust):** Reduce info asymmetry with verified listings and reputation systems (platform trust literature 2021–2024). 
* **Data Quality & Governance:** Enforce accuracy, completeness, timeliness with clear ownership/SLAs and user-facing quality badges (KPMG 2021; ISO 8000-1:2022). 
* **Security & Auth:** OAuth 2.1 (draft 2024) with Authorization Code + PKCE, JWT Access Token Profile (IETF 2021), optional DPoP proof-of-possession (IETF 2023), secure cookies, strict validation, and OWASP API Security Top 10 (2023) rate limiting & hardening. 
* **MERN Performance:** React 18 concurrent/SSR (2022), Node.js LTS 18/20 event-loop best practices (2022–2023), MongoDB 6/7 indexing & TTL (2022–2023), Redis 7 cache-aside (2022). 
* **What this project adds (2021+ aligned):** 
    * **Trust & safety:** ID-verified agents, clear moderation queues. 
    * **Data quality:** Measurable DQ metrics + auto-expire stale listings (2022). 
    * **Security:** OAuth2.1-style flows, JWT profile, DPoP, OWASP API Sec (2023-2024), and Zero-Trust restricted Admin Portal IP allowlisting. 
    * **Performance:** Targeted geospatial indexes + Vercel CDNs for fast search UX (2022-2023). 

## 6. Significance of the Study
* **For Buyers/Tenants:** Faster, safer discovery with verified listings and dynamic map-based filters. 
* **For Landlords/Agents:** Easy posting and updates, lead tracking, and simple platform analytics. 
* **For Academia:** A Kenyan case study in MIS + MERN with security-first design and measurable user impact. 
* **For Industry:** A scalable, low-cost architectural blueprint that can be extended to other regions or property services. 

## 7. Methodology
**Agile methodology** for delivering features in small sprints, enabling fast feedback and low risk. 
* **Frontend:** A responsive, mobile-first UI with modern architectural aesthetics using React + React Router DOM v6, Tailwind CSS, GSAP animations, and Ionic Capacitor for iOS/Android distribution.
* **Backend:** Secure, testable APIs using Node.js + Express.js (REST). 
* **Database:** Flexible storage and fast geospatial location search using MongoDB Atlas + Mongoose.  
* **Auth:** Safe access using JWT + Google OAuth with RBAC (user / agent / admin). 
* **Testing:** Quality assurance through User Acceptance Testing (UAT) and automated Sentry telemetry. 
* **Deployment:** Cloud hosting via Render/Koyeb for Backend APIs, and Vercel for Frontend UI. 

### Research methodology for validating usefulness and usability 
* **Data collection:** Interviews, questionnaires, usability tests. 
* **Sample:** Verified Real Estate Agents; Prospective buyers/tenants. 

## 8. Budget (KES)

| Item | What it covers | Units | Unit Cost | Total |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud hosting** | Render/Koyeb/Vercel free tier + buffer (3 months) | 1 | 3,000 | 3,000 |
| **Domain** | .com or .co.ke (1 year) | 1 | 1,500 | 1,500 |
| **Media storage** | Cloudinary/S3 usage (estimate) | 1 | 2,000 | 2,000 |
| **Hardware/Connectivity** | Laptop, Internet, & Power for research, testing, deployment | 1 | 63,000 | 63,000 |
| **Miscellaneous** | Transport, printing, 10% contingency | 1 | 1,750 | 1,750 |
| **Total** | | | | **71,250** |

## 9. Project Schedule

| Dates | Activities |
| :--- | :--- |
| **20 Oct – 30 Oct 2025** | Gather requirements, define personas and use cases. |
| **31 Oct – 9 Nov 2025** | System design: architecture, ERD/data models. |
| **10 Nov – 20 Nov 2025** | Project setup, backend, Auth (JWT + Google OAuth). |
| **21 Nov – 2 Dec 2025** | Listings CRUD APIs (Mongoose schemas, validation, tests). |
| **9 Jan – 19 Jan 2026** | Frontend: sign-up/in, profile page, image upload flow via Cloudinary. |
| **20 Jan – 31 Jan 2026** | Listing UI (create/update), details page, GSAP image gallery/slider. |
| **1 Feb – 11 Feb 2026** | Map-Based Search & filters (location/price/bedrooms), geospatial indexing; admin verification tools. |
| **12 Feb – March 2026** | Socket.IO messaging integration, bug fixes via Sentry, mobile sync via Capacitor, deployment & submission. |

## 10. References (APA)
* IETF OAuth 2.1 (latest draft). The OAuth 2.1 Authorization Framework. (2024–2025). https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ 
* IETF. RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens. (Oct 2021). https://www.rfc-editor.org/rfc/rfc9068 
* IETF. RFC 9449: OAuth 2.0 Demonstrating Proof-of-Possession (DPoP). (Jan 2023). https://www.rfc-editor.org/rfc/rfc9449 
* OWASP. API Security Top 10 (2023). (Dec 2023). https://owasp.org/API-Security/ 
* ISO. ISO 8000-1:2022 — Data quality — Part 1: Overview. (2022). (ISO catalog page — paywalled) https://www.iso.org/standard/81107.html 
* Office of the Data Protection Commissioner (Kenya). Data Protection (General) Regulations, 2021 (LN 263 of 2021; in force Jan 14, 2022). https://www.odpc.go.ke/ (see “Legal & Regulatory” → Regulations) 
* MongoDB Docs. 2dsphere / Geospatial Indexes (current docs, v7+). (2023–2025). https://www.mongodb.com/docs/manual/core/2dsphere/
