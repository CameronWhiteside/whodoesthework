// src/shared/constants.ts

// ── System ───────────────────────────────────────────────────────────────────
export const SCORE_VERSION = '0.1.0';
export const STALENESS_DAYS = 7;
export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_PER_PAGE = 100;
export const MAX_COMMIT_LINES = 10_000;
// Lookback window for first-time commit ingestion. Re-ingestion uses
// dev.lastIngestedAt for true incremental fetching.
export const COMMIT_LOOKBACK_DAYS = 730; // 2 years

// ── Recency decay ─────────────────────────────────────────────────────────────
// exp(-RECENCY_LAMBDA × months_ago): λ=0.05 → ~78% at 5 months, ~55% at 12 months
export const RECENCY_LAMBDA = 0.05;

// ── SEU (Simple Effort Unit) coefficients ────────────────────────────────────
// SEU = ln(1+churn) × (1 + SEU_FILE_COEFF × ln(1+F)) × (1 + SEU_ENTROPY_COEFF × H)
// Resists gaming: log-scale churn, file-coordination overhead, spread bonus.
export const SEU_FILE_COEFF = 0.15;      // file coordination overhead per ln(1+F)
export const SEU_ENTROPY_COEFF = 0.20;   // spread bonus for cross-cutting changes

// ── EffortH (Hybrid Effort) coefficients ──────────────────────────────────────
// EffortH = SEU × (1 + EFFORH_CC_COEFF × |ΔCC|) × (1 + EFFORH_CENTRALITY_COEFF × centrality)
export const EFFORH_CC_COEFF = 0.03;          // cyclomatic complexity multiplier per decision point
export const EFFORH_CENTRALITY_COEFF = 0.50;  // centrality bonus in high-impact repos

// ── QualityH (Quality multiplier) coefficients ───────────────────────────────
// QualityH = clamp(BASE + W_MAINT × maintShare + W_TEST × testRatio − W_REWORK × reworkRate, MIN, MAX)
// Result ∈ [QUALITY_MIN, QUALITY_MAX] — applied as a multiplier on EffortH.
export const QUALITY_BASE = 0.80;
export const QUALITY_MAINTAINABLE_WEIGHT = 0.20;  // reward: lower complexity additions
export const QUALITY_TEST_WEIGHT = 0.30;           // reward: test churn alongside prod churn
export const QUALITY_REWORK_WEIGHT = 0.50;         // penalty: rework rate (V1: always 0, not yet computed)
export const QUALITY_MIN = 0.40;                   // floor — even low-quality work has effort value
export const QUALITY_MAX = 1.20;                   // ceiling — 20% bonus for excellent practices

// ── Normalization references (calibration) ───────────────────────────────────
// qualityScore (per contribution) = min(100, ln(1+valueH) / ln(1+REF) × 100)
// Calibrated: a 300-line feature commit with moderate spread → qualityScore ≈ 50.
export const CODE_QUALITY_REF = 15.0;

// domainScore = min(100, ln(1 + Σ recencyWeightedScore) / ln(1 + DOMAIN_SCORE_REF) × 100)
// Calibrated: ~20 good contributions over 12 months → domain score ≈ 80.
export const DOMAIN_SCORE_REF = 500;

// recentActivityScore = min(100, ln(1+recentCount) / ln(1+RECENT_ACTIVITY_REF) × 100)
// Calibrated: 20 contributions in last 12 months → score = 100.
export const RECENT_ACTIVITY_REF = 20;

// ── Contribution type weights ────────────────────────────────────────────────
// Applied as typeWeight multiplier in ValueH = EffortH × QualityH × typeWeight.
export const CONTRIBUTION_TYPE_WEIGHTS: Record<string, number> = {
  feature: 1.0,
  bugfix: 1.0,
  refactor: 0.9,
  test: 0.8,
  documentation: 0.7,
  infrastructure: 0.6,
  dependency: 0.2,
  formatting: 0.1,
  generated: 0.0,
};

// ── Overall score dimension weights ──────────────────────────────────────────
// overallImpact = Σ (dimensionScore × SCORE_WEIGHTS[dimension])
export const SCORE_WEIGHTS = {
  codeQuality: 0.35,
  reviewQuality: 0.25,
  documentationQuality: 0.10,
  collaborationBreadth: 0.10,
  consistencyScore: 0.10,
  recentActivityScore: 0.10,
} as const;

// ── Review score sub-weights ──────────────────────────────────────────────────
// reviewQuality = sum of (ratio × weight) for each signal, normalized to [0,100].
export const REVIEW_SUBSTANTIVE_WEIGHT = 0.40;    // fraction with code-line references
export const REVIEW_DEPTH_WEIGHT = 0.30;          // comment depth (count + length)
export const REVIEW_CHANGE_REQUEST_WEIGHT = 0.10; // willingness to request changes
export const REVIEW_NOT_RUBBER_STAMP_WEIGHT = 0.20; // penalize fast zero-comment approvals
