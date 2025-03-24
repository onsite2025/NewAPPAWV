// This file exposes environment variables to the client browser
window.ENV = {
  // Firebase Configuration
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyCjVKYDelG6ASUS6EfYUtOnvJBYhMCA1Lo",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "manusawv.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "manusawv",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "manusawv.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "49788426717",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:49788426717:web:ef1d243368f20cb8363e34",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-MKGBXDJZFT",
  
  // API Configuration - Used by the frontend to know where to send requests
  API_URL: window.location.origin,
  
  // Database Configuration - Not directly used by frontend, but useful for debugging
  MONGODB_URI: "mongodb+srv://onsitepcn:8Pkn4n0rUeT25VsQ@cluster1.cv9ak.mongodb.net/annual-wellness-visit"
}; 