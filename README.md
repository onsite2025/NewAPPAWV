# Annual Wellness Visit Application

A comprehensive web application for healthcare providers to conduct Annual Wellness Visits, manage patients, create assessment templates, conduct visits, generate health plans, and produce PDF reports.

## Features

- **User Authentication**: Secure login/registration system with role-based access control
- **Dashboard**: Overview of upcoming and past visits with quick access to key features
- **Template Management**: Create, edit, and manage assessment templates with various question types
- **Patient Management**: Maintain a patient database with demographics and medical information
- **Visit Management**: Schedule, conduct, and track patient visits
- **Health Plan Generation**: Create personalized health plans based on assessment results
- **Reporting**: Generate PDF reports of visits and health plans

## Technology Stack

- **Frontend**: Next.js 15+ with App Router, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **Storage**: Firebase Storage
- **PDF Generation**: pdfmake

## Setup Instructions

1. Clone the repository
   ```
   git clone <repository-url>
   cd annual-wellness-visit
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env.local` file with the following variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   NEXTAUTH_SECRET=<random-secret-key>
   NEXTAUTH_URL=http://localhost:3000
   
   # Firebase Configuration
   FIREBASE_API_KEY=<your-firebase-api-key>
   FIREBASE_AUTH_DOMAIN=<your-firebase-auth-domain>
   FIREBASE_PROJECT_ID=<your-firebase-project-id>
   FIREBASE_STORAGE_BUCKET=<your-firebase-storage-bucket>
   FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
   FIREBASE_APP_ID=<your-firebase-app-id>
   ```

4. Run the development server
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src/app`: Next.js App Router pages and layouts
- `/src/components`: Reusable React components
- `/src/lib`: Utility functions and services
- `/src/models`: MongoDB schema models
- `/src/types`: TypeScript type definitions

## API Endpoints

- `/api/auth/*`: Authentication endpoints (handled by NextAuth.js)
- `/api/users`: User management endpoints
- `/api/patients`: Patient management endpoints
- `/api/templates`: Template management endpoints
- `/api/visits`: Visit management endpoints
- `/api/recommendations`: Health plan recommendation endpoints

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 