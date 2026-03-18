# Direct-to-Device/Cloud Integration Strategy

**Source:** Gemini research conversation
**Date:** 2026-03-18
**Purpose:** Zero-cost strategy for directly integrating health data from the four primary wearable ecosystems without third-party aggregator fees.

---

This document outlines the zero-cost strategy for directly integrating health data from the four primary wearable ecosystems. By building these integrations internally, you avoid recurring 3rd-party "tax" and maintain a direct, high-trust relationship with your users' sensitive data.

---

## Technical Integration Strategy: Direct-to-Device/Cloud
**Prepared for:** CTO and Mobile Engineering Team

### 1. The Strategy: "The HealthKit Bridge"
The most cost-effective way to launch is to prioritize **Apple HealthKit**.
* **The "Secondary Aggregator" Effect:** Many women who use Garmin, Oura, or Whoop already sync that data to Apple Health. By building **one** robust HealthKit integration, you automatically "inherit" data from their other wearables for free.
* **Architecture:** HealthKit is a local on-device database. There is no cloud API. Your mobile app must request permissions locally to read and then "push" that data to your backend.

### 2. Implementation Roadmap by Brand

| Brand | Integration Path | Protocol | Key Data Points for Women's Health |
| :--- | :--- | :--- | :--- |
| **Apple Watch** | HealthKit Framework | Native SDK | `menstrualFlow`, `basalBodyTemperature`, `ovulationTestResult` |
| **Garmin** | Connect Women's Health API | OAuth 2.0 | Cycle schedules, pregnancy tracking, symptom logs |
| **Oura Ring** | Oura API V2 | OAuth 2.0 | `temperature`, `readiness_score`, `sleep_stages` |
| **Whoop** | WHOOP Developer Platform | OAuth 2.0 | `recovery_score`, `strain`, `sleep_performance` |

---

### 3. Engineering "How-To" for Developers

#### **Apple HealthKit (Direct Integration)**
No internet connection is required to fetch this data; it lives on the iPhone.
* **Step 1:** Enable **HealthKit Capability** in Xcode.
* **Step 2:** Request permissions for specific identifiers:
  * `HKCategoryTypeIdentifierMenstrualFlow`
  * `HKQuantityTypeIdentifierBasalBodyTemperature`
* **Step 3:** Use `HKStatisticsQuery` for trends or `HKSampleQuery` for specific log entries.

#### **Garmin Connect (Cloud-to-Cloud)**
You must apply for the **Garmin Connect Developer Program**.
* **The Catch:** Garmin usually requires a brief "Business Review" to grant access to the Women's Health API.
* **Implementation:** Set up a **Webhook Listener**. When a user logs a period in the Garmin app, Garmin's server sends a JSON "Push" to your backend immediately.

#### **Oura & Whoop (Standard Web APIs)**
Both companies use a standard modern API approach.
* **Oura:** Use the **v2/usercollection/daily_readiness** endpoint. This is high-value data for correlating energy levels with cycle phases.
* **Whoop:** Requires your team to have at least one physical Whoop device to access the developer dashboard. Focus on the **Cycle** and **Recovery** endpoints to get the "Physiological Cycle" data.

---

### 4. User Onboarding Flow
To ensure high conversion during onboarding, the UI should guide the user through these three steps:
1.  **Device Selection:** "Which device do you use to track your health?"
2.  **Permission Request:**
    * **iOS:** System-level popup for HealthKit.
    * **Garmin/Oura/Whoop:** A "Sign In" screen that opens a secure Web View for the user to authorize your app.
3.  **Initial Backfill:** Upon first connection, your backend should query the last **60 days of data** to populate the user's health profile instantly.

### 5. Cost & Maintenance Analysis
* **Financial Cost:** **$0** (No per-user fees or monthly subscriptions).
* **Engineering Maintenance:** Your team will need to update the integration if a brand changes its API version (e.g., Oura moving from V2 to V3).
* **Privacy:** Users are more likely to share data when they see it is going directly from their device/account to your app, rather than through an unknown 3rd-party aggregator.

---

### 6. Key Takeaways for Crea

- **Start with HealthKit** — one integration covers Apple Watch + most Garmin/Oura/Whoop users who sync to Apple Health
- **Garmin Connect API** is high priority since Jessica already uses Garmin and we parse Garmin emails today — direct API replaces email parsing
- **Oura API** is valuable because Natural Cycles users (a key competitor audience) often use Oura Ring
- **Zero recurring cost** — all these APIs are free to use, no per-user fees
- **Trust advantage** — direct device-to-app data flow (no middleman) is a selling point for privacy-conscious users
