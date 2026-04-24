# 🌿 PureVeg FitFuel Kitchen

**India's First AI-Powered Pure Vegetarian Macro Kitchen**

A production-ready full-stack web application for premium food-tech startup serving fitness-focused vegetarians, Jain customers, and religious fasting communities (Navratri, Ekadashi, Monday vrat) across Delhi NCR.

## ✨ Features

### 🎯 Core Functionality
- **Pure Vegetarian Menu** - 36+ dishes with lab-tested macros (±5% accuracy)
- **AI Meal Planner** - Claude-powered personalized macro meal plans
- **Fasting Menus** - Navratri, Ekadashi, and Jain-certified options
- **Subscription Plans** - Saatvik, Complete Fuel, Full Day, Family
- **Real-time Order Tracking** - 60-minute delivery SLA
- **Admin Dashboard** - Complete order and menu management

### 🔧 Tech Stack

**Frontend:**
- Next.js 14 (App Router) with TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion for animations
- Three.js + React Three Fiber for 3D hero section
- TanStack Query for server state
- Zustand for client state

**Backend:**
- Node.js + Express.js REST API
- PostgreSQL with Prisma ORM
- Redis for caching & sessions
- JWT authentication

**Integrations:**
- Razorpay (payments & subscriptions)
- Anthropic Claude API (AI meal planner)
- Cloudinary (image optimization)
- WhatsApp Business API
- Google Maps

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Environment variables (see `.env.example`)

### Installation

```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📊 Database Schema

### Core Models
- **User** - Customer & admin accounts with auth
- **Dish** - Menu items with macro data
- **Order** - Order history with payment tracking
- **Subscription** - Meal plan subscriptions
- **Cart** - Shopping cart management
- **AIProfile** - Saved meal plans & macro targets
- **PromoCode** - Discount management
- **Review** - Dish ratings

## 📁 Project Structure

```
pureveg-fitfuel/
├── app/                 # Next.js pages
├── components/          # React components
├── lib/                 # Utilities
├── server/
│   ├── prisma/         # Database schema
│   ├── api/            # API routes
│   └── services/       # Business logic
├── public/             # Static assets
└── types/              # TypeScript definitions
```

## 🔐 Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
ANTHROPIC_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
```

## 🎨 Design System

**Brand Colors:**
- Primary Dark: `#1B4332`
- Primary Mid: `#2D6A4F`
- Primary Light: `#52B788`
- Accent Gold: `#E9C46A`
- Cream: `#FEFAE0`

**Typography:**
- Display: Playfair Display
- Body: Plus Jakarta Sans
- Mono: DM Mono

## 📱 Pages

- `/` - Home page with hero section
- `/menu` - Full menu with filters
- `/menu/[id]` - Dish detail page
- `/ai-planner` - AI meal planner
- `/fasting` - Navratri/Ekadashi menus
- `/subscriptions` - Subscription plans
- `/cart` - Shopping cart
- `/checkout` - Payment page
- `/orders` - Order history
- `/profile` - User profile
- `/admin` - Admin dashboard

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Menu
- `GET /api/dishes` - Get all dishes
- `GET /api/dishes/:id` - Get dish details
- `POST /api/dishes` - Create dish (admin)

### Orders
- `POST /api/orders/create` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/admin/orders` - Get all orders (admin)

### Payments
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment
- `POST /api/payment/webhook` - Razorpay webhook

### AI Planner
- `POST /api/ai/generate-plan` - Generate meal plan
- `GET /api/ai/saved-plans` - Get saved plans

## 🧪 Testing

### Test Credentials
**Admin:**
- Email: `admin@purevegfitfuel.com`
- Password: `admin123`

**Customer:**
- Email: `customer@example.com`
- Password: `customer123`

### Test Razorpay
- Card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date
- OTP: `1234`

## 📈 Performance

- Lighthouse: Performance 90+
- Core Web Vitals: LCP < 2.5s
- Image optimization via Next.js Image component
- Static generation for menu pages
- API route edge runtime optimization

## ♿ Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Reduced motion support
- ARIA labels on interactive elements

## 📱 Mobile

- Mobile-first responsive design
- Bottom navigation bar on mobile
- PWA support with offline menu
- Touch-optimized (44x44px targets)

## 🔄 Deployment

**Frontend:** Vercel
**Backend:** Railway or Render
**Database:** Supabase (managed PostgreSQL)
**Images:** Cloudinary
**Email:** Resend or Gmail SMTP

## 📝 License

Private - PureVeg FitFuel Kitchen

## 🤝 Support

For issues or questions:
- WhatsApp: +91-XXXXX-XXXXX
- Email: hello@purevegfitfuel.com
- Website: purevegfitfuel.com
