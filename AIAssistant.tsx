export interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  subcategory: string;
  features: { text: string; imageUrl?: string }[];
  benefits: { text: string; imageUrl?: string }[];
  imageUrl: string;
  gallery: string[];
  demoUrl: string;
  downloadUrl: string;
  downloadFiles?: { name: string; url: string }[];
  technologies?: string[];
  createdAt: string;
}

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Order {
  _id: string;
  productId: Product;
  userEmail: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  amount: number;
  createdAt: string;

  // New checkout fields
  customerName?: string;
  customerEmail?: string;
  customerWhatsapp?: string;
  paymentMethod?: string;
  transactionId?: string;
  senderPhone?: string;
  selectedGuidePack?: {
    key: string;
    name: string;
    price: number;
    description: string;
  };
}

export interface Sale {
  _id: string;
  orderId: Order;
  amount: number;
  createdAt: string;
}

export interface GuidePack {
  _id?: string;
  key: string;
  name: string;
  price: number;
  description: string;
  images: string[];
}

export interface PaymentConfig {
  _id?: string;
  method: string;
  label: string;
  isEnabled: boolean;
  details: string;
}
