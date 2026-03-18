/**
 * Crea Monthly API Cost Report
 *
 * Queries Anthropic and Railway APIs for usage data, calculates costs,
 * and writes a markdown summary to docs/finance/api-costs/YYYY-MM-api-costs.md
 *
 * Usage:
 *   npx tsx src/scripts/api-cost-report.ts            # current month
 *   npx tsx src/scripts/api-cost-report.ts 2026-03    # specific month
 *
 * Environment variables:
 *   ANTHROPIC_ADMIN_API_KEY  - Anthropic admin API key (for org usage data)
 *   ANTHROPIC_API_KEY        - Regular API key (fallback, limited info)
 *   RAILWAY_API_TOKEN        - Railway API token
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Pricing (per million tokens)
// ---------------------------------------------------------------------------

const PRICING = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-4-5-haiku': { input: 0.8, output: 4.0 },
  // Aliases / partial matches
  'claude-sonnet': { input: 3.0, output: 15.0 },
  'claude-haiku': { input: 0.8, output: 4.0 },
} as const;

type PricingTier = { input: number; output: number };

function getPricing(modelId: string): PricingTier | null {
  const lower = modelId.toLowerCase();
  if (lower.includes('sonnet')) return { input: 3.0, output: 15.0 };
  if (lower.includes('haiku')) return { input: 0.8, output: 4.0 };
  if (lower.includes('opus')) return { input: 15.0, output: 75.0 };
  return null;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseMonth(arg?: string): { year: number; month: number; label: string } {
  if (arg && /^\d{4}-\d{2}$/.test(arg)) {
    const [y, m] = arg.split('-').map(Number);
    return { year: y, month: m, label: arg };
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return { year: y, month: m, label: `${y}-${String(m).padStart(2, '0')}` };
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59); // last day of month
  return {
    startISO: start.toISOString().split('T')[0],
    endISO: end.toISOString().split('T')[0],
    start,
    end,
  };
}

// ---------------------------------------------------------------------------
// Anthropic usage
// ---------------------------------------------------------------------------

interface AnthropicUsage {
  available: boolean;
  mode: 'admin' | 'placeholder';
  models: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  }>;
  totalCost: number;
  note?: string;
}

async function fetchAnthropicUsage(year: number, month: number): Promise<AnthropicUsage> {
  const adminKey = process.env.ANTHROPIC_ADMIN_API_KEY;
  const regularKey = process.env.ANTHROPIC_API_KEY;

  if (!adminKey && !regularKey) {
    console.warn('[Anthropic] No API keys found. Skipping Anthropic usage.');
    return {
      available: false,
      mode: 'placeholder',
      models: [],
      totalCost: 0,
      note: 'No ANTHROPIC_ADMIN_API_KEY or ANTHROPIC_API_KEY set. Skipped.',
    };
  }

  if (!adminKey) {
    console.warn('[Anthropic] No ANTHROPIC_ADMIN_API_KEY set. Using placeholder mode.');
    console.warn('[Anthropic] To get usage data, create an admin key at: https://console.anthropic.com/settings/admin-keys');
    return {
      available: false,
      mode: 'placeholder',
      models: [],
      totalCost: 0,
      note: [
        'Admin API key not configured. To enable automated usage tracking:',
        '1. Go to https://console.anthropic.com/settings/admin-keys',
        '2. Create an admin API key',
        '3. Set ANTHROPIC_ADMIN_API_KEY in your .env file',
        '',
        'For now, check usage manually at: https://console.anthropic.com/settings/usage',
      ].join('\n'),
    };
  }

  // Try the admin usage API
  const { startISO, endISO } = monthRange(year, month);

  try {
    // The Anthropic admin API for usage. Try the /v1/usage endpoint.
    const url = new URL('https://api.anthropic.com/v1/usage');
    url.searchParams.set('start_date', startISO);
    url.searchParams.set('end_date', endISO);

    const res = await fetch(url.toString(), {
      headers: {
        'x-api-key': adminKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(`[Anthropic] Admin API returned ${res.status}: ${body}`);
      console.warn('[Anthropic] Falling back to placeholder mode.');
      return {
        available: false,
        mode: 'placeholder',
        models: [],
        totalCost: 0,
        note: [
          `Admin API returned HTTP ${res.status}. This may mean:`,
          '- The admin key does not have usage permissions',
          '- The usage API endpoint has changed',
          '',
          'Check usage manually at: https://console.anthropic.com/settings/usage',
        ].join('\n'),
      };
    }

    const data = await res.json() as any;

    // Parse the response — structure may vary; handle gracefully
    const modelUsages: AnthropicUsage['models'] = [];
    let totalCost = 0;

    // Expected shape: { data: [{ model, input_tokens, output_tokens }] } or similar
    const entries = data.data ?? data.usage ?? data.daily_usage ?? [];

    // Aggregate by model
    const byModel = new Map<string, { input: number; output: number }>();

    for (const entry of Array.isArray(entries) ? entries : []) {
      const model = entry.model ?? entry.model_id ?? 'unknown';
      const inp = entry.input_tokens ?? entry.input_token_count ?? 0;
      const out = entry.output_tokens ?? entry.output_token_count ?? 0;

      const existing = byModel.get(model) ?? { input: 0, output: 0 };
      existing.input += inp;
      existing.output += out;
      byModel.set(model, existing);
    }

    for (const [model, tokens] of byModel) {
      const pricing = getPricing(model);
      const inputCost = pricing ? (tokens.input / 1_000_000) * pricing.input : 0;
      const outputCost = pricing ? (tokens.output / 1_000_000) * pricing.output : 0;
      const cost = inputCost + outputCost;
      totalCost += cost;

      modelUsages.push({
        model,
        inputTokens: tokens.input,
        outputTokens: tokens.output,
        inputCost,
        outputCost,
        totalCost: cost,
      });
    }

    return {
      available: true,
      mode: 'admin',
      models: modelUsages,
      totalCost,
    };
  } catch (err) {
    console.warn(`[Anthropic] Failed to fetch usage: ${err}`);
    return {
      available: false,
      mode: 'placeholder',
      models: [],
      totalCost: 0,
      note: `Error fetching usage: ${err}. Check manually at https://console.anthropic.com/settings/usage`,
    };
  }
}

// ---------------------------------------------------------------------------
// Railway usage
// ---------------------------------------------------------------------------

interface RailwayUsage {
  available: boolean;
  estimatedCost: number | null;
  details: string;
}

async function fetchRailwayUsage(): Promise<RailwayUsage> {
  const token = process.env.RAILWAY_API_TOKEN;

  if (!token) {
    console.warn('[Railway] No RAILWAY_API_TOKEN set. Skipping Railway costs.');
    return {
      available: false,
      estimatedCost: null,
      details: 'No RAILWAY_API_TOKEN set. Check costs at https://railway.com/dashboard',
    };
  }

  try {
    // First, get the current user's projects
    const projectsQuery = `
      query {
        me {
          projects {
            edges {
              node {
                id
                name
                updatedAt
              }
            }
          }
        }
      }
    `;

    const projectsRes = await fetch('https://backboard.railway.com/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: projectsQuery }),
    });

    if (!projectsRes.ok) {
      const body = await projectsRes.text();
      console.warn(`[Railway] API returned ${projectsRes.status}: ${body}`);
      return {
        available: false,
        estimatedCost: null,
        details: `Railway API returned HTTP ${projectsRes.status}. Check costs at https://railway.com/dashboard`,
      };
    }

    const projectsData = await projectsRes.json() as any;
    const projects = projectsData?.data?.me?.projects?.edges ?? [];

    if (projects.length === 0) {
      return {
        available: true,
        estimatedCost: 0,
        details: 'No projects found in Railway account.',
      };
    }

    // Query estimated usage for each project
    const projectDetails: string[] = [];
    let totalEstimated = 0;

    for (const edge of projects) {
      const project = edge.node;
      const usageQuery = `
        query($projectId: String!) {
          estimatedUsage(projectId: $projectId) {
            estimatedValue
            currentUsage
          }
        }
      `;

      try {
        const usageRes = await fetch('https://backboard.railway.com/graphql/v2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: usageQuery,
            variables: { projectId: project.id },
          }),
        });

        if (usageRes.ok) {
          const usageData = await usageRes.json() as any;
          const estimated = usageData?.data?.estimatedUsage?.estimatedValue ?? 0;
          const current = usageData?.data?.estimatedUsage?.currentUsage ?? 0;
          // Railway returns values in cents, convert to dollars
          const estimatedDollars = estimated / 100;
          const currentDollars = current / 100;
          totalEstimated += currentDollars;
          projectDetails.push(`- **${project.name}**: $${currentDollars.toFixed(2)} current / $${estimatedDollars.toFixed(2)} estimated`);
        } else {
          projectDetails.push(`- **${project.name}**: usage data unavailable`);
        }
      } catch {
        projectDetails.push(`- **${project.name}**: usage query failed`);
      }
    }

    return {
      available: true,
      estimatedCost: totalEstimated,
      details: projectDetails.length > 0
        ? projectDetails.join('\n')
        : 'No usage data available.',
    };
  } catch (err) {
    console.warn(`[Railway] Failed to fetch usage: ${err}`);
    return {
      available: false,
      estimatedCost: null,
      details: `Error: ${err}. Check costs at https://railway.com/dashboard`,
    };
  }
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function generateReport(
  label: string,
  anthropic: AnthropicUsage,
  railway: RailwayUsage,
): string {
  const now = new Date();
  const generated = now.toISOString().split('T')[0];

  const lines: string[] = [];

  lines.push(`# Crea API Cost Report: ${label}`);
  lines.push('');
  lines.push(`> Generated on ${generated}`);
  lines.push('');

  // -- Summary table --
  lines.push('## Summary');
  lines.push('');
  lines.push('| Service | Cost |');
  lines.push('|---------|------|');

  const anthropicCost = anthropic.totalCost;
  const railwayCost = railway.estimatedCost ?? 0;
  const geminiCost = 0; // Free tier

  lines.push(`| Anthropic (Claude) | ${formatCurrency(anthropicCost)} |`);
  lines.push(`| Railway (hosting) | ${formatCurrency(railwayCost)} |`);
  lines.push(`| Google AI (Gemini) | ${formatCurrency(geminiCost)} (free tier) |`);

  const total = anthropicCost + railwayCost + geminiCost;
  lines.push(`| **Total** | **${formatCurrency(total)}** |`);
  lines.push('');

  // -- Prior month comparison placeholder --
  lines.push('## Month-over-Month');
  lines.push('');
  lines.push('<!-- TODO: Auto-populate once prior month report exists -->');
  lines.push('_Comparison with prior month will be available after the second report is generated._');
  lines.push('');

  // -- Anthropic detail --
  lines.push('## Anthropic (Claude) Details');
  lines.push('');

  if (anthropic.available && anthropic.models.length > 0) {
    lines.push('| Model | Input Tokens | Output Tokens | Input Cost | Output Cost | Total |');
    lines.push('|-------|-------------|---------------|------------|-------------|-------|');

    for (const m of anthropic.models) {
      lines.push(
        `| ${m.model} | ${formatTokens(m.inputTokens)} | ${formatTokens(m.outputTokens)} | ${formatCurrency(m.inputCost)} | ${formatCurrency(m.outputCost)} | ${formatCurrency(m.totalCost)} |`,
      );
    }
    lines.push('');
  } else if (anthropic.note) {
    lines.push('```');
    lines.push(anthropic.note);
    lines.push('```');
    lines.push('');
  } else {
    lines.push('_No usage data available for this period._');
    lines.push('');
  }

  // -- Railway detail --
  lines.push('## Railway (Hosting) Details');
  lines.push('');
  if (railway.available) {
    lines.push(railway.details);
  } else {
    lines.push(`_${railway.details}_`);
  }
  lines.push('');

  // -- Gemini --
  lines.push('## Google AI (Gemini Flash) Details');
  lines.push('');
  lines.push('Gemini Flash is on the free tier. No charges expected unless usage exceeds free limits.');
  lines.push('Check usage at: https://aistudio.google.com');
  lines.push('');

  // -- Notes --
  lines.push('## Notes');
  lines.push('');
  lines.push('- Anthropic pricing: Sonnet 4.6 ($3/$15 per MTok in/out), Haiku 4.5 ($0.80/$4 per MTok in/out)');
  lines.push('- Railway cost is the current billing period estimate from their API');
  lines.push('- AWS S3 costs (progress photos) are not yet tracked in this script');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  const { year, month, label } = parseMonth(arg);

  console.log(`\nCrea API Cost Report for ${label}`);
  console.log('='.repeat(40));

  // Fetch data in parallel
  const [anthropic, railway] = await Promise.all([
    fetchAnthropicUsage(year, month),
    fetchRailwayUsage(),
  ]);

  // Generate report
  const report = generateReport(label, anthropic, railway);

  // Write to file
  const docsDir = path.resolve(
    import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
    '..', '..', '..', 'docs', 'finance', 'api-costs',
  );

  fs.mkdirSync(docsDir, { recursive: true });

  const outFile = path.join(docsDir, `${label}-api-costs.md`);
  fs.writeFileSync(outFile, report, 'utf-8');

  console.log(`\nReport written to: ${outFile}`);

  // Print summary to console
  console.log('\n--- Quick Summary ---');
  console.log(`Anthropic: ${formatCurrency(anthropic.totalCost)}${anthropic.available ? '' : ' (placeholder)'}`);
  console.log(`Railway:   ${formatCurrency(railway.estimatedCost ?? 0)}${railway.available ? '' : ' (unavailable)'}`);
  console.log(`Gemini:    $0.00 (free tier)`);
  console.log(`Total:     ${formatCurrency(anthropic.totalCost + (railway.estimatedCost ?? 0))}`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
