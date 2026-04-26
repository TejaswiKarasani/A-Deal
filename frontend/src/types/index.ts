export interface Run {
  id: number;
  name: string;
  model_assignment: string;
  is_public: boolean;
  status: string;
  start_at: string | null;
  end_at: string | null;
}

export interface Listing {
  listing_id: number;
  item_id: number;
  name: string;
  description: string | null;
  category: string | null;
  asking_price: number;
  seller_id: number;
  listed_at: string;
}

export interface Deal {
  deal_id: number;
  negotiation_id: number;
  item: string;
  buyer_id: number;
  seller_id: number;
  final_price: number;
  closed_at: string;
}

export interface Message {
  role: "buyer" | "seller";
  content: string;
  timestamp: string;
}

export interface Negotiation {
  id: number;
  status: string;
  item: string;
  buyer_id: number;
  seller_id: number;
  round_count: number;
  messages: Message[];
}

export interface MyDeals {
  sold: { item: string; price: number; buyer_id: number }[];
  bought: { item: string; price: number; seller_id: number }[];
}

export interface RunSummary {
  run_id: number;
  items_listed: number;
  items_sold: number;
  sale_rate: number;
  total_deals: number;
  total_value: number;
  mean_price: number;
  median_price: number;
}

export interface AgentPerformance {
  user_id: number;
  name: string;
  model: string | null;
  deals_as_seller: number;
  deals_as_buyer: number;
  total_earned: number;
  total_spent: number;
  net: number;
}
