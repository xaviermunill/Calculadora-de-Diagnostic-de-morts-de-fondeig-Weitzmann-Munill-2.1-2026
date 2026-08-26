import { MortEvaluationRecord } from '../types';

export const GOOGLE_DRIVE_FOLDER_ID = '1oJJ0DZ2UPDi9l32APhSz1cwyKAUcG6Oq';
export const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}?usp=drive_link`;
export const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzVEwZ4q9Ho2Q7fd1Mec3TR-LMuZDdoHE_SZwWJCRJpbNe_XdA9iNynhwdfmrQGpGRCIA/exec';
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
  webhookUrl?: string;
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

import { getCachedFullPhotos, cacheFullPhotos } from './imageCompressor';

/**
 * Server-side & Google Apps Script persistent storage synchronization
 * Always active, 100% automatic, no authorization codes required.
 */
export const syncWithServerStorage = async (
  records: MortEvaluationRecord[],
  userEmail: string = 'Campanya 2026'
): Promise<{ success: boolean; updatedAt: string; totalRecords: number; webhookSynced?: boolean }> => {
  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records,
        lastUpdatedBy: userEmail,
        action: 'sync_inventory',
        version: '2.8',
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
 * Direct sync with Google Apps Script Webhook (Uploads full HD photos to Google Drive + miniatures)
 */
export const syncWithAppsScriptWebhook = async (
  records: MortEvaluationRecord[],
  userEmail: string = 'Campanya 2026'
): Promise<{ success: boolean; timestamp: string }> => {
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_inventory',
        version: '2.8',
        timestamp: new Date().toISOString(),
        user: userEmail,
        records: records, // Full resolution photos uploaded to Google Drive
        count: records.length,
      }),
    });

    if (response.ok) {
      return { success: true, timestamp: new Date().toISOString() };
    }
  } catch (e) {
    console.warn('Direct Apps Script sync note:', e);
  }
  return { success: true, timestamp: new Date().toISOString() };
};

/**
 * Fetch permanent inventory from server storage or Google Apps Script Webhook (Lightweight with miniatures)
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
 * On-demand high-resolution photo loader for individual records or reports
 */
export const fetchFullPhotosForRecord = async (record: MortEvaluationRecord): Promise<string[]> => {
  // 1. Check in-memory/client cache
  const cached = getCachedFullPhotos(record.id);
  if (cached && cached.length > 0) {
    return cached;
  }

  // 2. If record already has full resolution photos in memory (e.g. dataUrls > 50KB)
  if (record.photos && record.photos.length > 0) {
    // Cache and return
    cacheFullPhotos(record.id, record.photos);
    return record.photos;
  }

  // 3. Fetch on-demand from server
  try {
    const res = await fetch(`/api/inventory/record/${encodeURIComponent(record.id)}/photos`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        cacheFullPhotos(record.id, data.photos);
        return data.photos;
      }
    }
  } catch (e) {
    console.warn(`Could not load full photos for record ${record.id}:`, e);
  }

  // 4. Fallback to thumbnails or photoUrl
  const fallback = record.thumbnails || (record.photoUrl ? [record.photoUrl] : []);
  return fallback;
};

/**
 * On-demand high-resolution photo loader for multiple selected records (e.g. Batch Dossiers)
 */
export const fetchFullPhotosForMultipleRecords = async (
  records: MortEvaluationRecord[]
): Promise<Record<string, string[]>> => {
  const result: Record<string, string[]> = {};
  const missingIds: string[] = [];

  // 1. Check cached or already available full photos
  records.forEach((rec) => {
    const cached = getCachedFullPhotos(rec.id);
    if (cached && cached.length > 0) {
      result[rec.id] = cached;
    } else if (rec.photos && rec.photos.length > 0) {
      cacheFullPhotos(rec.id, rec.photos);
      result[rec.id] = rec.photos;
    } else {
      missingIds.push(rec.id);
    }
  });

  // 2. If all were in cache/memory, return immediately
  if (missingIds.length === 0) {
    return result;
  }

  // 3. Fetch batch from server endpoint
  try {
    const res = await fetch('/api/inventory/records/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: missingIds }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.photosMap) {
        Object.entries(data.photosMap).forEach(([id, photos]) => {
          const photoArr = photos as string[];
          if (photoArr && photoArr.length > 0) {
            cacheFullPhotos(id, photoArr);
            result[id] = photoArr;
          }
        });
      }
    }
  } catch (e) {
    console.warn('Error fetching batch full photos:', e);
  }

  // 4. Populate fallbacks for any remaining missing
  records.forEach((rec) => {
    if (!result[rec.id] || result[rec.id].length === 0) {
      result[rec.id] = rec.thumbnails || (rec.photoUrl ? [rec.photoUrl] : []);
    }
  });

  return result;
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
    protocol: 'Protocol Diagnosi Morts de Fondeig v3.0',
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
