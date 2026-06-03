/**
 * Calculates the grade for a specific training component based on custom rules.
 * 
 * @param name The name of the subject/component (e.g., 'Attendance', 'Phonics', 'Vocabulary').
 * @param score The marks obtained.
 * @param maxMarks The maximum possible marks.
 * @returns A string representing the grade (e.g., 'A+', 'B', 'D').
 */
export const getComponentGrade = (name: string, score: number, maxMarks: number): string => {
    if (score === undefined || score === null) return '-';

    const normalizedName = name.toLowerCase();

    // Rules for Attendance (Max 10)
    if (normalizedName === 'attendance' || normalizedName.includes('attendance')) {
        if (score >= 9) return 'A+';
        if (score >= 8) return 'A';
        if (score >= 7) return 'B+';
        if (score >= 6) return 'B';
        if (score >= 5) return 'C';
        return 'D';
    }

    // Rules for Phonics (Max 26)
    if (normalizedName === 'phonics') {
        if (score >= 23) return 'A+';
        if (score >= 20) return 'A';
        if (score >= 17) return 'B+';
        if (score >= 14) return 'B';
        if (score >= 11) return 'C';
        return 'D';
    }

    // Rules for Vocabulary (Max 25)
    if (normalizedName === 'vocabulary') {
        if (score >= 22) return 'A+';
        if (score >= 19) return 'A';
        if (score >= 16) return 'B+';
        if (score >= 13) return 'B';
        if (score >= 10) return 'C';
        return 'D';
    }

    // Fallback Rule (Percentage based)
    const percentage = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    return 'D';
};
