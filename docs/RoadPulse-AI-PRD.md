# RoadPulse AI — Product Requirements Document

**Team:** The Cartel (IS2603) · **Event:** Idea Sprint — National Level Inter-University Innovation Challenge
**Domain:** Artificial Intelligence & Machine Learning
**Status:** Draft for prototype build

---

## 1. Problem

Potholes and road deterioration cause accidents and congestion, but municipal road inspection today is manual, slow, and reactive — issues surface only after a complaint or an accident. There is no low-cost system for continuous monitoring of road condition at city scale.

## 2. Solution summary

RoadPulse AI turns existing electric-bus dashcams into a passive, continuous road-condition sensor network. No new hardware is installed. Footage already being recorded is periodically uploaded, processed for potholes, deduplicated, scored for risk, and turned into an interactive map and a weekly accountability report — shifting road maintenance from reactive to proactive.

## 3. Users

| User | Need |
|---|---|
| Municipal / highway authority (NHAI, JMC, PWD, JDA) | See which road segments need repair, in priority order, with proof |
| Civic body / ward officer | Know which segments are assigned to their ward and their repair status |
| Commuters / citizens | See current road risk on a map before choosing a route |
| Hackathon judges (prototype context) | See a believable, working demo of the above |

## 4. Data ingestion pipeline

1. **Capture** — NVR dashcams already installed in electric city buses record continuously to local on-device storage.
2. **Sync** — When a bus returns to one of the city's 1–2 designated charging stations and begins charging, the camera connects to the station's network and uploads the front dashcam feed to the server. (This makes the system **near-real-time**, refreshed on a daily/charging cycle — not live-streaming.)
3. **Detection** — The server runs a lightweight YOLO model on uploaded footage to detect potholes. Timestamp and GPS (lat/long) are read from metadata already embedded in the video by the camera at capture time.
4. **Deduplication** — The same pothole detected by multiple buses on the same road is merged using **DBSCAN spatial clustering**, with a confidence score per merged detection.
5. **Scoring** — Each road segment gets a computed risk score and letter grade (see §6).
6. **Output** — Data is published to an interactive map and rolled into a weekly report, exportable as CSV and PDF.
7. **Accountability loop** — When a segment crosses a risk threshold, the responsible authority is notified. The system tracks whether repair happens within an expected window, and verifies it against before/after evidence.

## 5. Road segmentation

Roads are not tracked as single objects. Each road is split into fixed-length **segments** (e.g. 100–200 m, defined by GPS range) so that condition can vary along a road — e.g. point A→B may be in poor condition while B→C is fine. The segment is the atomic unit that all data attaches to: detections, risk score, grade, authority owner, and weekly history.

## 6. Risk & grading system

Each segment gets a **0–100 risk score**, computed from:

| Factor | Description | Effect |
|---|---|---|
| Density | Potholes per 100 m | Raises score |
| Severity | Avg. severity rating per detected pothole | Raises score |
| Depth | Estimated depth per pothole | Multiplier — a few deep potholes should outweigh many shallow ones |
| Trend | Week-over-week growth rate | Amplifies score if worsening |
| Weather | Recent rainfall | Contextual modifier, since rain accelerates deterioration |

Scores are bucketed into grades for map color-coding:

| Grade | Score range | Color | Meaning |
|---|---|---|---|
| A | 0–25 | Green | Good condition |
| B | 26–45 | Light green | Minor wear |
| C | 46–65 | Amber | Moderate risk |
| D | 66–85 | Orange | High risk |
| F | 86–100 | Red | Severe / accident risk |

**Depth estimation note:** a single dashcam cannot measure true depth. The prototype should use a proxy (shadow-based heuristic or a monocular depth-estimation model such as MiDaS) and label it explicitly as an *estimated* depth score rather than a measured one.

## 7. Feature list

### Must-have for the prototype
- **Interactive map** — segments color-coded by current risk grade.
- **Weekly cycle view** — switch between weeks to see how each segment's condition changed.
- **Road segment history / timeline** — click a segment, see its pothole count, risk score, grade, and status for every scanned week.
- **Video ingestion status** — which bus uploaded footage, which files are processing, which failed.
- **Duplicate detection** — DBSCAN clustering merges detections of the same pothole from multiple buses into one road issue.
- **Evidence per pothole** — a frame image or short clip, confidence score, timestamp, GPS.
- **Authority mapping** — each segment mapped to its responsible authority/ward/department.
- **Weekly report export** — CSV and PDF, showing road condition and week-over-week change.
- **Repair accountability tracking** — flag segments where risk has been rising for multiple weeks, mark when a report was auto-sent, and flag if the authority has not acted within an expected window.
- **Repair verification** — before/after evidence comparison, not just a drop in detection count (a drop can also mean the bus route changed or the camera failed).
- **Historical playback** — see how the whole city's condition changed week by week.
- **Automatic upload retry** — when a bus's network connectivity fails at the charging station, retry rather than losing the batch.
- **Weather correlation** — rainfall shown alongside deterioration to explain spikes.
- **Last-survey log** — for any segment, show when it was last scanned and its condition history, so a gap in coverage isn't mistaken for a good road.
- **Road lifecycle data store** — persist the *data* (not raw video) for every scanned segment indefinitely, so history survives even after footage is discarded.

### Recommended additions (not yet scoped by the team)
- **SLA / escalation timer** — assign each authority an expected repair window (e.g. 21 days); auto-flag segments that breach it. This is what actually proves neglect, rather than eyeballing weekly reports.
- **Low-confidence review queue** — a lightweight human-verification step for borderline detections (shadows, manholes, tar patches can trigger false positives).
- **Coverage / blind-spot map** — show which segments have no recent bus traffic, so "no potholes shown" isn't misread as "road is fine."
- **Privacy handling** — dashcam footage on public roads captures faces and license plates; at minimum, plan for a blur pass before storage/display.
- **Repair-priority / cost view** — rank segments by safety impact per unit of repair cost, separate from raw danger score, to help authorities budget.
- **Push/email alert on threshold breach** — don't rely solely on the weekly report cadence for urgent cases.
- **Public vs. authority view** — a simplified citizen-facing map versus a detailed operations view for authorities.
- **Navigation API export** — expose risk data so third-party map/navigation apps could route around severe segments.

## 8. Non-functional requirements

- System should tolerate delayed/batched data (charging-station sync model), not assume continuous connectivity.
- Detection pipeline should run on modest server hardware (lightweight YOLO variant, not a heavy model) since this is a bus-fleet-scale, cost-conscious deployment.
- Data (structured detections/scores) must be retained independently of raw video, which can be purged after processing to save storage.

## 9. Out of scope (for prototype)

- Physical camera installation or hardware integration — assumes NVR dashcams already exist.
- True laser/LiDAR depth measurement.
- Full production-grade authentication/permissions system (a simple role split — citizen vs. authority — is enough for the demo).

## 10. Success metrics (for pitch)

- Road segments continuously monitored without new hardware cost.
- Median time from pothole appearance to authority notification.
- % of reported segments repaired within SLA window, verified by before/after evidence.
- Reduction in average city-wide risk score over successive weekly cycles (demo can simulate this with the sample data).

## 11. References

- RDD2022 road-damage dataset (pothole class D40)
- NHAI — National Highways Authority of India
- PostGIS — for storing and querying segment geometry
- DBSCAN (Ester et al., 1996) — spatial clustering for deduplication
- YOLO (Redmon et al., 2016) — real-time object detection
