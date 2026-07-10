# 专注计时器

一款支持系统级快捷键封锁的 Windows 全屏专注计时器。

## 功能

- 全屏遮罩，阻止分心操作
- 可选 5/10/15/25/45 分钟预设，或自定义时长
- 倒计时圆环与粒子、烟花动效
- 桌面小鱼池塘交互背景
- 专注结束时声音与烟花提示

## 快捷键

专注模式下，按下 **`Ctrl + Shift + E`** 可退出专注并返回设置页。

## 开发

```bash
# 安装依赖
npm install

# 开发运行（含热更新）
npm run dev

# 构建
npm run build

# 打包安装包
npm run dist
```

## 技术栈

- Vue 3 + TypeScript
- Vite
- Electron
- node-addon-api（Windows 低层键盘钩子）

## 权限说明

应用安装包需要管理员权限运行，用于注册全局快捷键和低层键盘钩子，以在专注期间屏蔽 `Alt+Tab`、`Alt+F4`、`Win` 等系统快捷键。
