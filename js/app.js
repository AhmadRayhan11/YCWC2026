/**
 * ═══════════════════════════════════════════════════════════════
 * Main Application Controller
 * ═══════════════════════════════════════════════════════════════
 * 
 * Orchestrates all modules:
 * - Module 1: Health Diary (text analysis)
 * - Module 2: Vital Sign Scanner
 * - Module 3: Analytics Dashboard
 * 
 * Features: Navigation, splash screen, toast notifications,
 * analytics charts, CSV export, font-size accessibility,
 * scroll-reveal animations, and data persistence (localStorage).
 */

// ═══════ APP STATE ═══════
let currentLog = {
    text: "",
    urgency: null,
    cssClass: null,
    disease: null,
    recommendation: null,
    date: null,
    hr: null,
    rr: null,
    confidence: 0
};

// ═══════ TOAST NOTIFICATION SYSTEM ═══════
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ═══════ SPLASH SCREEN ═══════
function initSplash() {
    const splash = document.getElementById("splash-screen");
    const progressEl = document.getElementById("splash-progress");
    if (!splash) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) progress = 100;
        if (progressEl) progressEl.style.width = progress + "%";

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                splash.classList.add("hidden");
                setTimeout(() => splash.remove(), 500);
            }, 400);
        }
    }, 200);
}

// ═══════ MAIN INITIALIZATION ═══════
document.addEventListener("DOMContentLoaded", () => {
    initSplash();

    // DOM References
    const btnAnalyze = document.getElementById("btn-analyze");
    const logInput = document.getElementById("log-input");
    const resultUrgency = document.getElementById("text-result-urgency");
    const resultBadge = document.getElementById("text-result-badge");
    const resultDisease = document.getElementById("text-result-disease");
    const resultRecommendation = document.getElementById("text-result-recommendation");
    const resultPanel = document.getElementById("result-panel");
    const confidenceSection = document.getElementById("confidence-section");
    const confidenceValue = document.getElementById("confidence-value");
    const confidenceBar = document.getElementById("confidence-bar");

    const btnOpenScanner = document.getElementById("btn-open-scanner");
    const module1 = document.getElementById("module-1");
    const module2 = document.getElementById("module-2");
    const module3 = document.getElementById("module-3");
    const heroSection = document.getElementById("hero");
    const btnCloseScanner = document.getElementById("btn-close-scanner");
    const btnSaveVital = document.getElementById("btn-save-vital");
    const btnExportCsv = document.getElementById("btn-export-csv");
    const btnDashboardExport = document.getElementById("btn-dashboard-export");
    const btnClearData = document.getElementById("btn-clear-data");

    // Hero buttons
    const heroBtnDiary = document.getElementById("hero-btn-diary");
    const heroBtnScan = document.getElementById("hero-btn-scan");

    // ═══════ NAVIGATION ═══════
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    const sections = { hero: heroSection, "module-1": module1, "module-2": module2, "module-3": module3 };

    function navigateTo(sectionId) {
        // Hide all sections
        Object.values(sections).forEach(s => {
            if (s) s.classList.add("hidden");
        });

        // Show target
        const target = sections[sectionId];
        if (target) {
            target.classList.remove("hidden");
            target.classList.add("visible");
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        // Special: show hero section always when "hero" is selected
        if (sectionId === "hero" && heroSection) {
            heroSection.classList.remove("hidden");
            // Also show module-1 below hero
            if (module1) module1.classList.remove("hidden");
        }

        // Update nav active state
        navLinks.forEach(link => {
            const isActive = link.dataset.section === sectionId;
            link.classList.toggle("active", isActive);
            link.setAttribute("aria-selected", isActive);
        });

        // Initialize camera if navigating to scanner
        if (sectionId === "module-2" && typeof initCamera === "function") {
            initCamera();
        }

        // Refresh dashboard if navigating to analytics
        if (sectionId === "module-3") {
            updateDashboard();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener("click", () => navigateTo(link.dataset.section));
    });

    // Hero buttons
    if (heroBtnDiary) {
        heroBtnDiary.addEventListener("click", () => navigateTo("module-1"));
    }
    if (heroBtnScan) {
        heroBtnScan.addEventListener("click", () => navigateTo("module-2"));
    }

    // Initial state: show hero + module 1
    if (heroSection) heroSection.classList.remove("hidden");
    if (module1) module1.classList.remove("hidden");

    // Load history
    renderHistory();

    // ═══════ MODULE 1: ANALYZE TEXT ═══════
    btnAnalyze.addEventListener("click", () => {
        const text = logInput.value.trim();
        if (!text) {
            showToast("Please enter a health condition description.", "warning");
            return;
        }

        // Run ML analysis (multimodal: text + optional vital signs)
        const result = analyzeHealthLog(text, currentLog.hr, currentLog.rr);

        // Update UI
        resultUrgency.textContent = "Urgency: " + result.urgencyLevel;
        resultBadge.textContent = result.urgencyLevel;
        resultBadge.className = "badge " + result.urgencyCss;
        resultBadge.style.display = "inline-flex";
        resultDisease.textContent = result.disease;

        if (resultRecommendation) {
            resultRecommendation.innerHTML = sanitizeHTML(result.recommendation.replace(/\n/g, '<br>'));
        }

        // Update confidence meter
        if (confidenceSection && confidenceValue && confidenceBar) {
            confidenceSection.style.display = "block";
            confidenceValue.textContent = result.confidence + "%";
            confidenceBar.style.width = result.confidence + "%";
        }

        // Animate result panel
        if (resultPanel) resultPanel.classList.add("has-result");

        // Save log
        currentLog.text = text;
        currentLog.urgency = result.urgencyLevel;
        currentLog.cssClass = result.urgencyCss;
        currentLog.disease = result.disease;
        currentLog.recommendation = result.recommendation;
        currentLog.confidence = result.confidence;
        currentLog.date = new Date().toLocaleString("en-US");

        saveLog();
        showToast("Analysis complete — " + result.urgencyLevel, 
            result.urgencyCss === "badge-high" ? "error" : 
            result.urgencyCss === "badge-medium" ? "warning" : "success");
    });

    // ═══════ SCANNER NAVIGATION ═══════
    btnOpenScanner.addEventListener("click", () => navigateTo("module-2"));

    btnCloseScanner.addEventListener("click", () => {
        navigateTo("module-1");
        if (typeof stopScanner === "function") stopScanner();
    });

    // ═══════ SAVE VITAL SIGNS (Manual) ═══════
    btnSaveVital.addEventListener("click", () => {
        const hr = document.getElementById("hr-result").textContent;
        const rr = document.getElementById("rr-result").textContent;

        if (hr !== "--" && rr !== "--") {
            window.onScanCompleted(parseInt(hr), parseInt(rr));
            showToast("Vital signs saved and synced with AI analysis!", "success");
            navigateTo("module-1");
        }
    });

    // ═══════ EXPORT CSV ═══════
    function exportCSV() {
        const logs = JSON.parse(localStorage.getItem("elderly_logs") || "[]");
        if (logs.length === 0) {
            showToast("No data to export.", "warning");
            return;
        }

        const headers = ["Date", "Text", "Urgency", "Disease", "Heart Rate (BPM)", "Resp Rate (/min)", "Confidence (%)"];
        const rows = logs.map(log => [
            `"${log.date || ''}"`,
            `"${(log.text || '').replace(/"/g, '""')}"`,
            `"${log.urgency || ''}"`,
            `"${log.disease || ''}"`,
            log.hr || '',
            log.rr || '',
            log.confidence || ''
        ]);

        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `health_companion_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Data exported as CSV!", "success");
    }

    if (btnExportCsv) btnExportCsv.addEventListener("click", exportCSV);
    if (btnDashboardExport) btnDashboardExport.addEventListener("click", exportCSV);

    // ═══════ DEMO DATA FOR JURY ═══════
    const btnLoadDemo = document.getElementById("btn-load-demo");
    if (btnLoadDemo) {
        btnLoadDemo.addEventListener("click", () => {
            const demoLogs = [
                { date: "9/13/2026, 08:30 AM", text: "Kakek minum obat rutin, kondisi sehat bugar", urgency: "Normal", cssClass: "badge-low", disease: "Stable / Normal Condition", recommendation: "Maintain healthy lifestyle & water intake.", confidence: 96, hr: 72, rr: 16 },
                { date: "9/12/2026, 02:15 PM", text: "Mengeluh sedikit pusing setelah jalan siang", urgency: "Warning", cssClass: "badge-medium", disease: "Cardiovascular / Heart & Blood Issue", recommendation: "Rest in shaded area and measure blood pressure.", confidence: 84, hr: 88, rr: 18 },
                { date: "9/11/2026, 09:00 AM", text: "Batuk ringan dan hidung agak tersumbat", urgency: "Warning", cssClass: "badge-medium", disease: "Respiratory Issue (Breathing Problem)", recommendation: "Warm water intake and monitor oxygen saturation.", confidence: 89, hr: 78, rr: 19 },
                { date: "9/10/2026, 07:45 AM", text: "Tidur pulas, nafsu makan sarapan sangat baik", urgency: "Normal", cssClass: "badge-low", disease: "Stable / Normal Condition", recommendation: "Continue routine daily activities.", confidence: 98, hr: 70, rr: 15 },
                { date: "9/09/2026, 05:20 PM", text: "Tersandung meja, memar sedikit di lutut", urgency: "Warning", cssClass: "badge-medium", disease: "Physical Trauma / Injury Indication", recommendation: "Apply cold compress on swelling area.", confidence: 91, hr: 82, rr: 17 },
                { date: "9/08/2026, 10:10 AM", text: "Nenek ngobrol santai dan jalan-jalan di taman", urgency: "Normal", cssClass: "badge-low", disease: "Stable / Normal Condition", recommendation: "Maintain hydration and light exercise.", confidence: 97, hr: 68, rr: 14 }
            ];
            localStorage.setItem("elderly_logs", JSON.stringify(demoLogs));
            renderHistory();
            updateDashboard();
            showToast("✨ Sample demo data loaded successfully!", "success");
        });
    }

    // ═══════ PRINT REPORT ═══════
    const btnPrintReport = document.getElementById("btn-print-report");
    if (btnPrintReport) {
        btnPrintReport.addEventListener("click", () => {
            window.print();
        });
    }

    // ═══════ CLEAR DATA ═══════
    if (btnClearData) {
        btnClearData.addEventListener("click", () => {
            if (confirm("Are you sure you want to delete all stored health data? This action cannot be undone.")) {
                localStorage.removeItem("elderly_logs");
                renderHistory();
                updateDashboard();
                showToast("All data cleared.", "info");
            }
        });
    }

    // ═══════ FONT SIZE ACCESSIBILITY ═══════
    const fontBtns = document.querySelectorAll(".font-size-btn[data-size]");
    fontBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const size = btn.dataset.size;
            document.body.setAttribute("data-font-size", size);
            fontBtns.forEach(b => b.classList.toggle("active", b === btn));
            localStorage.setItem("preferred_font_size", size);
        });
    });

    // Restore font preference
    const savedSize = localStorage.getItem("preferred_font_size");
    if (savedSize) {
        document.body.setAttribute("data-font-size", savedSize);
        fontBtns.forEach(b => b.classList.toggle("active", b.dataset.size === savedSize));
    }

    // ═══════ SCROLL REVEAL ANIMATION ═══════
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
});

// ═══════ SCAN COMPLETED CALLBACK ═══════
window.onScanCompleted = function(hr, rr) {
    const logInput = document.getElementById("log-input");
    const resultUrgency = document.getElementById("text-result-urgency");
    const resultBadge = document.getElementById("text-result-badge");
    const resultDisease = document.getElementById("text-result-disease");
    const resultRecommendation = document.getElementById("text-result-recommendation");
    const confidenceSection = document.getElementById("confidence-section");
    const confidenceValue = document.getElementById("confidence-value");
    const confidenceBar = document.getElementById("confidence-bar");

    currentLog.hr = parseInt(hr);
    currentLog.rr = parseInt(rr);
    if (!currentLog.date) {
        currentLog.date = new Date().toLocaleString("en-US");
    }

    let textToAnalyze = logInput ? logInput.value.trim() : "";
    if (!textToAnalyze && currentLog.text) textToAnalyze = currentLog.text;
    if (!textToAnalyze) textToAnalyze = "Routine Vital Sign Check";

    if (typeof analyzeHealthLog === "function") {
        const result = analyzeHealthLog(textToAnalyze, currentLog.hr, currentLog.rr);

        if (resultUrgency) resultUrgency.textContent = "Urgency: " + result.urgencyLevel;
        if (resultBadge) {
            resultBadge.textContent = result.urgencyLevel;
            resultBadge.className = "badge " + result.urgencyCss;
            resultBadge.style.display = "inline-flex";
        }
        if (resultDisease) resultDisease.textContent = result.disease;
        if (resultRecommendation) {
            resultRecommendation.innerHTML = sanitizeHTML(result.recommendation.replace(/\n/g, '<br>'));
        }
        if (confidenceSection && confidenceValue && confidenceBar) {
            confidenceSection.style.display = "block";
            confidenceValue.textContent = result.confidence + "%";
            confidenceBar.style.width = result.confidence + "%";
        }

        currentLog.text = textToAnalyze;
        currentLog.urgency = result.urgencyLevel;
        currentLog.cssClass = result.urgencyCss;
        currentLog.disease = result.disease;
        currentLog.recommendation = result.recommendation;
        currentLog.confidence = result.confidence;
    }

    saveLog();
};

// ═══════ DATA PERSISTENCE ═══════
function saveLog() {
    if (!currentLog.text && !currentLog.hr) return;

    const logs = JSON.parse(localStorage.getItem("elderly_logs") || "[]");

    if (logs.length > 0 && logs[0].date === currentLog.date && currentLog.hr) {
        logs[0].hr = currentLog.hr;
        logs[0].rr = currentLog.rr;
        logs[0].confidence = currentLog.confidence;
    } else if (!currentLog.hr && logs.length > 0 && logs[0].date === currentLog.date) {
        logs[0] = { ...currentLog };
    } else {
        logs.unshift({ ...currentLog });
    }

    localStorage.setItem("elderly_logs", JSON.stringify(logs));
    renderHistory();
}

// ═══════ RENDER HISTORY ═══════
function renderHistory() {
    const historyContainer = document.getElementById("log-history");
    const logs = JSON.parse(localStorage.getItem("elderly_logs") || "[]");

    if (!historyContainer) return;

    if (logs.length === 0) {
        historyContainer.innerHTML = '<p class="text-muted text-sm">No history yet. Start by analyzing a health condition.</p>';
        return;
    }

    historyContainer.innerHTML = "";
    logs.forEach(log => {
        const item = document.createElement("div");
        item.className = "log-item";

        let vitalsHtml = "";
        if (log.hr && log.rr) {
            vitalsHtml = `<div class="log-vitals">❤️ HR: ${log.hr} BPM &nbsp;|&nbsp; 🫁 RR: ${log.rr}/min</div>`;
        }

        let diseaseHtml = "";
        if (log.disease) {
            diseaseHtml = `<div class="log-disease">🩺 ${sanitizeText(log.disease)}</div>`;
        }

        let confidenceHtml = "";
        if (log.confidence) {
            confidenceHtml = `<span class="text-muted text-sm" style="margin-left: 0.5rem;">· ${log.confidence}% confidence</span>`;
        }

        item.innerHTML = `
            <div class="log-header">
                <span class="log-date">${sanitizeText(log.date || '')}</span>
                <div>
                    <span class="badge ${log.cssClass || 'badge-low'}">${sanitizeText(log.urgency || 'Unknown')}</span>
                    ${confidenceHtml}
                </div>
            </div>
            <p class="log-text">${sanitizeText(log.text || '')}</p>
            ${diseaseHtml}
            ${vitalsHtml}
        `;
        historyContainer.appendChild(item);
    });
}

// ═══════ ANALYTICS DASHBOARD ═══════
let hrTrendChart = null;
let rrTrendChart = null;
let urgencyChart = null;

function updateDashboard() {
    const logs = JSON.parse(localStorage.getItem("elderly_logs") || "[]");

    // Update stat cards
    const totalEl = document.getElementById("stat-total-entries");
    const normalEl = document.getElementById("stat-normal-count");
    const mediumEl = document.getElementById("stat-medium-count");
    const highEl = document.getElementById("stat-high-count");

    if (totalEl) totalEl.textContent = logs.length;

    const normalCount = logs.filter(l => l.cssClass === "badge-low").length;
    const mediumCount = logs.filter(l => l.cssClass === "badge-medium").length;
    const highCount = logs.filter(l => l.cssClass === "badge-high").length;

    if (normalEl) normalEl.textContent = normalCount;
    if (mediumEl) mediumEl.textContent = mediumCount;
    if (highEl) highEl.textContent = highCount;

    // Chart data (last 15 entries, reversed for chronological order)
    const recentLogs = logs.slice(0, 15).reverse();
    const labels = recentLogs.map((l, i) => l.date ? l.date.split(",")[0] : `Entry ${i + 1}`);

    // HR Trend Chart
    const hrCtx = document.getElementById("hrTrendChart");
    if (hrCtx) {
        if (hrTrendChart) hrTrendChart.destroy();
        const hrData = recentLogs.map(l => l.hr || null);

        hrTrendChart = new Chart(hrCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Heart Rate (BPM)',
                    data: hrData,
                    borderColor: '#F87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#F87171',
                    tension: 0.3,
                    fill: true,
                    spanGaps: true
                }]
            },
            options: chartOptions('BPM', 40, 140)
        });
    }

    // RR Trend Chart
    const rrCtx = document.getElementById("rrTrendChart");
    if (rrCtx) {
        if (rrTrendChart) rrTrendChart.destroy();
        const rrData = recentLogs.map(l => l.rr || null);

        rrTrendChart = new Chart(rrCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Resp Rate (/min)',
                    data: rrData,
                    borderColor: '#818CF8',
                    backgroundColor: 'rgba(129, 140, 248, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#818CF8',
                    tension: 0.3,
                    fill: true,
                    spanGaps: true
                }]
            },
            options: chartOptions('/min', 5, 35)
        });
    }

    // Urgency Distribution Chart
    const urgCtx = document.getElementById("urgencyChart");
    if (urgCtx) {
        if (urgencyChart) urgencyChart.destroy();

        urgencyChart = new Chart(urgCtx, {
            type: 'doughnut',
            data: {
                labels: ['Normal (Low)', 'Attention (Medium)', 'Emergency (High)'],
                datasets: [{
                    data: [normalCount, mediumCount, highCount],
                    backgroundColor: [
                        'rgba(52, 211, 153, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(248, 113, 113, 0.8)'
                    ],
                    borderColor: [
                        'rgba(52, 211, 153, 1)',
                        'rgba(251, 191, 36, 1)',
                        'rgba(248, 113, 113, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94A3B8',
                            font: { size: 12, family: 'Inter' },
                            padding: 16,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

/**
 * Shared chart options factory
 */
function chartOptions(unit, suggestedMin, suggestedMax) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
            mode: 'index',
            intersect: false
        },
        scales: {
            x: {
                display: true,
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                ticks: {
                    color: '#64748B',
                    font: { size: 10, family: 'Inter' },
                    maxRotation: 45,
                    maxTicksLimit: 8
                }
            },
            y: {
                display: true,
                suggestedMin,
                suggestedMax,
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                ticks: {
                    color: '#64748B',
                    font: { size: 10, family: 'Inter' },
                    callback: val => val + ' ' + unit
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#F8FAFC',
                bodyColor: '#94A3B8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                titleFont: { family: 'Inter', weight: '600' },
                bodyFont: { family: 'Inter' }
            }
        }
    };
}

// ═══════ SECURITY: HTML SANITIZATION ═══════
function sanitizeHTML(str) {
    // Allow only safe inline formatting tags
    const temp = document.createElement('div');
    temp.textContent = str;
    let safe = temp.innerHTML;
    // Re-enable <br> tags and <strong> that we intentionally use
    safe = safe.replace(/&lt;br&gt;/gi, '<br>');
    safe = safe.replace(/&lt;br\/&gt;/gi, '<br>');
    return safe;
}

function sanitizeText(str) {
    const temp = document.createElement('div');
    temp.textContent = str || '';
    return temp.innerHTML;
}
