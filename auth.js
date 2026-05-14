import { firebaseConfig } from "./firebase-config.js";

const isConfigured = () =>
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes("YOUR_") &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes("YOUR_");

let auth;
let db;
let firebaseReady = false;
let activeUser = null;
let unsubscribeAuth = null;

const stateDocPath = (uid) => ["users", uid, "chantApp", "state"];

export const cloudAuth = {
  async init(onUserChange) {
    if (!isConfigured()) {
      return {
        enabled: false,
        message: "Firebase is not configured yet.",
      };
    }

    try {
      const [
        { initializeApp },
        { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut },
        { getFirestore, doc, getDoc, setDoc, serverTimestamp },
      ] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
      ]);

      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseReady = true;

      this.signInWithEmailAndPassword = signInWithEmailAndPassword;
      this.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
      this.firebaseSignOut = signOut;
      this.doc = doc;
      this.getDoc = getDoc;
      this.setDoc = setDoc;
      this.serverTimestamp = serverTimestamp;

      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        activeUser = user;
        onUserChange(user);
      });

      return {
        enabled: true,
        message: "Firebase ready.",
      };
    } catch (error) {
      return {
        enabled: false,
        message: error.message || "Firebase could not start.",
      };
    }
  },

  configured: isConfigured,

  user() {
    return activeUser;
  },

  async signIn(email, password) {
    if (!firebaseReady) throw new Error("Firebase is not ready.");
    await this.signInWithEmailAndPassword(auth, email, password);
  },

  async signUp(email, password) {
    if (!firebaseReady) throw new Error("Firebase is not ready.");
    await this.createUserWithEmailAndPassword(auth, email, password);
  },

  async signOut() {
    if (!firebaseReady) return;
    await this.firebaseSignOut(auth);
  },

  async loadState() {
    if (!firebaseReady || !activeUser) return null;
    const ref = this.doc(db, ...stateDocPath(activeUser.uid));
    const snapshot = await this.getDoc(ref);
    return snapshot.exists() ? snapshot.data().state : null;
  },

  async saveState(state) {
    if (!firebaseReady || !activeUser) return;
    const ref = this.doc(db, ...stateDocPath(activeUser.uid));
    await this.setDoc(ref, {
      state,
      updatedAt: this.serverTimestamp(),
      email: activeUser.email,
    });
  },

  cleanup() {
    if (unsubscribeAuth) unsubscribeAuth();
  },
};
