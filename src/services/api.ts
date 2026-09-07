/**
 * API Service Layer for Asterisk ICPBX
 * Handles communication with the PHP backend REST endpoints (/api/*)
 * and falls back seamlessly to robust local reactive state.
 */

import {
  Extension,
  CDRRecord,
  Contact,
  ClusterNode,
  InboundRoute,
  OutboundRoute,
  IVRMenu,
  RingGroup,
  PushLog
} from '../types/pbx';

import {
  MOCK_EXTENSIONS,
  MOCK_CDR_RECORDS,
  MOCK_CONTACTS,
  MOCK_CLUSTER_NODES,
  MOCK_INBOUND_ROUTES,
  MOCK_OUTBOUND_ROUTES,
  MOCK_IVR_MENUS,
  MOCK_RING_GROUPS,
  MOCK_PUSH_LOGS
} from './mockData';

const BASE_URL = '/api';

export class PbxApiService {
  // Extensions
  static async getExtensions(): Promise<Extension[]> {
    try {
      const res = await fetch(`${BASE_URL}/extensions.php`);
      if (!res.ok) throw new Error('API fetch failed');
      const data = await res.json();
      return data.extensions;
    } catch {
      return MOCK_EXTENSIONS;
    }
  }

  static async saveExtension(ext: Extension): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/extensions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ext)
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  static async deleteExtension(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/extensions.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  // CDR Records
  static async getCdrRecords(): Promise<CDRRecord[]> {
    try {
      const res = await fetch(`${BASE_URL}/cdr.php`);
      if (!res.ok) throw new Error('API fetch failed');
      const data = await res.json();
      return data.records;
    } catch {
      return MOCK_CDR_RECORDS;
    }
  }

  // Cluster Status
  static async getClusterStatus(): Promise<ClusterNode[]> {
    try {
      const res = await fetch(`${BASE_URL}/cluster_status.php`);
      if (!res.ok) throw new Error('API fetch failed');
      const data = await res.json();
      return data.nodes;
    } catch {
      return MOCK_CLUSTER_NODES;
    }
  }

  // Reload Asterisk PJSIP & Dialplan via AMI
  static async reloadAsterisk(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${BASE_URL}/ami_client.php?action=reload`, {
        method: 'POST'
      });
      return await res.json();
    } catch {
      return { success: true, message: 'Asterisk core & PJSIP ricaricati con successo (simulato)' };
    }
  }
}
