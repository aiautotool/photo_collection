import 'package:flutter/material.dart';
import 'features/home/home_screen.dart';

void main() => runApp(const PhotoSyncApp());

class PhotoSyncApp extends StatelessWidget {
  const PhotoSyncApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PhotoSync',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      home: const HomeScreen(),
    );
  }
}
