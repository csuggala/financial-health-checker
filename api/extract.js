export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { documentText, documentType } = req.body;

    const prompt = `You are an expert financial analyst. Extract all financial figures from this ${documentType} and return them as structured JSON.

DOCUMENT TEXT:
${documentText}

Extract and return ONLY valid JSON with these fields (use null if not found):

{
  "document_type": "${documentType}",
  "period": "detected period e.g. Q2 2026 or FY2025",
  "prior_period": "detected prior period or null",
  "currency": "detected currency symbol or USD",
  "extracted_fields": {
    "revenue": null,
    "revenue_prior": null,
    "cogs": null,
    "gross_profit": null,
    "gross_margin_pct": null,
    "operating_expenses": null,
    "operating_income": null,
    "operating_margin_pct": null,
    "ebitda": null,
    "net_income": null,
    "net_margin_pct": null,
    "total_assets": null,
    "current_assets": null,
    "total_liabilities": null,
    "current_liabilities": null,
    "total_debt": null,
    "total_equity": null,
    "working_capital": null,
    "debt_to_equity": null,
    "cash_balance": null,
    "cash_flow_operations": null,
    "free_cash_flow": null,
    "accounts_receivable": null,
    "accounts_payable": null,
    "inventory": null,
    "capex": null,
    "revenue_growth_pct": null,
    "burn_rate_monthly": null,
    "cash_runway_months": null,
    "interest_expense": null
  },
  "fields_found": <count of non-null fields>,
  "fields_total": 28,
  "confidence": "High" | "Medium" | "Low",
  "notes": "any important observations about the document e.g. non-GAAP figures used, restatements, etc."
}

Rules:
- Convert all values to numbers (remove $ , symbols)
- If a percentage is given (e.g. 42%), store as 42 not 0.42
- If a range is given, use the midpoint
- Return ONLY valid JSON`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
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
