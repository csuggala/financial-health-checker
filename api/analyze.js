export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { context, financialData, assessmentType } = req.body;

    const prompt = `You are an expert CFO and financial analyst. Evaluate the financial health of this organization and return a structured JSON assessment.

ORGANIZATION CONTEXT:
Industry: ${context.industry}
Company Size/Stage: ${context.companySize}
Business Age: ${context.businessAge}
Funding Stage: ${context.fundingStage}
Current Period: ${context.currentPeriod}
Prior Period: ${context.priorPeriod || 'Not provided'}
Known Pressures: ${context.knownPressures || 'None specified'}
Assessment Type: ${assessmentType}
Data Confidence: ${financialData.confidence}

FINANCIAL DATA PROVIDED:
${JSON.stringify(financialData, null, 2)}

Evaluate across 5 categories and return ONLY valid JSON:

{
  "overall_score": <0-100 number>,
  "overall_rating": "Excellent" | "Good" | "Moderate" | "At Risk" | "Critical",
  "executive_summary": "2-3 sentence plain English summary for a board presentation. Be specific about the biggest strength and biggest concern.",
  "data_confidence": "High" | "Medium" | "Low",
  "confidence_rationale": "1 sentence explaining confidence level",
  "categories": {
    "liquidity": {
      "score": <0-100>,
      "rating": "Excellent" | "Good" | "Moderate" | "At Risk" | "Critical",
      "benchmark": "Above average" | "Average" | "Below average",
      "trend": "Improving" | "Stable" | "Declining" | "No prior data",
      "trend_detail": "e.g. +3 points vs prior period or null",
      "key_insight": "1 sentence most important observation",
      "metrics": [
        {"name": "Current Ratio", "value": "x.x", "benchmark": "Industry avg: x.x", "status": "Good" | "Watch" | "Risk"}
      ]
    },
    "profitability": {
      "score": <0-100>,
      "rating": "Excellent" | "Good" | "Moderate" | "At Risk" | "Critical",
      "benchmark": "Above average" | "Average" | "Below average",
      "trend": "Improving" | "Stable" | "Declining" | "No prior data",
      "trend_detail": "e.g. -3 points vs prior period or null",
      "key_insight": "1 sentence most important observation",
      "metrics": [
        {"name": "Gross Margin", "value": "xx%", "benchmark": "Industry avg: xx%", "status": "Good" | "Watch" | "Risk"}
      ]
    },
    "solvency": {
      "score": <0-100>,
      "rating": "Excellent" | "Good" | "Moderate" | "At Risk" | "Critical",
      "benchmark": "Above average" | "Average" | "Below average",
      "trend": "Improving" | "Stable" | "Declining" | "No prior data",
      "trend_detail": null,
      "key_insight": "1 sentence most important observation",
      "metrics": [
        {"name": "Debt-to-Equity", "value": "x.x", "benchmark": "Industry avg: x.x", "status": "Good" | "Watch" | "Risk"}
      ]
    },
    "revenue_health": {
      "score": <0-100>,
      "rating": "Excellent" | "Good" | "Moderate" | "At Risk" | "Critical",
      "benchmark": "Above average" | "Average" | "Below average",
      "trend": "Improving" | "Stable" | "Declining" | "No prior data",
      "trend_detail": null,
      "key_insight": "1 sentence most important observation",
      "metrics": [
        {"name": "Revenue Growth", "value": "xx%", "benchmark": "Industry avg: xx%", "status": "Good" | "Watch" | "Risk"}
      ]
    },
    "cost_structure": {
      "score": <0-100>,
      "rating": "Excellent" | "Good" | "Moderate" | "At Risk" | "Critical",
      "benchmark": "Above average" | "Average" | "Below average",
      "trend": "Improving" | "Stable" | "Declining" | "No prior data",
      "trend_detail": null,
      "key_insight": "1 sentence most important observation",
      "metrics": [
        {"name": "Operating Margin", "value": "xx%", "benchmark": "Industry avg: xx%", "status": "Good" | "Watch" | "Risk"}
      ]
    }
  },
  "top_risks": [
    {"risk": "Specific risk description", "severity": "High" | "Medium" | "Low", "category": "Liquidity" | "Profitability" | "Solvency" | "Revenue" | "Cost"}
  ],
  "top_recommendations": [
    {"action": "Specific actionable recommendation", "priority": "Immediate" | "Short-term" | "Strategic", "impact": "High" | "Medium" | "Low"}
  ],
  "extracted_metrics": {
    "revenue": null,
    "gross_margin_pct": null,
    "operating_margin_pct": null,
    "net_margin_pct": null,
    "current_ratio": null,
    "debt_to_equity": null,
    "cash_runway_months": null,
    "revenue_growth_pct": null
  }
}

Rules:
- overall_score = weighted average: liquidity 25% + profitability 25% + solvency 20% + revenue_health 20% + cost_structure 10%
- Be specific with benchmarks for the stated industry
- top_risks: max 3, ordered by severity
- top_recommendations: max 3, ordered by priority
- If prior period not provided, trend = "No prior data"
- If data is missing for a category, note it in key_insight and lower the score accordingly
- Return ONLY valid JSON, no markdown, no explanation`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.content[0].text.trim();
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(clean);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
