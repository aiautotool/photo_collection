import 'models.dart';

class StoragePolicy {
  static const int gib = 1024 * 1024 * 1024;
  static const int appCapBytes = 10 * gib;
  static const int reserveBytes = 5 * gib;

  static int safeAvailable(StorageAccount a) {
    final appHeadroom = appCapBytes - a.appUsedBytes;
    final reserveHeadroom = a.providerFreeBytes - reserveBytes;
    final safe = appHeadroom < reserveHeadroom ? appHeadroom : reserveHeadroom;
    return safe < 0 ? 0 : safe;
  }

  static StorageAccount? allocate(List<StorageAccount> accounts, int fileBytes) {
    final eligible = accounts.where((a) => safeAvailable(a) >= fileBytes).toList()
      ..sort((a, b) {
        final bySpace = safeAvailable(b).compareTo(safeAvailable(a));
        return bySpace != 0 ? bySpace : a.id.compareTo(b.id);
      });
    return eligible.isEmpty ? null : eligible.first;
  }
}
