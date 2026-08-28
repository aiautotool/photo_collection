enum SyncState { discovered, hashing, queued, uploading, verifying, protected, failed, blockedNoCapacity }

class MediaAsset {
  MediaAsset({required this.id, required this.filename, required this.sizeBytes, required this.mimeType, this.sha256});
  final String id;
  final String filename;
  final int sizeBytes;
  final String mimeType;
  String? sha256;
}

class StorageAccount {
  StorageAccount({required this.id, required this.email, required this.appUsedBytes, required this.providerFreeBytes});
  final String id;
  final String email;
  final int appUsedBytes;
  final int providerFreeBytes;
}
