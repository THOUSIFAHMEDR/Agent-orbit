# 🛰️ AGENT_ORBIT_V1

> A tactical, space-themed trajectory planning and task monitoring console — featuring an interactive Canvas particle field and a defensive multi-model API rotation system.

🔗 **Live App:** `<ADD DEPLOYED GOOGLE CLOUD URL HERE>`
📂 **Repository:** `https://github.com/THOUSIFAHMEDR/Agent-orbit`

---

## 🧩 Problem Statement

Traditional productivity planners are passive. They require constant manual upkeep, give no real-time guidance, and offer zero assistance the moment a task becomes blocked — leaving the user to manually re-plan, re-prioritize, and chase follow-ups on their own.

---

## 💡 Solution Overview

**AGENT_ORBIT_V1** turns task management into an active, defensive, cooperative loop instead of a static checklist. The user states an objective (by voice or text), and the system decomposes it into a live, time-blocked trajectory. If any step gets blocked, the agent automatically recalculates the path forward, preserves everything already completed, and drafts the escalation communication needed to clear the blocker — all surfaced inside a responsive, Vercel-style command console.

---

## ✨ Key Features

- **Vocal Perception** — Captures and parses spoken objectives using the browser's native Web Speech API.
- **Dynamic Trajectory Mapping** — Decomposes a goal into sequential, time-blocked trajectory nodes using the Gemini API.
- **Defensive Anomaly Mitigation** — When a node is marked "Stuck," the agent calculates a local detour, updates only the future timeline (past progress is never erased), and drafts a ready-to-send escalation email.
- **Resilient Multi-Endpoint Rotation** — If the Gemini API returns a 503 (traffic spike) or 429 (quota limit), requests automatically reroute across alternate endpoints, or fall back to a local heuristic layout, so the console never crashes.
- **Live Telemetry Visualization** — A custom Canvas particle field reacts to project state in real time (cyan = active, red = stuck, green = complete).
- **Exportable Mission Log** — On completion, the full session history can be downloaded as `Orbit_Telemetry.txt`.

---

## 🛠️ Technologies Used

| Category | Technology |
|---|---|
| Core Framework | React 18+ (Vite) |
| Styling | Tailwind CSS v4 (glassmorphism, `@theme` syntax) |
| Voice Input | Web Speech API |
| Background Engine | Custom HTML5 Canvas 2D particle system |
| Icons | Lucide React |
| Deployment | Google Cloud |

---

## ☁️ Google Technologies Utilized

- **Gemini API** — Powers trajectory mapping (decomposing objectives into time-blocked nodes) and anomaly mitigation (recalculating paths and drafting escalation emails), orchestrated via the `@google/generative-ai` SDK.
- **Google Cloud** — Hosts the deployed, publicly accessible production build of the application.

---

## 🏗️ Architecture

### The Visual "Layer Cake"

| Layer | Component | Purpose |
|---|---|---|
| 0 — Background | `Antigravity.jsx` | Floating, rotating capsule elements that accelerate and shift color with project telemetry |
| 1 — Overlay | `.scifi-grid` + scanline filter | Coordinate-grid and CRT-style atmosphere |
| 2 — Mockup Chrome | `ScaledDashboard.jsx` | Scales the console interface down cleanly on smaller viewports |
| 3 — Bento Console | Main UI | Three-column layout: control panel, tactical timeline, real-time brain-logs terminal |

### Core Agentic Loop

```
[User Input / Voice]
        │
        ▼
[Trajectory Mapping] ──► Generates nodes with time blocks
        │
        ├─► [Mark Done]      ──► Node cleared
        │
        └─► [Stuck / Anomaly] ──► UI turns red, path recalculated
                    │
                    ▼
            [Drafts Email Payload] ──► Copy & open mail client
```

---

## 📋 Demo Script

Run through this scenario to show off the full system in under two minutes:

1. **Objective Input** — Click the microphone icon on the input pill and say:
   > "Establish active telemetry uplink with Low-Earth Orbit (LEO) weather satellite and sync coordinate database."

2. **Trajectory Deployment** — Press **Enter**. Watch the **Neural Brain Logs** stream live as the planner builds the timeline.

3. **Dynamic Recalibration** — Click **"Stuck"** on Node 02 and observe:
   - The particle field shifts to **Alert Amber** and accelerates.
   - An **Intervention Draft** is generated — copy it or open it directly in your mail client.
   - Node 01 (completed) stays untouched while the remaining nodes update around the blockage.

4. **Mission Accomplished** — Clear the remaining nodes to trigger the green **"MISSION SECURED"** panel, then download the full session log as `Orbit_Telemetry.txt`.

---

## ⚡ Local Setup

**1. Install dependencies**

From inside the `agent-planner` directory:

```bash
npm install
```

**2. Add your Gemini API key**

In `src/gemini.js`:

```javascript
const API_KEY = "YOUR_API_KEY_HERE";
```

**3. Run the dev server**

```bash
npm run dev
```

**4. Build the production bundle**

```bash
npm run build
npx vite preview
```

---

## ☁️ Deploying to Google Cloud

This project is deployed via **Google AI Studio's Cloud deployment flow** (Cloud Run under the hood):

1. Push the project to a GitHub repository.
2. In [Google AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-deploying), select **Deploy** and connect the repository.
3. Set the `API_KEY` environment variable in the deployment configuration (do not commit it to the repo).
4. Deploy — AI Studio builds the app and provisions a Cloud Run service with a public URL.
5. Confirm the URL loads correctly, then add it to the **Live App** link at the top of this README.

> Full reference: https://ai.google.dev/gemini-api/docs/aistudio-deploying

---

<p align="center"><i>Built for Google Cloud deployment.</i></p>
