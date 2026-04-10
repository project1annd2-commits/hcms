"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseAdmin = void 0;
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
// Define the path to your service account key
const serviceAccountPath = path.resolve(__dirname, '../../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
// Check if already initialized to avoid errors in dev reloading
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(require(serviceAccountPath)),
            databaseURL: "https://hcms-680e6.firebaseio.com" // Not strictly required for Auth, but good to have
        });
        console.log('Firebase Admin initialized for custom auth.');
    }
    catch (e) {
        console.error('Failed to initialize Firebase Admin SDK. Make sure the service account file exists and is valid.', e);
    }
}
exports.firebaseAdmin = admin;
