export const MODEL = "claude-sonnet-4-6";
export const RATE_LIMIT = 5;
export const RATE_WINDOW = 60000; // 1 minute in ms

// Pricing per million tokens (USD)
export const PRICING = {
  input: 3,
  output: 15,
  cache_read: 0.30,
};
