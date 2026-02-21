# Chronic Health Buddy - Frontend Setup

## Frontend Structure

- **app/**: Next.js app directory
  - **page.tsx**: Main entry point with user signup/login
  - **layout.tsx**: Root layout
  - **globals.css**: Global styles with Tailwind

- **components/**: React components
  - **QuickLog.tsx**: Quick event logging interface
  - **Dashboard.tsx**: Health dashboard with metrics
  - **AppContainer.tsx**: Main app layout with navigation

- **utils/**: Utility functions
  - **api.ts**: API client wrapper
  - **constants.ts**: Shared constants (medications, symptoms, etc.)

- **hooks/**: Custom React hooks
  - **useHealthData.ts**: Fetch dashboard data

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables** (create `.env.local`):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Access the app**:
   - Open http://localhost:3000 in your browser

## Features Implemented

- ✅ User signup/login
- ✅ Quick event logging (vitals, symptoms, medications)
- ✅ Health dashboard with 7-day summary
- ✅ PDF report download
- ✅ Responsive design (mobile-first)
- ✅ Real-time status updates

## Next Steps

- Add voice input integration
- Implement Qwen polish features
- Add more customization options
