import 'package:flutter_test/flutter_test.dart';
import 'package:photosync_mobile/core/models.dart';
import 'package:photosync_mobile/core/storage_allocator.dart';

void main() {
  test('rejects file that would exceed app 10 GiB cap', () {
    final a = StorageAccount(id:'a', email:'a@x', appUsedBytes: 9*StoragePolicy.gib, providerFreeBytes: 20*StoragePolicy.gib);
    expect(StoragePolicy.allocate([a], 2*StoragePolicy.gib), isNull);
  });
  test('rejects file that would violate 5 GiB reserve', () {
    final a = StorageAccount(id:'a', email:'a@x', appUsedBytes: 0, providerFreeBytes: 6*StoragePolicy.gib);
    expect(StoragePolicy.allocate([a], 2*StoragePolicy.gib), isNull);
  });
  test('selects account with most safe capacity', () {
    final a = StorageAccount(id:'a', email:'a@x', appUsedBytes: 8*StoragePolicy.gib, providerFreeBytes: 20*StoragePolicy.gib);
    final b = StorageAccount(id:'b', email:'b@x', appUsedBytes: 1*StoragePolicy.gib, providerFreeBytes: 20*StoragePolicy.gib);
    expect(StoragePolicy.allocate([a,b], StoragePolicy.gib)?.id, 'b');
  });
}
