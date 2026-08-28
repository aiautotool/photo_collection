import 'models.dart';

class SyncQueueItem {
  SyncQueueItem(this.asset) : state = SyncState.discovered;
  final MediaAsset asset;
  SyncState state;
  int retryCount = 0;
  String? lastError;

  void transition(SyncState next) {
    const allowed = <SyncState, Set<SyncState>>{
      SyncState.discovered: {SyncState.hashing},
      SyncState.hashing: {SyncState.queued, SyncState.failed},
      SyncState.queued: {SyncState.uploading, SyncState.blockedNoCapacity},
      SyncState.uploading: {SyncState.verifying, SyncState.failed},
      SyncState.verifying: {SyncState.protected, SyncState.failed},
      SyncState.failed: {SyncState.queued},
      SyncState.blockedNoCapacity: {SyncState.queued},
      SyncState.protected: {},
    };
    if (!(allowed[state]?.contains(next) ?? false)) {
      throw StateError('Invalid sync transition: $state -> $next');
    }
    state = next;
  }
}
