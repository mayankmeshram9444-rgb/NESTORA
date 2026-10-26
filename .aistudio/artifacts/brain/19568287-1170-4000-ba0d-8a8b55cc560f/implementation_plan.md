# Nestora — Dual-Portal PG Resident & Owner Management & Settlement Platform

Transform Nestora into a dual-role platform connecting **PG Residents** and **PG Owners** under a unified, real-time state. Residents log in with their email/phone and PG room code to inspect deposit deductions, upload move-in/move-out photos, submit manual UPI/Bank UTR payment references, and download official settlement receipts; PG Owners manage rooms, track monthly rent, post itemized deposit deductions, and verify resident UTR transactions.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices incorporate your confirmed preferences:

- **Confirmed Login & Property Lookup**: Email or mobile phone login paired with a **PG Property & Room Code Lookup** (e.g., `OLIVE-402`, `STANZA-204`), plus one-click role switchers and quick-fill demo credentials so you can test both the **PG Resident** and **PG Owner** views effortlessly.
- **Confirmed PG Owner Portal**: Full PG property management including a multi-room occupancy directory, monthly rent status tracking, itemized deposit deduction posting, move-in/move-out photo review, and one-click UTR verification.
- **Confirmed Settlement & Receipt Workflow**: Manual 12-digit UPI/NEFT **UTR Transaction Entry** submitted by the resident and verified by the PG Owner to unlock an official, printable **PG Payment & No-Dues Settlement Receipt**.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges the transparency gap between PG residents and PG property owners. Both parties access a shared tenancy record tied to a specific PG property and room number. Owners manage rooms, rent collection, and checkout deductions, while residents review deductions, upload room condition photos, submit UTR payment proofs, and obtain verified receipts.
- **Target Audience / Persona**:
  - **PG Residents (Students & Working Professionals)**: Need clarity on which PG and room they are registered under, why money is being deducted from their deposit, how to pay agreed dues or claim refunds via UTR, and how to get an official receipt.
  - **PG Owners & Wardens**: Need a clean console to manage multiple rooms, track monthly rent, record sub-meter electricity readings, post transparent deposit deductions, and verify UTR payments before issuing clearance receipts.
- **Key Value**: Eliminates chaotic WhatsApp arguments at move-out by giving both resident and owner a single source of truth for room condition photos, itemized deductions, UTR payment verification, and instant receipt generation.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Login & PG Room Lookup Flow**:
     - User selects their role (**PG Resident** or **PG Owner / Warden**).
     - Enters their **Email or Mobile Number**, selects their **PG Property** (e.g., *Olive Co-Living & Luxury PG*, *Stanza Living Orchid House*, or registers a new PG), and enters their **Room Code** (e.g., `OLIVE-402`).
     - Quick-login preset cards allow instant one-click sign-in as either the Resident or Owner of the same room to test two-way synchronization immediately.
  2. **PG Owner Portal Flow**:
     - **PG Rooms & Rent Directory**: View all rooms in the PG, resident details, sharing type, monthly rent status (*Paid*, *Due*, *Pending UTR*), and security deposit balance. Owners can add new rooms or toggle rent status.
     - **Post & Manage Deductions**: Select a resident's room to add or update deposit deductions (e.g., Sub-Meter Electricity kWh, Cleaning, Painting, Rent Arrears) with explanations.
     - **Verify Resident UTR & Issue Receipt**: Review pending UTR transaction submissions from residents, verify the 12-digit UTR code, and click **"Approve UTR & Issue Official Receipt"**.
     - **Inspect Room Photos**: View side-by-side Move-In and Move-Out photos uploaded by the resident.
  3. **PG Resident Portal Flow**:
     - **Active PG & Room Banner**: Top bar and overview clearly display the resident's active PG name, room number, sharing type, landlord contact, and current settlement status.
     - **Deposit & Deductions Breakdown**: See every deduction added by the PG Owner in plain language, agree to valid charges (like electricity sub-meter units), or flag unfair deductions using photo proof.
     - **Pay & Submit UTR Reference**: In the **Deposit & Payment Receipt** tab, residents view the net payable utility/deduction amount or net deposit refund, pay via UPI/Bank transfer, and submit their **12-digit UTR Number**, date, and payment app (GPay, PhonePe, Paytm, NEFT).
     - **Download Official Receipt**: Once the UTR is recorded and verified by the Owner, the resident unlocks a formal **PG Deposit Settlement & No-Dues Receipt** with printable/downloadable formatting.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Clean, high-trust utilitarian SaaS workspace with clear role differentiation (**Emerald (`#059669`)** accent for PG Resident portal; **Indigo/Slate (`#0F172A` / `#4F46E5`)** executive accent for PG Owner portal).
  - *Color Palette & Mood*: Crisp `#F8FAFC` neutral canvas, `#FFFFFF` structural cards with `1px solid #E2E8F0` hairline borders, semantic status badges (`#16A34A` Verified/Paid, `#D97706` Pending UTR Verification, `#DC2626` Disputed/Overdue).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for crisp headers and approachable UI labels, paired with `JetBrains Mono` (`tabular-nums`) for all ₹ currency figures, UTR reference numbers, room codes, and sub-meter kWh readings.
  - *Component Styling & Layout*: 1440px desktop layout with a clean 3-zone top bar (Brand + Active PG/Role indicator + Role Switch/Logout CTA), streamlined sidebar navigation, and single-elevation cards.

- **Interactive Feedback & Motion**:
  - Instant role-switching banner at the top so the user can post a deduction or verify a UTR as the **PG Owner** and immediately switch to the **PG Resident** view to see the live update and download the receipt.
  - Toast notifications confirming UTR submission, owner verification, photo uploads, and receipt downloads.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Shared Real-Time State with Instant Role Switcher**
  - *Chosen Approach*: Both the PG Resident and PG Owner portals read and mutate the same synchronized PG property & room store in `localStorage` (backed by the server export endpoint). In addition to the dedicated Login Page, a quick **"Switch View: Resident ↔ Owner"** control in the header lets you test both sides of a transaction without re-typing credentials.
  - *Why*: Makes testing two-party workflows (Owner posts deduction → Resident submits UTR → Owner verifies UTR → Resident downloads receipt) seamless in a single browser session.
- **Decision 2: Manual UTR Verification Workflow & Official Receipt Generator**
  - *Chosen Approach*: Residents submit a 12-digit UTR number with amount and payment method, creating a `PaymentTransaction` with status `pending_verification`. The PG Owner dashboard highlights pending UTRs for one-click approval (`verified`), which stamps the official receipt with a verification hash and timestamp.
  - *Why*: Matches real-world Indian PG operations where residents pay via UPI (GPay/PhonePe) and share UTR numbers with the PG owner/warden for verification.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     Authentication & PG Lookup Gate                        │
│   [Role: PG Resident | PG Owner] + [Email/Phone] + [PG Name & Room Code]   │
└───────────────────┬────────────────────────────────────┬───────────────────┘
                    │                                    │
                    ▼                                    ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────┐
│          PG RESIDENT PORTAL          │  │         PG OWNER PORTAL          │
├──────────────────────────────────────┤  ├──────────────────────────────────┤
│ 1. My PG & Deposit Overview          │  │ 1. All PG Rooms & Rent Tracker   │
│ 2. Move-In / Move-Out Photo Upload   │  │ 2. Post & Edit Room Deductions   │
│ 3. Deductions & Pay via UTR          │  │ 3. Verify Resident UTR Payments  │
│ 4. Official Receipt & No-Dues Cert   │  │ 4. Review Resident Room Photos   │
│ 5. AI Agreement & Notice Helper      │  │ 5. Issue Clearance Receipts      │
└───────────────────┬──────────────────┘  └──────────────┬───────────────────┘
                    │                                    │
                    └───────────────┬────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               Unified PG Tenancy, Payment & Receipt Store                  │
│   • PgCase[] (PG Name, Room Code, Rent Status, Deposit, Deductions)        │
│   • PaymentReceipt[] (UTR Number, Amount, Method, Status: Pending/Verified)│
│   • RoomComparison[] (Move-In / Move-Out Base64 Photos & Notes)            │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `UserSession`: `{ role: 'resident' | 'owner', identifier: string, pgName: string, roomCode: string, activeCaseId: string }`
  - `PaymentTransaction`: `{ id: string, receiptNo: string, utrNumber: string, amount: number, paymentType: 'deduction_settlement' | 'monthly_rent' | 'deposit_refund', paymentMethod: 'UPI / GPay' | 'PhonePe' | 'Paytm' | 'Bank NEFT', date: string, status: 'pending_verification' | 'verified' | 'rejected', submittedBy: string, verifiedBy?: string, verifiedAt?: string, notes: string }`
  - Extended `PgCase`: Includes `roomCode` (e.g., `OLIVE-402`), `rentStatus` (`'Paid' | 'Pending' | 'Overdue'`), and `payments: PaymentTransaction[]`.

- **Interactive Component & State Mapping**:
  - **Login & PG Selector View**: Validates email/phone and room code against existing PG rooms or creates a new room entry; persists session and routes to either the Resident Portal or Owner Portal.
  - **Resident UTR Payment & Receipt View**: Calculates agreed deductions and payable/refundable balance; validates 12-digit UTR input; appends a `pending_verification` transaction to `activeCase.payments`; renders a printable/downloadable receipt card once verified.
  - **Owner Management Console**: Lists all PG rooms with live filters; provides a modal/form to append `DeductionItem` entries to any room; displays a prominent queue of `pending_verification` UTR submissions with **"Approve & Issue Receipt"** and **"Reject"** handlers that immediately update the resident's receipt status.
