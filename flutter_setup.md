# Flutter 桌面开发环境搭建指南

## 1. 安装 Flutter

### Windows 安装步骤：

1. **下载 Flutter SDK**
```bash
# 访问官网下载或使用 git clone
git clone https://github.com/flutter/flutter.git -b stable
```

2. **配置环境变量**
```bash
# 将 Flutter 安装目录的 bin 文件夹添加到 PATH
# 例如：C:\flutter\bin
```

3. **验证安装**
```bash
flutter doctor
```

4. **启用桌面开发**
```bash
flutter config --enable-windows-desktop
flutter config --enable-macos-desktop
flutter config --enable-linux-desktop
```

## 2. 开发工具推荐

### VS Code 插件：
- Flutter
- Dart
- Dart Data Class Generator

### Android Studio 插件：
- Flutter
- Dart

## 3. 创建桌面项目

```bash
# 创建新项目
flutter create --platforms=windows,macos,linux ai_chat_desktop

# 进入项目目录
cd ai_chat_desktop

# 运行桌面应用
flutter run -d windows
```

## 4. 检查环境
```bash
flutter doctor -v
flutter devices  # 应该看到 Windows、macOS 或 Linux 设备
``` 