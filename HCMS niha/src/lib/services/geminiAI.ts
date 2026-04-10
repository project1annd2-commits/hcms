/**
 * Gemini AI Service for Followup Sentiment Analysis
 * Uses Google's Gemini 2.0 Flash model for intelligent comment analysis
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Debug log
console.log('Gemini API Key loaded:', GEMINI_API_KEY ? 'Yes (hidden)' : 'No');

export interface SentimentResult {
    original: string;
    sentiment: 'positive' | 'neutral' | 'critical';
    category: string;
    summary: string;
}

export interface AnalysisResponse {
    results: SentimentResult[];
    overallHealth: 'healthy' | 'at_risk' | 'critical';
    topIssues: string[];
    recommendations: string[];
}

/**
 * Analyzes followup comments using Gemini AI
 * @param comments Array of followup comment strings
 * @returns Promise with sentiment analysis results
 */
export async function analyzeFollowupSentiments(
    comments: { id: string; comment: string; schoolName: string; employeeName: string; date: string }[]
): Promise<AnalysisResponse> {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured, falling back to keyword analysis');
        return fallbackAnalysis(comments);
    }

    if (comments.length === 0) {
        return {
            results: [],
            overallHealth: 'healthy',
            topIssues: [],
            recommendations: []
        };
    }

    const prompt = `You are an education management system analyst. Analyze these school followup comments from field employees and provide sentiment analysis.

For each comment, determine:
1. Sentiment: "positive" (good progress, no issues), "neutral" (routine update), or "critical" (problems, delays, complaints)
2. Category: One of "Books/Orders", "Training/Academics", "Management/Admin", "Payments/Fees", "Infrastructure", or "General"
3. Summary: A brief 5-10 word summary of the key point

Also provide:
- Overall health status of the school relationships
- Top 3 issues that need attention (if any)
- 2-3 actionable recommendations

IMPORTANT: Comments like "No issues", "Everything is fine", "Going smoothly" should be marked as POSITIVE, not critical.

Comments to analyze:
${comments.map((c, i) => `${i + 1}. [${c.schoolName}] (${c.date}): "${c.comment}"`).join('\n')}

Respond in this exact JSON format:
{
  "results": [
    {"index": 0, "sentiment": "positive|neutral|critical", "category": "...", "summary": "..."},
    ...
  ],
  "overallHealth": "healthy|at_risk|critical",
  "topIssues": ["issue1", "issue2", "issue3"],
  "recommendations": ["rec1", "rec2"]
}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status, await response.text());
            return fallbackAnalysis(comments);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = textResponse;
        const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        } else {
            // Try to find raw JSON
            const startIdx = textResponse.indexOf('{');
            const endIdx = textResponse.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                jsonStr = textResponse.substring(startIdx, endIdx + 1);
            }
        }

        const parsed = JSON.parse(jsonStr);

        // Map results back to original comments
        const results: SentimentResult[] = comments.map((c, i) => {
            const aiResult = parsed.results?.find((r: any) => r.index === i) || parsed.results?.[i];
            return {
                original: c.comment,
                sentiment: aiResult?.sentiment || 'neutral',
                category: aiResult?.category || 'General',
                summary: aiResult?.summary || c.comment.substring(0, 50)
            };
        });

        return {
            results,
            overallHealth: parsed.overallHealth || 'healthy',
            topIssues: parsed.topIssues || [],
            recommendations: parsed.recommendations || []
        };

    } catch (error) {
        console.error('Gemini analysis failed:', error);
        return fallbackAnalysis(comments);
    }
}

/**
 * Fallback keyword-based analysis when AI is unavailable
 */
function fallbackAnalysis(
    comments: { id: string; comment: string; schoolName: string; employeeName: string; date: string }[]
): AnalysisResponse {
    const CRITICAL_KEYWORDS = ['urgent', 'critical', 'problem', 'complaint', 'delay', 'issue', 'bad', 'angry', 'rejection', 'quit', 'stop', 'serious', 'negative'];
    const POSITIVE_KEYWORDS = ['no issues', 'going on', 'smooth', 'everything ok', 'good', 'satisfied', 'positive', 'happy', 'resolved', 'fine'];
    const EXCLUSION_PHRASES = ['no issues', 'no problem', 'issue resolved'];

    const results: SentimentResult[] = comments.map(c => {
        const text = c.comment.toLowerCase();

        const isCritical = CRITICAL_KEYWORDS.some(k => text.includes(k)) &&
            !EXCLUSION_PHRASES.some(p => text.includes(p));
        const isPositive = POSITIVE_KEYWORDS.some(k => text.includes(k));

        return {
            original: c.comment,
            sentiment: isCritical ? 'critical' : isPositive ? 'positive' : 'neutral',
            category: 'General',
            summary: c.comment.substring(0, 50) + (c.comment.length > 50 ? '...' : '')
        };
    });

    const criticalCount = results.filter(r => r.sentiment === 'critical').length;
    const overallHealth = criticalCount > results.length * 0.3 ? 'critical' :
        criticalCount > 0 ? 'at_risk' : 'healthy';

    return {
        results,
        overallHealth,
        topIssues: [],
        recommendations: ['Enable Gemini AI for detailed analysis']
    };
}
