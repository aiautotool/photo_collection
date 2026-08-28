import 'package:flutter/material.dart';
import '../../core/models.dart';
import '../../core/storage_allocator.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = [
      StorageAccount(id: '1', email: 'drive-a@example.com', appUsedBytes: 8 * StoragePolicy.gib, providerFreeBytes: 8 * StoragePolicy.gib),
      StorageAccount(id: '2', email: 'drive-b@example.com', appUsedBytes: 2 * StoragePolicy.gib, providerFreeBytes: 13 * StoragePolicy.gib),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('PhotoSync')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const Text('Backup', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const Text('Automatic photo & video protection across your devices.'),
        const SizedBox(height: 24),
        const Card(child: ListTile(leading: Icon(Icons.cloud_done), title: Text('Backup ready'), subtitle: Text('Wi-Fi only • Originals • Background queue enabled'))),
        const SizedBox(height: 16),
        ...accounts.map((a) => Card(child: ListTile(
          leading: const Icon(Icons.storage),
          title: Text(a.email),
          subtitle: Text('Safe capacity: ${(StoragePolicy.safeAvailable(a) / StoragePolicy.gib).toStringAsFixed(1)} GiB'),
        ))),
        const SizedBox(height: 16),
        const Text('Every account is capped at 10 GiB for PhotoSync and must keep 5 GiB free.', style: TextStyle(fontWeight: FontWeight.w600)),
      ]),
    );
  }
}
