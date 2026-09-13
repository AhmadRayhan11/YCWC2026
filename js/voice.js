/**
 * ═══════════════════════════════════════════════════════════════
 * Voice Assistant Module: Speech-to-Text (STT) & Text-to-Speech (TTS)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Uses the Web Speech API for:
 * - Speech Recognition (STT): Voice dictation in Indonesian (id-ID)
 * - Speech Synthesis (TTS): Read analysis results aloud
 * 
 * The STT language is set to Indonesian since the ML model is trained
 * on Indonesian text data. TTS supports both English and Indonesian.
 */

document.addEventListener("DOMContentLoaded", () => {
    const btnVoiceInput = document.getElementById("btn-voice-input");
    const voiceStatus = document.getElementById("voice-status");
    const logInput = document.getElementById("log-input");
    const btnSpeakResult = document.getElementById("btn-speak-result");

    let recognition = null;
    let isListening = false;

    // ═══════ SPEECH-TO-TEXT (Voice Dictation) ═══════
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = "id-ID"; // Indonesian — matches ML training data
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            if (voiceStatus) {
                voiceStatus.style.display = "inline-block";
                voiceStatus.textContent = "🔴 Listening... Please speak.";
            }
            if (btnVoiceInput) {
                btnVoiceInput.innerHTML = "⏹️ Stop Listening";
                btnVoiceInput.classList.add("btn-primary");
                btnVoiceInput.classList.remove("btn-ghost");
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (logInput) {
                logInput.value = logInput.value.trim().length > 0
                    ? logInput.value + " " + transcript
                    : transcript;
            }

            // Show toast notification
            if (typeof showToast === "function") {
                showToast("Voice input captured successfully.", "success");
            }
        };

        recognition.onerror = (event) => {
            console.error("[Voice] Speech Recognition Error:", event.error);
            if (voiceStatus) {
                voiceStatus.textContent = "⚠️ Recognition failed: " + event.error;
            }
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
        };

        if (btnVoiceInput) {
            btnVoiceInput.addEventListener("click", () => {
                if (isListening) {
                    recognition.stop();
                } else {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error("[Voice] Failed to start recognition:", e);
                    }
                }
            });
        }
    } else if (btnVoiceInput) {
        btnVoiceInput.disabled = true;
        btnVoiceInput.title = "Your browser does not support Web Speech API";
        btnVoiceInput.innerHTML = "🎙️ Voice (Not Supported)";
    }

    function stopListening() {
        isListening = false;
        if (voiceStatus) voiceStatus.style.display = "none";
        if (btnVoiceInput) {
            btnVoiceInput.innerHTML = "🎙️ Voice Dictation";
            btnVoiceInput.classList.add("btn-ghost");
            btnVoiceInput.classList.remove("btn-primary");
        }
    }

    // ═══════ TEXT-TO-SPEECH (Read Results Aloud) ═══════
    let isSpeaking = false;

    if ("speechSynthesis" in window) {
        if (btnSpeakResult) {
            btnSpeakResult.addEventListener("click", () => {
                if (isSpeaking) {
                    window.speechSynthesis.cancel();
                    isSpeaking = false;
                    btnSpeakResult.innerHTML = "🔊 Read Aloud";
                    return;
                }

                const urgency = document.getElementById("text-result-urgency").textContent;
                const disease = document.getElementById("text-result-disease").textContent;
                const recElement = document.getElementById("text-result-recommendation");
                const rawText = recElement ? recElement.innerText : "";

                if (urgency === "No data yet") {
                    if (typeof showToast === "function") {
                        showToast("No analysis results to read yet.", "warning");
                    }
                    return;
                }

                // Clean emoji/markdown for natural speech
                const cleanRec = rawText.replace(/[*_#•📌👉⚠️🚨🫁🤢🌡️🧠🦴📊✅💡]/g, "");

                const speechText = `Analysis Result. Urgency Level: ${urgency}. Diagnosis: ${disease}. ${cleanRec}`;

                const utterance = new SpeechSynthesisUtterance(speechText);
                utterance.lang = "en-US"; // English TTS for international audience
                utterance.rate = 0.9;     // Slightly slower for elderly users
                utterance.pitch = 1.0;

                utterance.onstart = () => {
                    isSpeaking = true;
                    btnSpeakResult.innerHTML = "⏹️ Stop Reading";
                };

                utterance.onend = () => {
                    isSpeaking = false;
                    btnSpeakResult.innerHTML = "🔊 Read Aloud";
                };

                utterance.onerror = () => {
                    isSpeaking = false;
                    btnSpeakResult.innerHTML = "🔊 Read Aloud";
                };

                window.speechSynthesis.speak(utterance);
            });
        }
    } else if (btnSpeakResult) {
        btnSpeakResult.style.display = "none";
    }
});
