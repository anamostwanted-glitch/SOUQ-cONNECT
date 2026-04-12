import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow: boolean = false) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export function handleAiError(error: unknown, context: string, shouldThrow: boolean = false) {
  let errorMessage = 'Unknown error occurred';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    // Handle GeolocationPositionError or other objects
    const err = error as any;
    if ('code' in err || err.constructor?.name === 'GeolocationPositionError') {
      errorMessage = `Geolocation Error (Code ${err.code ?? 'unknown'}): ${err.message ?? 'unknown'}`;
    } else if ('message' in err) {
      errorMessage = err.message;
    } else {
      const stringified = JSON.stringify(err);
      if (stringified !== '{}') {
        errorMessage = stringified;
      }
    }
  }

  const errInfo = {
    error: errorMessage || 'No error message',
    context: context || 'Unknown context',
    timestamp: new Date().toISOString(),
    authInfo: {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || 'none'
    }
  };

  const isInvalidKey = errorMessage.includes('API key not valid') || errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('MISSING_API_KEY');
  
  if (isInvalidKey) {
    console.error('CRITICAL: AI API Key is invalid or missing. Please check your AI Studio Secrets (Settings -> Secrets) and ensure GEMINI_API_KEY is set correctly.');
  }

  console.error(`AI Error [${context}]:`, JSON.stringify(errInfo, null, 2));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}
