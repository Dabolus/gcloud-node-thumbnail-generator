declare module 'primitive';
declare module 'mini-svg-data-uri';

interface FunctionData {
  kind: 'storage#object';
  id: string;
  selfLink: string;
  name: string;
  bucket: string;
  generation: number;
  metageneration: number;
  contentType: string;
  timeCreated: Date;
  updated: Date;
  timeDeleted: Date;
  temporaryHold: boolean;
  eventBasedHold: boolean;
  retentionExpirationTime: Date;
  storageClass: string;
  timeStorageClassUpdated: Date;
  size: number;
  md5Hash: string;
  mediaLink: string;
  contentEncoding: string;
  contentDisposition: string;
  contentLanguage: string;
  cacheControl: string;
  metadata: {
    [key: string]: string;
  };
  acl: ReadonlyArray<{
    kind: 'storage#objectAccessControl';
    id: string;
    selfLink: string;
    bucket: string;
    object: string;
    generation: number;
    entity: string;
    role: string;
    email: string;
    entityId: string;
    domain: string;
    projectTeam: {
      projectNumber: string;
      team: string
    };
    etag: string
  }>;
  owner: {
    entity: string;
    entityId: string
  };
  crc32c: string;
  componentCount: number;
  etag: string;
  customerEncryption: {
    encryptionAlgorithm: string;
    keySha256: string
  };
  kmsKeyName: string
}
