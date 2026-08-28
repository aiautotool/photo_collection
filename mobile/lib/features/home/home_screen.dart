import 'package:flutter/material.dart';
import '../../core/models.dart';
import '../../core/storage_allocator.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int index = 0;

  static const images = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900',
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=900',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900',
    'https://images.unsplash.com/photo-1511497584788-876760111969?w=900',
    'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=900',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900',
  ];

  final accounts = [
    StorageAccount(id: '1', email: 'khanh@gmail.com', appUsedBytes: 8.2 * StoragePolicy.gib, providerFreeBytes: 6.8 * StoragePolicy.gib),
    StorageAccount(id: '2', email: 'khanh.work@gmail.com', appUsedBytes: 4.1 * StoragePolicy.gib, providerFreeBytes: 10.9 * StoragePolicy.gib),
    StorageAccount(id: '3', email: 'backup.family@gmail.com', appUsedBytes: 2.7 * StoragePolicy.gib, providerFreeBytes: 12.3 * StoragePolicy.gib),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: IndexedStack(
          index: index,
          children: [
            _photos(),
            _search(),
            _shared(),
            _library(),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.photo_outlined), selectedIcon: Icon(Icons.photo), label: 'Ảnh'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Tìm kiếm'),
          NavigationDestination(icon: Icon(Icons.people_alt_outlined), label: 'Chia sẻ'),
          NavigationDestination(icon: Icon(Icons.collections_bookmark_outlined), label: 'Thư viện'),
        ],
      ),
    );
  }

  Widget _header(String title, {String? subtitle}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w800, letterSpacing: -.5)),
                if (subtitle != null) ...[
                  const SizedBox(height: 3),
                  Text(subtitle, style: TextStyle(color: Colors.white.withValues(alpha: .55), fontSize: 12)),
                ]
              ],
            ),
          ),
          _roundIcon(Icons.notifications_none_rounded),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _showBackupSheet,
            child: const CircleAvatar(
              radius: 18,
              backgroundColor: Color(0xFF17375B),
              child: Icon(Icons.person, size: 18, color: Color(0xFF8CC6FF)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _photos() {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _header('PhotoSync', subtitle: 'Đã sao lưu • 1 phút trước')),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GestureDetector(
              onTap: () => setState(() => index = 1),
              child: Container(
                height: 48,
                padding: const EdgeInsets.symmetric(horizontal: 15),
                decoration: BoxDecoration(color: const Color(0xFF111821), borderRadius: BorderRadius.circular(16)),
                child: Row(children: [
                  const Icon(Icons.search, color: Color(0xFF9AA7B5)),
                  const SizedBox(width: 10),
                  Text('Tìm trong ảnh của bạn', style: TextStyle(color: Colors.white.withValues(alpha: .55))),
                  const Spacer(),
                  const Icon(Icons.tune_rounded, size: 18, color: Color(0xFF9AA7B5)),
                ]),
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(child: _SectionTitle('Hôm nay')),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 5),
          sliver: SliverGrid.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, crossAxisSpacing: 3, mainAxisSpacing: 3),
            itemCount: 6,
            itemBuilder: (_, i) => _photoTile(i),
          ),
        ),
        const SliverToBoxAdapter(child: _SectionTitle('Hôm qua')),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 5),
          sliver: SliverGrid.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, crossAxisSpacing: 3, mainAxisSpacing: 3),
            itemCount: 6,
            itemBuilder: (_, i) => _photoTile(i + 6),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    );
  }

  Widget _photoTile(int i) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => PhotoViewer(image: images[i % images.length]))),
      child: Hero(
        tag: images[i % images.length],
        child: ClipRRect(
          borderRadius: BorderRadius.circular(7),
          child: Image.network(
            images[i % images.length],
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(color: const Color(0xFF18222D), child: const Icon(Icons.image_outlined)),
          ),
        ),
      ),
    );
  }

  Widget _search() {
    final categories = [
      ('Video', Icons.play_circle_outline_rounded),
      ('Ảnh chụp màn hình', Icons.screenshot_rounded),
      ('Selfie', Icons.face_retouching_natural_rounded),
      ('Live Photos', Icons.motion_photos_on_outlined),
    ];
    return ListView(
      padding: const EdgeInsets.only(bottom: 30),
      children: [
        _header('Tìm kiếm'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            autofocus: false,
            decoration: InputDecoration(
              hintText: 'Người, địa điểm, vật thể...',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: const Color(0xFF111821),
              border: OutlineInputBorder(borderSide: BorderSide.none, borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ),
        const _SectionTitle('Mọi người & thú cưng'),
        SizedBox(
          height: 94,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: 5,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (_, i) => Column(children: [
              CircleAvatar(radius: 28, backgroundImage: NetworkImage(images[(i + 2) % images.length])),
              const SizedBox(height: 5),
              Text(['An', 'Bố', 'Mẹ', 'Miu', 'Bạn bè'][i], style: const TextStyle(fontSize: 12)),
            ]),
          ),
        ),
        const _SectionTitle('Địa điểm'),
        SizedBox(
          height: 112,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: 3,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) => SizedBox(
              width: 150,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(fit: StackFit.expand, children: [
                  Image.network(images[i], fit: BoxFit.cover),
                  Container(decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black87]))),
                  Positioned(left: 12, bottom: 10, child: Text(['Đà Lạt', 'Phú Quốc', 'Đà Nẵng'][i], style: const TextStyle(fontWeight: FontWeight.w700))),
                ]),
              ),
            ),
          ),
        ),
        const _SectionTitle('Các loại'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: GridView.builder(
            physics: const NeverScrollableScrollPhysics(),
            shrinkWrap: true,
            itemCount: categories.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 2.7, crossAxisSpacing: 10, mainAxisSpacing: 10),
            itemBuilder: (_, i) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 13),
              decoration: BoxDecoration(color: const Color(0xFF111821), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [Icon(categories[i].$2, size: 21), const SizedBox(width: 9), Expanded(child: Text(categories[i].$1, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)))]),
            ),
          ),
        ),
      ],
    );
  }

  Widget _shared() => _emptyPage('Chia sẻ', 'Album gia đình và liên kết chia sẻ sẽ xuất hiện ở đây.', Icons.people_alt_outlined);

  Widget _library() {
    return ListView(
      children: [
        _header('Thư viện'),
        _libraryTile(Icons.favorite_border, 'Yêu thích', '345 ảnh'),
        _libraryTile(Icons.folder_outlined, 'Album', '12 album'),
        _libraryTile(Icons.archive_outlined, 'Lưu trữ', '48 mục'),
        _libraryTile(Icons.delete_outline, 'Thùng rác', 'Tự xóa sau 30 ngày'),
        const _SectionTitle('Sao lưu & lưu trữ'),
        _libraryTile(Icons.cloud_done_outlined, 'Sao lưu', 'Đang hoạt động', onTap: _showBackupSheet),
        _libraryTile(Icons.storage_rounded, 'Tài khoản Google Drive', '${accounts.length} tài khoản', onTap: _showBackupSheet),
      ],
    );
  }

  Widget _emptyPage(String title, String subtitle, IconData icon) => Column(
        children: [
          _header(title),
          const Spacer(),
          Icon(icon, size: 54, color: const Color(0xFF4DA3FF)),
          const SizedBox(height: 16),
          Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF9AA7B5))),
          const Spacer(),
        ],
      );

  Widget _libraryTile(IconData icon, String title, String subtitle, {VoidCallback? onTap}) => ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
        leading: Container(width: 42, height: 42, decoration: BoxDecoration(color: const Color(0xFF111821), borderRadius: BorderRadius.circular(13)), child: Icon(icon, color: const Color(0xFF8CC6FF))),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
      );

  Widget _roundIcon(IconData icon) => Container(width: 38, height: 38, decoration: const BoxDecoration(color: Color(0xFF111821), shape: BoxShape.circle), child: Icon(icon, size: 20));

  void _showBackupSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0C1219),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .74,
        minChildSize: .5,
        maxChildSize: .92,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 30),
          children: [
            Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(8)))),
            const SizedBox(height: 20),
            const Row(children: [Icon(Icons.cloud_done_rounded, color: Color(0xFF58D7B2)), SizedBox(width: 10), Text('Sao lưu & đồng bộ', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))]),
            const SizedBox(height: 8),
            const Text('Ảnh và video được tự động phân bổ sang các tài khoản Google Drive an toàn.', style: TextStyle(color: Color(0xFF9AA7B5))),
            const SizedBox(height: 18),
            ...accounts.map((a) {
              final used = a.appUsedBytes / StoragePolicy.gib;
              final safe = StoragePolicy.safeAvailable(a) / StoragePolicy.gib;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFF111821), borderRadius: BorderRadius.circular(16)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    const CircleAvatar(radius: 17, backgroundColor: Colors.white, child: Text('G', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.w800))),
                    const SizedBox(width: 10),
                    Expanded(child: Text(a.email, style: const TextStyle(fontWeight: FontWeight.w700))),
                    Text('${used.toStringAsFixed(1)} / 10 GB', style: const TextStyle(fontSize: 12, color: Color(0xFFB9C5D1))),
                  ]),
                  const SizedBox(height: 10),
                  ClipRRect(borderRadius: BorderRadius.circular(10), child: LinearProgressIndicator(value: (used / 10).clamp(0, 1), minHeight: 6, backgroundColor: const Color(0xFF26313D))),
                  const SizedBox(height: 8),
                  Text('Có thể sao lưu thêm ${safe.toStringAsFixed(1)} GB • Luôn chừa 5 GB', style: const TextStyle(fontSize: 11, color: Color(0xFF7F8C99))),
                ]),
              );
            }),
            OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('Thêm tài khoản Google')),
            const SizedBox(height: 14),
            SwitchListTile.adaptive(value: true, onChanged: (_) {}, title: const Text('Sao lưu & đồng bộ'), subtitle: const Text('Tự động khi có ảnh/video mới')),
            SwitchListTile.adaptive(value: true, onChanged: (_) {}, title: const Text('Chỉ dùng Wi-Fi')),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 22, 16, 10),
        child: Text(text, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
      );
}

class PhotoViewer extends StatelessWidget {
  final String image;
  const PhotoViewer({super.key, required this.image});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Đà Lạt, Việt Nam', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)), Text('12 tháng 5, 2024 • 06:45', style: TextStyle(fontSize: 10, color: Colors.white54))]),
        actions: const [Icon(Icons.more_vert)],
      ),
      body: Center(child: Hero(tag: image, child: InteractiveViewer(child: Image.network(image, fit: BoxFit.contain)))),
      bottomNavigationBar: SafeArea(
        child: Container(
          color: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: const Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _ViewerAction(Icons.ios_share_outlined, 'Chia sẻ'),
            _ViewerAction(Icons.favorite_border, 'Yêu thích'),
            _ViewerAction(Icons.tune_rounded, 'Chỉnh sửa'),
            _ViewerAction(Icons.delete_outline, 'Xóa'),
          ]),
        ),
      ),
    );
  }
}

class _ViewerAction extends StatelessWidget {
  final IconData icon;
  final String label;
  const _ViewerAction(this.icon, this.label);

  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon), const SizedBox(height: 4), Text(label, style: const TextStyle(fontSize: 10))]);
}
