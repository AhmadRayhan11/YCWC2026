/**
 * ═══════════════════════════════════════════════════════════════
 * Module 1: Text-Based Health Classification & Disease Detection
 * ═══════════════════════════════════════════════════════════════
 * 
 * This module performs NLP-based health analysis using a Logistic Regression
 * model exported from scikit-learn. It implements:
 * 
 * 1. TF-IDF vectorization with L2 normalization
 * 2. Multinomial classification for urgency level (3 classes)
 * 3. Multinomial classification for disease category (8 classes)
 * 4. Softmax probability output for confidence scoring
 * 5. Vital sign integration for multimodal analysis
 * 
 * The model weights are loaded from model/model.json and inference
 * runs entirely in the browser (client-side).
 */

let modelData = null;

/**
 * Load the pre-trained model weights from model.json
 * Updates the splash screen progress during loading
 */
async function loadModel() {
    try {
        const response = await fetch('model/model.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        modelData = await response.json();
        console.log("[ML] Model loaded successfully:", {
            vocabSize: Object.keys(modelData.vocabulary).length,
            urgencyClasses: modelData.urgency_classes.length,
            diseaseClasses: modelData.disease_classes.length
        });
        return true;
    } catch (e) {
        console.error("[ML] Failed to load model:", e);
        return false;
    }
}

/**
 * Simple tokenizer — lowercase, remove punctuation, split by whitespace
 * @param {string} text - Input text
 * @returns {string[]} Array of tokens
 */
function tokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
}

/**
 * Predict class using Logistic Regression with Softmax
 * Returns both the predicted class index AND the probability array
 * 
 * @param {number[]} tfidfVector - TF-IDF feature vector
 * @param {number[][]} coef - Model coefficient matrix
 * @param {number[]} intercept - Model intercept vector
 * @param {number} n_classes - Number of output classes
 * @returns {{classIdx: number, probs: number[]}} Predicted class and probabilities
 */
function predictClassWithProbs(tfidfVector, coef, intercept, n_classes) {
    // Compute raw logits: z = X·W^T + b
    const logits = new Array(n_classes).fill(0);
    for (let c = 0; c < n_classes; c++) {
        logits[c] = intercept[c];
        for (let f = 0; f < tfidfVector.length; f++) {
            logits[c] += coef[c][f] * tfidfVector[f];
        }
    }

    // Numerically stable softmax: subtract max logit to prevent overflow
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(e => e / sumExps);

    // Find argmax
    let bestClassIdx = 0;
    let maxProb = 0;
    for (let c = 0; c < n_classes; c++) {
        if (probs[c] > maxProb) {
            maxProb = probs[c];
            bestClassIdx = c;
        }
    }

    return { classIdx: bestClassIdx, probs };
}

/**
 * Disease recommendation map with clinical guidance
 * Each entry contains: English title, description, and actionable steps
 */
const recommendationsMap = {
    0: {
        title: "Stable / Normal Condition",
        desc: "No acute disease indication or emergency symptoms detected from the entered notes.",
        action: "Maintain a healthy lifestyle: ensure adequate water intake (1.5–2 L/day), good sleep quality, and timely medication adherence."
    },
    1: {
        title: "Physical Trauma / Injury Indication",
        desc: "Potential physical injury detected — bruising, fall, impact, or laceration on the body.",
        action: "⚠️ **Action:** Rest the injured area. Apply pressure if bleeding. If head impact, loss of consciousness, or suspected fracture — seek immediate medical attention."
    },
    2: {
        title: "Cardiovascular / Heart & Blood Issue",
        desc: "Symptoms of circulatory or cardiac distress detected (e.g., chest pain, neck tension, palpitations, fainting).",
        action: "🚨 **EMERGENCY:** Position the patient seated upright (45°). Loosen tight clothing. If severe chest pain radiating to arm or fainting — **CALL EMERGENCY SERVICES IMMEDIATELY (119/911)**."
    },
    3: {
        title: "Respiratory Issue (Breathing Problem)",
        desc: "Lung/breathing disturbance detected (e.g., shortness of breath, severe cough, chest tightness, wheezing).",
        action: "🫁 **Action:** Position the patient sitting upright (45-90°) to open airways. Remove from smoke/dust. If respiratory rate > 20/min or lips appear blue — provide supplemental oxygen immediately."
    },
    4: {
        title: "Gastrointestinal Disorder (Digestive Issue)",
        desc: "Digestive system problem detected (e.g., nausea, vomiting, diarrhea, stomach cramps, acid reflux).",
        action: "🤢 **Action:** Give small sips of warm water/ORS to prevent dehydration. Avoid spicy/acidic foods. If vomiting or diarrhea exceeds 4x/day — consult a clinic."
    },
    5: {
        title: "Infection / Fever (Pyrexia)",
        desc: "Inflammatory or infectious response detected (e.g., high fever, chills, sore throat, infected wound).",
        action: "🌡️ **Action:** Apply warm compress on armpits & neck. Increase warm fluid intake. Administer fever-reducing medication (Paracetamol) per dosage instructions."
    },
    6: {
        title: "Neurological Disorder (Nervous System Issue)",
        desc: "Central nervous system symptoms detected (e.g., sudden slurred speech, facial drooping, seizure, disorientation).",
        action: "🧠 **EMERGENCY (Stroke/Neuro):** Turn patient on their side if vomiting to prevent aspiration. Secure from sharp objects. **RUSH TO HOSPITAL IMMEDIATELY**."
    },
    7: {
        title: "Musculoskeletal Issue (Muscle & Joint Problem)",
        desc: "Movement system complaint detected (e.g., knee joint pain, muscle cramps, stiff back, gout).",
        action: "🦴 **Action:** Apply warm compress to stiff muscles/joints. Assist with gentle stretching. Rest from strenuous activity."
    }
};

/**
 * Main analysis function — performs multimodal health classification
 * Combines text NLP classification with vital sign data
 * 
 * @param {string} text - Free-form health description text
 * @param {number|null} hr - Heart rate from scanner (optional)
 * @param {number|null} rr - Respiratory rate from scanner (optional)
 * @returns {Object} Analysis result with urgency, disease, recommendation, and confidence
 */
function analyzeHealthLog(text, hr = null, rr = null) {
    if (!modelData) {
        return {
            urgencyLevel: "Error",
            urgencyCss: "badge-high",
            disease: "Model not loaded",
            recommendation: "Failed to connect to ML model. Please refresh the page.",
            confidence: 0
        };
    }

    const tokens = tokenize(text);
    const vocab = modelData.vocabulary;
    const idf = modelData.idf;

    // Step 1: Build Term Frequency (TF) vector
    const tf = new Array(idf.length).fill(0);
    for (const token of tokens) {
        if (vocab[token] !== undefined) {
            tf[vocab[token]] += 1;
        }
    }

    // Step 2: Apply TF-IDF weighting with L2 normalization
    const tfidfVector = new Array(idf.length).fill(0);
    let sumSq = 0;
    for (let i = 0; i < tfidfVector.length; i++) {
        tfidfVector[i] = tf[i] * idf[i];
        sumSq += tfidfVector[i] * tfidfVector[i];
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
        for (let i = 0; i < tfidfVector.length; i++) {
            tfidfVector[i] /= norm;
        }
    }

    // Step 3: Predict Urgency (with probabilities)
    const urgencyResult = predictClassWithProbs(
        tfidfVector,
        modelData.urgency_coef,
        modelData.urgency_intercept,
        modelData.urgency_classes.length
    );
    let urgencyIdx = urgencyResult.classIdx;
    const urgencyConfidence = urgencyResult.probs[urgencyIdx];

    // Step 4: Predict Disease (with probabilities)
    const diseaseResult = predictClassWithProbs(
        tfidfVector,
        modelData.disease_coef,
        modelData.disease_intercept,
        modelData.disease_classes.length
    );
    const diseaseIdx = diseaseResult.classIdx;
    const diseaseConfidence = diseaseResult.probs[diseaseIdx];
    const diseaseId = modelData.disease_classes[diseaseIdx];

    const diagObj = recommendationsMap[diseaseId] || {
        title: modelData.disease_names[diseaseId],
        desc: "Further observation of the elderly's symptoms is needed.",
        action: "Consult a medical professional if symptoms persist."
    };

    // Combined confidence = geometric mean of both predictions
    const overallConfidence = Math.sqrt(urgencyConfidence * diseaseConfidence);

    // Step 5: Format detailed analysis
    let detailedAnalysis = `📌 **Diagnosis Details:** ${diagObj.desc}\n\n👉 **Recommended Action:**\n${diagObj.action}`;

    // Step 6: Vital Sign Analysis (integrate HR & RR normal ranges)
    const vitalNotes = [];
    if (hr) {
        let hrStatus = "";
        if (hr > 100) {
            hrStatus = `⚠️ **ABNORMAL (High / Tachycardia):** ${hr} BPM (Normal: 60–100 BPM)`;
            if (urgencyIdx < 2) urgencyIdx = 2;
        } else if (hr < 60) {
            hrStatus = `⚠️ **ABNORMAL (Low / Bradycardia):** ${hr} BPM (Normal: 60–100 BPM)`;
            if (urgencyIdx < 1) urgencyIdx = 1;
        } else {
            hrStatus = `✅ **NORMAL:** ${hr} BPM (Range: 60–100 BPM)`;
        }
        vitalNotes.push(`• Heart Rate: ${hrStatus}`);
    }

    if (rr) {
        let rrStatus = "";
        if (rr > 20) {
            rrStatus = `⚠️ **ABNORMAL (Fast / Tachypnea):** ${rr} breaths/min (Normal: 12–20/min)`;
            if (urgencyIdx < 2) urgencyIdx = 2;
        } else if (rr < 12) {
            rrStatus = `⚠️ **ABNORMAL (Slow / Bradypnea):** ${rr} breaths/min (Normal: 12–20/min)`;
            if (urgencyIdx < 1) urgencyIdx = 1;
        } else {
            rrStatus = `✅ **NORMAL:** ${rr} breaths/min (Range: 12–20/min)`;
        }
        vitalNotes.push(`• Respiratory Rate: ${rrStatus}`);
    }

    if (vitalNotes.length > 0) {
        detailedAnalysis += `\n\n📊 **Vital Sign Evaluation:**\n` + vitalNotes.join("\n");
    } else {
        detailedAnalysis += `\n\n💡 *Tip: Add Vital Sign data (Module 2) for a more comprehensive heart rate & respiratory rate analysis.*`;
    }

    // Step 7: Resolve final urgency mapping
    const finalUrgencyId = modelData.urgency_classes[urgencyIdx] !== undefined
        ? modelData.urgency_classes[urgencyIdx]
        : urgencyIdx;

    return {
        urgencyLevel: modelData.urgency_names[finalUrgencyId] || modelData.urgency_names[urgencyIdx],
        urgencyCss: modelData.urgency_css[finalUrgencyId] || modelData.urgency_css[urgencyIdx],
        disease: diagObj.title,
        recommendation: detailedAnalysis,
        confidence: Math.round(overallConfidence * 100)
    };
}

// Start model loading on page load
loadModel();
