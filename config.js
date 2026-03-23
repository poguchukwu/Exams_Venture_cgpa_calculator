/**
 * EXAMS VENTURE - UNIFIED SCALE CONFIGURATION
 * Eliminates code duplication for 4.0 and 5.0 CGPA scales
 */

// Detect active scale from URL or default to 5.0
const ACTIVE_SCALE = new URLSearchParams(window.location.search).get('scale') === '4.0' ? '4.0' : '5.0';

const SCALE_CONFIG = {
    '4.0': {
        maxGPA: 4.0,
        defaultGrade: '4',
        prefixes: {
            data: 'data4-',
            notes: 'notes-4-',
            profile: 'student-profile-4',
            pin: 'app4-pin',
            onboarding: 'ev-onboarding-4-done'
        },
        grades: [
            { value: '4', letter: 'A' },
            { value: '3', letter: 'B' },
            { value: '2', letter: 'C' },
            { value: '1', letter: 'D' },
            { value: '0', letter: 'F' }
        ],
        gradeMap: { "4": "A", "3": "B", "2": "C", "1": "D", "0": "F" },
        colors: { "4": "#4caf50", "3": "#2196f3", "2": "#ffc107", "1": "#ff9800", "0": "#9e9e9e" },
        boundaries: [
            { threshold: 3.5, label: 'First Class', shortLabel: 'FC', nextThreshold: 4.0, nextLabel: 'Max GPA', nextShortLabel: 'MAX' },
            { threshold: 3.0, label: '2nd Class Upper', shortLabel: '2.1', nextThreshold: 3.5, nextLabel: 'First Class', nextShortLabel: 'FC' },
            { threshold: 2.0, label: '2nd Class Lower', shortLabel: '2.2', nextThreshold: 3.0, nextLabel: '2nd Class Upper', nextShortLabel: '2.1' },
            { threshold: 1.0, label: 'Third Class', shortLabel: 'TC', nextThreshold: 2.0, nextLabel: '2nd Class Lower', nextShortLabel: '2.2' },
            { threshold: 0, label: 'Pass', shortLabel: 'P', nextThreshold: 1.0, nextLabel: 'Third Class', nextShortLabel: 'TC' }
        ],
        totalDegreeUnits: 120,
        chartMaxY: 4,
        statusThresholds: {
            hard: 3.0,
            elite: 3.7,
            impossible: 4.0
        }
    },
    '5.0': {
        maxGPA: 5.0,
        defaultGrade: '5',
        prefixes: {
            data: 'data-',
            notes: 'notes-5-',
            profile: 'student-profile',
            pin: 'app-pin',
            onboarding: 'ev-onboarding-5-done'
        },
        grades: [
            { value: '5', letter: 'A' },
            { value: '4', letter: 'B' },
            { value: '3', letter: 'C' },
            { value: '2', letter: 'D' },
            { value: '1', letter: 'E' },
            { value: '0', letter: 'F' }
        ],
        gradeMap: { "5": "A", "4": "B", "3": "C", "2": "D", "1": "E", "0": "F" },
        colors: { "5": "#4caf50", "4": "#2196f3", "3": "#ffc107", "2": "#ff9800", "1": "#f44336", "0": "#9e9e9e" },
        boundaries: [
            { threshold: 4.5, label: 'First Class', shortLabel: 'FC', nextThreshold: 5.0, nextLabel: 'Max GPA', nextShortLabel: 'MAX' },
            { threshold: 3.5, label: '2nd Class Upper', shortLabel: '2.1', nextThreshold: 4.5, nextLabel: 'First Class', nextShortLabel: 'FC' },
            { threshold: 2.49, label: '2nd Class Lower', shortLabel: '2.2', nextThreshold: 3.5, nextLabel: '2nd Class Upper', nextShortLabel: '2.1' },
            { threshold: 1.5, label: 'Third Class', shortLabel: 'TC', nextThreshold: 2.49, nextLabel: '2nd Class Lower', nextShortLabel: '2.2' },
            { threshold: 0, label: 'Pass', shortLabel: 'P', nextThreshold: 1.5, nextLabel: 'Third Class', nextShortLabel: 'TC' }
        ],
        totalDegreeUnits: 200,
        chartMaxY: 5,
        statusThresholds: {
            hard: 4.0,
            elite: 4.5,
            impossible: 5.0
        }
    }
};

// Get active configuration
function getConfig() {
    return SCALE_CONFIG[ACTIVE_SCALE];
}

// Helper: Get prefixed storage key
function getStorageKey(type, semesterCode = '') {
    const prefixes = getConfig().prefixes;
    const key = prefixes[type];
    if (!key) return type;
    
    if (semesterCode && (type === 'data' || type === 'notes')) {
        return key + semesterCode;
    }
    return key;
}

// Helper: Format grade value within scale limits
function limitGrade(gradeValue) {
    return Math.min(parseInt(gradeValue) || 0, getConfig().maxGPA);
}

// Helper: Get letter grade from numeric value
function getLetterGrade(numericGrade) {
    const mapping = getConfig().gradeMap;
    return mapping[numericGrade.toString()] || 'F';
}

// Update page title based on scale
document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.querySelector('title');
    if (titleEl) {
        titleEl.textContent = `${ACTIVE_SCALE} CGPA Calculator | Exams Venture`;
    }
    const appLogoEl = document.querySelector('.app-logo-text');
    if (appLogoEl) {
        appLogoEl.textContent = `${ACTIVE_SCALE} CGPA Calculator`;
    }
});
