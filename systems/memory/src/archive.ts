/**
 * Archive Manager Implementation
 * 
 * Handles memory expiration, archival, and cleanup operations.
 */

import { MemoryType } from '../../../core/contracts/memory';

import type { InternalMemoryEntry } from './types.js';

/**
 * Archive configuration
 */
export interface ArchiveConfig {
  /**
   * Default TTL in seconds for session memories
   */
  defaultSessionTTL: number;
  
  /**
   * Default TTL in seconds for ephemeral memories
   */
  defaultEphemeralTTL: number;
  
  /**
   * Maximum age in seconds before permanent deletion of archived memories
   */
  maxArchiveAge: number;
  
  /**
   * Whether to archive instead of delete
   */
  preserveArchived: boolean;
}

/**
 * Default archive configuration
 */
const DEFAULT_CONFIG: ArchiveConfig = {
  defaultSessionTTL: 86400 * 7, // 7 days
  defaultEphemeralTTL: 3600,    // 1 hour
  maxArchiveAge: 86400 * 30,   // 30 days
  preserveArchived: true
};

/**
 * Archive status for memory entries
 */
export enum ArchiveStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  EXPIRED = 'expired',
  DELETED = 'deleted'
}

/**
 * Archive record
 */
export interface ArchiveRecord {
  entryId: string;
  originalType: MemoryType;
  archivedAt: Date;
  expiresAt: Date;
  status: ArchiveStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Archive manager for handling memory expiration and cleanup
 */
export class ArchiveManager {
  private archivedEntries: Map<string, ArchiveRecord> = new Map();
  private config: ArchiveConfig;

  constructor(config: Partial<ArchiveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Determine if an entry has expired based on its type
   */
  isExpired(entry: InternalMemoryEntry): boolean {
    // Check explicit expiration
    if (entry.metadata.expiresAt) {
      return new Date() > new Date(entry.metadata.expiresAt);
    }

    // Check TTL based on memory type
    const ttl = this.getTTLForType(entry.type);
    if (ttl === Infinity) return false;

    const createdAt = new Date(entry.metadata.createdAt);
    const expiresAt = new Date(createdAt.getTime() + ttl * 1000);
    return new Date() > expiresAt;
  }

  /**
   * Get TTL for a memory type
   */
  private getTTLForType(type: MemoryType): number {
    switch (type) {
      case MemoryType.EPHEMERAL:
        return this.config.defaultEphemeralTTL;
      case MemoryType.SESSION:
        return this.config.defaultSessionTTL;
      case MemoryType.PERSISTENT:
        return Infinity;
      case MemoryType.DERIVED:
        return this.config.defaultSessionTTL * 2;
      default:
        return this.config.defaultSessionTTL;
    }
  }

  /**
   * Calculate expiration date for an entry
   */
  getExpirationDate(entry: InternalMemoryEntry): Date {
    if (entry.metadata.expiresAt) {
      return new Date(entry.metadata.expiresAt);
    }

    const ttl = this.getTTLForType(entry.type);
    return new Date(new Date(entry.metadata.createdAt).getTime() + ttl * 1000);
  }

  /**
   * Get all expired entry IDs
   */
  getExpired(entries: Map<string, InternalMemoryEntry>): string[] {
    const expiredIds: string[] = [];

    for (const [id, entry] of entries) {
      if (this.isExpired(entry)) {
        expiredIds.push(id);
      }
    }

    return expiredIds;
  }

  /**
   * Archive expired memories
   */
  archive(entries: Map<string, InternalMemoryEntry>): string[] {
    const archivedIds: string[] = [];
    const expiredIds = this.getExpired(entries);

    for (const id of expiredIds) {
      const entry = entries.get(id);
      if (!entry) continue;

      // Create archive record
      const archiveRecord: ArchiveRecord = {
        entryId: id,
        originalType: entry.type,
        archivedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.maxArchiveAge * 1000),
        status: this.config.preserveArchived ? ArchiveStatus.ARCHIVED : ArchiveStatus.EXPIRED,
        metadata: {
          contentLength: entry.content.length,
          tokenCount: entry.tokenCount
        }
      };

      this.archivedEntries.set(id, archiveRecord);
      archivedIds.push(id);
    }

    return archivedIds;
  }

  /**
   * Permanently delete archived memories past max archive age
   */
  prune(): string[] {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [id, record] of this.archivedEntries) {
      if (record.status === ArchiveStatus.ARCHIVED && new Date(record.expiresAt) < now) {
        record.status = ArchiveStatus.DELETED;
        toDelete.push(id);
      }
    }

    // Actually remove deleted records
    for (const id of toDelete) {
      this.archivedEntries.delete(id);
    }

    return toDelete;
  }

  /**
   * Restore an archived memory to active status
   */
  restore(id: string): boolean {
    const record = this.archivedEntries.get(id);
    if (!record) return false;

    if (record.status === ArchiveStatus.ARCHIVED) {
      record.status = ArchiveStatus.ACTIVE;
      record.expiresAt = new Date(Date.now() + this.config.maxArchiveAge * 1000);
      return true;
    }

    return false;
  }

  /**
   * Get archive status for an entry
   */
  getStatus(id: string): ArchiveStatus | null {
    const record = this.archivedEntries.get(id);
    return record?.status ?? null;
  }

  /**
   * Get all archived entries
   */
  getArchived(): Map<string, ArchiveRecord> {
    return new Map(this.archivedEntries);
  }

  /**
   * Get archive statistics
   */
  getStats(): {
    totalArchived: number;
    byStatus: Record<ArchiveStatus, number>;
    oldestArchive: Date | null;
    newestArchive: Date | null;
  } {
    const byStatus: Record<ArchiveStatus, number> = {
      [ArchiveStatus.ACTIVE]: 0,
      [ArchiveStatus.ARCHIVED]: 0,
      [ArchiveStatus.EXPIRED]: 0,
      [ArchiveStatus.DELETED]: 0
    };

    let oldestArchive: Date | null = null;
    let newestArchive: Date | null = null;

    for (const record of this.archivedEntries.values()) {
      byStatus[record.status]++;
      
      if (!oldestArchive || record.archivedAt < oldestArchive) {
        oldestArchive = record.archivedAt;
      }
      if (!newestArchive || record.archivedAt > newestArchive) {
        newestArchive = record.archivedAt;
      }
    }

    return {
      totalArchived: this.archivedEntries.size,
      byStatus,
      oldestArchive,
      newestArchive
    };
  }

  /**
   * Clear all archived records
   */
  clear(): void {
    this.archivedEntries.clear();
  }
}

/**
 * Factory function to create an archive manager
 */
export function createArchiveManager(config?: Partial<ArchiveConfig>): ArchiveManager {
  return new ArchiveManager(config);
}