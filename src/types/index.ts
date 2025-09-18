export type OrderItem = {
  id: string;
  status: string;
  fabric_type: string;
  quantity_meters: number;
  billed_quantity: number | null;
  stamp_image_url?: string;
  is_op_generated: boolean;
  stamp_ref: string;
  order_id: string;
};

export type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  status: string;
  is_launch: boolean;
  details: {
    fabric_type: string;
    [key: string]: any;
  } | null;
  actual_delivery_date: Date | null;
  delivery_confirmed_at: string | null;
  production_date: string | null;
  billed_at: string | null;
  order_number: number;
  order_items: OrderItem[];
  creator: {
    full_name: string;
  } | null;
  created_at: string;
};

export type Profile = {
  id: string;
  updated_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: 'admin' | 'vendedor' | 'designer' | 'producao' | 'user';
  allowed_regions?: ('SE' | 'NE')[];
  gestao_click_id?: number;
};
