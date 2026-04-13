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
  let errorMessage = '';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    // Handle GeolocationPositionError or other objects
    const err = error as any;
    if ('code' in err || err.constructor?.name === 'GeolocationPositionError') {
      errorMessage = `Geolocation Error (Code ${err.code ?? 'unknown'}): ${err.message ?? 'unknown'}`;
    } else if ('message' in err && typeof err.message === 'string') {
      errorMessage = err.message;
    } else if ('error' in err && typeof err.error === 'string') {
      errorMessage = err.error;
    } else {
      try {
        const stringified = JSON.stringify(err);
        if (stringified !== '{}') {
          errorMessage = stringified;
        }
      } catch (e) {
        errorMessage = 'Object error (not stringifiable)';
      }
    }
  }

  if (!errorMessage || errorMessage.trim() === '') {
    errorMessage = 'Unknown error occurred';
  }

  // Ignore dynamic import errors completely (they are handled by auto-reload)
  if (errorMessage.includes('Failed to fetch dynamically imported module')) {
    return;
  }

  const errInfo = {
    error: errorMessage,
    context: context || 'Unknown context',
    timestamp: new Date().toISOString(),
    authInfo: {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || 'none'
    }
  };

  const isInvalidKey = errorMessage.includes('API key not valid') || errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('MISSING_API_KEY');
  const isHighDemand = errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE');
  
  if (isInvalidKey) {
    console.error('CRITICAL: AI API Key is invalid or missing. Please check your AI Studio Secrets (Settings -> Secrets) and ensure GEMINI_API_KEY is set correctly.');
  } else if (isHighDemand) {
    console.warn(`AI Service Busy [${context}]: The AI model is currently experiencing high demand. Retrying or waiting a moment is recommended.`);
    // We can make the error message more user-friendly if it's going to be displayed
    errInfo.error = "الخدمة مشغولة حالياً بسبب ضغط كبير. يرجى المحاولة مرة أخرى بعد قليل. (AI Service Busy)";
  }

  console.error(`AI Error [${context}]:`, JSON.stringify(errInfo, null, 2));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}
