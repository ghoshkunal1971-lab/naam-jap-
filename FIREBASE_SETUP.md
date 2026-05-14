# Firebase Login Setup

This site is hosted on GitHub Pages, so login and synced user records need an external backend. The app is prepared for Firebase Authentication plus Firestore.

## 1. Create Firebase Project

1. Go to Firebase Console.
2. Create a new project.
3. Add a Web app.
4. Copy the Firebase config.

## 2. Enable Sign In

1. Open Authentication.
2. Open Sign-in method.
3. Enable Email/Password.

## 3. Enable Firestore

1. Open Firestore Database.
2. Create a database.
3. Start in production mode.

Use these Firestore rules:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/chantApp/state {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 4. Add Config

Open `firebase-config.js` and replace every `YOUR_...` value with your Firebase web app config.

```js
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

## 5. Publish Again

Commit and push these files to GitHub Pages:

- `index.html`
- `styles.css`
- `script.js`
- `auth.js`
- `firebase-config.js`

After that, users can sign up, sign in, and keep their records synced to their own account.
