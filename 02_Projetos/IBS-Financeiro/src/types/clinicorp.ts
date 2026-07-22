// Financial summary — fields mapped after first API call, kept flexible intentionally
export interface FinancialSummary {
  [key: string]: unknown
}

export interface CashFlowItem {
  [key: string]: unknown
}

export interface PaymentItem {
  [key: string]: unknown
}

export interface ApiError {
  Error: number
  Message: string
}
