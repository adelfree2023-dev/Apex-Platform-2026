# 🗺️ خريطة الصفحات الكاملة - Apex Platform

> **دليل شامل لجميع الصفحات والواجهات في المنصة**

---

## 📊 ملخص سريع

| الواجهة | عدد الصفحات الأساسية | عدد الصفحات الكلي | الأولوية |
|---------|---------------------|-------------------|----------|
| **Super Admin (HQ)** | 20 | 35+ | 🔥🔥🔥 |
| **Marketing Site** | 10 | 15+ | 🔥🔥🔥 |
| **Tenant Admin** | 25 | 40+ | 🔥🔥 |
| **Storefront** | 15 | 25+ | 🔥 |
| **Mobile App** | 10 | 15+ | ⚡ |
| **المجموع** | **80** | **130+** | - |

---

## 1️⃣ Super Admin Dashboard (HQ) - مركز التحكم الرئيسي

### 📊 Dashboard & Analytics

#### `/admin/dashboard`
**الصفحة الرئيسية - Mission Control**

**Real-time Metrics:**
- 📈 Total Active Tenants
- 💰 MRR (Monthly Recurring Revenue)
- 📊 ARR (Annual Recurring Revenue)
- 🔑 Active Licenses
- ⚠️ Expiring Soon (< 7 days)
- 🚫 Suspended Tenants
- 💳 Failed Payments (last 24h)

**Charts & Graphs:**
- Revenue trend (30 days)
- New signups vs Churn (weekly)
- License usage distribution
- Top plans by revenue
- Regional distribution map

**Quick Actions:**
- ➕ Create New Tenant
- 🔑 Generate License
- 📧 Send Bulk Email
- 📊 Download Report

**Recent Activities (Live Feed):**
- New tenant registrations
- License activations
- Payment events
- Support tickets
- System alerts

---

### 🏢 Tenant Management

#### `/admin/tenants`
**قائمة المستأجرين**

**Features:**
- 🔍 Advanced Search (name, email, domain, license key)
- 🎛️ Filters:
  - Status (Active, Trial, Suspended, Cancelled)
  - Plan (Starter, Pro, Enterprise)
  - Created Date Range
  - Expiry Date Range
  - Payment Status
- 📋 Columns:
  - Tenant Name
  - Domain
  - Plan
  - Status
  - MRR
  - License Expiry
  - Created Date
  - Actions
- 🔄 Bulk Actions:
  - Suspend/Resume
  - Send Email
  - Export Selected
  - Change Plan
- 📤 Export Options:
  - CSV
  - Excel
  - PDF Report

**Views:**
- 📋 List View (default)
- 🎴 Card View
- 📊 Stats View

#### `/admin/tenants/:id`
**تفاصيل المستأجر - Deep Dive**

**Tabs:**

**1. Overview**
- Tenant Information Card:
  - Name, Email, Phone
  - Domain (subdomain + custom)
  - Created Date
  - Company Info
  - Owner Details
- Current Status:
  - Plan name & tier
  - Billing cycle
  - Next billing date
  - Auto-renew status
- Usage Statistics:
  - Products count
  - Orders count (this month)
  - Revenue (this month)
  - Storage used
  - Bandwidth used
  - API calls (this month)
- Quick Actions:
  - 👤 **Login as Tenant** (Impersonation Mode)
  - 🔄 Change Plan
  - ⏸️ Suspend Tenant
  - ▶️ Resume Tenant
  - 🗑️ Delete Tenant
  - 🔑 Reset Password
  - 📧 Send Email

**2. Licenses**
- Active Licenses Table:
  - License Key
  - Status
  - Created Date
  - Expiry Date
  - Last Used
  - IP Address
  - Actions (Revoke, Extend)
- License History
- Generate New License Button
- Revoked Licenses Archive

**3. Billing & Payments**
- Current Subscription:
  - Plan details
  - Price
  - Next payment date
  - Payment method
- Payment History Table:
  - Invoice #
  - Date
  - Amount
  - Status
  - Payment Method
  - Download Invoice
- Failed Payments (if any)
- Refund History
- Credit Balance

**4. Users & Team**
- Tenant Users Table:
  - Name
  - Email
  - Role (Owner, Admin, Staff)
  - Status
  - Last Login
  - Actions
- Invite User
- Manage Permissions

**5. Store Data**
- Products Count
- Categories Count
- Orders Statistics
- Customers Count
- Revenue Breakdown
- Top Selling Products

**6. Activity & Logs**
- Audit Logs Table:
  - Timestamp
  - Action
  - User
  - IP Address
  - Details
- Login History
- API Usage Logs
- Error Logs
- Export Logs

**7. Settings**
- Domain Management:
  - Current subdomain
  - Custom domain setup
  - DNS verification
  - SSL status
- Theme Settings:
  - Current theme
  - Custom CSS
  - Logo/Favicon
- Email Settings:
  - From name/email
  - SMTP config (view only)
- Advanced:
  - Maintenance mode
  - API access
  - Webhooks

**8. Support**
- Support Tickets
- Notes (internal)
- Communication History
- Add Note

#### `/admin/tenants/new`
**إنشاء مستأجر جديد - Wizard**

**Step 1: Basic Information**
- Company Name *
- Contact Name *
- Email *
- Phone
- Country/Region

**Step 2: Store Setup**
- Store Name *
- Subdomain * (yourstore.apex-platform.com)
- Industry/Category
- Store Description

**Step 3: Select Plan**
- Plan options (cards):
  - Starter ($29/mo)
  - Professional ($79/mo)
  - Enterprise ($199/mo)
- Billing cycle toggle (Monthly/Yearly)
- Trial option (14 days free)

**Step 4: Owner Account**
- Owner Name *
- Owner Email *
- Generate Password / Let user choose
- Send welcome email checkbox

**Step 5: Review & Create**
- Summary of all inputs
- Terms & Conditions checkbox
- Create Tenant button

**Step 6: Success! 🎉**
- ✅ Tenant created successfully
- Display:
  - Tenant ID
  - Generated License Key
  - Store URL
  - Admin Dashboard URL
  - Owner credentials (if generated)
- Actions:
  - 📧 Send credentials email
  - 📋 Copy license key
  - 🔗 Open dashboard
  - ✅ Done

---

### 🔑 License Management

#### `/admin/licenses`
**قائمة الرخص الشاملة**

**Stats Cards:**
- Total Licenses
- Active Licenses
- Expired Licenses
- Expiring Soon (< 7 days)

**Filters:**
- Status (All, Active, Expired, Revoked, Suspended)
- Expiry (All, < 7 days, < 30 days, > 30 days)
- Tenant (dropdown)
- Date Range

**Table Columns:**
- License Key
- Tenant Name/Domain
- Status (badge)
- Created Date
- Expiry Date
- Last Used
- IP Address
- Actions (View, Extend, Revoke)

**Bulk Actions:**
- Extend selected
- Revoke selected
- Export list

#### `/admin/licenses/new`
**توليد رخصة جديدة**

**Form:**
- Select Tenant * (dropdown with search)
- Expiry Duration:
  - 1 Month
  - 3 Months
  - 6 Months
  - 1 Year
  - Custom (input months)
- Metadata (JSON or Key-Value pairs):
  - Note
  - Reference ID
  - Custom fields
- Auto-send email checkbox

**Actions:**
- Generate License
- Cancel

**Success State:**
- ✅ License generated
- Display key (with copy button)
- Send to tenant button

#### `/admin/licenses/:key`
**تفاصيل الرخصة**

**License Information:**
- License Key (large, copyable)
- Status badge
- Tenant link
- Created date
- Expiry date
- Days remaining

**Usage Statistics:**
- Total API calls
- Last used timestamp
- IP addresses (list)
- User agents (list)
- Geographic usage (map)

**Usage History Table:**
- Timestamp
- IP Address
- User Agent
- Endpoint
- Status

**Metadata:**
- Display all metadata (JSON viewer)

**Actions:**
- 🔄 Extend License
  - Modal: input additional months
- 🚫 Revoke License
  - Modal: input reason
- ⏸️ Suspend License
  - Modal: input reason
- ▶️ Reactivate License
- 📧 Send to Tenant
- 📋 Copy Key
- 📊 View Full Report

**Timeline:**
- Created
- First used
- Last used
- Extended (if any)
- Revoked/Expired (if applicable)

---

### 💳 Plans & Pricing

#### `/admin/plans`
**إدارة الخطط**

**Plans Grid:**
Each plan card shows:
- Plan Name
- Price
- Billing interval
- Status (Active/Inactive)
- Featured badge
- Current subscribers count
- Actions (Edit, Duplicate, Delete, Toggle Active)

**Actions Bar:**
- ➕ Create New Plan
- 📊 Compare Plans
- 📤 Export Plans

#### `/admin/plans/:id/edit`
**تعديل الخطة**

**Tabs:**

**1. Basic Info**
- Plan Name *
- Slug * (auto-generated, editable)
- Description (textarea)
- Short Description (for cards)

**2. Pricing**
- Price * (in cents)
- Currency (USD, EUR, SAR, etc.)
- Billing Interval:
  - Monthly
  - Yearly
- Annual Discount (%)
- Trial Period (days)

**3. Features**
**Visual Feature Editor:**
- ✅ Custom Domain
- ✅ Email Support
- ✅ Phone Support (24/7)
- ✅ Analytics (Basic/Advanced/Enterprise)
- ✅ API Access
- ✅ White Label
- ✅ Priority Support
- ✅ Dedicated Account Manager
- ✅ SLA 99.9%
- + Add Custom Feature

**JSON Editor** (for advanced users)

**4. Limits**
- Max Products (number or -1 for unlimited)
- Max Orders per month
- Max Storage (MB)
- Max Bandwidth (GB)
- Max Team Members
- Max API Calls per month

**5. Settings**
- Is Active (toggle)
- Is Featured (toggle)
- Is Visible (show on pricing page)
- Sort Order (for display)
- Button Text (e.g., "Start Free Trial")
- Button Color

**6. Terms**
- Cancellation Policy (textarea)
- Money-back Guarantee (days)
- Notes (internal)

**Actions:**
- 💾 Save Changes
- 👁️ Preview
- ❌ Cancel

---

### 💰 Billing & Revenue

#### `/admin/billing`
**Financial Dashboard**

**Key Metrics (Cards):**
- 💰 MRR (Monthly Recurring Revenue)
  - Current
  - Growth %
  - Trend chart
- 📊 ARR (Annual Recurring Revenue)
- 💵 Total Revenue (All time)
- 📈 Average Revenue Per User (ARPU)
- 📉 Churn Rate
  - This month
  - Trend
- 🎯 Customer Lifetime Value (LTV)

**Charts:**
- Revenue over time (12 months)
- Revenue breakdown by plan (pie chart)
- Payment success vs failed (bar chart)
- Subscription growth (line chart)

**Recent Transactions (Table):**
- Date
- Tenant
- Amount
- Type (Subscription, One-time)
- Status
- View

#### `/admin/billing/invoices`
**إدارة الفواتير**

**Filters:**
- Status (All, Paid, Pending, Failed, Refunded)
- Date Range
- Tenant
- Amount Range

**Table:**
- Invoice #
- Date
- Tenant
- Amount
- Status
- Payment Method
- Actions (View, Download PDF, Send Email, Refund)

**Stats:**
- Total Invoices
- Total Amount
- Paid
- Pending
- Failed

#### `/admin/billing/payments`
**سجل المدفوعات**

**Tabs:**
- All Payments
- Successful
- Failed
- Refunded

**Table:**
- Payment ID
- Date & Time
- Tenant
- Invoice #
- Amount
- Method (Stripe, PayPal, etc.)
- Status
- Actions (View Details, Refund)

**Failed Payments Actions:**
- Retry Payment
- Send Reminder Email
- Suspend Tenant

---

### 📊 Analytics & Reports

#### `/admin/analytics`
**Business Intelligence Dashboard**

**Date Range Selector:**
- Last 7 days
- Last 30 days
- Last 90 days
- This Year
- All Time
- Custom Range

**Sections:**

**1. Growth Metrics**
- New Signups (chart)
  - Per day/week/month
  - Conversion funnel
- Trial to Paid Conversion Rate
- Active Users Growth
- User Retention Rate

**2. Revenue Metrics**
- Revenue Trend (line chart)
- Revenue by Plan (pie)
- Revenue by Region (map)
- ARPU Trend

**3. Churn Analysis**
- Churn Rate (%)
- Reasons for Cancellation (pie)
- At-Risk Customers
- Win-back Campaigns Performance

**4. Usage Metrics**
- Average Products per Tenant
- Average Orders per Tenant
- Storage Usage (total & per tenant)
- API Usage (total & top consumers)

**5. Customer Metrics**
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- LTV:CAC Ratio
- Payback Period

**6. Top Performers**
- Top Tenants by Revenue
- Top Performing Plans
- Top Regions

#### `/admin/reports`
**Custom Reports Builder**

**Report Templates:**
- Monthly Financial Report
- Tenant Activity Report
- License Usage Report
- Churn Analysis Report
- Custom Report

**Report Builder:**
1. Select Data Source
2. Choose Metrics
3. Apply Filters
4. Set Date Range
5. Choose Visualization
6. Schedule (optional)

**Scheduled Reports:**
- List of scheduled reports
- Edit/Delete
- Run Now

**Report History:**
- Previously generated reports
- Download again

---

### 👥 User Management (Super Admins)

#### `/admin/users`
**HQ Users Management**

**List:**
- Name
- Email
- Role (Super Admin, Admin, Support)
- Status
- Last Login
- Actions

**Actions:**
- Add User
- Edit
- Deactivate
- Delete

#### `/admin/users/:id`
**User Details**

**Tabs:**
- Profile
- Permissions
- Activity Log
- Sessions

---

### 📜 Audit Logs

#### `/admin/audit`
**System Audit Trail**

**Filters:**
- Date Range
- Action Type (User Created, License Generated, etc.)
- User (Super Admin)
- Tenant
- Severity (Info, Warning, Error)

**Table:**
- Timestamp
- Action
- User
- Tenant (if applicable)
- IP Address
- User Agent
- Details
- View Full

**Export:**
- Export filtered logs (CSV, JSON)

---

### ⚙️ System Settings

#### `/admin/settings`

**Tabs:**

**1. General**
- Platform Name
- Company Name
- Support Email
- Support Phone
- Default Timezone
- Default Currency
- Date Format
- Logo
- Favicon

**2. Email**
- SMTP Settings:
  - Host
  - Port
  - Username
  - Password
  - Encryption (TLS/SSL)
- From Name
- From Email
- Test Email button
- Email Templates:
  - Welcome Email
  - License Expiry Warning
  - Payment Failed
  - Invoice Email
  - etc.

**3. Payment Gateways**
- Stripe:
  - Publishable Key
  - Secret Key
  - Webhook Secret
  - Test Mode toggle
- PayPal:
  - Client ID
  - Secret
  - Test Mode

**4. Storage**
- AWS S3:
  - Access Key
  - Secret Key
  - Bucket Name
  - Region
- Test Connection button

**5. Domain Management**
- Default Subdomain (e.g., apex-platform.com)
- DNS Provider API (Cloudflare)
  - API Token
  - Zone ID
- SSL Certificate Provider

**6. Security**
- Enable 2FA for Admins
- Password Policy
- Session Timeout
- IP Whitelist
- Rate Limiting

**7. Advanced**
- Feature Flags:
  - Enable Mobile App
  - Enable Custom Domains
  - Enable API Access
  - etc.
- Maintenance Mode
  - Toggle
  - Message
- Debug Mode (Dev only)
- API Rate Limits
- Webhook URLs

**8. Integrations**
- Google Analytics
- Facebook Pixel
- Sentry (Error Tracking)
- Intercom (Support Chat)

---

### 🔔 Notifications & Alerts

#### `/admin/notifications`

**Notification Center:**
- Unread count
- Notifications list:
  - New tenant signup
  - License expiring soon
  - Payment failed
  - Support ticket created
  - System alert
- Mark as read
- Delete
- Settings (which notifications to receive)

---

## 2️⃣ Marketing/Landing Site - صفحة التسويق

### 🏠 Public Pages

#### `/` (Homepage)
**Hero Section:**
- Compelling Headline
- Subheadline
- Primary CTA ("Start Your Free Trial")
- Secondary CTA ("See Pricing")
- Hero Image/Video
- Trust Badges (SSL, Payment Methods, etc.)

**Features Section:**
- 6-8 Key Features (grid)
  - Icon
  - Title
  - Description
  - "Learn More" link

**How It Works:**
- 3-4 Steps Timeline
  - Step 1: Sign Up
  - Step 2: Customize
  - Step 3: Launch
  - Step 4: Grow

**Pricing Preview:**
- 3 Plans (Cards)
- "View Full Pricing" link

**Social Proof:**
- Customer Testimonials (carousel)
  - Photo
  - Name
  - Company
  - Quote
  - Rating
- Trust Stats:
  - "10,000+ Stores Created"
  - "$50M+ Revenue Processed"
  - "99.9% Uptime"

**Featured Customers:**
- Logos (masonry/carousel)

**FAQ Section:**
- 6-8 Common Questions
- Accordion style

**Final CTA:**
- "Ready to Start?"
- CTA Button
- No credit card required note

**Footer:**
- Links (About, Features, Pricing, etc.)
- Social Media
- Newsletter Signup
- Copyright

---

#### `/pricing`
**Detailed Pricing Page**

**Header:**
- Headline: "Choose the Right Plan for Your Business"
- Monthly/Yearly Toggle (show discount)

**Plans Comparison Table:**
- Feature Matrix:
  - All features listed
  - Checkmarks for included features
  - Limits clearly shown

**Plans Cards:**
- Starter:
  - Price
  - Features list
  - "Start Free Trial" CTA
- Professional (Most Popular):
  - Highlighted
  - Price
  - Features
  - "Start Free Trial" CTA
- Enterprise:
  - "Contact Us" or Custom Pricing
  - Features
  - "Contact Sales" CTA

**Add-ons (Optional):**
- Extra Storage
- Premium Support
- Additional Team Members

**FAQs:**
- Billing questions
- Cancellation policy
- Money-back guarantee

**CTA:**
- "Still not sure? Try it free for 14 days"

---

#### `/features`
**Features Overview**

**Hero:**
- Headline
- Description

**Feature Categories:**
Each category is a section:

**1. Store Management**
- Product Management
- Inventory Tracking
- Order Processing
- Customer Management

**2. Marketing & SEO**
- SEO Optimization
- Email Marketing
- Discount Codes
- Analytics

**3. Payments**
- Multiple Payment Gateways
- Secure Checkout
- Invoicing

**4. Customization**
- Theme Builder
- Custom Domains
- Logo & Branding

**5. Mobile**
- Responsive Design
- Mobile App
- Push Notifications

**6. Integrations**
- Shipping Providers
- Accounting Software
- Social Media

Each feature has:
- Icon
- Title
- Description
- Screenshot/Demo
- "Learn More" link

**CTA at bottom**

---

#### `/features/:feature-name`
**Individual Feature Page**

Example: `/features/inventory-management`

**Structure:**
- Hero
  - Feature name
  - Tagline
  - Screenshot
- Problem Statement
- How It Works
- Benefits (3-4 key benefits)
- Screenshots/Video Demo
- Customer Testimonial
- Pricing (which plans include this)
- CTA

---

### 📚 Resources

#### `/blog`
**Blog Homepage**

- Latest Posts (grid)
- Categories (sidebar)
- Tags
- Search
- Newsletter signup

#### `/blog/:slug`
**Blog Post**

- Title
- Author & Date
- Featured Image
- Content
- Share buttons
- Related Posts
- Comments (optional)

#### `/docs`
**Documentation Center**

**Sidebar:**
- Getting Started
- User Guides
- Admin Guides
- API Reference
- Video Tutorials
- FAQs

**Content Area:**
- Search
- Article content
- Table of Contents
- "Was this helpful?" feedback
- Related Articles

#### `/case-studies`
**Customer Success Stories**

- List of case studies
- Each with:
  - Company Logo
  - Industry
  - Challenge
  - Solution
  - Results (metrics)
  - Testimonial

---

### 👨‍💼 Company Pages

#### `/about`
- Company Story
- Mission & Vision
- Team Members (photos, names, roles)
- Timeline/Milestones
- Press/Media Kit

#### `/contact`
- Contact Form:
  - Name
  - Email
  - Subject
  - Message
- Support Email
- Sales Email
- Office Address (if applicable)
- Phone Number
- Social Media Links

#### `/careers` (optional)
- Open Positions
- Company Culture
- Benefits
- Application Process

---

### 🔐 Authentication

#### `/login`
**Login Page**

**Form:**
- Email
- Password
- "Remember me" checkbox
- "Login" button
- "Forgot Password?" link

**Divider:**
- "Or continue with"

**Social Login:** (Optional)
- Google
- Facebook
- Apple

**Footer:**
- "Don't have an account? Sign up"

---

#### `/register`
**Sign Up - Multi-Step Wizard**

**Progress Indicator:**
- Step 1: Account
- Step 2: Store
- Step 3: Plan
- Step 4: Payment
- Step 5: Success

**Step 1: Create Your Account**
- Full Name *
- Email Address *
- Password *
- Confirm Password *
- Agree to Terms checkbox *
- "Continue" button
- "Already have an account? Login"

**Step 2: Set Up Your Store**
- Store Name *
- Store Category/Industry (dropdown)
- Subdomain *
  - Input + `.apex-platform.com`
  - Check availability (live)
- "Continue"

**Step 3: Choose Your Plan**
- Plan options (cards):
  - Starter
  - Professional (Recommended)
  - Enterprise
- Billing toggle (Monthly/Yearly)
- "Start 14-Day Free Trial" button
- "No credit card required"

**Step 4: Payment Info** (Skip if trial)
- Credit Card Number
- Exp Date / CVV
- Cardholder Name
- Billing Address
- "Start Trial" button

**Step 5: Success! 🎉**
**Welcome Screen:**
- 🎊 Congratulations message
- ✅ Your store is ready!

**Your Dashboard Links:**
- 🛍️ Store URL (visit your store)
  - `https://yourstore.apex-platform.com`
- ⚙️ Admin Dashboard (manage your store)
  - `https://yourstore.apex-platform.com/admin`
- 📱 Mobile App (coming soon)
  - Download links

**Getting Started Checklist:**
- [ ] Add your first product
- [ ] Customize your theme
- [ ] Set up payment methods
- [ ] Configure shipping
- [ ] Invite team members

**Actions:**
- "Go to Dashboard" (primary)
- "Watch Tutorial Video"
- "Read Documentation"

**Bonus:**
- "Share on social media" buttons
- "Refer a friend and get 20% off"

---

#### `/forgot-password`
**Password Reset Request**

- Headline: "Forgot Your Password?"
- Description
- Email Input
- "Send Reset Link" button
- "Remember it? Login"

**Success State:**
- "Check Your Email"
- Instructions
- Didn't receive? Resend

---

#### `/reset-password/:token`
**Set New Password**

- New Password
- Confirm Password
- "Reset Password" button

**Success:**
- "Password changed successfully"
- "Login now" link

---

### 📄 Legal & Compliance

#### `/terms`
**Terms of Service**
- Full legal text
- Last updated date
- Sections:
  - Acceptance of Terms
  - User Accounts
  - Payment Terms
  - Refund Policy
  - Prohibited Uses
  - Limitation of Liability
  - etc.

#### `/privacy`
**Privacy Policy**
- Data collection
- How we use data
- Cookies
- Third parties
- User rights (GDPR)
- Contact info

#### `/refund-policy`
**Refund Policy**
- Money-back guarantee
- Conditions
- Process
- Timeline

#### `/acceptable-use`
**Acceptable Use Policy**
- Prohibited content
- Prohibited activities
- Consequences

---

## 3️⃣ Tenant Admin Dashboard - لوحة إدارة المتجر

### 📊 Dashboard

#### `/dashboard`
**Dashboard Overview**

**Header:**
- Store Name
- Plan Badge
- "Upgrade" button (if not on highest plan)

**Stats Cards (Today):**
- 💰 Sales (amount)
  - Trend vs yesterday
- 📦 Orders (count)
  - Trend
- 👥 Visitors (unique)
  - Trend
- 🛒 Conversion Rate (%)

**Charts:**
- Revenue Chart (7, 30, 90 days toggle)
  - Line chart
- Orders Chart
  - Bar chart
- Top Products (Today)
  - List with images

**Recent Orders (Table):**
- Order #
- Customer
- Date
- Total
- Status
- Quick Actions (View, Process)

**Alerts:**
- 🚨 Low Stock Items (if any)
- ⚠️ Pending Orders
- 💳 Payment Methods Not Set
- 🎨 Store Not Customized

**Quick Actions:**
- ➕ Add Product
- 📦 Process Order
- 👥 View Customers
- 🎨 Customize Theme

---

### 📦 Products Management

#### `/products`
**Products List**

**Header Actions:**
- ➕ Add Product
- 📤 Import Products (CSV)
- 📥 Export Products

**View Toggles:**
- 📋 List View (default)
- 🎴 Grid View

**Filters & Search:**
- 🔍 Search by name, SKU
- Filters:
  - Category
  - Status (Published, Draft, Out of Stock)
  - Price Range
  - Stock Status

**Table/Grid:**
- Image
- Product Name
- SKU
- Price
- Stock
- Category
- Status
- Actions (Edit, Duplicate, Delete)

**Bulk Actions:**
- Publish/Unpublish
- Delete
- Change Category
- Export Selected

**Pagination:**
- Show 25/50/100 per page

---

#### `/products/new`
**Add New Product**

**Tabs:**

**1. Basic Info**
- Product Name *
- Description (Rich Text Editor)
  - Bold, Italic, Lists
  - Links, Images
  - Headings
- Short Description (for listings)
- SKU (auto-generated or manual)
- Barcode

**2. Pricing**
- Regular Price *
- Sale Price (optional)
  - Sale start date
  - Sale end date
- Cost Per Item (for profit calculation)
- Tax Status:
  - Taxable
  - Tax-free
- Tax Class (if applicable)

**3. Inventory**
- Track Inventory toggle
- Stock Quantity (if tracking)
- Low Stock Threshold
- Allow Backorders:
  - Do not allow
  - Allow, notify customer
  - Allow
- Stock Status (if not tracking):
  - In Stock
  - Out of Stock
- Weight
- Dimensions (L × W × H)

**4. Shipping**
- Shipping Class (Free, Standard, Express)
- Weight *
- Dimensions *
- Shipping Cost Override (optional)

**5. Images**
- Featured Image (drag & drop or click)
- Product Gallery (multiple images)
  - Drag to reorder
  - Delete
  - Set as featured

**6. Categories & Tags**
- Categories (tree select)
  - Create new category (inline)
- Tags (token input)
  - Create new tag

**7. Variants** (Optional)
**If product has variants (Size, Color, etc.):**
- Variant Options:
  - Option Name (e.g., Size)
  - Values (S, M, L, XL)
  - Option Name (e.g., Color)
  - Values (Red, Blue, Green)
- Variant Table (auto-generated):
  - Combination (S-Red, S-Blue, etc.)
  - Price
  - SKU
  - Stock
  - Image
  - Enable/Disable

**8. SEO (Optional)**
- Page Title (auto from product name)
- Meta Description
- URL Slug
- Focus Keyword

**9. Additional Info**
Custom Fields:
- Brand
- Material
- Country of Origin
- Custom Field 1, 2, 3...

**Actions:**
- 💾 Save Draft
- 👁️ Preview
- ✅ Publish
- ❌ Cancel

---

#### `/products/:id/edit`
**Edit Product**
- Same as "Add Product" but with existing data
- Additional:
  - View on Store (link)
  - Product Performance Stats:
    - Total Sales
    - Revenue
    - Views
    - Conversion Rate
  - Version History (optional)

---

#### `/products/categories`
**Manage Categories**

**Category Tree:**
- Expandable/Collapsible tree
- Drag & drop to reorder or nest
- Actions per category:
  - Edit
  - Delete
  - Add Subcategory

**Add/Edit Category Form:**
- Name *
- Slug (auto from name)
- Description
- Parent Category
- Image
- Display Type (Products, Subcategories, Both)
- Save

---

### 🛒 Orders Management

#### `/orders`
**Orders List**

**Stats Cards:**
- All Orders
- Pending
- Processing
- Completed
- Cancelled/Refunded

**Filters:**
- Status (All, Pending, Processing, Completed, Cancelled, Refunded)
- Date Range
- Payment Status (Paid, Pending, Failed)
- Payment Method

**Search:**
- By Order #, Customer Name, Email

**Table:**
- Order # (link)
- Date & Time
- Customer
- Total
- Payment Status
- Order Status
- Actions (View, Process, Invoice)

**Bulk Actions:**
- Mark as Processing
- Mark as Completed
- Export Selected

**Export:**
- CSV, Excel, PDF

---

#### `/orders/:id`
**Order Details**

**Order Info Card:**
- Order # (large)
- Order Date & Time
- Order Status (badge + dropdown to change)
- Payment Status (badge)
- Payment Method

**Customer Info:**
- Customer Name (link to customer profile)
- Email
- Phone
- Shipping Address:
  - Full address
  - Edit button
- Billing Address:
  - Same as shipping checkbox
  - Or different address

**Order Items Table:**
- Product Image
- Product Name (link)
- SKU
- Quantity
- Unit Price
- Total
- Actions (Refund item)

**Order Totals:**
- Subtotal
- Discount (if any)
  - Coupon code used
- Shipping
  - Shipping method
- Tax
- **Grand Total** (highlighted)

**Payment Info:**
- Payment Method
- Transaction ID
- Payment Date
- Payment Status

**Shipping Info:**
- Shipping Method
- Tracking Number (input + save)
- Shipping Status
- Estimated Delivery

**Order Notes:**
- Customer Notes (if any)
- Private Notes (admin only)
  - Add Note (textarea + save)

**Timeline:**
- Order Placed
- Payment Received
- Processing Started
- Shipped
- Delivered
- Completed

**Actions:**
- 📧 Send Invoice
- 📧 Email Customer
- 💵 Issue Refund (partial or full)
- 🗑️ Delete Order
- 🖨️ Print Invoice
- 🖨️ Print Packing Slip

**Refund Modal:**
- Select items to refund
- Quantity (if partial)
- Reason
- Refund Amount (calculated)
- Restock inventory checkbox
- Issue Refund button

---

### 👥 Customers Management

#### `/customers`
**Customers List**

**Stats:**
- Total Customers
- New This Month
- Average Order Value
- Top Customer (by spend)

**Search & Filters:**
- Search by Name, Email, Phone
- Filter by:
  - Customer Type (Guest, Registered)
  - Lifetime Value Range
  - Total Orders Range
  - Last Order Date

**Table:**
- Name
- Email
- Phone
- Total Orders
- Total Spent
- Last Order Date
- Status
- Actions (View, Edit, Delete)

**Bulk Actions:**
- Export
- Send Email
- Delete

---

#### `/customers/:id`
**Customer Profile**

**Customer Info Card:**
- Name
- Email
- Phone
- Customer Since
- Status (Active, Banned)
- Actions:
  - Edit
  - Ban/Unban
  - Delete
  - Email Customer

**Stats:**
- Total Orders
- Total Spent
- Average Order Value
- Last Order Date

**Order History Table:**
- Order #
- Date
- Total
- Status
- View

**Addresses:**
- Shipping Addresses (list)
  - Set as default
  - Edit
  - Delete
- Billing Address

**Notes:**
- Private notes about this customer
- Add Note

---

### 💹 Analytics & Reports

#### `/analytics`
**Analytics Dashboard**

**Date Range Selector:**
- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- This Month
- Last Month
- Custom Range

**Overview Cards:**
- Revenue
- Orders
- Customers
- Conversion Rate
- Average Order Value

**Sales Chart:**
- Line/Bar chart
- Toggle: Revenue / Orders

**Top Products (Current Period):**
- Product Name
- Quantity Sold
- Revenue
- % of Total

**Traffic Sources:**
- Direct
- Social Media
- Search Engines
- Referrals

**Geographic Data:**
- Sales by Country/Region
- Map visualization

**Customer Insights:**
- New vs Returning Customers
- Customer Retention Rate

**Export Report:**
- PDF
- CSV
- Email

---

### 🎨 Store Appearance

#### `/appearance/theme`
**Theme Customizer**

**Live Preview:**
- Split screen:
  - Left: Controls
  - Right: Live preview iframe

**Tabs:**

**1. Colors**
- Primary Color (color picker)
- Secondary Color
- Text Color
- Background Color
- Link Color
- Button Color
- Header Background
- Footer Background
- Reset to defaults button

**2. Typography**
- Heading Font (dropdown)
- Body Font
- Font Sizes:
  - H1, H2, H3
  - Body
  - Small

**3. Layout**
- Header Style:
  - Fixed
  - Sticky
  - Static
- Footer Layout
- Sidebar (for blog/shop)
- Container Width

**4. Header**
- Logo Upload
  - Max height
- Site Title (show/hide)
- Tagline
- Navigation Menu Select
- Header Widgets

**5. Homepage**
- Hero Section:
  - Heading
  - Subheading
  - Background Image
  - CTA Button Text
  - CTA Button Link
- Featured Products Count
- Show Categories
- Show Blog Posts

**6. Product Page**
- Gallery Style (Grid, Slider)
- Show Related Products
- Show Reviews
- Add to Cart Button Text

**7. Footer**
- Copyright Text
- Show Social Icons
- Footer Widgets
- Footer Menu

**8. Custom CSS**
- Textarea for custom CSS
- Syntax highlighting

**Actions:**
- 💾 Save & Publish
- 👁️ Preview
- ↩️ Revert Changes
- 📥 Export Theme
- 📤 Import Theme

---

#### `/appearance/menus`
**Menu Management**

**Menus:**
- Header Menu
- Footer Menu
- Mobile Menu
- (Create new menu)

**Menu Builder:**
- Drag & drop interface
- Add items:
  - Pages
  - Categories
  - Products
  - Custom Links
- Nested structure (sub-menus)
- Item settings:
  - Label
  - URL
  - Open in new tab
  - CSS Class
  - Remove

**Save Menu**

---

#### `/appearance/pages`
**Static Pages**

**List:**
- Homepage
- About Us
- Contact
- Privacy Policy
- Terms of Service
- Refund Policy
- FAQ

**Page Editor:**
- Title
- Content (Rich Text / Page Builder)
- Featured Image
- URL Slug
- SEO Settings
- Publish/Save Draft

---

### 🚚 Shipping Settings

#### `/shipping/zones`
**Shipping Zones**

**Zones List:**
- Zone Name
- Regions (Countries/States)
- Shipping Methods
- Actions (Edit, Delete)

**Add Zone:**
- Zone Name
- Select Regions (multi-select)
- Add Shipping Methods:
  - Flat Rate
  - Free Shipping
  - Local Pickup
  - Weight-Based
  - Price-Based
- Save

---

#### `/shipping/methods`
**Shipping Methods**

**Methods:**
- Flat Rate
  - Cost
  - Tax Status
- Free Shipping
  - Minimum order amount (optional)
- Local Pickup
  - Pickup locations
- Third-Party:
  - Aramex
  - DHL
  - FedEx
  - (Configure API credentials)

---

### 💳 Payment Settings

#### `/payments`
**Payment Methods**

**Available Methods:**
Each method card:
- Logo
- Name
- Status (Enabled/Disabled toggle)
- Configure button

**1. Credit Card (Stripe)**
- Publishable Key
- Secret Key
- Webhook Secret
- Test Mode toggle
- Accepted Cards (checkboxes)

**2. PayPal**
- Client ID
- Secret
- Test Mode

**3. Cash on Delivery**
- Instructions (textarea)
- Enable for specific zones

**4. Bank Transfer**
- Bank Details (textarea)
- Instructions

**Test Payments** button

---

### 🔔 Marketing Tools

#### `/marketing/discounts`
**Discount Codes**

**List:**
- Code
- Type (Percentage, Fixed Amount)
- Value
- Usage Count / Limit
- Expiry Date
- Status
- Actions

**Create Discount:**
- Code * (auto-generate option)
- Type:
  - Percentage Discount
  - Fixed Amount Discount
  - Free Shipping
- Value *
- Minimum Order Amount
- Usage Limit per Customer
- Total Usage Limit
- Valid From - To
- Applicable To:
  - All Products
  - Specific Products
  - Specific Categories
- Save

---

#### `/marketing/emails`
**Email Campaigns** (Optional)

- Email Templates
- Send Newsletter
- Automation:
  - Welcome Email
  - Abandoned Cart
  - Order Follow-up

---

### 🔧 Settings

#### `/settings/general`
**General Settings**

- Store Name *
- Store Email *
- Store Phone
- Store Address
- Currency *
- Currency Position (Before/After)
- Thousand Separator
- Decimal Separator
- Number of Decimals
- Timezone *
- Date Format
- Time Format
- Language
- Country/Region

---

#### `/settings/taxes`
**Tax Settings**

- Enable Taxes toggle
- Prices Include Tax toggle
- Tax Calculation Based On:
  - Customer Shipping Address
  - Customer Billing Address
  - Shop Base Address
- Tax Classes:
  - Standard
  - Reduced Rate
  - Zero Rate
  - (Add new)
- Tax Rates:
  - Country
  - State/Province
  - Rate (%)
  - Tax Class
  - Priority

---

#### `/settings/checkout`
**Checkout Settings**

- Enable Guest Checkout
- Require Account Creation
- Require Login Before Checkout
- Checkout Fields:
  - Which fields to show/hide
  - Which fields are required
- Terms & Conditions Page
- Privacy Policy Page
- Order Received Page Message

---

#### `/settings/notifications`
**Email Notifications**

**Toggles for each notification type:**

**Admin Notifications:**
- New Order
- Cancelled Order
- Low Stock
- Out of Stock

**Customer Notifications:**
- Order Confirmation
- Order Processing
- Order Completed
- Order Cancelled
- Order Refunded
- Password Reset
- New Account

**For each:**
- Enable/Disable
- Edit Template

---

#### `/settings/domains`
**Domain Management**

**Current Domain:**
- `yourstore.apex-platform.com` (subdomain)
- Status: Active

**Custom Domain:**
- Add Custom Domain button

**Add Custom Domain Flow:**
1. Enter your domain (e.g., `www.yourstore.com`)
2. DNS Verification:
   - Add these DNS records:
     - Type: CNAME
     - Name: www
     - Value: yourstore.apex-platform.com
   - Verify button
3. SSL Certificate:
   - Auto-provision Let's Encrypt
   - Status: Pending/Active
4. Make Primary button

---

### 👤 Account Settings

#### `/account/profile`
**Your Profile**

- Profile Picture
- Full Name *
- Email * (change email flow)
- Phone
- Change Password:
  - Current Password
  - New Password
  - Confirm New Password
- Two-Factor Authentication:
  - Enable/Disable
  - QR Code / Backup Codes
- Save Changes

---

#### `/account/team`
**Team Management**

**Team Members List:**
- Name
- Email
- Role (Owner, Admin, Staff, Viewer)
- Status
- Last Login
- Actions (Edit, Remove)

**Roles & Permissions:**
- Owner (full access)
- Admin (everything except billing)
- Staff (products, orders)
- Viewer (read-only)

**Invite Member:**
- Email
- Role
- Send Invitation

---

#### `/account/billing`
**Billing & Subscription**

**Current Plan:**
- Plan Name (Starter, Pro, Enterprise)
- Price
- Billing Cycle (Monthly/Yearly)
- Next Billing Date
- Auto-Renew Status

**Usage This Month:**
- Products: X / Y
- Orders: X / Y
- Storage: X GB / Y GB

**Actions:**
- Upgrade Plan
- Downgrade Plan
- Change Billing Cycle
- Cancel Subscription

**Payment Method:**
- Card ending in ****1234
- Expiry: 12/25
- Update Card

**Invoice History:**
- Date
- Amount
- Status
- Download

---

## 4️⃣ Storefront - واجهة المتجر للعملاء

### 🏠 Homepage

#### `/`

**Header:**
- Logo
- Navigation Menu
- Search Bar
- Icons:
  - Account
  - Cart (with count badge)

**Hero Section:**
- Large banner/slider
- Headline
- CTA button

**Featured Categories:**
- Category cards (grid)

**Featured Products:**
- Product cards (carousel or grid)
  - Image
  - Name
  - Price
  - "Add to Cart" button

**Promotional Banners:**
- Sales/Offers

**Testimonials:**
- Customer reviews (carousel)

**Newsletter Signup:**
- Email input
- Subscribe button

**Footer:**
- Links (Categories, Pages)
- Social Media
- Payment Methods Icons
- Copyright

---

### 🛍️ Shop/Products

#### `/shop`
**All Products**

**Header:**
- Breadcrumb (Home > Shop)
- Page Title

**Sidebar (Filters):**
- Categories (checkboxes)
- Price Range (slider)
- Brands (if applicable)
- Attributes (Size, Color, etc.)
- In Stock Only
- Apply Filters / Clear

**Main Area:**
- Products Found Count
- Sort By (dropdown):
  - Newest
  - Price: Low to High
  - Price: High to Low
  - Best Selling
  - On Sale
- View Toggle (Grid / List)

**Products Grid:**
- Product Cards:
  - Image
  - Sale Badge (if on sale)
  - Out of Stock Badge (if applicable)
  - Name
  - Price (sale price + strikethrough regular)
  - Quick View button (modal)
  - Add to Cart button

**Pagination:**
- Page numbers
- Prev/Next

---

#### `/shop/:category`
**Category Page**

- Category Banner
- Category Description
- Products in this category
- (Same filters/sorting as /shop)

---

#### `/product/:slug`
**Product Detail Page**

**Breadcrumb:**
- Home > Shop > Category > Product Name

**Product Gallery:**
- Main image (large)
- Thumbnail images (click to change main)
- Zoom on hover
- Lightbox on click

**Product Info:**
- Product Name (H1)
- Price:
  - Regular price (strikethrough if on sale)
  - Sale price (highlighted)
  - Discount % badge
- Short Description
- SKU
- Availability: In Stock / Out of Stock

**Variants (if applicable):**
- Size selector (buttons or dropdown)
- Color selector (color swatches)

**Quantity Selector:**
- - button
- Input
- + button

**Add to Cart Button:**
- "Add to Cart"
- Or "Notify Me" if out of stock

**Buy Now Button** (optional):
- Direct to checkout

**Wishlist Button:**
- Heart icon

**Share:**
- Social share buttons

**Tabs:**
- Description (full, rich text)
- Additional Information (table):
  - Weight
  - Dimensions
  - Material
  - etc.
- Reviews (if enabled):
  - Average rating
  - Review list
  - Write a review form

**Related Products:**
- "You may also like"
- Product carousel

---

### 🛒 Cart & Checkout

#### `/cart`
**Shopping Cart**

**Breadcrumb:**
- Home > Cart

**Cart Table:**
- Product Image
- Product Name (link)
- Variant (if any)
- Price
- Quantity (adjustable)
- Subtotal
- Remove (X button)

**Cart Totals (Sidebar):**
- Subtotal
- Discount (if coupon applied)
- Estimated Shipping
- Tax (if applicable)
- **Total** (large)

**Coupon Code:**
- Input
- Apply button

**Actions:**
- Update Cart (if quantities changed)
- Continue Shopping
- **Proceed to Checkout** (primary CTA)

**Empty Cart State:**
- "Your cart is empty"
- Continue Shopping button

---

#### `/checkout`
**Checkout Page**

**Breadcrumb:**
- Home > Cart > Checkout

**Multi-Step or Single Page:**

**1. Customer Information:**
- Email (for order confirmation)
- Create Account checkbox (with password fields)

**2. Shipping Address:**
- First Name *
- Last Name *
- Company (optional)
- Address Line 1 *
- Address Line 2
- City *
- State/Province *
- Postal Code *
- Country * (dropdown)
- Phone *

**3. Shipping Method:**
- Radio buttons:
  - Standard Shipping - $5.00
  - Express Shipping - $15.00
  - Free Shipping (if eligible)

**4. Payment Method:**
- Radio buttons:
  - Credit Card
    - Card Number
    - Exp Date / CVV
    - Cardholder Name
  - PayPal
    - (Redirect to PayPal)
  - Cash on Delivery
  - Bank Transfer

**Billing Address:**
- Same as Shipping checkbox
- Or different address fields

**Order Notes:**
- Textarea (optional)

**Order Summary (Sidebar or Right Column):**
- Cart Items (mini list)
- Subtotal
- Shipping
- Tax
- **Total** (large)

**Terms & Conditions:**
- Checkbox: "I agree to the terms and conditions"

**Place Order Button:**
- Primary CTA
- Loading state while processing

---

#### `/checkout/success`
**Order Confirmation**

**Success Icon:**
- ✅ Checkmark

**Message:**
- "Thank you for your order!"
- "Your order has been received"

**Order Details:**
- Order Number (large)
- Date
- Email confirmation sent to [email]

**Order Summary:**
- Items ordered
- Shipping address
- Payment method
- Totals

**What's Next:**
- You will receive an email with tracking info
- Estimated delivery date

**Actions:**
- View Order Details
- Continue Shopping
- Print Receipt

---

### 👤 Customer Account

#### `/account/login`
**Customer Login**

**Form:**
- Email
- Password
- "Remember me" checkbox
- Login button

**Links:**
- Forgot Password?
- Don't have an account? Register

**Social Login (optional):**
- Login with Google
- Login with Facebook

---

#### `/account/register`
**Customer Registration**

**Form:**
- First Name *
- Last Name *
- Email *
- Password *
- Confirm Password *
- Subscribe to newsletter checkbox
- Register button

**Link:**
- Already have an account? Login

---

#### `/account/dashboard`
**Customer Dashboard**

**Welcome Message:**
- "Hello, [Customer Name]!"

**Quick Stats:**
- Total Orders
- Pending Orders
- Total Spent

**Recent Orders (Table):**
- Order #
- Date
- Status
- Total
- Actions (View, Reorder)

**Account Links:**
- View All Orders
- Edit Profile
- Manage Addresses
- Change Password
- Logout

---

#### `/account/orders`
**My Orders**

**Filters:**
- All
- Pending
- Processing
- Completed
- Cancelled

**Orders Table:**
- Order #
- Date
- Status
- Total
- Actions (View, Track, Reorder, Invoice)

---

#### `/account/orders/:id`
**Order Details**

**Order Info:**
- Order # (large)
- Date
- Status
- Payment Status

**Items Ordered:**
- Product Image
- Name
- Quantity
- Price
- Total

**Shipping Address**
**Billing Address**
**Payment Method**

**Totals:**
- Subtotal
- Shipping
- Tax
- **Total**

**Tracking Info:**
- Tracking Number (if shipped)
- Estimated Delivery
- Track Shipment (link to carrier)

**Actions:**
- Download Invoice (PDF)
- Reorder
- Contact Support

---

#### `/account/addresses`
**My Addresses**

**Shipping Addresses:**
- Address cards (list)
  - Full address
  - Default badge (if default)
  - Edit / Delete

**Add New Address:**
- Modal or inline form
- Same fields as checkout

**Billing Address:**
- Same structure

---

#### `/account/profile`
**Edit Profile**

**Form:**
- Profile Picture (upload)
- First Name
- Last Name
- Email
- Phone
- Display Name (public)
- Save Changes

---

#### `/account/password`
**Change Password**

**Form:**
- Current Password
- New Password
- Confirm New Password
- Update Password button

---

#### `/account/wishlist` (Optional)
**My Wishlist**

- Wishlist items (grid)
- Move to Cart button
- Remove from Wishlist

---

### 📄 Content Pages

#### `/about`
**About Us**

- Company story
- Images
- Team
- Values

#### `/contact`
**Contact Us**

**Contact Form:**
- Name
- Email
- Subject
- Message
- Send button

**Contact Info:**
- Email
- Phone
- Address
- Map (embedded)

**Business Hours**

---

#### `/faq`
**Frequently Asked Questions**

- Categories
- Questions (accordion style)
- Answers

---

#### `/blog` (Optional)
**Blog**

- Recent posts (grid)
- Categories (sidebar)
- Search

#### `/blog/:slug`
**Blog Post**

- Title
- Date, Author
- Featured Image
- Content
- Tags
- Share buttons
- Comments
- Related posts

---

### 🔍 Utility Pages

#### `/search`
**Search Results**

- Search query display
- Filters (Categories, Price)
- Results count
- Product grid
- "No results found" state with suggestions

---

#### `/404`
**Page Not Found**

- 404 Illustration
- "Oops! Page not found"
- Message
- Search box
- Popular Products/Categories
- Back to Home button

---

#### `/503` (Maintenance Mode)
**Site Under Maintenance**

- Maintenance icon
- "We'll be back soon!"
- Message
- Countdown timer (optional)
- Contact info

---

## 5️⃣ Mobile App (React Native / Expo)

### 🏠 Mobile App Screens

#### **Splash Screen**
- Logo
- Loading indicator

#### **Onboarding** (First Launch)
- 3-4 slides:
  - Welcome
  - Features
  - Benefits
  - Get Started

#### **Auth Screens**
- Login
- Register
- Forgot Password
- OTP Verification (optional)

#### **Home**
- Header with logo, search, cart
- Banner carousel
- Featured categories
- Featured products
- Flash sales
- Bottom navigation

#### **Shop/Products**
- Category tabs
- Filters (modal)
- Product grid
- Pull to refresh

#### **Product Detail**
- Image carousel
- Product info
- Variants selector
- Add to cart
- Reviews

#### **Cart**
- Cart items list
- Quantity adjust
- Coupon
- Checkout button

#### **Checkout**
- Shipping address
- Shipping method
- Payment method
- Place order

#### **Order Success**
- Success message
- Order details
- Track order

#### **Account**
- Profile info
- Orders
- Addresses
- Settings
- Logout

#### **Orders List**
- Order cards
- Filter by status

#### **Order Details**
- Order info
- Items
- Tracking
- Download invoice

#### **Profile**
- Edit profile
- Change password

#### **Settings**
- Notifications
- Language
- Theme (Dark/Light)
- About
- Terms
- Privacy

#### **Notifications**
- Push notifications list
- Order updates
- Promotions

---

## 📊 إجمالي الصفحات

| الواجهة | الصفحات |
|---------|---------|
| **Super Admin (HQ)** | 35+ |
| **Marketing Site** | 20+ |
| **Tenant Admin** | 50+ |
| **Storefront** | 30+ |
| **Mobile App** | 20+ |
| **الإجمالي** | **155+ صفحة** |

---

## 🎯 خطة التنفيذ حسب الأولوية

### **Sprint 1 (Weeks 1-4): Core MVP**
1. Super Admin: Dashboard, Tenants, Licenses
2. Marketing: Homepage, Pricing, Register
3. Tenant Admin: Dashboard, Products, Orders
4. Storefront: Shop, Product, Cart, Checkout

### **Sprint 2 (Weeks 5-8): Essential Features**
1. Super Admin: Billing, Analytics
2. Tenant Admin: Customers, Settings
3. Storefront: Account, Wishlist
4. Mobile App: Core screens

### **Sprint 3 (Weeks 9-12): Advanced**
1. Marketing Tools
2. Customization
3. Advanced Analytics
4. Integrations

### **Sprint 4 (Weeks 13-16): Polish & Scale**
1. Performance optimization
2. Multi-language
3. Advanced features
4. Third-party integrations

---

## 🚨 Critical UX/UI Pages (Anti-Fragile Additions)

### **1. Impersonation Mode (Super Admin)**

#### Component: Impersonation Banner
**Location:** Shown across ALL pages when super admin is impersonating a tenant

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ IMPERSONATION MODE: Viewing as "Store Name"             │
│ [Exit Impersonation] [View Real Admin]          Super Admin │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Sticky top banner (always visible)
- Cannot be dismissed
- Shows tenant name
- "Exit Impersonation" button → Returns to Super Admin dashboard
- All actions logged in Audit Logs with `IMPERSONATION` tag

**Security:**
- Separate session token with `impersonation:true` flag
- Expires after 2 hours or on manual exit
- Cannot transfer funds or delete critical data while impersonating
- All actions tagged as "Performed by Super Admin"

---

### **2. Tenant Suspension Page** 

#### `/suspended` (Storefront - Public)
**Triggers:** When tenant status = SUSPENDED

**Design:**
- Clean, professional page
- **Heading:** "Store Temporarily Unavailable"
- **Subheading:** "This service is currently suspended."
- **Message:** "If you are the store owner, please check your email or contact support."
- **Support Link:** Large button → "Contact Support" (mailto or support page)
- **No branding** (neutral, not shaming)

**Display Logic:**
```typescript
if (tenant.status === 'SUSPENDED') {
  return <SuspensionPage 
    supportEmail={platform.supportEmail}
    supportPhone={platform.supportPhone}
  />;
}
```

**Important:**
- ❌ Don't show payment failure reason publicly
- ❌ Don't show "Account Disabled" (too harsh)
- ✅ Professional, neutral language
- ✅ Clear path to resolution

---

### **3. Developers Section** (Tenant Admin)

#### `/settings/developers`
**Purpose:** Allow technical tenants to integrate via API

**Tabs:**

**Tab 1: API Keys**
- **Current Keys Table:**
  - Key Name
  - Key (hidden: `sk_live_••••••••1234`)
  - Permissions (Read Only / Read-Write)
  - Created Date
  - Last Used
  - Actions (Copy, Revoke)
- **Generate New Key:**
  - Key Name *
  - Permissions (dropdown)
  - Expiry (Never / 30 days / 90 days / 1 year)
  - Generate Button
- **Security Note:**
  - "Keep your API keys secure. Do not share them publicly."

**Tab 2: Webhooks**
- **Webhook Endpoints Table:**
  - Endpoint URL
  - Events (list)
  - Status (Active/Failed)
  - Last Triggered
  - Actions (Edit, Test, Delete)
- **Add Webhook:**
  - Endpoint URL * (`https://...`)
  - Events (multi-select):
    - order.created
    - order.updated
    - order.cancelled
    - product.created
    - product.updated
    - product.deleted
    - customer.created
  - Secret (auto-generated for signature verification)
  - Test Webhook button (sends test payload)
- **Webhook Logs:**
  - Recent deliveries
  - Status codes
  - Retry attempts

**Tab 3: API Documentation**
- Link to API docs
- Quick start guide
- Code examples (curl, JavaScript, Python)
- Rate limits info

---

### **4. Guest Order Tracking** (Storefront)

#### `/track-order`
**Purpose:** Let guests track orders without account/login

**Design:**

**Form:**
- **Heading:** "Track Your Order"
- **Order Number:** Input field
  - Placeholder: "e.g., #APX-12345"
- **Email Address:** Input field
  - Placeholder: "Email used for order"
- **Track Order** button

**Results Page (if found):**
- Order Number (large)
- Order Status (badge + icon)
  - Processing
  - Shipped
  - Out for Delivery
  - Delivered
- **Order Timeline:**
  - ✅ Order Placed (date/time)
  - ✅ Payment Confirmed
  - ✅ Processing Started
  - ✅ Shipped (date/time)
  - 🚚 Out for Delivery (estimated)
  - 📦 Delivered (estimated date)
- **Shipping Info:**
  - Carrier
  - Tracking Number (link to carrier)
  - Estimated Delivery
- **Order Items** (summary):
  - Product name
  - Quantity
  - Price
- **Actions:**
  - Download Invoice (PDF)
  - Contact Support

**Error States:**
- Order not found → "We couldn't find an order with that number and email."
- Invalid format → "Please enter a valid order number."

---

### **5. Account Switcher** (Multi-Tenant Owner)

#### `/select-store`
**Triggers:** After login, if user owns/admin of multiple tenants

**Design:**

**Heading:** "Select Store to Manage"

**Store Cards (Grid):**
Each card shows:
- Store Logo
- Store Name
- Subdomain
- Plan (badge)
- Status (Active/Trial/Suspended)
- "Manage Store" button

**Example:**
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│  [Logo]             │  [Logo]             │  [Logo]             │
│  Fashion Store      │  Tech Gadgets       │  Books & More       │
│  fashion.apex.com   │  tech.apex.com      │  books.apex.com     │
│  Pro Plan     [🟢]  │  Starter    [🟡]    │  Enterprise [🟢]    │
│  [Manage Store]     │  [Manage Store]     │  [Manage Store]     │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

**Features:**
- Recent activity indicator
- Quick stats (orders today, revenue today)
- "Create New Store" button (if allowed by Super Admin)

**Storage:**
- Selected store ID saved in session
- "Switch Store" link in header (all pages) → Returns to `/select-store`

---

### **6. Cookie Consent & GDPR Compliance** (Storefront)

#### Component: Cookie Banner
**Location:** Bottom of all Storefront pages (first visit)

**Design:**
```
┌────────────────────────────────────────────────────────────────┐
│ 🍪 This site uses cookies to improve your experience.         │
│                                                                │
│ [Cookie Settings]  [Accept All Cookies]  [Reject All]        │
└────────────────────────────────────────────────────────────────┘
```

**Cookie Settings Modal:**
- **Necessary Cookies** (always on)
  - Authentication
  - Shopping cart
  - Security
- **Analytics Cookies** (toggle)
  - Google Analytics
  - Usage tracking
- **Marketing Cookies** (toggle)
  - Facebook Pixel
  - Retargeting

**Save Preferences** button

#### `/privacy/data-request`
**GDPR Data Request Page**

**Form:**
- **Request Type:**
  - Download My Data (generates ZIP with all user data)
  - Delete My Data (GDPR Right to be Forgotten)
- **Email Address:** (verification)
- **Reason:** (optional textarea)
- **Submit Request** button

**After Submission:**
- Confirmation email sent
- Request processed within 30 days
- Download link sent via email (for download requests)
- Account deleted after confirmation (for delete requests)

**Admin Panel:**
- Super Admin can manage all data requests
- Auto-compliance with GDPR deletion rules

---

### **7. Onboarding Checklist Widget** (Tenant Admin Dashboard)

#### Component: Setup Progress Card
**Location:** Replaces empty charts on Tenant Dashboard when:
- No orders yet
- No products yet
- Store created < 7 days ago

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🚀 Get Your Store Ready to Sell                        [X] Hide │
│                                                                  │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░ 40% Complete                 │
│                                                                  │
│ ✅ Create your account                                          │
│ ✅ Choose your plan                                             │
│ ⬜ Add your first product                         [Add Product] │
│ ⬜ Customize your store theme                    [Customize]    │
│ ⬜ Set up payment methods                        [Setup]        │
│ ⬜ Configure shipping options                    [Configure]    │
│ ⬜ Launch your store                             [Go Live]      │
│                                                                  │
│ 🎯 3 more steps to go! You're doing great.                     │
└──────────────────────────────────────────────────────────────────┘
```

**Logic:**
- Automatically checks completed steps from database
- Each button links directly to relevant page
- Progress bar updates in real-time
- "Hide" button → Dismiss (can re-show in settings)
- Disappears automatically after all steps complete OR after 30 days

**Checklist Items:**
1. ✅ Create account (done on signup)
2. ✅ Choose plan (done on signup)
3. [ ] Add first product → `/products/new`
4. [ ] Customize theme → `/appearance/theme`
5. [ ] Setup payment → `/payments`
6. [ ] Configure shipping → `/shipping/zones`
7. [ ] Add custom domain (optional) → `/settings/domains`
8. [ ] Launch store → Modal with "Go Live" checklist

**Celebration on 100%:**
- Confetti animation 🎉
- "Your store is ready!" message
- "View Your Store" button (opens storefront)

---

## 📊 Updated Total Page Count

| الواجهة | الصفحات الأصلية | الإضافات الحرجة | الإجمالي الجديد |
|---------|-----------------|-----------------|------------------|
| **Super Admin (HQ)** | 35+ | +1 (Impersonation) | 36+ |
| **Marketing Site** | 15+ | - | 15+ |
| **Tenant Admin** | 40+ | +2 (Developers, Multi-Store) | 42+ |
| **Storefront** | 25+ | +4 (Suspension, Track Order, GDPR, Cookie) | 29+ |
| **Mobile App** | 15+ | - | 15+ |
| **الإجمالي** | **130+** | **+7** | **137+ صفحة** |

---

## 🎯 Updated Sprint Plan

### **Sprint 1 (Weeks 1-4): Core MVP**
1. Super Admin: Dashboard, Tenants, Licenses
2. Marketing: Homepage, Pricing, Register
3. Tenant Admin: Dashboard, Products, Orders
4. Storefront: Shop, Product, Cart, Checkout

### **Sprint 2 (Weeks 5-8): Essential Features**
1. Super Admin: Billing, Analytics, **Impersonation Mode**
2. Tenant Admin: Customers, Settings
3. Storefront: Account, **Guest Order Tracking**
4. **Onboarding Checklist**

### **Sprint 3 (Weeks 9-12): Advanced**
1. **Developers Section** (API Keys, Webhooks)
2. **Multi-Store Account Switcher**
3. **GDPR Compliance** (Cookie Consent, Data Requests)
4. Marketing Tools

### **Sprint 4 (Weeks 13-16): Polish & Scale**
1. **Suspension Page** & Flow
2. Performance optimization
3. Multi-language
4. Third-party integrations

---

**تم توثيق 137+ صفحة بالتفصيل الكامل (155 أصلية + 7 حرجة)! 🎯**

---

## ✅ Anti-Fragile UX Checklist

- [x] **Impersonation Mode** - For customer support
- [x] **Suspension Page** - Professional error handling
- [x] **Developers Section** - API Keys & Webhooks
- [x] **Guest Order Tracking** - No login required
- [x] **Account Switcher** - Multi-tenant owners
- [x] **Cookie Consent** - GDPR compliance
- [x] **Onboarding Checklist** - User guidance

**All critical UX gaps addressed! Ready for production. 🚀**
