export interface UserProfile {
  uid: string;
  pupaId: string;
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  level: number;
  xp: number;
  points: number;
  bio?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isBlocked: boolean;
  trophies?: UserTrophy[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  promoPrice?: number;
  collection: string;
  dropId: string;
  badge?: string;
  featured: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  sku: string;
  stock: number;
  active: boolean;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  order: number;
}

export interface CartItem {
  cartItemId: string; // Unique ID for this cart entry
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  name: string;
  color: string;
  size: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}

export type OrderPaymentStatus = 'AGUARDANDO PAGAMENTO' | 'PAGO' | 'RECUSADO' | 'CANCELADO' | 'ESTORNADO';
export type OrderStatus = 'AGUARDANDO PAGAMENTO' | 'PAGAMENTO APROVADO' | 'EM PROCESSAMENTO' | 'ENVIADO' | 'ENTREGUE' | 'CANCELADO';

export interface Order {
  id: string;
  userId: string;
  publicOrderCode: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentProvider?: string;
  paymentId?: string;
  paymentDetails?: {
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    expiresAt?: string;
  };
  customerSnapshot: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  shippingAddress: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  orderId?: string;
  amount: number;
  type: 'EARN' | 'SPEND' | 'ADMIN_ADD' | 'ADMIN_REMOVE' | 'PURCHASE' | 'REFUND';
  source: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface UserTrophy {
  trophyId: string;
  unlockedAt: string;
}

export interface LevelConfig {
  name: string;
  order: number;
  threshold: number;
  description: string;
  benefits: string[];
}

export type DropStatus = 'EM BREVE' | 'DISPONÍVEL' | 'QUASE ESGOTADO' | 'ESGOTADO' | 'ENCERRADO';

export interface Drop {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  manifesto?: string;
  coverImage?: string;
  heroImage?: string;
  status: DropStatus;
  releaseDate?: string;
  endDate?: string;
  countdownEnabled: boolean;
  featured: boolean;
  limited: boolean;
  noRestock: boolean;
  totalPieces?: number;
  products: string[]; // array of product IDs
  requiredLevel?: number;
  requiredPoints?: number;
  createdAt: string;
  updatedAt: string;
}

export type SecretContentStatus = 'BLOQUEADO' | 'DESBLOQUEANDO' | 'DESBLOQUEADO';

export interface SecretContent {
  id: string;
  title: string;
  description: string;
  assetUrl?: string; // Image or video
  requiredLevel?: number;
  requiredPoints?: number;
  requiredTrophyId?: string;
  rewardTrophyId?: string;
  requiredDropId?: string;
  dropId?: string;
  active: boolean;
}

export interface UserUnlock {
  id: string;
  userId: string;
  contentId: string;
  unlockedAt: string;
}

export type RewardType = 'DISCOUNT' | 'EARLY_ACCESS' | 'SECRET_CONTENT' | 'EXCLUSIVE_ITEM' | 'TROPHY' | 'EXPERIENCE';

export interface Reward {
  id: string;
  title: string;
  description: string;
  type: RewardType;
  pointsCost: number;
  active: boolean;
  stock?: number;
  unlimited: boolean;
  oneTimePerUser: boolean;
  requiredLevel?: number;
  rewardTrophyId?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Redemption {
  id: string;
  userId: string;
  rewardId: string;
  pointsCost: number;
  status: 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
  idempotencyKey: string;
  createdAt: string;
}

export interface PublicProfile {
  rankingPoints: number;
  userId: string;
  username: string;
  pupaId: string;
  avatar?: string;
  displayName: string;
  level: number;
  publicTrophies: string[];
  publicDrops: string[];
  updatedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  dropId?: string;
  likesCount: number;
  commentsCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostLike {
  id: string; // postId_userId
  postId: string;
  userId: string;
  createdAt: string;
}

export interface CommentLike {
  id: string; // commentId_userId
  commentId: string;
  userId: string;
  createdAt: string;
}

export type ReportTargetType = 'POST' | 'COMMENT' | 'PROFILE';
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export interface CommunityReport {
  id: string;
  targetId: string;
  targetType: ReportTargetType;
  reporterId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}
