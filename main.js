/**
 * EXAMS VENTURE - UNIFIED MAIN APPLICATION LOGIC
 * Supports both 4.0 and 5.0 scales using config.js
 */

/**
 * THEME (Light / Dark)
 */
const THEME_KEY = 'ev-theme';

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeButton(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeButton(next);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

/**
 * UI & VIEW CONTROLS
 */
function toggleSidebar() {
    const menu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    if (menu) menu.classList.toggle("active");
    if (overlay) overlay.style.display = menu.classList.contains("active") ? "block" : "none";
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    navLinks.forEach(item => item.classList.remove('active'));
    
    const navIndices = { 
        'view-dashboard': 0, 
        'view-calc': 1, 
        'view-target': 2,
        'view-profile': 3,
    };
    
    const activeIndex = navIndices[viewId];
    if (activeIndex !== undefined && navLinks[activeIndex]) {
        navLinks[activeIndex].classList.add('active');
    }

    if (viewId === 'view-target' || viewId === 'view-dashboard') {
        updateRemainingUnitsDisplay();
    }
    if (viewId === 'view-calc') {
        setTimeout(updateProjectedCGPA, 100);
    }

    const menu = document.getElementById("side-menu");
    if (menu && menu.classList.contains("active")) toggleSidebar();
    
    // ===== NAVIGATION-TRIGGERED AD REFRESH (Google AdSense User-Action Model) =====
    // Only refresh on navigation if online and eligible per 3-minute rule
    if (navigator.onLine && canContextRefreshAd() && AdEngine.isEligibleForRefresh()) {
        recordContextAdRefresh();
        AdEngine.pushAd();
    }
}

/**
 * SEMESTER & COURSE ROW LOGIC
 */
function renderCourseRow(code = '', unit = '', grade = '') {
    const config = getConfig();
    const defaultGrade = grade || config.defaultGrade;
    
    const container = document.getElementById('course-container');
    const row = document.createElement('div');
    row.className = 'course-row';
    row.style.opacity = '0';
    row.style.transform = 'translateY(15px)';
    row.style.transition = 'all 0.3s ease-out';
    
    let gradeOptions = config.grades.map(g => 
        `<option value="${g.value}" ${defaultGrade == g.value ? 'selected' : ''}>${g.letter}</option>`
    ).join('');
    
    row.innerHTML = `
        <input type="text" placeholder="Course" class="inp-code" value="${code}">
        <input type="text" inputmode="decimal" placeholder="Unit" class="inp-unit" value="${unit}" pattern="[0-9]*">
        <select class="inp-grade">
            ${gradeOptions}
        </select>
        <button class="btn-remove" onclick="removeRow(this)">×</button>
    `;
    
    container.appendChild(row);
    requestAnimationFrame(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
    });
}

function addCourseRow() {
    renderCourseRow();
    setTimeout(updateProjectedCGPA, 50);
}

function removeRow(btn) {
    const row = btn.parentElement;
    row.style.opacity = '0';
    row.style.transform = 'translateX(20px)';
    setTimeout(() => {
        row.remove();
        updateProjectedCGPA();
    }, 200);
}

function populateSemesters() {
    const select = document.getElementById('sem-select');
    if (!select) return;
    const levels = [100, 200, 300, 400, 500, 600];
    const sessions = ["First Semester", "Second Semester"];
    
    select.innerHTML = ''; 
    levels.forEach(level => {
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = `${level}-${session.split(' ')[0]}`;
            option.textContent = `${level} Level - ${session}`;
            select.appendChild(option);
        });
    });

    select.addEventListener('change', (e) => loadSemesterData(e.target.value));
}

function updateProjectedCGPA() {
    const config = getConfig();
    const el = document.getElementById('projected-cgpa');
    if (!el) return;
    const selectedSem = document.getElementById('sem-select')?.value;
    if (!selectedSem) { el.textContent = '--'; return; }

    let totalPoints = 0, totalUnits = 0;

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data) && k !== getStorageKey('data', selectedSem)).forEach(key => {
        (JSON.parse(localStorage.getItem(key) || '[]')).forEach(c => {
            const u = parseInt(c.unit) || 0;
            const g = limitGrade(c.grade);
            totalUnits += u;
            totalPoints += (u * g);
        });
    });

    document.querySelectorAll('.course-row').forEach(row => {
        const code = row.querySelector('.inp-code')?.value;
        const unit = parseInt(row.querySelector('.inp-unit')?.value) || 0;
        const grade = limitGrade(row.querySelector('.inp-grade')?.value);
        if (code || unit > 0) {
            totalUnits += unit;
            totalPoints += (unit * grade);
        }
    });

    if (totalUnits === 0) { el.textContent = '--'; return; }
    el.textContent = (totalPoints / totalUnits).toFixed(2);
}

/**
 * DATA PERSISTENCE (SAVE & LOAD)
 */
function loadSemesterData(semesterKey) {
    const config = getConfig();
    const container = document.getElementById('course-container');
    container.innerHTML = '';
    const savedData = localStorage.getItem(getStorageKey('data', semesterKey));
    if (savedData) {
        JSON.parse(savedData).forEach(c => renderCourseRow(c.code, c.unit, c.grade));
    } else {
        for(let i=0; i<5; i++) renderCourseRow();
    }
    const notesEl = document.getElementById('semester-notes');
    if (notesEl) notesEl.value = localStorage.getItem(getStorageKey('notes', semesterKey)) || '';
    setTimeout(updateProjectedCGPA, 50);
}

function saveSemesterData() {
    const config = getConfig();
    const selectedSem = document.getElementById('sem-select').value;
    const rows = document.querySelectorAll('.course-row');
    const semesterData = [];

    rows.forEach(row => {
        const code = row.querySelector('.inp-code').value;
        const unit = row.querySelector('.inp-unit').value;
        const grade = row.querySelector('.inp-grade').value;

        if (code || unit > 0) {
            semesterData.push({ 
                code: code, 
                unit: parseInt(unit) || 0, 
                grade: grade 
            });
        }
    });

    if (semesterData.length === 0) {
        alert("Please add at least one course before saving.");
        return;
    }

    localStorage.setItem(getStorageKey('data', selectedSem), JSON.stringify(semesterData));
    const notes = document.getElementById('semester-notes')?.value?.trim() || '';
    localStorage.setItem(getStorageKey('notes', selectedSem), notes);
    
    updateDashboard(); 
    getRemainingUnits(); 
    switchView('view-dashboard');
    
    alert(`Semester saved successfully to ${ACTIVE_SCALE} database!`);
    triggerAdRefresh();
}

/**
 * DASHBOARD & ANALYSIS
 */
function updateDashboard() {
    const config = getConfig();
    let totalPoints = 0, totalUnits = 0;

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        JSON.parse(localStorage.getItem(key)).forEach(course => {
            const units = parseInt(course.unit) || 0;
            totalUnits += units;
            totalPoints += (units * limitGrade(course.grade));
        });
    });

    const cgpa = totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : "0.00";
    
    document.getElementById('display-cgpa').innerText = cgpa;
    document.getElementById('display-units').innerText = totalUnits;

    let degreeClass = "Pass";
    let nextBoundary = config.maxGPA;
    let boundaryName = `Max GPA`;

    for (const boundary of config.boundaries) {
        if (cgpa >= boundary.threshold) {
            degreeClass = boundary.label;
            nextBoundary = boundary.nextThreshold;
            boundaryName = boundary.nextLabel;
            break;
        }
    }

    document.getElementById('display-class').innerText = degreeClass;

    const gap = (nextBoundary - parseFloat(cgpa)).toFixed(2);
    const progressPercent = (parseFloat(cgpa) / config.maxGPA) * 100;

    const predictorDiv = document.getElementById('class-predictor');
    if (predictorDiv) {
        predictorDiv.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progressPercent}%"></div>
            </div>
            <small style="color: var(--text-dim)">
                ${gap > 0 ? `<b>${gap}</b> points away from <b>${boundaryName}</b>` : "Top Tier Reached"}
            </small>
        `;
    }

    const cgpaCard = document.getElementById('current-cgpa-card');
    if (cgpaCard) {
        cgpaCard.style.cursor = 'pointer';
        cgpaCard.title = 'Open CGPA Calculator';
        cgpaCard.onclick = () => {
            switchView('view-calc');
        };
    }

    renderAcademicHistory();
    renderGpaTrendChart();
    renderGradeDistributionChart();
}

let gpaTrendChartInstance = null;
let gradeDistChartInstance = null;

function renderGpaTrendChart() {
    const config = getConfig();
    const keys = Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).sort();
    const canvas = document.getElementById('gpa-trend-chart');
    const emptyMsg = document.getElementById('gpa-chart-empty');
    if (!canvas) return;

    if (keys.length === 0) {
        canvas.parentElement.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (gpaTrendChartInstance) {
            gpaTrendChartInstance.destroy();
            gpaTrendChartInstance = null;
        }
        return;
    }

    canvas.parentElement.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    let cumulativePoints = 0, cumulativeUnits = 0;
    const labels = [];
    const cgpaData = [];

    keys.forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key) || '[]');
        let sPoints = 0, sUnits = 0;
        semesterData.forEach(c => {
            const u = parseInt(c.unit) || 0;
            const g = limitGrade(c.grade);
            sUnits += u;
            sPoints += (u * g);
        });
        cumulativePoints += sPoints;
        cumulativeUnits += sUnits;
        const cgpa = cumulativeUnits > 0 ? parseFloat((cumulativePoints / cumulativeUnits).toFixed(2)) : 0;
        const prefix = config.prefixes.data;
        labels.push(key.replace(prefix, '').replace('-', ' Lvl '));
        cgpaData.push(cgpa);
    });

    if (gpaTrendChartInstance) gpaTrendChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    gpaTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'CGPA',
                data: cgpaData,
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#fbbf24',
                pointBorderColor: '#0b0e14',
                pointBorderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: '#8b949e', maxRotation: 45, fontSize: 10 }
                },
                y: {
                    min: 0,
                    max: config.chartMaxY,
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: '#8b949e', fontSize: 10 }
                }
            }
        }
    });
}

function renderGradeDistributionChart() {
    const config = getConfig();
    const unitCount = {};
    config.grades.forEach(g => unitCount[g.value] = 0);

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        (JSON.parse(localStorage.getItem(key) || '[]')).forEach(c => {
            const u = parseInt(c.unit) || 0;
            const g = String(c.grade ?? 0);
            if (u > 0 && unitCount.hasOwnProperty(g)) unitCount[g] += u;
        });
    });

    const total = Object.values(unitCount).reduce((a, b) => a + b, 0);
    const canvas = document.getElementById('grade-dist-chart');
    const emptyMsg = document.getElementById('grade-dist-empty');
    if (!canvas) return;

    if (total === 0) {
        canvas.parentElement.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (gradeDistChartInstance) { gradeDistChartInstance.destroy(); gradeDistChartInstance = null; }
        return;
    }

    canvas.parentElement.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    const labels = [];
    const data = [];
    const bgColors = [];
    config.grades.forEach(g => {
        if (unitCount[g.value] > 0) {
            labels.push(`${g.letter} (${unitCount[g.value]} units)`);
            data.push(unitCount[g.value]);
            bgColors.push(config.colors[g.value]);
        }
    });

    if (gradeDistChartInstance) gradeDistChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    gradeDistChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: bgColors, borderColor: '#161b22', borderWidth: 2 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 10 }, boxWidth: 12 } }
            }
        }
    });
}

function getRemainingUnits() {
    const config = getConfig();
    const profile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
    const totalDegreeUnits = parseFloat(profile.totalUnits) || config.totalDegreeUnits;
    let earnedUnits = 0;
    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        JSON.parse(localStorage.getItem(key)).forEach(c => earnedUnits += (parseInt(c.unit) || 0));
    });
    
    const remainingInput = document.getElementById('remaining-units');
    if (remainingInput) remainingInput.value = Math.max(0, totalDegreeUnits - earnedUnits);
}

function calculateTarget() {
    const config = getConfig();
    const goal = parseFloat(document.getElementById('goal-input').value);
    const remainingUnitsInput = document.getElementById('remaining-units');
    const resultDiv = document.getElementById('target-result');

    if (!goal || !remainingUnitsInput.value) {
        alert("Wait! I need your target CGPA and remaining units to start the audit. 😊");
        return;
    }

    // ===== COLLECT HISTORICAL DATA =====
    let currentPoints = 0;
    let currentUnits = 0;
    let asCount = 0;
    let bsCount = 0;
    let csCount = 0;
    let courseHistory = [];
    let semesterGPAs = [];
    let coursesByUnit = { easy: [], medium: [], hard: [], ultraHard: [] };

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).sort().forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key) || '[]');
        let semPoints = 0, semUnits = 0;
        
        semesterData.forEach(c => {
            const u = parseFloat(c.unit || c.units || 0);
            const g = parseFloat(c.grade || 0);
            if (u > 0) {
                currentUnits += u;
                currentPoints += (u * g);
                semPoints += (u * g);
                semUnits += u;
                
                courseHistory.push({ code: c.code || 'N/A', grade: g, units: u });
                
                if(g === config.maxGPA) asCount++;
                if(g === config.maxGPA - 1) bsCount++;
                if(g === config.maxGPA - 2) csCount++;
                
                // Categorize by unit size for study focus
                if(u <= 2) coursesByUnit.easy.push({code: c.code, grade: g, units: u});
                else if(u <= 3) coursesByUnit.medium.push({code: c.code, grade: g, units: u});
                else if(u <= 4) coursesByUnit.hard.push({code: c.code, grade: g, units: u});
                else coursesByUnit.ultraHard.push({code: c.code, grade: g, units: u});
            }
        });
        if(semUnits > 0) semesterGPAs.push(semPoints / semUnits);
    });

    // ===== CALCULATE METRICS =====
    const remainingUnits = parseFloat(remainingUnitsInput.value);
    const totalUnitsFinal = currentUnits + remainingUnits;
    const currentCGPA = currentUnits > 0 ? (currentPoints / currentUnits).toFixed(2) : "0.00";
    
    const totalPointsNeeded = goal * totalUnitsFinal;
    const pointsToEarn = totalPointsNeeded - currentPoints;
    const requiredGPA = (pointsToEarn / remainingUnits).toFixed(2);
    
    const maxPossiblePoints = currentPoints + (remainingUnits * config.maxGPA);
    const maxPossibleCGPA = (maxPossiblePoints / totalUnitsFinal).toFixed(2);
    
    // ===== ADVANCED ANALYTICS =====
    // GPA Velocity (trend)
    let gpaVelocity = "STABLE";
    let velocityColor = "#34d399";
    if(semesterGPAs.length >= 2) {
        const recentGPA = semesterGPAs[semesterGPAs.length - 1];
        const prevGPA = semesterGPAs[semesterGPAs.length - 2];
        if(recentGPA > prevGPA + 0.1) { gpaVelocity = "IMPROVING 📈"; velocityColor = "#34d399"; }
        else if(recentGPA < prevGPA - 0.1) { gpaVelocity = "DECLINING 📉"; velocityColor = "#ff6b6b"; }
    }
    
    // Predictability Score (based on performance variance)
    const avgGPA = courseHistory.length > 0 ? courseHistory.reduce((s,c) => s + c.grade, 0) / courseHistory.length : 0;
    const variance = courseHistory.length > 0 ? Math.sqrt(courseHistory.reduce((s,c) => s + Math.pow(c.grade - avgGPA, 2), 0) / courseHistory.length) : 0;
    let predictability = "HIGHLY CONSISTENT ✓";
    let predictColor = "#34d399";
    if(variance > 0.8) { predictability = "VARIABLE - Need more focus"; predictColor = "#fbbf24"; }
    if(variance > 1.2) { predictability = "HIGHLY INCONSISTENT - High risk"; predictColor = "#ff6b6b"; }
    
    // Probability of Success
    let successProbability = 100;
    if(requiredGPA > config.maxGPA) successProbability = 0;
    else if(requiredGPA > avgGPA + 0.5) successProbability = Math.max(30, 100 - (requiredGPA - avgGPA) * 20);
    else if(requiredGPA <= avgGPA) successProbability = 95;
    else successProbability = 100 - ((requiredGPA - avgGPA) * 15);
    successProbability = Math.max(0, Math.min(100, successProbability));
    
    // Identify weakest/strongest courses for strategy
    const worstCourses = courseHistory.sort((a,b) => a.grade - b.grade).slice(0, 3);
    const bestCourses = courseHistory.sort((a,b) => b.grade - a.grade).slice(0, 3);

    resultDiv.style.display = "block";
    
    let greeting = "Hello Champ! 👋";
    if (currentCGPA >= (config.maxGPA - 0.5)) greeting = "First Class Scholar in the building! 🚀";
    else if (currentCGPA >= (config.maxGPA - 1)) greeting = "Solid work so far! Let's push higher. 🙌";

    let html = `<h2 style="color:var(--accent); font-size:1.2rem; margin-bottom:10px;">${greeting}</h2>`;
    html += `<p style="font-size:0.85rem; line-height:1.5; color:#e6edf3;">
                I've audited your <b>${currentUnits} units</b> of history with ADVANCED ANALYTICS enabled. 
                With <b>${asCount} As</b>, <b>${bsCount} Bs</b>, and <b>${csCount} Cs</b> secured, here is your INTELLIGENT roadmap to a <b>${goal} CGPA</b>.
             </p>`;

    let statusTheme = { label: "MODERATE", color: "#34d399", msg: "Very achievable with a structured study plan." };
    if (requiredGPA > config.maxGPA) statusTheme = { label: "IMPOSSIBLE", color: "#ff4444", msg: "Mathematically, this specific target is out of reach." };
    else if (requiredGPA > config.statusThresholds.elite) statusTheme = { label: "ELITE MODE", color: "#fbbf24", msg: "Zero margin for error. Maximum focus required." };
    else if (requiredGPA > config.statusThresholds.hard) statusTheme = { label: "HARD MODE", color: "#60a5fa", msg: "Consistent high performance is mandatory." };

    html += `
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; margin:20px 0; border:1px solid rgba(255,255,255,0.1); position:relative; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <small style="color:var(--text-dim); font-size:0.7rem; text-transform:uppercase; letter-spacing:1px;">Current Standing</small>
                    <p style="font-size:2.2rem; font-weight:bold; margin:0;">${currentCGPA}</p>
                </div>
                <span style="background:${statusTheme.color}; color:#000; padding:4px 10px; border-radius:6px; font-size:0.65rem; font-weight:bold;">${statusTheme.label}</span>
            </div>
            <p style="font-size:0.75rem; margin-top:10px; color:${statusTheme.color};"><i>"${statusTheme.msg}"</i></p>
        </div>
    `;

    // NEW: Smart Analytics Dashboard
    html += `
        <div style="background:#161b22; padding:12px; border-radius:12px; margin:16px 0; border:1px solid #30363d;">
            <h4 style="color:var(--accent); font-size:0.9rem; margin-bottom:10px;">⚡ SMART ANALYTICS DASHBOARD</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; font-size:0.75rem;">
                <div style="background:rgba(52,211,153,0.05); padding:8px; border-radius:8px; border-left:2px solid ${velocityColor};">
                    <small style="color:var(--text-dim); display:block;">Performance Trend</small>
                    <b style="color:${velocityColor};">${gpaVelocity}</b>
                </div>
                <div style="background:rgba(96,165,250,0.05); padding:8px; border-radius:8px; border-left:2px solid ${predictColor};">
                    <small style="color:var(--text-dim); display:block;">Consistency Score</small>
                    <b style="color:${predictColor};">${predictability}</b>
                </div>
                <div style="background:rgba(139,166,246,0.05); padding:8px; border-radius:8px; border-left:2px solid #8ba6f6;">
                    <small style="color:var(--text-dim); display:block;">Success Probability</small>
                    <b style="color:#8ba6f6;">${Math.round(successProbability)}% Likely ✓</b>
                </div>
            </div>
        </div>
    `;

    if (requiredGPA > config.maxGPA) {
        html += `
            <div style="background:rgba(255,68,68,0.05); padding:15px; border-radius:10px; border-left:4px solid #ff4444; margin-bottom: 15px;">
                <p style="font-weight:bold; color:#ff4444; margin-bottom:8px; font-size: 0.9rem;">System Reality Check</p>
                <p style="font-size:0.8rem; line-height:1.5; color:#e6edf3;">
                    To reach a ${goal}, you'd need to average a <b>${requiredGPA} GPA</b>. Since the max is ${config.maxGPA}, this target is not possible.
                </p>
            </div>
            
            <div style="background:#1c2128; padding:15px; border-radius:10px; border:1px solid var(--accent);">
                <p style="font-size:0.8rem; font-weight:bold; color:var(--accent); margin-bottom:5px;">Your New Max Potential</p>
                <p style="font-size:0.85rem; line-height:1.4;">
                    If you secure a perfect ${config.maxGPA} in every remaining course, you will graduate with a <b>${maxPossibleCGPA} CGPA</b>.
                </p>
            </div>`;
    } else {
        let minUnitsA = Math.ceil(pointsToEarn - ((config.maxGPA - 1) * remainingUnits));
        if (minUnitsA < 0) minUnitsA = 0; 
        if (minUnitsA > remainingUnits) minUnitsA = remainingUnits;

        let maxUnitsB = Math.floor(remainingUnits - minUnitsA);

        // ===== ADVANCED STRATEGY ENGINE =====
        // Calculate alternative scenarios
        const scenarios = [];
        
        // Scenario 1: Conservative (Safe path with buffer)
        let conservativeA = Math.ceil(minUnitsA * 1.15);
        if(conservativeA > remainingUnits) conservativeA = remainingUnits;
        scenarios.push({
            name: "Safe Path (Recommended)",
            aUnits: conservativeA,
            bUnits: remainingUnits - conservativeA,
            risk: "LOW",
            riskColor: "#34d399",
            description: "Extra buffer for unexpected challenges"
        });
        
        // Scenario 2: Aggressive (Minimum path)
        scenarios.push({
            name: "Minimum Path (Risky)",
            aUnits: minUnitsA,
            bUnits: remainingUnits - minUnitsA,
            risk: "HIGH",
            riskColor: "#ff6b6b",
            description: "Zero margin for error, any slip-up damages target"
        });
        
        // Scenario 3: Balanced (Middle ground)
        let balancedA = Math.round((minUnitsA + conservativeA) / 2);
        if(balancedA > remainingUnits) balancedA = remainingUnits;
        scenarios.push({
            name: "Balanced Path",
            aUnits: balancedA,
            bUnits: remainingUnits - balancedA,
            risk: "MEDIUM",
            riskColor: "#fbbf24",
            description: "Middle ground with reasonable flexibility"
        });

        // Identify courses needing focus based on past performance
        const weakSubjectCodes = courseHistory
            .sort((a,b) => a.grade - b.grade)
            .slice(0, Math.max(2, Math.floor(courseHistory.length * 0.25)))
            .map(c => c.code);
        
        const strongSubjectCodes = courseHistory
            .sort((a,b) => b.grade - a.grade)
            .slice(0, Math.max(2, Math.floor(courseHistory.length * 0.25)))
            .map(c => c.code);

        html += `
            <h3 style="font-size:1rem; margin-bottom:12px; color:var(--accent); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">🎮 INTELLIGENT STRATEGY ENGINE</h3>
            <p style="font-size:0.85rem; margin-bottom:15px;">
                You must maintain an average of <b>${requiredGPA} GPA</b> across <b>${remainingUnits} units</b>. 
                The system analyzed ${courseHistory.length} past courses to build personalized strategies.
            </p>

            <div style="background:#161b22; padding:14px; border-radius:12px; border:1px solid #30363d; margin-bottom:16px;">
                <p style="font-size:0.75rem; font-weight:bold; margin-bottom:12px; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px;">📊 THREE STRATEGIC PATHWAYS</p>
                <div style="display:grid; gap:10px;">
        `;
        
        scenarios.forEach(s => {
            html += `
                <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid #30363d; border-left:3px solid ${s.riskColor};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="flex:1;">
                            <p style="margin:0; font-size:0.85rem; font-weight:bold; color:#fff;">${s.name}</p>
                            <small style="color:var(--text-dim); display:block; margin-top:4px;">${s.description}</small>
                        </div>
                        <span style="background:${s.riskColor}; color:#000; padding:3px 8px; border-radius:4px; font-size:0.65rem; font-weight:bold; white-space:nowrap;">${s.risk} RISK</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                        <div style="background:rgba(52,211,153,0.1); padding:6px 8px; border-radius:6px; border:1px solid rgba(52,211,153,0.3);">
                            <small style="color:var(--text-dim); font-size:0.65rem;">Target A's</small>
                            <p style="margin:2px 0; font-weight:bold; color:#34d399;">${s.aUnits} units</p>
                        </div>
                        <div style="background:rgba(96,165,250,0.1); padding:6px 8px; border-radius:6px; border:1px solid rgba(96,165,250,0.3);">
                            <small style="color:var(--text-dim); font-size:0.65rem;">Max B's</small>
                            <p style="margin:2px 0; font-weight:bold; color:#60a5fa;">${s.bUnits} units</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>

            <div style="background:#1c2128; padding:12px; border-radius:12px; border:1px solid #30363d; margin-bottom:16px;">
                <h4 style="font-size:0.85rem; color:var(--accent); margin-bottom:10px;">🎯 YOUR PERFORMANCE PROFILE</h4>
        `;
        
        if(weakSubjectCodes.length > 0) {
            html += `
                <div style="margin-bottom:10px;">
                    <small style="color:var(--text-dim); display:block; margin-bottom:4px;">⚠️ Subjects That Needed Improvement:</small>
                    <p style="margin:0; font-size:0.8rem; color:#ff6b6b;"><b>${weakSubjectCodes.join(', ')}</b><br><small>These courses historically challenged you. Plan extra study time.</small></p>
                </div>
            `;
        }
        
        if(strongSubjectCodes.length > 0) {
            html += `
                <div style="margin-bottom:10px;">
                    <small style="color:var(--text-dim); display:block; margin-bottom:4px;">✅ Your Strength Areas:</small>
                    <p style="margin:0; font-size:0.8rem; color:#34d399;"><b>${strongSubjectCodes.join(', ')}</b><br><small>Leverage these strengths and master similar course types.</small></p>
                </div>
            `;
        }
        
        html += `
                <small style="color:var(--text-dim); display:block; margin-top:8px;">Performance Variance: <b>${variance.toFixed(2)}</b> (0=perfect consistency, 2+=highly variable)</small>
            </div>

            <div style="background:rgba(96, 165, 250, 0.05); padding:12px; border-radius:8px; border-left:3px solid #60a5fa; margin-bottom:16px;">
                <p style="font-size:0.8rem; color:#e6edf3; line-height:1.5; margin:0;">
                    <b>💡 Smart Recommendation:</b> Start with the <b>Safe Path</b> (${scenarios[0].aUnits} A's). This gives you breathing room. 
                    Once you ace your first 2-3 exams this semester, you can reassess and pivot to Balanced or even Minimum if needed.
                </p>
            </div>

            <div style="background:rgba(255, 191, 0, 0.05); padding:12px; border-radius:8px; border-left:3px solid #fbbf24;">
                <p style="font-size:0.75rem; color:#e6edf3; line-height:1.5; margin:0;">
                    <b>🚨 Critical:</b> High-unit courses (4+ units) are leverage points. Securing an A in one 4-unit course equals securing A's in two 2-unit courses. 
                    Prioritize ${coursesByUnit.ultraHard.length > 0 ? 'high-unit courses' : 'strategic course selection'}.
                </p>
            </div>
        `;
    }

    html += `
        <div style="margin-top:25px; border-top:1px solid #30363d; padding-top:15px; text-align:center;">
            <button onclick="document.getElementById('goal-input').focus();" 
                    style="background:transparent; border:1px solid var(--accent); color:var(--accent); padding:8px 20px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                Adjust Target CGPA
            </button>
        </div>
    `;

    resultDiv.innerHTML = html;
    triggerAdRefresh();
}

function exportBackupJSON() {
    const config = getConfig();
    const profile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
    const semesters = {};
    Object.keys(localStorage)
        .filter(k => k.startsWith(config.prefixes.data))
        .sort()
        .forEach(key => {
            const shortKey = key.replace(config.prefixes.data, '');
            semesters[shortKey] = JSON.parse(localStorage.getItem(key) || '[]');
        });
    const semesterNotes = {};
    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.notes)).forEach(k => {
        semesterNotes[k.replace(config.prefixes.notes, '')] = localStorage.getItem(k) || '';
    });
    const backup = {
        version: ACTIVE_SCALE,
        exportedAt: new Date().toISOString(),
        profile,
        semesters,
        semesterNotes
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ExamVenture_${ACTIVE_SCALE}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    alert("Backup downloaded! Use 'Import from File' to restore on another device.");
}

function exportToPDF() {
    const config = getConfig();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const profile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');

    const NAVY = [11, 14, 20];
    const GOLD = [251, 191, 36];

    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setFontSize(22);
    doc.text("EXAMS VENTURE (" + ACTIVE_SCALE + ")", 20, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("OFFICIAL ACADEMIC PERFORMANCE REPORT", 20, 30);
    doc.text(`Student: ${profile.name || '---'}`, 130, 20);
    doc.text(`Dept: ${profile.dept || '---'}`, 130, 28);

    let cgpa = document.getElementById('display-cgpa').innerText;
    let units = document.getElementById('display-units').innerText;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Cumulative CGPA (${ACTIVE_SCALE}): ${cgpa}`, 20, 50);
    doc.text(`Total Units Earned: ${units}`, 120, 50);

    let y = 65;

    const drawTableHeader = (posY, title) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text(title.toUpperCase(), 20, posY - 5);
        doc.setFillColor(240, 240, 240);
        doc.rect(20, posY, 170, 8, 'F');
        doc.setFontSize(9);
        doc.text("COURSE CODE", 25, posY + 5);
        doc.text("UNITS", 100, posY + 5);
        doc.text("GRADE", 160, posY + 5);
        return posY + 8;
    };

    Object.keys(localStorage)
        .filter(k => k.startsWith(config.prefixes.data)) 
        .sort().forEach(key => {
            if (y > 240) { doc.addPage(); y = 30; }
            
            const semTitle = key.replace(config.prefixes.data, '').replace('-', ' Level - ');
            y = drawTableHeader(y, semTitle);
            
            const semesterData = JSON.parse(localStorage.getItem(key)) || [];
            
            doc.setFont("helvetica", "normal");
            semesterData.forEach((c, index) => {
                if (index % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(20, y, 170, 7, 'F');
                }
                doc.text(c.code.toUpperCase(), 25, y + 5);
                doc.text(c.unit.toString(), 105, y + 5);
                doc.text(getLetterGrade(c.grade), 165, y + 5);
                y += 7;
            });
            const semKey = key.replace(config.prefixes.data, '');
            const notes = localStorage.getItem(getStorageKey('notes', semKey)) || '';
            if (notes) {
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Note: ' + notes, 20, y + 5);
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                y += 10;
            }
            y += 15;
        });

    const pageHeight = doc.internal.pageSize.height;
    
    doc.setDrawColor(230, 230, 230);
    doc.line(20, pageHeight - 30, 190, pageHeight - 30);

    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(20, pageHeight - 25, 45, 15, 'F'); 
    
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setFontSize(7);
    doc.text("VERIFIED BY", 25, pageHeight - 19);
    doc.setFontSize(9);
    doc.text("EXAMS VENTURE", 25, pageHeight - 14);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const date = new Date().toLocaleDateString();
    doc.text(`Authentic ${ACTIVE_SCALE} Record: ${date}`, 70, pageHeight - 14);

    doc.save(`Transcript_${ACTIVE_SCALE}_${profile.name || 'Student'}.pdf`);
}

function clearAllData() {
    const config = getConfig();
    if (confirm(`⚠️ DANGER: Delete ALL ${ACTIVE_SCALE} records?`)) {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(config.prefixes.data) || k.startsWith(config.prefixes.notes)) {
                localStorage.removeItem(k);
            }
        });
        
        updateDashboard();
        getRemainingUnits();
        
        const semSelect = document.getElementById('sem-select');
        if (semSelect) loadSemesterData(semSelect.value);
        
        alert(`${ACTIVE_SCALE} Data Wiped.`);
        switchView('view-dashboard');
    }
}

function saveProfile() {
    const config = getConfig();
    const profileData = {
        name: document.getElementById('setup-name')?.value || "Scholar",
        uni: document.getElementById('setup-uni')?.value || "",
        faculty: document.getElementById('setup-faculty')?.value || "",
        dept: document.getElementById('setup-dept')?.value || "",
        level: document.getElementById('setup-level')?.value || "",
        totalUnits: document.getElementById('prof-total-units').value 
    };

    if (!profileData.totalUnits) {
        alert("Please enter your Total Degree Units to enable the Target Tracker! 😊");
        return;
    }

    localStorage.setItem(getStorageKey('profile'), JSON.stringify(profileData));
    
    if (typeof applyProfile === "function") applyProfile(); 
    
    updateDashboard(); 
    updateRemainingUnitsDisplay(); 
    
    alert(`${ACTIVE_SCALE} Profile & Target Tracker Updated Successfully! 🚀`);
    
    switchView('view-dashboard');
}

function loadProfile() {
    const config = getConfig();
    const saved = localStorage.getItem(getStorageKey('profile'));
    if (saved) {
        const profile = JSON.parse(saved);
        const setupName = document.getElementById('setup-name');
        const setupDept = document.getElementById('setup-dept');
        const setupLevel = document.getElementById('setup-level');
        const profTotalUnits = document.getElementById('prof-total-units');
        if (setupName) setupName.value = profile.name || "";
        if (setupDept) setupDept.value = profile.dept || "";
        if (setupLevel) setupLevel.value = profile.level || "";
        if (profTotalUnits) profTotalUnits.value = profile.totalUnits || "";
    }
}

function applyProfile() {
    const config = getConfig();
    const savedProfile = localStorage.getItem(getStorageKey('profile'));
    if (!savedProfile) return;

    const data = JSON.parse(savedProfile);
    
    const safeDept = data.dept ? data.dept.substring(0, 3).toUpperCase() : 'DPT';
    
    if(document.getElementById('prof-name')) document.getElementById('prof-name').innerText = data.name || 'Student Name';
    if(document.getElementById('prof-level')) document.getElementById('prof-level').innerText = data.level || '---';
    if(document.getElementById('prof-uni')) document.getElementById('prof-uni').innerText = data.uni || '---';
    if(document.getElementById('prof-dept-short')) document.getElementById('prof-dept-short').innerText = safeDept;

    if(document.getElementById('prof-name-side')) document.getElementById('prof-name-side').innerText = data.name || 'Student Name';
    if(document.getElementById('prof-level-side')) document.getElementById('prof-level-side').innerText = data.level || '---';
    if(document.getElementById('prof-uni-side')) document.getElementById('prof-uni-side').innerText = data.uni || '---';
    if(document.getElementById('prof-dept-short-side')) document.getElementById('prof-dept-short-side').innerText = safeDept;

    if(document.getElementById('setup-name')) document.getElementById('setup-name').value = data.name || '';
    if(document.getElementById('setup-uni')) document.getElementById('setup-uni').value = data.uni || '';
    if(document.getElementById('setup-faculty')) document.getElementById('setup-faculty').value = data.faculty || '';
    if(document.getElementById('setup-dept')) document.getElementById('setup-dept').value = data.dept || '';
    if(document.getElementById('setup-level')) document.getElementById('setup-level').value = data.level || '100 Level';
    if(document.getElementById('prof-total-units')) document.getElementById('prof-total-units').value = data.totalUnits || '';
}

function renderAcademicHistory() {
    const config = getConfig();
    const listContainer = document.getElementById('dynamic-sem-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(config.prefixes.data)) 
        .sort().reverse();

    if (keys.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-dim);">No ${ACTIVE_SCALE} data found.</p>`;
        return;
    }

    keys.forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key));
        let sPoints = 0, sUnits = 0;

        semesterData.forEach(c => {
            const u = parseInt(c.unit) || 0;
            sUnits += u;
            const gradeVal = limitGrade(c.grade);
            sPoints += (u * gradeVal);
        });

        const sGpa = sUnits > 0 ? (sPoints / sUnits).toFixed(2) : "0.00";
        const title = key.replace(config.prefixes.data, '').replace('-', ' Level - ');
        const semKey = key.replace(config.prefixes.data, '');
        const notes = localStorage.getItem(getStorageKey('notes', semKey)) || '';
        const raw = notes.length > 35 ? notes.substring(0, 35) + '...' : notes;
        const notesPreview = notes ? raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;') : '';

        const card = document.createElement('div');
        card.className = 'stats-card clickable-history';
        card.onclick = () => {
            const semSelect = document.getElementById('sem-select');
            if (semSelect) {
                semSelect.value = semKey;
                loadSemesterData(semKey);
            }
            switchView('view-calc');
        };
        card.style.cursor = 'pointer';
        card.style.padding = '18px 20px';
        card.style.marginBottom = '12px';
        card.style.textAlign = 'left';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1; min-width: 0;">
                    <strong style="color: var(--accent); display: block; margin-bottom: 2px;">${title}</strong>
                    <p style="font-size: 0.75rem; color: var(--text-dim)">${sUnits} Units</p>
                    ${notesPreview ? `<p style="font-size: 0.7rem; color: var(--text-dim); font-style: italic; margin-top: 4px;">"${notesPreview}"</p>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <span style="color: var(--accent); font-size: 0.9rem; opacity: 0.7;">✎</span>
                    <span class="badge" style="background: ${sGpa >= (config.maxGPA - 0.5) ? 'rgba(76, 175, 80, 0.1)' : 'rgba(251, 191, 36, 0.1)'}; 
                                               color: ${sGpa >= (config.maxGPA - 0.5) ? '#4caf50' : 'var(--accent)'}; font-weight: bold;">
                        ${sGpa} GPA
                    </span>
                    <button onclick="event.stopPropagation(); deleteSemester('${key}')" 
                            style="background:none; border:none; cursor:pointer; color:#ff4444; font-size: 1.2rem; padding: 5px;">
                        🗑️
                    </button>
                </div>
            </div>`;
        listContainer.appendChild(card);
    });
}

function deleteSemester(key) {
    const config = getConfig();
    const title = key.replace(config.prefixes.data, '').replace('-', ' Level - ');
    if (confirm(`Delete ${title} history?`)) {
        localStorage.removeItem(key);
        const semKey = key.replace(config.prefixes.data, '');
        localStorage.removeItem(getStorageKey('notes', semKey));
        updateDashboard();
    }
}

function checkLogin() {
    const config = getConfig();
    const enteredPin = document.getElementById('login-pin').value;
    const storedPin = localStorage.getItem(getStorageKey('pin'));

    if (!storedPin) {
        if (enteredPin.length < 4) return alert("Please set a 4-digit PIN");
        localStorage.setItem(getStorageKey('pin'), enteredPin);
        alert("PIN Set Successfully!");
        unlockApp();
    } else {
        if (enteredPin === storedPin) {
            unlockApp();
        } else {
            alert("Incorrect PIN!");
            document.getElementById('login-pin').value = '';
        }
    }
}

function unlockApp() {
    switchView('view-dashboard');
    const topBar = document.querySelector('.top-bar');
    if (topBar) topBar.style.display = 'flex';
    document.getElementById('login-pin').value = '';
    const adHouse = document.getElementById('ad-container-bottom');
    if (adHouse) adHouse.style.display = 'block';
    const config = getConfig();
    if (!localStorage.getItem(getStorageKey('onboarding'))) showOnboarding();
}

function showOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.getElementById('onboarding-step-1').style.display = 'block';
    document.getElementById('onboarding-step-2').style.display = 'none';
    document.getElementById('onboarding-step-3').style.display = 'none';
}

function onboardingNext() {
    const s1 = document.getElementById('onboarding-step-1');
    const s2 = document.getElementById('onboarding-step-2');
    const s3 = document.getElementById('onboarding-step-3');
    if (s1.style.display !== 'none') { s1.style.display = 'none'; s2.style.display = 'block'; }
    else if (s2.style.display !== 'none') { s2.style.display = 'none'; s3.style.display = 'block'; }
}

function onboardingComplete() {
    const config = getConfig();
    localStorage.setItem(getStorageKey('onboarding'), 'true');
    document.getElementById('onboarding-overlay').style.display = 'none';
    switchView('view-calc');
}

function onboardingSkip() {
    const config = getConfig();
    localStorage.setItem(getStorageKey('onboarding'), 'true');
    document.getElementById('onboarding-overlay').style.display = 'none';
}


function handleReset() {
    const config = getConfig();
    const confirmReset = confirm(`DANGER: This will delete ALL your ${ACTIVE_SCALE} saved grades and your PIN. \n\nAre you sure?`);

    if (confirmReset) {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(config.prefixes.data) || k === getStorageKey('pin')) {
                localStorage.removeItem(k);
            }
        });
        
        alert(`${ACTIVE_SCALE} App has been reset successfully.`);
        location.reload();
    }
}

function updateRemainingUnitsDisplay() {
    const config = getConfig();
    const remainingUnitsElement = document.getElementById('remaining-units');
    if (!remainingUnitsElement) return;

    const savedProfile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
    const totalUnitsToGraduate = parseInt(savedProfile.totalUnits) || config.totalDegreeUnits; 

    let earnedUnits = 0;
    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key) || '[]');
        semesterData.forEach(course => {
            earnedUnits += (parseInt(course.unit) || 0);
        });
    });

    const remaining = totalUnitsToGraduate - earnedUnits;
    remainingUnitsElement.value = remaining > 0 ? remaining : 0;
}

function importDataJSON(inputEl) {
    const config = getConfig();
    const file = inputEl?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                data.forEach(c => renderCourseRow(c.code, c.unit, c.grade));
                alert(`Imported ${data.length} courses to current semester.`);
            } else if (data.semesters && typeof data.semesters === 'object') {
                const isForThisScale = data.version === ACTIVE_SCALE;
                if (!isForThisScale) {
                    alert(`Warning: This backup is for ${data.version} scale, but you're on ${ACTIVE_SCALE}. Importing anyway...`);
                }
                Object.keys(data.semesters).forEach(semKey => {
                    localStorage.setItem(getStorageKey('data', semKey), JSON.stringify(data.semesters[semKey]));
                });
                if (data.semesterNotes) {
                    Object.keys(data.semesterNotes).forEach(semKey => {
                        localStorage.setItem(getStorageKey('notes', semKey), data.semesterNotes[semKey] || '');
                    });
                }
                if (data.profile) {
                    localStorage.setItem(getStorageKey('profile'), JSON.stringify(data.profile));
                }
                updateDashboard();
                getRemainingUnits();
                const semSelect = document.getElementById('sem-select');
                if (semSelect) loadSemesterData(semSelect.value);
                applyProfile();
                renderAcademicHistory();
                alert(`Backup restored: ${Object.keys(data.semesters).length} semesters.`);
            } else {
                alert("Unsupported file format. Use a JSON array or Exams Venture backup file.");
            }
        } catch (err) {
            alert("Invalid JSON file. Please check the format.");
        }
        inputEl.value = '';
    };
    reader.readAsText(file);
}

function triggerImportFile() {
    document.getElementById('import-file').click();
}

function toggleBulkInput() {
    const area = document.getElementById('bulk-input-area');
    if (area) {
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
    }
}

function copyPrompt() {
    const textElement = document.getElementById('ai-prompt-text');
    const btn = document.querySelector('.btn-copy');
    if (!textElement) return;

    const textToCopy = textElement.innerText;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            updateCopyBtnStatus(btn);
        }).catch(() => fallbackCopyText(textToCopy, btn));
    } else {
        fallbackCopyText(textToCopy, btn);
    }
}

function fallbackCopyText(text, btn) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        updateCopyBtnStatus(btn);
    } catch (err) {
        console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
}

function updateCopyBtnStatus(btn) {
    const originalText = btn.innerText;
    btn.innerText = "Copied!";
    btn.style.background = "#4caf50"; 
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = "var(--accent)";
    }, 2000);
}

function processBulkJSON() {
    const rawData = document.getElementById('json-paste-area').value.trim();
    
    try {
        const courses = JSON.parse(rawData);
        if (!Array.isArray(courses)) throw new Error("Invalid Format");

        courses.forEach(course => {
            renderCourseRow(course.code, course.unit, course.grade);
        });

        alert(`Successfully imported ${courses.length} courses!`);
        document.getElementById('json-paste-area').value = '';
        toggleBulkInput();
        updateProjectedCGPA(); 
    } catch (e) {
        alert("Please paste a valid JSON list from the AI (starting with [ and ending with ]).");
    }
}

/**
 * ADMOB & AD ENGINE
 */
const ADMOB_ID = 'ca-app-pub-3940256099942544/6300978111';
let adRefreshCount = 0;
const MAX_REFRESHES = 15;

// ===== PERSISTENT AD MANAGEMENT =====
const AD_REFRESH_KEY = 'last_ad_refresh_timestamp';
const AD_CONTEXT_REFRESH_KEY = 'last_context_ad_refresh';
const MIN_AD_REFRESH_INTERVAL = 180000; // 3 minutes
const MIN_CONTEXT_AD_INTERVAL = 30000;  // 30 seconds for view changes

function canRefreshAd() {
    const now = Date.now();
    const lastRefresh = localStorage.getItem(AD_REFRESH_KEY);
    
    // If no previous refresh, allow it (first time)
    if (!lastRefresh) {
        return true;
    }
    
    // Only allow if 3 minutes have passed
    const timeSinceLastRefresh = now - parseInt(lastRefresh);
    return timeSinceLastRefresh >= MIN_AD_REFRESH_INTERVAL;
}

function recordAdRefresh() {
    localStorage.setItem(AD_REFRESH_KEY, Date.now());
    console.log("✓ Ad refresh recorded. Next allowed in 3 minutes.", new Date().toLocaleTimeString());
}

function canContextRefreshAd() {
    const now = Date.now();
    const lastContextRefresh = localStorage.getItem(AD_CONTEXT_REFRESH_KEY);
    
    if (!lastContextRefresh) return true;
    
    const timeSinceContextRefresh = now - parseInt(lastContextRefresh);
    return timeSinceContextRefresh >= MIN_CONTEXT_AD_INTERVAL;
}

function recordContextAdRefresh() {
    localStorage.setItem(AD_CONTEXT_REFRESH_KEY, Date.now());
}

// ===== REMOVED: Timer-based ad refresh (Google AdSense policy violation) =====
// All ad refreshes now triggered by user actions (view navigation) via switchView()

function showWaitScreen(msg) {
    const loginView = document.getElementById('view-login');
    if (loginView) {
        loginView.innerHTML = `
            <div class="stats-card" style="text-align:center; border: 1px solid var(--accent); margin: 20px;">
                <h3 style="color:var(--accent)">Exams Venture</h3>
                <p style="margin: 15px 0; font-size: 0.9rem;">${msg}</p>
                <div style="width:30px; height:30px; border:3px solid #30363d; border-top:3px solid var(--accent); border-radius:50%; animation: spin 1s linear infinite; margin: 10px auto;"></div>
            </div>`;
    }
}


// ===== GOOGLE ADSENSE USER-ACTION MODEL =====
// Ads only refresh when: user navigates (switchView) or page loads
// Complies with Google AdSense "User-Action" refresh policies
const AdEngine = {
    init() {
        const adWrapper = document.getElementById('dynamic-ad-wrapper');
        if (!adWrapper) return;

        // ===== PAGE LOAD: Trigger initial ad if eligible =====
        const timeUntilAllowed = this.getTimeUntilNextRefresh();
        if (timeUntilAllowed > 0) {
            console.log(`⏳ Ad refresh blocked. Allowed in ${Math.ceil(timeUntilAllowed / 1000)} seconds.`);
        } else {
            console.log("✓ 3-minute rule satisfied. Ad eligible for refresh on page load.");
            if (this.isEligibleForRefresh() && navigator.onLine && window.adsbygoogle) {
                this.pushAd();
            }
        }
    },

    getTimeUntilNextRefresh() {
        const now = Date.now();
        const lastRefresh = localStorage.getItem(AD_REFRESH_KEY);
        
        if (!lastRefresh) return 0; // First time, no wait needed
        
        const timeSinceLastRefresh = now - parseInt(lastRefresh);
        return Math.max(0, MIN_AD_REFRESH_INTERVAL - timeSinceLastRefresh);
    },

    isEligibleForRefresh() {
        return canRefreshAd();
    },

    pushAd() {
        // ===== SAFETY CHECKS: Only push if user is online and library loaded =====
        if (!navigator.onLine) {
            console.warn("❌ Ad push blocked: User is offline.");
            return;
        }

        if (!window.adsbygoogle) {
            console.warn("❌ Ad push blocked: adsbygoogle library not loaded.");
            return;
        }

        if (!this.isEligibleForRefresh()) {
            console.warn("❌ Ad push blocked by 3-minute rule. Wait " + Math.ceil(this.getTimeUntilNextRefresh() / 1000) + " seconds.");
            return;
        }

        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
            recordAdRefresh(); // Record ONLY after successful push
            console.log("✓ Ad pushed successfully (user-action triggered)");
        } catch (e) {
            console.error("AdSense Push Error:", e);
        }
    }
};

/**
 * PWA INSTALLATION & PERMANENT STORAGE LOGIC
 */
let deferredPrompt;

// Check if app is already installed/running in standalone mode
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Request Permanent Storage from the phone
async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`PWA: Permanent Storage granted? ${isPersisted}`);
    }
}

// Initialize PWA Visibility
function initPWAVisibility() {
    const installBtn = document.getElementById('install-btn');
    const installBtnIndex = document.getElementById('install-btn-index');
    
    const isInstalled = isAppInstalled();
    console.log(`PWA Status: ${isInstalled ? 'Standalone/Installed' : 'Browser/Not Installed'}`);

    if (isInstalled) {
        if (installBtn) installBtn.style.display = 'none';
        if (installBtnIndex) installBtnIndex.style.display = 'none';
    } else {
        // Show in browser
        if (installBtn) {
            installBtn.style.display = 'block';
            installBtn.style.opacity = '1';
        }
        if (installBtnIndex) {
            installBtnIndex.style.display = 'block';
            installBtnIndex.style.opacity = '1';
        }
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Ensure button is visible
    initPWAVisibility();
});

async function installPWA() {
    if (deferredPrompt) {
        // Show the browser's native install prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        
        if (outcome === 'accepted') {
            const installBtn = document.getElementById('install-btn');
            if (installBtn) installBtn.style.display = 'none';
        }
    } else {
        // Fallback: Manual Instructions (for iOS or delayed prompts)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            alert("To install on iOS:\n1. Tap the 'Share' icon (square with arrow) at the bottom.\n2. Scroll down and tap 'Add to Home Screen'.");
        } else {
            alert("To install:\n1. Open your browser menu (usually three dots ⋮).\n2. Tap 'Install App' or 'Add to Home Screen'.");
        }
    }
}

window.addEventListener('appinstalled', (evt) => {
    console.log('App installed successfully');
    requestPersistentStorage(); // Lock files to permanent storage
    
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'none';

    // Show the confirmation notification
    const notification = document.getElementById('install-notification');
    if (notification) {
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.animation = 'slideDown 0.5s ease-in forwards';
            setTimeout(() => notification.style.display = 'none', 500);
        }, 4000);
    }
});

// ===== OFFLINE LOCKDOWN SYSTEM (5-MINUTE HARD LOCKDOWN) =====
const OFFLINE_KEY = 'offline_start_time';
const OFFLINE_LOCKOUT_TIME = 300000; // 5 minutes in milliseconds
let offlineCountdownTimer = null;

function initOfflineDetection() {
    // Check periodic online status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if already offline
    if (!navigator.onLine) {
        handleOffline();
    }
}

function handleOffline() {
    console.log("User is now OFFLINE");
    const now = Date.now();
    
    // Only set the timer if not already set (preserve across page reloads)
    if (!sessionStorage.getItem(OFFLINE_KEY)) {
        sessionStorage.setItem(OFFLINE_KEY, now);
    }
    
    startOfflineCountdown();
}

function handleOnline() {
    console.log("User is now ONLINE");
    
    // Clear offline tracking
    sessionStorage.removeItem(OFFLINE_KEY);
    hideOfflineLockout();
    stopOfflineCountdown();
    
    // ===== STRICT: Only attempt ad refresh if 3-minute rule allows =====
    if (AdEngine.isEligibleForRefresh()) {
        AdEngine.pushAd();
    }
}

function startOfflineCountdown() {
    if (offlineCountdownTimer) return; // Already running
    
    offlineCountdownTimer = setInterval(() => {
        const offlineStartTime = sessionStorage.getItem(OFFLINE_KEY);
        if (!offlineStartTime) return; // Online again
        
        const now = Date.now();
        const timeOffline = now - parseInt(offlineStartTime);
        const timeRemaining = Math.max(0, OFFLINE_LOCKOUT_TIME - timeOffline);
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        
        // Update countdown display
        const countdownElement = document.getElementById('offline-countdown');
        if (countdownElement) {
            if (secondsRemaining > 0) {
                const mins = Math.floor(secondsRemaining / 60);
                const secs = secondsRemaining % 60;
                countdownElement.textContent = `Offline: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                countdownElement.style.display = 'inline';
            }
        }
        
        // If time expired, show lockout
        if (timeRemaining <= 0) {
            stopOfflineCountdown();
            showOfflineLockout();
        }
    }, 1000); // Update every second
}

function stopOfflineCountdown() {
    if (offlineCountdownTimer) {
        clearInterval(offlineCountdownTimer);
        offlineCountdownTimer = null;
    }
    
    const countdownElement = document.getElementById('offline-countdown');
    if (countdownElement) {
        countdownElement.style.display = 'none';
    }
}

function showOfflineLockout() {
    const overlay = document.getElementById('offline-lockout');
    if (overlay) {
        overlay.classList.add('active');
        overlay.style.display = 'flex';
    }
    
    disableAllControls(true);
}

function hideOfflineLockout() {
    const overlay = document.getElementById('offline-lockout');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
    }
    
    disableAllControls(false);
}

function disableAllControls(shouldDisable) {
    const buttons = document.querySelectorAll('button');
    const inputs = document.querySelectorAll('input, select, textarea');
    const links = document.querySelectorAll('a');
    
    const elements = [...buttons, ...inputs, ...links];
    
    elements.forEach(el => {
        if (shouldDisable) {
            el.disabled = true;
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.5';
        } else {
            el.disabled = false;
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    // 1. Core State Initialization
    localStorage.setItem('ev-scale', ACTIVE_SCALE);
    initTheme();
    populateSemesters();
    applyProfile();
    updateDashboard();
    updateRemainingUnitsDisplay();
    
    // 2. Calculator UI Listeners
    const semSelect = document.getElementById('sem-select');
    if (semSelect) loadSemesterData(semSelect.value);

    const viewCalc = document.getElementById('view-calc');
    if (viewCalc) {
        viewCalc.addEventListener('change', () => updateProjectedCGPA());
        viewCalc.addEventListener('input', () => updateProjectedCGPA());
    }

    // 3. Login & Navigation UI
    const loginView = document.getElementById('view-login');
    if (loginView && loginView.classList.contains('active')) {
        const topBar = document.querySelector('.top-bar');
        if (topBar) topBar.style.display = 'none';
        const adHouse = document.getElementById('ad-container-bottom');
        if (adHouse) adHouse.style.display = 'none';
    }

    const savedPin = localStorage.getItem(getStorageKey('pin'));
    const instruction = document.getElementById('login-instruction');
    if (instruction) {
        if (savedPin) {
            instruction.innerText = `Enter your secret ${ACTIVE_SCALE} PIN to continue`;
        } else {
            instruction.innerText = `First time here? Create a 4-digit PIN to secure your ${ACTIVE_SCALE} data.`;
        }
    }

    const profileInput = document.getElementById('prof-total-units');
    if (profileInput) {
        const savedProfile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
        if (savedProfile.totalUnits) {
            profileInput.value = savedProfile.totalUnits;
        }
    }

    // 4. Scale Switching Sidebar
    const scaleLinksContainer = document.getElementById('scale-links');
    if (scaleLinksContainer) {
        const otherScales = Object.keys(SCALE_CONFIG).filter(s => s !== ACTIVE_SCALE);
        scaleLinksContainer.innerHTML = otherScales.map(scale => `
            <a href="calculator.html?scale=${scale}" style="color: var(--accent); text-decoration: none; font-size: 0.88rem; font-weight: 600;" title="Open the ${scale} calculator">
                Switch to ${scale} scale
            </a>
        `).join('');
    }

    // 5. Capacitor & AdMob
    if (window.Capacitor) {
        try {
            await window.Capacitor.Plugins.AdMob.initialize();
            triggerAdRefresh();
        } catch (e) { console.log("AdMob init failed"); }
    }

    // 6. AdEngine, Offline, & PWA
    AdEngine.init();
    initOfflineDetection();
    requestPersistentStorage();
    initPWAVisibility();

    // 7. Service Worker Registration
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('sw.js');
            console.log('Exams Venture PWA: Active', reg.scope);
        } catch (err) {
            console.log('PWA Registration Failed: ', err);
        }
    }
});
