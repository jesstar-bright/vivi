# Fertility Tracker Integration & Product Research

**Source:** Gemini deep research conversation
**Date:** 2026-03-18
**Purpose:** Understand the fertility/period tracking market and how Crea could integrate with existing trackers to pull cycle data for hormone-aware workout and nutrition planning.

---

## 1. Top Market Solutions (2026)

| Category | Product | Key Strength |
|----------|---------|-------------|
| Most Popular | **Flo** (420M+ users) | Massive user base, AI-driven cycle predictions |
| Most Trusted | **Clue** | Science-first approach, strict GDPR privacy |
| Best Medical/Paid | **Natural Cycles** | First FDA-cleared app for contraception |
| Best Hormone Data | **Mira Clarity Bundle** ($207) | Quantitative hormone tracking (LH, PdG, E3G) |
| Best Wearable | **Tempdrop 2.0** ($159) | Overnight arm sensor for BBT |
| Best Ease of Use | **Daysy** ($259) | Simple red/green light fertility indicator |
| Best Clinical | **OvuSense** ($99) | Vaginal sensor, 99% ovulation confirmation |

---

## 2. Technical Integration Strategies

### A. Health Aggregator Method (Recommended)

The most efficient path — instead of building individual APIs for every app, use the phone's centralized health database. Most trackers sync to these automatically.

**iOS: Apple HealthKit**

Apps like Clue and Natural Cycles write to HealthKit. Request these Category Type Identifiers:

| Metric | HealthKit Identifier | Possible Values |
|--------|---------------------|----------------|
| Period Days | `HKCategoryTypeIdentifierMenstrualFlow` | Light, Medium, Heavy, Unspecified |
| Spotting | `HKCategoryTypeIdentifierIntermenstrualBleeding` | Boolean |
| Temperature | `HKQuantityTypeIdentifierBasalBodyTemperature` | Numerical (e.g., 36.6°C / 97.9°F) |
| Ovulation Tests | `HKCategoryTypeIdentifierOvulationTestResult` | Negative, Positive, High, Peak |
| Cervical Mucus | `HKCategoryTypeIdentifierCervicalMucusQuality` | Dry, Sticky, Creamy, Watery, Egg white |
| Progesterone | `HKCategoryTypeIdentifierProgesteroneTestResult` | Negative, Positive |

**Android: Google Health Connect**

| Record Type | Data Points |
|------------|-------------|
| `MenstruationPeriodRecord` | Start/end dates of period |
| `MenstruationFlowRecord` | Flow intensity (Light, Medium, Heavy) |
| `OvulationTestRecord` | LH surge results (Positive, Negative, High) |
| `BasalBodyTemperatureRecord` | Daily temperature readings |

### B. Third-Party API Aggregators

| Service | Integration | Notes |
|---------|------------|-------|
| **Terra API** | Clue integration | Receives data via webhooks when user logs new data |
| **Oura Cloud API** | Natural Cycles users | High-resolution temperature and sleep metrics |
| **Heads Up Health** | Mira integration | Clinician dashboard for raw hormone values |

### C. Direct Product Integration

| Product | Best Way to Integrate | Difficulty |
|---------|----------------------|-----------|
| Clue | Apple Health / Google Health Connect | Low |
| Natural Cycles | HealthKit (BBT + Flow) | Medium |
| Flo | Apple Health / Google Health Connect | Low |
| Mira | Partner API / Heads Up Health | High (medical partnership required) |
| OvuSense | OvuSense Pro portal | Medium (physician monitoring) |

---

## 3. Manual Data Sharing & Summaries

| Product | Sharing Method | What is Shared |
|---------|---------------|----------------|
| Clue | Clue Connect | Simplified calendar view for partner |
| Flo | Partner Mode | Daily updates via unique link |
| Natural Cycles | NC° Follow | Fertility status (Green/Red days) |
| OvuSense | OvuSense Pro | 24/7 core temperature charts for doctors |
| Mira | Partner Mode | Real-time hormone concentrations |

### Data Export Options

- **JSON/CSV Export:** Clue and Flo allow users to download raw data. Clue's `measurements.json` is the most developer-friendly.
- **PDF Reports:** Natural Cycles and Mira provide polished "Doctor Reports" designed to be printed or emailed.

---

## 4. Sample Data Structures

### HealthKit Menstrual Flow Entry (JSON)

```json
{
  "type": "HKCategoryTypeIdentifierMenstrualFlow",
  "value": "HKCategoryValueMenstrualFlowHeavy",
  "source": "Clue",
  "startDate": "2026-03-18T08:00:00Z",
  "endDate": "2026-03-18T20:00:00Z",
  "metadata": {
    "HKWasUserEntered": true,
    "IsSpotting": false
  }
}
```

### Basal Body Temperature Entry (JSON)

```json
{
  "type": "HKQuantityTypeIdentifierBasalBodyTemperature",
  "unit": "degC",
  "value": 36.65,
  "source": "Natural Cycles",
  "timestamp": "2026-03-18T06:15:00Z"
}
```

### Mock 3-Month Cycle History (for testing)

```json
[
  {
    "date": "2026-01-01",
    "type": "menstrual_flow",
    "value": "heavy",
    "note": "Cycle Day 1"
  },
  {
    "date": "2026-01-14",
    "type": "ovulation_test",
    "value": "positive",
    "metric": "LH_surge_detected"
  },
  {
    "date": "2026-01-15",
    "type": "basal_body_temp",
    "value": 36.8,
    "unit": "celsius"
  },
  {
    "date": "2026-01-29",
    "type": "menstrual_flow",
    "value": "medium",
    "note": "Cycle Day 1 (Month 2)"
  },
  {
    "date": "2026-02-11",
    "type": "ovulation_test",
    "value": "positive",
    "metric": "LH_surge_detected"
  },
  {
    "date": "2026-02-12",
    "type": "basal_body_temp",
    "value": 36.85,
    "unit": "celsius"
  },
  {
    "date": "2026-02-26",
    "type": "menstrual_flow",
    "value": "medium",
    "note": "Cycle Day 1 (Month 3)"
  }
]
```

---

## 5. Code Implementation

### iOS: Swift (HealthKit)

Add `Privacy - Health Share Usage Description` to `Info.plist`, then:

```swift
import HealthKit

let healthStore = HKHealthStore()

func requestFertilityPermissions() {
    let readTypes: Set<HKObjectType> = [
        HKObjectType.categoryType(forIdentifier: .menstrualFlow)!,
        HKObjectType.quantityType(forIdentifier: .basalBodyTemperature)!,
        HKObjectType.categoryType(forIdentifier: .ovulationTestResult)!
    ]

    healthStore.requestAuthorization(toShare: nil, read: readTypes) { (success, error) in
        if success {
            print("Access granted to fertility metrics.")
        } else {
            print("Authorization failed: \(error?.localizedDescription ?? "Unknown error")")
        }
    }
}
```

### Android: Kotlin (Health Connect)

```kotlin
val healthConnectClient = HealthConnectClient.getOrCreate(context)

suspend fun requestHealthPermissions() {
    val permissions = setOf(
        HealthPermission.getReadPermission(MenstruationPeriodRecord::class),
        HealthPermission.getReadPermission(BasalBodyTemperatureRecord::class)
    )

    val granted = healthConnectClient.permissionController.getGrantedPermissions()
    if (!granted.containsAll(permissions)) {
        healthConnectClient.permissionController.requestPermissions(permissions)
    }
}
```

---

## 6. Privacy & Consent Framework

### Privacy Policy Language (Required)

> **Processing of Sensitive Health Data:**
> We process "Sensitive Health Data" (specifically menstrual cycle, ovulation, and basal body temperature) only with your explicit, affirmative consent.
>
> **Purpose:** This data is used solely to provide personalized wellness insights within our application.
>
> **No Third-Party Sale:** We never sell, rent, or trade your fertility or health data to third-party advertisers or data brokers.
>
> **Encryption:** All health data is encrypted at rest using AES-256 and in transit via TLS 1.3.
>
> **Right to Delete:** You may revoke access to your health data at any time via [Settings > Data Privacy] and request the permanent deletion of all stored health records.

### User Consent UX Flow (Pre-Authorization Screen)

Before triggering the system-level Apple Health or Google Health Connect pop-up, show a custom "value-first" consent screen:

- **Headline:** "Personalize your experience with cycle data."
- **Bullet Points:**
  - We only read your cycle phase to adjust your workouts and nutrition
  - Your data is encrypted and never sold
  - You can disconnect at any time
- **CTA Button:** "Connect Health Data" (triggers system pop-up)
- **Secondary Action:** "Maybe Later"

---

## 7. Developer Tips

- **Timezones:** Always store health data in UTC but display in the user's local timezone
- **Data Deduplication:** If a user syncs with both Natural Cycles and Clue, they may have duplicate "Period Start" entries in HealthKit — check for overlapping dates
- **Missing Data:** Fertility data is often "noisy" (users forget to log days) — handle gaps gracefully in the UI
- **Passive Sync:** Once the user grants permission, fetch updates in the background whenever the user opens your app

---

## 8. Implementation Recommendation for Crea

1. **Start with Apple HealthKit** — most Natural Cycles and Clue users on iPhone already have data syncing there. One query can pull their entire history.
2. **Add Google Health Connect** second for Android coverage.
3. **Use cycle phase data to enhance AI agents:**
   - AI Trainer: adjust workout intensity based on cycle phase (luteal = lower intensity)
   - AI Dietician: adjust macros/cravings support based on hormonal phase
4. **Future:** Partner with Mira for quantitative hormone data if Crea moves into clinical-grade territory.
