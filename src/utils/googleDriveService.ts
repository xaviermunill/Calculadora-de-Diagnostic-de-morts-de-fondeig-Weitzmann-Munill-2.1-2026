import { MortEvaluationRecord } from '../types';

export const GOOGLE_DRIVE_FOLDER_ID = '1oJJ0DZ2UPDi9l32APhSz1cwyKAUcG6Oq';
export const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}?usp=drive_link`;
export const INVENTORY_FILE_NAME = 'inventari_morts_fondeig.json';
export const INVENTORY_CSV_FILE_NAME = 'inventari_morts_fondeig.csv';

const DRIVE_OAUTH_SCOPES = 'https://www.googleapis.com/auth/drive';

// Persistent token storage (localStorage + inMemory)
let inMemoryToken: string | null = null;
let tokenExpiresAt: number = 0;

export interface DriveSyncStatus {
  isConnected: boolean;
  userEmail?: string;
  lastSyncTime?: string;
  folderId: string;
  folderUrl: string;
  fileName: string;
  fileId?: string;
  isSyncing: boolean;
  autoSync: boolean;
  error?: string | null;
}

export const getStoredDriveToken = (): string | null => {
  if (inMemoryToken && Date.now() < tokenExpiresAt) {
    return inMemoryToken;
  }
  try {
    const localTok = localStorage.getItem('gdrive_access_token') || sessionStorage.getItem('gdrive_access_token');
    const localExp = localStorage.getItem('gdrive_token_expires_at') || sessionStorage.getItem('gdrive_token_expires_at');
    if (localTok) {
      inMemoryToken = localTok;
      tokenExpiresAt = localExp ? parseInt(localExp, 10) : Date.now() + 86400000;
      return localTok;
    }
  } catch (e) {
    console.error('Storage read error', e);
  }
  return null;
};

export const setStoredDriveToken = (token: string, expiresInSeconds: number = 86400 * 30) => {
  inMemoryToken = token;
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  try {
    localStorage.setItem('gdrive_access_token', token);
    localStorage.setItem('gdrive_token_expires_at', tokenExpiresAt.toString());
    sessionStorage.setItem('gdrive_access_token', token);
    sessionStorage.setItem('gdrive_token_expires_at', tokenExpiresAt.toString());
  } catch (e) {
    console.error('Storage write error', e);
  }
};

export const clearStoredDriveToken = () => {
  inMemoryToken = null;
  tokenExpiresAt = 0;
  try {
    localStorage.removeItem('gdrive_access_token');
    localStorage.removeItem('gdrive_token_expires_at');
    localStorage.removeItem('gdrive_user_email');
    sessionStorage.removeItem('gdrive_access_token');
    sessionStorage.removeItem('gdrive_token_expires_at');
    sessionStorage.removeItem('gdrive_user_email');
  } catch (e) {
    console.error('Storage clear error', e);
  }
};

/**
 * Server-side persistent storage synchronization (Always active, 100% automatic, no codes required)
 */
export const syncWithServerStorage = async (
  records: MortEvaluationRecord[],
  userEmail: string = 'xaviermunill@bufalvent.net'
): Promise<{ success: boolean; updatedAt: string; totalRecords: number }> => {
  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records,
        lastUpdatedBy: userEmail,
      }),
    });

    if (!res.ok) {
      throw new Error(`Error en desar a l'emmagatzematge permanent (${res.status})`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('Server storage sync warning:', err);
    throw err;
  }
};

/**
 * Fetch permanent inventory from server storage
 */
export const fetchFromServerStorage = async (): Promise<MortEvaluationRecord[]> => {
  try {
    const res = await fetch('/api/inventory');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.records) && data.records.length > 0) {
        return data.records;
      }
    }
  } catch (err) {
    console.warn('Could not load from server storage:', err);
  }
  return [];
};

/**
 * Dynamically loads the Google Identity Services (GSI) script
 */
export const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('gsi-client-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

/**
 * Trigger OAuth token request popup for Google Drive
 */
export const requestGoogleDriveAuth = async (
  clientId?: string
): Promise<{ accessToken: string; userEmail?: string }> => {
  await loadGsiScript();

  return new Promise((resolve, reject) => {
    // Default client ID or environment client ID
    const effectiveClientId =
      clientId ||
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      '804447788304-dev.apps.googleusercontent.com';

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: DRIVE_OAUTH_SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            setStoredDriveToken(response.access_token, response.expires_in || 3600);
            
            // Try fetching user profile
            let email: string | undefined;
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                email = userData.email;
                if (email) {
                  sessionStorage.setItem('gdrive_user_email', email);
                }
              }
            } catch (e) {
              console.warn('Could not fetch userinfo', e);
            }

            resolve({ accessToken: response.access_token, userEmail: email });
          } else {
            reject(new Error('No access token returned'));
          }
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Searches for the inventory file in the target folder: 1oJJ0DZ2UPDi9l32APhSz1cwyKAUcG6Oq
 */
export const findInventoryFileInDrive = async (
  accessToken: string,
  folderId: string = GOOGLE_DRIVE_FOLDER_ID
): Promise<{ fileId: string | null; name: string | null }> => {
  const query = `'${folderId}' in parents and name = '${INVENTORY_FILE_NAME}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,modifiedTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error consultant fitxers a Google Drive (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return { fileId: data.files[0].id, name: data.files[0].name };
  }
  return { fileId: null, name: null };
};

/**
 * Reads and parses the inventory records from Google Drive
 */
export const loadInventoryFromDrive = async (
  accessToken: string,
  folderId: string = GOOGLE_DRIVE_FOLDER_ID
): Promise<{ records: MortEvaluationRecord[]; fileId: string | null; lastModified?: string }> => {
  const { fileId } = await findInventoryFileInDrive(accessToken, folderId);

  if (!fileId) {
    return { records: [], fileId: null };
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error descarregant inventari de Google Drive: ${err}`);
  }

  const content = await response.json();
  if (Array.isArray(content)) {
    return { records: content as MortEvaluationRecord[], fileId };
  } else if (content && Array.isArray(content.records)) {
    return { records: content.records as MortEvaluationRecord[], fileId, lastModified: content.lastModified };
  }

  return { records: [], fileId };
};

/**
 * Saves/Updates the inventory JSON file directly inside the target Google Drive folder
 */
export const saveInventoryToDrive = async (
  records: MortEvaluationRecord[],
  accessToken: string,
  folderId: string = GOOGLE_DRIVE_FOLDER_ID
): Promise<{ fileId: string; modifiedTime: string }> => {
  const { fileId: existingFileId } = await findInventoryFileInDrive(accessToken, folderId);

  const payloadData = {
    updatedAt: new Date().toISOString(),
    totalRecords: records.length,
    folderId: folderId,
    protocol: 'Protocol Diagnosi Morts de Fondeig v2.1',
    records: records,
  };

  const fileContent = JSON.stringify(payloadData, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  if (existingFileId) {
    // Update existing file content & metadata
    const metadata = {
      name: INVENTORY_FILE_NAME,
      mimeType: 'application/json',
      description: `Inventari de morts de fondeig sincronitzat automàticament (${records.length} registres).`,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&supportsAllDrives=true`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error actualitzant fitxer a Google Drive: ${err}`);
    }

    const data = await response.json();
    return { fileId: data.id, modifiedTime: new Date().toISOString() };
  } else {
    // Create new file inside target folder
    const metadata = {
      name: INVENTORY_FILE_NAME,
      mimeType: 'application/json',
      parents: [folderId],
      description: `Inventari de morts de fondeig sincronitzat automàticament (${records.length} registres).`,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error creant fitxer a la carpeta de Google Drive: ${err}`);
    }

    const data = await response.json();
    return { fileId: data.id, modifiedTime: new Date().toISOString() };
  }
};
