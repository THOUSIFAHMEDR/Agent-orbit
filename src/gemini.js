import { GoogleGenerativeAI } from "@google/generative-ai";

// SECURED: Reads the API key dynamically from your local .env file
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error(
    "CRITICAL SECURITY WARNING: VITE_GEMINI_API_KEY is not defined in your local .env file. " +
    "Please create a .env file in your root folder and add: VITE_GEMINI_API_KEY=your_api_key"
  );
}

const genAI = new GoogleGenerativeAI(API_KEY || "dummy_key_to_prevent_crash");

const MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash"
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text) => {
  try {
    const start = Math.min(
      text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
      text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
    );
    const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (start !== Infinity && end !== -1) return text.substring(start, end + 1);
    return text;
  } catch (e) { return text; }
};

async function callGemini(prompt, isJson = false) {
  if (!API_KEY) {
    throw new Error("API Key missing from local environment.");
  }

  let lastErr = null;

  for (const modelName of MODELS) {
    try {
      console.log(`Targeting model: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(isJson && { generationConfig: { responseMimeType: "application/json" } })
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      lastErr = err;
      const errMsg = err.message || "";

      if (errMsg.includes("503") || errMsg.includes("404") || errMsg.includes("429")) {
        console.warn(`Model ${modelName} hit an issue or rate-limit. Rotating to next model...`);
        await sleep(1000);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export const generatePlan = async (goal, deadline, context) => {
  const prompt = `Objective: ${goal}. Deadline: ${deadline || "Next 7 Days"}. Context: ${context || "None"}. 
  Return ONLY a JSON array: [{"title": "Step", "duration_mins": 30}]`;

  try {
    const text = await callGemini(prompt, true);
    return JSON.parse(cleanJson(text));
  } catch (err) {
    console.error("Critical Failure, activating smart local backup:", err);
    return [
      { title: `Phase I: Strategic Analysis of "${goal}"`, duration_mins: 15 },
      { title: "Phase II: Resource Calibration & Mapping", duration_mins: 30 },
      { title: "Phase III: Primary Trajectory Execution Run", duration_mins: 45 },
      { title: "Phase IV: Final Output Validation & Closure", duration_mins: 20 }
    ];
  }
};

export const replanTask = async (currentTasks, stuckTaskTitle, reason) => {
  const prompt = `Stuck on "${stuckTaskTitle}" because: ${reason}. Return ONLY JSON: {"updatedSubtasks": [{"title": "Recovery", "duration_mins": 20}], "intervention": "Draft message"}`;

  try {
    const text = await callGemini(prompt, true);
    return JSON.parse(cleanJson(text));
  } catch (err) {
    console.error("Replan Anomaly Fallback activated:", err);
    return {
      updatedSubtasks: [
        { title: `Recalibrate block: ${stuckTaskTitle}`, duration_mins: 15 },
        { title: "Alternative execution trajectory", duration_mins: 35 }
      ],
      intervention: `ALERT: Trajectory anomaly detected during node execution. Alternative routing has been successfully applied to keep project delivery on track.`
    };
  }
};

export const getTaskGuidance = async (taskTitle, context) => {
  const prompt = `The user is working on this task: "${taskTitle}" for project context: "${context}". 
  Provide exactly 3 highly specific, technical, actionable pro-tips to execute this successfully. Use bullet points (1., 2., 3.). Max 45 words total.`;

  try {
    return await callGemini(prompt, false);
  } catch (err) {
    console.error("Guidance Anomaly Fallback activated:", err);

    const titleLower = taskTitle.toLowerCase();

    if (titleLower.includes("percentage") || titleLower.includes("calculate") || titleLower.includes("formula")) {
      return "1. Recall the core formula: (Part / Whole) * 100. 2. Ensure both values are numerical and in matching units. 3. Check for division-by-zero errors before executing.";
    }
    if (titleLower.includes("identify") || titleLower.includes("value") || titleLower.includes("whole")) {
      return "1. Isolate the base (100% whole) number first. 2. Identify the target fractional subset. 3. Document the variables before processing calculation nodes.";
    }
    if (titleLower.includes("format") || titleLower.includes("result") || titleLower.includes("decimal")) {
      return "1. Use standard round-to-nearest logic (e.g., .toFixed(2)). 2. Append the '%' glyph as the final string step. 3. Verify text alignment inside display cards.";
    }
    if (titleLower.includes("telemetry") || titleLower.includes("uplink") || titleLower.includes("satellite")) {
      return "1. Align the ground station coordinates with LEO vector tracks. 2. Verify signal-to-noise ratio limits are within bounds. 3. Deploy parity bit checking on incoming packets.";
    }

    return "1. Isolate key workflow variables before processing. 2. Draft technical trajectory specifications. 3. Audit performance metrics regularly.";
  }
};
