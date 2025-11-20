# FaNect PPV Backend - Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Core Features](#core-features)
6. [Database Models](#database-models)
7. [API Endpoints](#api-endpoints)
8. [Services](#services)
9. [Middleware](#middleware)
10. [Installation & Setup](#installation--setup)
11. [Development Guide](#development-guide)
12. [Deployment](#deployment)

---

## Project Overview

**FaNect PPV Backend** is a comprehensive Node.js and TypeScript backend service for a pay-per-view (PPV) streaming platform. It enables users to watch live-streamed events, purchase access passes, receive notifications, and interact through real-time chat. Administrators can manage events, users, transactions, and platform analytics.

### Key Capabilities

- **User Management**: Registration, authentication (JWT, Google OAuth, Apple Sign-In), profiles, and account management
- **Event Management**: Create, publish, and manage live-streamed events with multi-currency pricing
- **Payments**: Integrate with Stripe and Flutterwave for streampass purchases and transactions
- **Live Streaming**: AWS IVS integration for channel management, stream keys, and playback URLs
- **Real-time Notifications**: FCM (Firebase Cloud Messaging) for push notifications
- **Admin Dashboard**: Analytics, user management, event approvals, and transaction monitoring
- **Multi-currency Support**: Support for 80+ currencies with automatic geolocation-based currency detection
- **Scheduled Tasks**: Cron jobs for cleanup, email notifications, and session management

---

## Technology Stack

### Runtime & Language
- **Node.js**: JavaScript runtime
- **TypeScript**: Type-safe language compiled to JavaScript

### Framework & HTTP
- **Express.js** (v4.21.2): Web framework for routing and middleware
- **CORS**: Cross-Origin Resource Sharing support
- **Helmet**: Security middleware for HTTP headers

### Database
- **MongoDB**: NoSQL database for data persistence
- **Mongoose** (v8.15.0): ODM (Object Data Modeling) for MongoDB

### Authentication & Security
- **JWT (jsonwebtoken)**: Token-based authentication
- **bcryptjs**: Password hashing and comparison
- **google-auth-library**: Google OAuth authentication
- **apple-signin-auth**: Apple Sign-In authentication
- **dotenv**: Environment variable management

### Payment Processing
- **Stripe** (v18.1.1): Payment gateway integration
- **Flutterwave**: Payment gateway integration (Africa-focused)

### Cloud Services
- **AWS S3** (@aws-sdk/client-s3): File storage for event media
- **AWS IVS** (@aws-sdk/client-ivs): Live video streaming service
- **AWS IVS Chat** (@aws-sdk/client-ivschat): Real-time chat for events
- **Firebase Admin SDK**: Push notifications and authentication

### Email & Notifications
- **Nodemailer** (v6.10.0): Email sending
- **Postmark** (v4.0.5): Email delivery service
- **Handlebars** (v4.7.8): Email template rendering
- **Firebase Cloud Messaging (FCM)**: Push notifications

### Utilities
- **Multer**: File upload handling
- **node-cron** (v4.2.1): Scheduled task execution
- **axios**: HTTP client for API requests
- **uuid**: Unique identifier generation
- **body-parser**: Request body parsing

### Development Tools
- **Nodemon**: Auto-restart development server
- **ts-node**: TypeScript execution for Node
- **TypeScript**: Latest version for compilation

---

## Project Structure

```
fanect-ppv-backend/
├── src/
│   ├── config/
│   │   ├── db.ts                          # MongoDB connection setup
│   │   └── fanect-ppv-df7d7-firebase...   # Firebase credentials
│   │
│   ├── controllers/
│   │   ├── authController.ts              # User auth (register, login, social auth)
│   │   ├── eventController.ts             # Event CRUD and streaming operations
│   │   ├── streampassController.ts        # Streampass purchase and management
│   │   ├── notificationController.ts      # Push notification handling
│   │   ├── feedbackController.ts          # Event feedback collection
│   │   ├── withdrawalController.ts        # Withdrawal request handling
│   │   └── admin/
│   │       ├── adminAuthController.ts     # Admin authentication
│   │       ├── eventController.ts         # Admin event management
│   │       ├── usersController.ts         # Admin user management
│   │       ├── organisersController.ts    # Organiser management
│   │       ├── transactionsController.ts  # Transaction monitoring
│   │       ├── feedbackController.ts      # Admin feedback review
│   │       └── analyticsController.ts     # Platform analytics
│   │
│   ├── middleware/
│   │   ├── authMiddleware.ts              # JWT token verification
│   │   ├── adminAuthMiddleware.ts         # Admin authorization
│   │   ├── googleTokenMiddleware.ts       # Google token validation
│   │   ├── locationMiddleware.ts          # Geolocation detection
│   │   └── multerMiddleware.ts            # File upload configuration
│   │
│   ├── models/
│   │   ├── User.ts                        # User document schema
│   │   ├── Admin.ts                       # Admin document schema
│   │   ├── Event.ts                       # Event document schema
│   │   ├── Streampass.ts                  # Streampass/ticket schema
│   │   ├── Transactions.ts                # Payment transaction schema
│   │   ├── Feedback.ts                    # Event feedback schema
│   │   ├── Notifications.ts               # Notification record schema
│   │   ├── Activity.ts                    # User activity log schema
│   │   ├── AdminActivity.ts               # Admin action audit schema
│   │   ├── Withdrawal.ts                  # Withdrawal request schema
│   │   ├── EventLocation.ts               # Event location schema
│   │   ├── Gift.ts                        # Gift schema
│   │   └── Views.ts                       # Event view tracking
│   │
│   ├── routes/
│   │   ├── auth.ts                        # User auth endpoints
│   │   ├── event.ts                       # Event endpoints
│   │   ├── streampass.ts                  # Streampass endpoints
│   │   ├── notification.ts                # Notification endpoints
│   │   ├── feedback.ts                    # Feedback endpoints
│   │   ├── withdrawal.ts                  # Withdrawal endpoints
│   │   └── admin/
│   │       ├── admin-auth.ts              # Admin auth endpoints
│   │       ├── event.ts                   # Admin event endpoints
│   │       ├── users.ts                   # Admin user endpoints
│   │       ├── organisers.ts              # Admin organiser endpoints
│   │       ├── transactions.ts            # Admin transaction endpoints
│   │       ├── feedback.ts                # Admin feedback endpoints
│   │       └── analytics.ts               # Admin analytics endpoints
│   │
│   ├── services/
│   │   ├── authService.ts                 # Authentication business logic
│   │   ├── emailService.ts                # Email sending logic
│   │   ├── fcmService.ts                  # Firebase Cloud Messaging
│   │   ├── ivsService.ts                  # AWS IVS operations
│   │   ├── s3Service.ts                   # AWS S3 file operations
│   │   ├── stripeService.ts               # Stripe payment logic
│   │   ├── flutterwaveService.ts          # Flutterwave payment logic
│   │   ├── paginationService.ts           # Pagination utilities
│   │   ├── analyticsService.ts            # Analytics calculations
│   │   ├── userService.ts                 # User business logic
│   │   ├── userActivityService.ts         # Activity tracking
│   │   ├── cronService.ts                 # Scheduled tasks
│   │   ├── sessionCleanupService.ts       # Session management
│   │   ├── sseService.ts                  # Server-Sent Events
│   │   └── appleAuthService.ts            # Apple authentication
│   │
│   ├── templates/
│   │   ├── emailVerification.hbs          # Email verification template
│   │   ├── passwordReset.hbs              # Password reset email
│   │   ├── eventLiveStreamBegins.hbs      # Stream start notification
│   │   ├── eventLiveStreamEnds.hbs        # Stream end notification
│   │   └── [other email templates]        # Gift, transaction, status emails
│   │
│   ├── types/
│   │   └── index.ts                       # TypeScript interfaces and types
│   │
│   └── server.ts                          # Express app setup and route mounting
│
├── dist/                                  # Compiled JavaScript output
├── node_modules/                          # Dependencies
├── package.json                           # Project configuration and scripts
├── tsconfig.json                          # TypeScript configuration
├── README.md                              # Project README
├── emailtemplate.md                       # Email template documentation
└── PROJECT_DOCUMENTATION.md               # This file
```

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                          │
│                    (Web, iOS, Android, etc.)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    HTTP/HTTPS Requests
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                      MIDDLEWARE LAYER                                │
│  - CORS, Helmet, Body Parser, Auth, Location Detection              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    EXPRESS ROUTE HANDLERS                            │
│  - API Routes, Admin Routes, Auth Routes, Event Routes, etc.        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    CONTROLLER LAYER                                  │
│  - Request validation, business logic orchestration                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼──────────┐  ┌────▼──────────┐  ┌────▼──────────┐
│   SERVICE LAYER   │  │ SERVICE LAYER │  │ SERVICE LAYER │
│ - Email Service   │  │ - IVS Service │  │ - Analytics   │
│ - Auth Service    │  │ - S3 Service  │  │ - Payment Gw. │
│ - FCM Service     │  │ - Pagination  │  │ - User Activity│
└────────┬──────────┘  └────┬──────────┘  └────┬──────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼──────┐      ┌────▼──────┐      ┌────▼──────┐
    │  MONGODB  │      │   AWS S3  │      │  AWS IVS  │
    │ (Mongoose)│      │  (Storage)│      │ (Streaming)│
    └──────────┘      └──────────┘      └──────────┘
         │                   │                   │
┌────────┴───────────────────┴───────────────────┴──────────┐
│               EXTERNAL SERVICES                           │
│ - Stripe (Payments)      - Firebase (Auth & Messaging)    │
│ - Flutterwave (Payments) - AWS Services (Cloud)           │
│ - Nodemailer/Postmark    - Google OAuth / Apple Sign-In   │
└──────────────────────────────────────────────────────────┘
```

### Data Flow Example: Streampass Purchase

```
1. User initiates purchase
   │
   ├─► streampassController.buyStreampass()
   │   ├─► Validates user auth
   │   ├─► Checks event availability
   │   ├─► Determines payment method (Stripe/Flutterwave)
   │   │
   │   └─► Payment Processing
   │       ├─► stripeService.createCheckoutSession() or
   │       └─► flutterwaveService.initializePayment()
   │
   ├─► Payment Gateway Webhook Callback
   │   ├─► Verifies transaction status
   │   ├─► Creates Streampass record in MongoDB
   │   ├─► Records Transaction in database
   │   ├─► Updates Analytics
   │   │
   │   └─► Send Confirmation Email
   │       └─► emailService.sendStreampassConfirmation()
   │
   └─► User receives streampass access
       └─► Can watch event and access chat
```

### Authentication Flow

```
REGISTRATION:
  User Input ─► Register Endpoint ─► Hash Password ─► Save User ─► Send Verification Email

EMAIL VERIFICATION:
  Verification Link ─► Verify Endpoint ─► Mark as Verified ─► Enable Login

LOGIN (JWT):
  Credentials ─► Validate ─► Generate JWT Token ─► Return Token & User

TOKEN USAGE:
  Client ─► Include JWT in Authorization Header ─► authMiddleware Validates ─► Allow Access

REFRESH TOKEN:
  Expired Token ─► Refresh Endpoint ─► Issue New Token

SOCIAL AUTH (Google/Apple):
  Social Provider ─► Token Received ─► Validate with Provider ─► Create/Link User ─► JWT Token
```

---

## Core Features

### 1. User Authentication & Management

**Features:**
- Email/password registration with verification
- JWT-based login/logout
- Google OAuth integration
- Apple Sign-In integration
- Password reset flow with email verification
- Profile management and updates
- Account deletion

**Controllers:** `authController.ts`, `admin/adminAuthController.ts`

**Key Methods:**
- `register()` - Create new user account
- `login()` - Authenticate and issue JWT
- `googleAuth()` - Google OAuth flow
- `appleAuth()` - Apple Sign-In flow
- `forgotPassword()` - Initiate password reset
- `resetPassword()` - Complete password reset with token
- `updateProfile()` - Update user profile information
- `deleteAccount()` - Permanently delete user account

---

### 2. Event Management

**Features:**
- Create events with multi-currency pricing
- Upload event media (banner, trailer, watermark)
- AWS IVS integration for live streaming
- Event status tracking (Draft, Published, Live, Completed)
- Event analytics and view tracking
- Real-time chat via IVS Chat

**Controllers:** `eventController.ts`, `admin/eventController.ts`

**Key Methods:**
- `createEvent()` - Create new event with media uploads
- `updateEvent()` - Modify event details
- `deleteEvent()` - Remove event
- `getEventById()` - Fetch detailed event info
- `getUpcomingEvents()` - List upcoming events
- `getLiveEvents()` - List currently live events
- `approveEvent()` - Admin approval with IVS channel creation
- `publishEvent()` - Publish event for users
- `getStreamKeyForEvent()` - Retrieve AWS IVS stream key
- `getPlaybackUrl()` - Get playback URL for viewers
- `eventStatistics()` - Analytics for event performance

**Event States:**
```
DRAFT ──► (Admin Approve) ──► APPROVED/PUBLISHED
              │
              ├─────────► (Start Time Reached) ──► LIVE
              │                                       │
              │                                  (Event Ends)
              └─────────────────────────────────► COMPLETED
```

---

### 3. Streampass (Ticket) System

**Features:**
- Purchase event access passes
- Support for single and bulk purchases
- Gift streampass to other users
- Track streampass usage and conversion
- Multi-currency pricing with geolocation detection
- Session management for watching events

**Controllers:** `streampassController.ts`

**Payment Methods:**
- Stripe (Global)
- Flutterwave (Africa-focused)

**Key Methods:**
- `buyStreampass()` - Purchase streampass for event
- `getUpcomingTicketedEvents()` - List events user has passes for (upcoming)
- `getPastTicketedEvents()` - List past event passes
- `getLiveTicketedEvents()` - List currently live events with passes
- `createStripeCheckoutSession()` - Initialize Stripe payment
- `flutterwaveInitialization()` - Initialize Flutterwave payment
- `createSingleSession()` - Create streaming session
- `updateStreamSessionHeartbeat()` - Keep-alive for active sessions

---

### 4. Payment & Transaction Management

**Features:**
- Multiple payment gateway integration
- Transaction tracking and history
- Currency conversion awareness
- Payment verification and webhook handling
- Revenue analytics by event and currency

**Services:**
- `stripeService.ts` - Stripe integration
- `flutterwaveService.ts` - Flutterwave integration

**Transaction Statuses:**
- `SUCCESSFUL` - Payment completed
- `PENDING` - Awaiting confirmation
- `FAILED` - Payment failed or rolled back

**Supported Currencies:** 80+ currencies including USD, EUR, GBP, NGN, JPY, CNY, INR, BRL, and more

---

### 5. Real-time Notifications

**Features:**
- Firebase Cloud Messaging (FCM) for push notifications
- Event stream start/end notifications
- Gift notifications
- Transaction confirmations
- Server-Sent Events (SSE) for real-time updates

**Controllers:** `notificationController.ts`

**Services:** `fcmService.ts`, `sseService.ts`

**Key Methods:**
- `sendNotificationToUsers()` - Broadcast push notifications
- `subscribeToEventStatus()` - SSE endpoint for event updates
- `eventStatusSSE()` - Real-time event status via Server-Sent Events

**Notification Types:**
- Live Stream Begins
- Live Stream Ends
- Gift Received
- Streampass Purchase Confirmation
- Event Status Updates

---

### 6. Admin Dashboard & Analytics

**Features:**
- Platform-wide analytics dashboard
- User and event statistics
- Revenue tracking by currency and timeframe
- Engagement metrics (views, ratings, feedback)
- Admin action audit trail
- Event approval workflow

**Controllers:** `admin/analyticsController.ts`

**Analytics Endpoints:**
- `getDashboardOverview()` - High-level metrics
- `getDetailedAnalytics()` - Detailed breakdowns
- `getEngagementStats()` - Engagement metrics
- `getTopEvents()` - Revenue-leading events
- `getTopCurrencies()` - Currency-specific revenue
- `getRecentActivity()` - Recent events and users

**Key Metrics:**
- Total users, active users, verified users
- Total events, live events, approved events
- Revenue by currency and date range
- View counts and engagement rates
- Feedback ratings and counts

---

### 7. Feedback & Ratings

**Features:**
- Event attendees can submit feedback
- Rating system with prevented duplicates
- Summary statistics per event

**Controllers:** `feedbackController.ts`, `admin/feedbackController.ts`

**Key Methods:**
- `submitFeedback()` - Post event feedback
- `getFeedbackByEvent()` - Retrieve event feedback
- `getFeedbackStats()` - Summary statistics

---

### 8. User Activity Tracking

**Features:**
- Track user actions (views, purchases, gifting)
- Admin action audit trail
- Activity-based analytics

**Services:** `userActivityService.ts`

**Tracked Activities:**
- Event views
- Streampass purchases
- Gift transactions
- Account updates

---

### 9. Scheduled Tasks (Cron Jobs)

**Features:**
- Automated cleanup routines
- Session expiration
- Email reminders
- Analytics aggregation

**Services:** `cronService.ts`, `sessionCleanupService.ts`

**Scheduled Jobs:**
- Stream session cleanup
- Expired token cleanup
- Old transaction archive
- Analytics aggregation

---

## Database Models

### User Model

```typescript
{
  username: String,              // Unique username
  email: String,                 // Contact email (unique)
  password: String,              // Hashed password
  firstName: String,             // First name
  lastName: String,              // Last name
  refreshToken?: String,         // For JWT refresh
  resetPasswordToken?: String,   // For password reset
  resetPasswordExpires?: Number, // Token expiry (timestamp)
  verificationCode?: String,     // Email verification code
  verificationCodeExpires?: Number, // Verification expiry
  isVerified: Boolean,           // Email verified status
  appNotifLiveStreamBegins: Boolean,     // Notification preference
  appNotifLiveStreamEnds: Boolean,       // Notification preference
  emailNotifLiveStreamBegins: Boolean,   // Email preference
  emailNotifLiveStreamEnds: Boolean,     // Email preference
  deviceTokens: [String],        // FCM device tokens
  appleId?: String,              // Apple Sign-In ID
  sessionToken?: String,         // Current session token
  lastLogin?: Date,              // Last login timestamp
  locked?: Boolean,              // Account locked status
  status: UserStatus,            // ACTIVE | INACTIVE
  createdAt: Date,               // Record creation
  updatedAt: Date                // Last update
}
```

### Event Model

```typescript
{
  name: String,                  // Event name
  date: Date,                    // Event date
  time: String,                  // Event time
  description: String,           // Event description
  banner: String,                // Banner image URL (S3)
  trailer: String,               // Trailer video URL (S3)
  watermark: String,             // Watermark image URL (S3)
  prices: [IPrice],              // Multi-currency pricing
  //  { currency: 'USD', amount: 50 }
  
  // IVS Streaming Setup
  ivsChannelArn: String,         // AWS IVS channel ARN
  ivsChatRoomArn: String,        // AWS IVS chat room ARN
  ivsPlaybackUrl: String,        // Playback URL
  streamKey: String,             // Stream key for broadcasters
  
  // Status & Metadata
  status: EventStatus,           // DRAFT | LIVE | COMPLETED
  published: Boolean,            // Publicly visible
  adminStatus: String,           // Approval status
  
  // Broadcast Info
  haveBroadcastRoom: Boolean,    // Has broadcast setup
  broadcastSoftware: String,     // Software used (OBS, etc)
  streamingDeviceType: String,   // Device type
  scheduledTestDate: Date,       // Test broadcast date
  
  // Creator & Metadata
  createdBy: ObjectId,           // Event creator user ID
  publishedBy: ObjectId,         // Admin who published
  createdAt: Date,               // Creation timestamp
  updatedAt: Date                // Last update
}
```

### Streampass Model

```typescript
{
  user: ObjectId,                // User who purchased
  email: String,                 // User email
  firstName: String,             // User first name
  event: ObjectId,               // Event referenced
  paymentMethod: 'stripe' | 'flutterwave',  // Payment method
  paymentReference: String,      // Transaction reference ID
  isGift: Boolean,               // Gifted streampass flag
  hasConverted: Boolean,         // If gifted, whether accepted
  hasUsed: Boolean,              // Whether pass was used
  inSession?: Boolean,           // Currently watching
  sessionToken?: String,         // Active session token
  lastActive?: Date,             // Last activity timestamp
  createdAt: Date                // Purchase date
}
```

### Transactions Model

```typescript
{
  user: ObjectId,                // Buyer user ID
  event: ObjectId,               // Event ID (required)
  paymentMethod: 'stripe' | 'flutterwave',
  paymentReference: String,      // Transaction ID from provider
  amount: Number,                // Amount paid
  currency: String,              // Currency code (USD, NGN, etc)
  isGift: Boolean,               // Gift transaction flag
  status: TransactionStatus,     // SUCCESSFUL | PENDING | FAILED
  createdAt: Date                // Transaction timestamp
}
```

### Feedback Model

```typescript
{
  user: ObjectId,                // Who submitted feedback
  event: ObjectId,               // Event reviewed
  rating: Number,                // Rating (1-5)
  comment: String,               // Feedback text
  createdAt: Date,               // Submission timestamp
  // Unique constraint on (user, event) to prevent duplicates
}
```

### Admin Model

```typescript
{
  username: String,
  email: String,
  password: String,              // Hashed
  role: String,                  // Admin role
  isVerified: Boolean,
  isActive: Boolean,
  lastLogin?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Other Models

- **AdminActivity** - Audit trail of admin actions
- **Activity** - User action history
- **Notifications** - Notification records
- **Withdrawal** - Withdrawal requests
- **EventLocation** - Event venue/location details
- **Gift** - Gift transaction records
- **Views** - Event view tracking

---

## API Endpoints

### User Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/google` | Google OAuth login |
| POST | `/api/v1/auth/apple` | Apple Sign-In login |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Complete password reset |
| POST | `/api/v1/auth/resend-otp` | Resend verification code |
| POST | `/api/v1/auth/verify-email` | Verify email with code |

### User Profile (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/profile` | Get user profile |
| PUT | `/api/v1/auth/profile` | Update user profile |
| POST | `/api/v1/auth/change-password` | Change password |
| POST | `/api/v1/auth/logout` | Logout (optional) |
| DELETE | `/api/v1/auth/account` | Delete account |
| POST | `/api/v1/auth/refresh-token` | Refresh JWT token |

### Events (Public + Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/events/upcoming` | List upcoming events |
| GET | `/api/v1/events/live` | List live events |
| GET | `/api/v1/events/past` | List past events |
| GET | `/api/v1/events/:id` | Get event details |
| POST | `/api/v1/events` | Create event (Protected) |
| PUT | `/api/v1/events/:id` | Update event (Protected) |
| DELETE | `/api/v1/events/:id` | Delete event (Protected) |
| GET | `/api/v1/events/stats/:eventId` | Get event statistics (Protected) |
| GET | `/api/v1/events/streamkey/:eventId` | Get stream key (Protected) |
| GET | `/api/v1/events/playbackurl/:eventId` | Get playback URL (Protected) |
| POST | `/api/v1/events/ivs/webhook` | IVS webhook callback |

### Streampass (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/streampass/buy-streampass` | Purchase streampass |
| GET | `/api/v1/streampass/upcoming` | Upcoming events with pass |
| GET | `/api/v1/streampass/past` | Past events with pass |
| GET | `/api/v1/streampass/live` | Live events with pass |
| POST | `/api/v1/streampass/payments/stripe/create-checkout-session` | Stripe checkout |
| POST | `/api/v1/streampass/payments/flutterwave/initialize` | Flutterwave init |
| POST | `/api/v1/streampass/payments/verify-payment` | Verify payment |
| GET | `/api/v1/streampass/get-one-event/:eventId` | User's pass for event |
| POST | `/api/v1/streampass/stream-session` | Create watch session |
| POST | `/api/v1/streampass/heartbeat` | Session keep-alive |
| GET | `/api/v1/streampass/events/:eventId/stream-status` | SSE event status |
| GET | `/api/v1/streampass/banks` | List supported banks (Flutterwave) |
| POST | `/api/v1/streampass/resolve-account` | Account resolution |

### Feedback (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/feedback` | Submit event feedback |
| GET | `/api/v1/feedback/:eventId` | Get event feedback |

### Notifications (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/notifications/subscribe` | Subscribe to notifications |
| GET | `/api/v1/notifications/history` | Get notification history |

### Withdrawal (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/withdrawal/details` | Save withdrawal account |
| GET | `/api/v1/withdrawal/details` | Get withdrawal details |

### Admin Endpoints (Admin Protected)

#### Admin Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/auth/register` | Admin registration |
| POST | `/api/v1/admin/auth/login` | Admin login |
| POST | `/api/v1/admin/auth/create-admin` | Create new admin |
| GET | `/api/v1/admin/auth/profile` | Get admin profile |

#### Admin Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/events` | List all events |
| POST | `/api/v1/admin/events` | Create event |
| GET | `/api/v1/admin/events/:id` | Get event details |
| PUT | `/api/v1/admin/events/:id` | Update event |
| DELETE | `/api/v1/admin/events/:id` | Delete event |
| POST | `/api/v1/admin/events/:id/approve` | Approve event |
| POST | `/api/v1/admin/events/:id/publish` | Publish event |
| GET | `/api/v1/admin/events/:id/locations` | Event locations |

#### Admin Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | List all users |
| GET | `/api/v1/admin/users/:id` | Get user details |
| GET | `/api/v1/admin/users/:id/activity` | User activity history |
| GET | `/api/v1/admin/users/:id/transactions` | User transactions |
| POST | `/api/v1/admin/users/:id/lock` | Lock user account |
| POST | `/api/v1/admin/users/:id/unlock` | Unlock user account |

#### Admin Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/transactions` | List all transactions |
| GET | `/api/v1/admin/transactions/:id` | Get transaction details |

#### Admin Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/analytics/dashboard` | Dashboard overview |
| GET | `/api/v1/admin/analytics/detailed` | Detailed analytics |
| GET | `/api/v1/admin/analytics/session-stats` | Session statistics |

#### Admin Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/feedbacks` | List all feedback |

---

## Services

### AuthService

Handles authentication logic including:
- Password hashing and verification
- JWT token generation and validation
- Refresh token management
- Social auth provider integration

**Key Methods:**
- `hashPassword(password)` - Secure password hashing
- `verifyPassword(password, hash)` - Validate password
- `generateToken(userId)` - Create JWT token
- `verifyToken(token)` - Validate JWT

### EmailService

Email sending and template rendering:
- Template compilation with Handlebars
- Multi-provider support (Nodemailer, Postmark)
- Email queue management

**Supported Templates:**
- Email Verification
- Password Reset
- Stream Start/End Notifications
- Streampass Confirmation
- Gift Notifications
- Transaction Receipts

### FCM Service (Firebase Cloud Messaging)

Push notification management:
- Device token registration
- Notification broadcasting
- Topic-based subscriptions
- Delivery tracking

**Key Methods:**
- `sendNotificationToUsers(userIds, notification)` - Send push notifications
- `subscribeToTopic(deviceTokens, topic)` - Subscribe to topic
- `unsubscribeFromTopic(deviceTokens, topic)` - Unsubscribe from topic

### IVS Service (AWS Interactive Video Service)

Live streaming channel management:
- Create/delete channels and chat rooms
- Stream key generation
- Chat token generation
- Playback URL retrieval
- Webhook event handling

**Key Methods:**
- `createChannel(name)` - Create IVS channel
- `createStreamKey(channelArn)` - Generate stream key
- `createChatRoom(eventName)` - Create chat room
- `createChatToken(roomId, userId, userName)` - Auth token for chat
- `deleteChannel(channelArn)` - Remove channel
- `getStreamKeyValue(channelArn)` - Retrieve stream key

### S3 Service (AWS Simple Storage Service)

File storage and management:
- Upload files (images, videos)
- Generate presigned URLs
- Delete files
- Organize by folders

**Supported File Types:**
- Event banners
- Trailers
- Watermarks
- User avatars

### Stripe Service

Stripe payment gateway integration:
- Checkout session creation
- Payment intent management
- Webhook verification
- Customer management

**Key Methods:**
- `createCheckoutSession(eventId, userId, amount, currency)` - Create payment session
- `verifyWebhookSignature(payload, signature)` - Validate webhook
- `retrieveSession(sessionId)` - Get session status

### Flutterwave Service

Flutterwave payment gateway integration:
- Payment initialization
- Transaction verification
- Bank list retrieval
- Account resolution

**Key Methods:**
- `initializePayment(user, event, amount, currency)` - Start payment
- `verifyTransaction(reference)` - Verify payment success
- `resolveBankAccount(accountNumber, bankCode)` - Validate account

### Pagination Service

Utility functions for paginated queries:
- MongoDB aggregation pagination
- Find-based pagination
- Cursor-based pagination

**Key Methods:**
- `paginateAggregate(pipeline, page, limit)` - Paginate aggregations
- `paginateFind(query, page, limit, select)` - Paginate find queries

### Analytics Service

Platform analytics calculations:
- User statistics
- Event statistics
- Revenue analytics
- Engagement metrics
- Time-series data

**Key Methods:**
- `getPlatformOverview(timeframe)` - High-level overview
- `getRevenueByDate(startDate, endDate)` - Revenue tracking
- `getTopEvents(startDate)` - Best-performing events
- `getEngagementStats(startDate)` - Engagement metrics

### Cron Service

Scheduled task management:
- Job scheduling
- Job execution
- Error handling

**Scheduled Tasks:**
- Session cleanup (every 30 minutes)
- Analytics aggregation (daily)
- Email reminders (on-demand)

### SSE Service (Server-Sent Events)

Real-time event streaming to clients:
- Event status updates
- Client connection management
- Message broadcasting

**Key Methods:**
- `eventStatusSSE()` - Express middleware for SSE endpoint

### User Service

User-related business logic:
- User creation
- Profile updates
- Activity tracking
- Gift/streampass conversion

### User Activity Service

Activity logging and tracking:
- Record user actions
- Query activity history
- Analytics on activity

**Tracked Actions:**
- Event views
- Purchases
- Gifts sent/received
- Profile updates

---

## Middleware

### AuthMiddleware

Validates JWT tokens and attaches user to request:
```typescript
// Usage: app.use('/protected-route', authMiddleware)
// Sets: req.user = { id, email, ... }
```

**Behavior:**
- Extracts JWT from Authorization header
- Validates token signature and expiry
- Returns 401 if invalid/missing
- Passes user info to controllers

### Admin Auth Middleware

Similar to auth middleware but for admin endpoints:
```typescript
// Usage: app.use('/admin-route', adminAuthMiddleware)
// Sets: req.admin = { id, email, role, ... }
```

### Google Token Middleware

Validates Google OAuth tokens for social auth.

### Location Middleware

Detects user's country from IP address:
```typescript
// Sets: req.userCountry = 'US', 'GB', 'NG', etc.
```

Used for currency detection and localization.

### Multer Middleware

File upload handling:
```typescript
// uploadFields - Handles multiple file types
// Sets: req.files = { banner, trailer, watermark, ... }
```

**Configured Fields:**
- `banner` - Event banner image
- `trailer` - Event trailer video
- `watermark` - Event watermark image

---

## Installation & Setup

### Prerequisites

- Node.js 14+ and npm
- MongoDB instance (local or cloud)
- AWS account (for S3, IVS services)
- Firebase project (for FCM)
- Stripe account (for payments)
- Flutterwave account (for payments)
- Google OAuth credentials
- Apple Developer account (for Sign-In)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/fanect-ppv-backend.git
cd fanect-ppv-backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Setup Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/fanect-ppv

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d

# AWS S3
AWS_S3_ACCESS_KEY_ID=your_access_key
AWS_S3_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=fanect-ppv-bucket

# AWS IVS
AWS_IVS_ACCESS_KEY_ID=your_access_key
AWS_IVS_SECRET_ACCESS_KEY=your_secret_key
AWS_IVS_REGION=us-east-1

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_...

# Email Service
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_app_password
POSTMARK_API_TOKEN=your_postmark_token

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret

# Apple Sign-In
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_BUNDLE_ID=com.fanect.app

# Admin
ADMIN_EMAIL=admin@fanect.com
ADMIN_PASSWORD=secure_password_here
```

### Step 4: Download Firebase Credentials

Place your Firebase service account JSON file in `src/config/`:
```bash
cp /path/to/firebase-adminsdk-*.json src/config/
```

### Step 5: Build TypeScript

```bash
npm run build
```

### Step 6: Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### Step 7: Database Initialization

The first user created with the provided `ADMIN_EMAIL` will be admin.

---

## Development Guide

### Project Structure Best Practices

1. **Controllers** - Request handling, input validation
2. **Services** - Business logic, external API calls
3. **Models** - Database schemas and interfaces
4. **Routes** - Endpoint definitions
5. **Middleware** - Cross-cutting concerns

### Adding a New Feature

#### Example: Add a new "Reviews" feature

1. **Create Model** (`src/models/Review.ts`):
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    event: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    title: string;
    content: string;
    rating: number;
    createdAt: Date;
}

const ReviewSchema = new Schema<IReview>({
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IReview>('Review', ReviewSchema);
```

2. **Create Controller** (`src/controllers/reviewController.ts`):
```typescript
import { Request, Response } from 'express';
import Review from '../models/Review';

class ReviewController {
    async createReview(req: Request, res: Response) {
        const { eventId, title, content, rating } = req.body;
        const userId = req.user.id;

        try {
            const review = new Review({
                event: eventId,
                user: userId,
                title,
                content,
                rating
            });

            await review.save();
            res.status(201).json({ message: 'Review created', review });
        } catch (error) {
            res.status(500).json({ message: 'Error creating review' });
        }
    }

    async getReviewsByEvent(req: Request, res: Response) {
        const { eventId } = req.params;
        
        try {
            const reviews = await Review.find({ event: eventId })
                .populate('user', 'firstName lastName')
                .sort({ createdAt: -1 });
            
            res.json(reviews);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching reviews' });
        }
    }
}

export default new ReviewController();
```

3. **Create Routes** (`src/routes/review.ts`):
```typescript
import express from 'express';
import reviewController from '../controllers/reviewController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, reviewController.createReview);
router.get('/event/:eventId', reviewController.getReviewsByEvent);

export default router;
```

4. **Mount Routes** (in `src/server.ts`):
```typescript
import reviewRoutes from './routes/review';

app.use('/api/v1/reviews', reviewRoutes);
```

5. **Create Email Template** (if needed):
```handlebars
<!-- src/templates/reviewNotification.hbs -->
<h2>New Review on {{eventName}}</h2>
<p>{{reviewerName}} left a {{rating}}-star review:</p>
<p>{{content}}</p>
```

### Error Handling Pattern

```typescript
async someOperation(req: Request, res: Response) {
    try {
        // Validate input
        if (!req.body.requiredField) {
            return res.status(400).json({ 
                message: 'Required field missing' 
            });
        }

        // Perform operation
        const result = await SomeModel.findById(req.body.id);
        
        if (!result) {
            return res.status(404).json({ 
                message: 'Resource not found' 
            });
        }

        // Success response
        res.status(200).json({ 
            message: 'Operation successful',
            data: result
        });
        
    } catch (error) {
        console.error('Operation error:', error);
        res.status(500).json({ 
            message: 'An error occurred. Please try again.' 
        });
    }
}
```

### Testing

Create tests in a `tests/` directory:

```typescript
// tests/auth.test.ts
import request from 'supertest';
import app from '../src/server';

describe('Auth Endpoints', () => {
    it('should register a new user', async () => {
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User'
            });

        expect(response.status).toBe(201);
        expect(response.body.user).toBeDefined();
    });
});
```

Run tests with: `npm test`

---

## Deployment

### Prerequisites for Deployment

- Production MongoDB instance
- AWS S3, IVS production credentials
- Firebase production project
- Stripe/Flutterwave production keys
- Domain and SSL certificate
- Process manager (PM2, Docker)

### Option 1: Heroku Deployment

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create fanect-ppv-backend

# Set environment variables
heroku config:set MONGO_URI=...
heroku config:set JWT_SECRET=...
# ... set all env vars

# Deploy
git push heroku main
```

### Option 2: Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=${MONGO_URI}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
volumes:
  mongo-data:
```

Deploy:
```bash
docker-compose up -d
```

### Option 3: AWS EC2/ECS Deployment

1. Create EC2 instance (Ubuntu 20.04)
2. Install Node.js and npm
3. Clone repository
4. Setup environment variables
5. Build and start with PM2:

```bash
npm run build
npm install -g pm2
pm2 start dist/server.js --name fanect-ppv-backend
pm2 startup
pm2 save
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Setup error logging (Sentry, Datadog)
- [ ] Enable database backups
- [ ] Configure rate limiting
- [ ] Setup monitoring and alerts
- [ ] Enable GZIP compression
- [ ] Setup CI/CD pipeline
- [ ] Document API with Swagger/OpenAPI
- [ ] Configure webhooks for payment gateways
- [ ] Setup email delivery service

### Monitoring

Key metrics to monitor:
- API response times
- Error rates
- Database query performance
- AWS service usage (S3, IVS, SQS)
- Payment transaction success rates
- Active user sessions
- Email delivery success

---

## Troubleshooting

### Common Issues

**Issue: MongoDB Connection Error**
```
Solution: Verify MONGO_URI is correct and database is accessible
- Check connection string format
- Verify IP whitelist in MongoDB Atlas
- Test with mongo shell: mongosh "mongodb+srv://..."
```

**Issue: JWT Token Expired**
```
Solution: Implement token refresh logic
- Check token expiry in JWT_EXPIRY
- Client should call /refresh-token endpoint with refresh token
```

**Issue: S3 Upload Fails**
```
Solution: Verify AWS S3 credentials and permissions
- Check AWS_S3_ACCESS_KEY_ID and SECRET_ACCESS_KEY
- Verify IAM user has S3 upload permissions
- Check bucket exists and is in correct region
```

**Issue: IVS Channel Creation Fails**
```
Solution: Check AWS IVS setup
- Verify AWS region is correct
- Check IAM permissions for IVS
- Verify channel ARN format
```

**Issue: FCM Notifications Not Sending**
```
Solution: Verify Firebase setup
- Check device tokens are valid
- Verify Firebase credentials file path
- Check device tokens haven't expired
```

---

## Security Best Practices

1. **Password Security**
   - Hash passwords with bcryptjs
   - Enforce strong password requirements
   - Implement rate limiting on login

2. **Token Security**
   - Use long expiry for refresh tokens (7 days)
   - Use short expiry for access tokens (1 hour)
   - Store tokens securely on client (HttpOnly cookies or secure storage)

3. **Data Validation**
   - Validate all user inputs
   - Use TypeScript for type safety
   - Sanitize email and string inputs

4. **API Security**
   - Use HTTPS/TLS for all communications
   - Implement CORS with specific origins
   - Use Helmet for security headers
   - Implement rate limiting

5. **Database Security**
   - Use parameterized queries (Mongoose handles this)
   - Implement least-privilege access
   - Enable database encryption
   - Regular backups

6. **External Service Security**
   - Store credentials in environment variables
   - Use API keys with limited scopes
   - Verify webhooks with signatures
   - Implement request timeouts

---

## Support & Contact

For questions or issues:
- Email: support@fanect.com
- GitHub Issues: [Repository Issues]
- Documentation: [Project Wiki]

---

**Last Updated:** November 20, 2025  
**Version:** 1.0.0  
**Status:** Production Ready
