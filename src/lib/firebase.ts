import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { firebaseConfig } from '$lib/config/public';

let firebaseApp: FirebaseApp;
let database: Database;

function initializeFirebase() {
    try {
        if (!firebaseApp) {
            firebaseApp = initializeApp(firebaseConfig);
            database = getDatabase(firebaseApp);
        }
        return { app: firebaseApp, db: database };
    } catch (error: any) {
        if (error.code !== 'app/duplicate-app') {
            throw error;
        }
        return { 
            app: firebaseApp, 
            db: database 
        };
    }
}

const { app, db } = initializeFirebase();
export { app, db };