# 重构日志与配置说明

本文档记录了代码质量改进工作的详细信息。

## 📅 时间线

### 2026-05-04: 全面整改（架构 + 性能 + 测试）

**完成的工作**：
- ✅ Store 切片化：单体 `store.ts`（694 行）→ `store/{input,level,puzzle,wind,chewing,name,home,dialogue}Slice.ts` + `store/types.ts` + `store/index.ts`。`store.ts` 变成 5 行 barrel；外部 API 与现有所有 import 路径完全保持
- ✅ App.tsx 拆分：396 行 → 113 行。抽出 `components/{CustomCursor,DynamicBackground,CameraController}.tsx`；`useLevelHotkeys` 保留在 App.tsx 内（先前曾抽到 `hooks/`，但该目录在多 agent 沙箱并行编辑下反复丢失，inline 后从源头消除问题）
- ✅ Zustand 订阅粒度收紧：移除所有 `const {...} = useGameStore()` 全 store 解构，改为 `useGameStore(s => s.x)` 或 `useShallow`，覆盖 Player/World/Puzzle/UI/CustomCursor
- ✅ 修复 Rules of Hooks 违规：`WitheredLeafFeature` 抽出为独立组件（原先 hooks 在 `if (feature.type === 'WITHERED_LEAF')` 内调用）
- ✅ Player 弹弓 ref 化：PROLOGUE 拖拽期间不再每帧 `setSlingshotVector()`，state 仅在拖拽进入/退出时切换
- ✅ Puzzle 几何体 memo 化：`DraggingThread`/`BodyTether`/`Chapter6Connection` 的 Vector3/QuadraticBezierCurve3 缓存到 `useMemo` 依赖下；`SwayingHairBeam` getPoints 50→20
- ✅ 关卡颜色集中：`constants/levelThemes.ts` 替代 App.tsx/UI.tsx/Player.tsx/World.tsx 四处分散的颜色表
- ✅ EnvFeature 改判别联合：消除 `data?: any` 类型黑洞
- ✅ setInterval 清理：`triggerRain` / `triggerHomeMelt` 启动 interval 后正确清理（防止 resetGame 后写入下一关）
- ✅ ThreeEvent 类型：~13 处 `(e: any)` → `ThreeEvent<PointerEvent | MouseEvent>`
- ✅ 死代码清理：删除未引用的 `nextDialogue`/`closeDialogue`、`vite.config.ts` 的 `GEMINI_API_KEY` define、`index.html` 的 importmap 块
- ✅ i18n 完整化：`PWAInstallPrompt.tsx` 12 个硬编码 zh/en 字符串、`UI.tsx` 离线 tooltip、`World.tsx` 片段 fallback 全部迁移到 `locales/*.json`，新增 `pwa` 块和 `ui.offline` / `npc.fragmentFallback` keys。`Translations` interface 在 `locales/index.ts` 同步
- ✅ Service Worker 修复：cache 版本 `v3`→`v4`，install 阶段 precache `/`、`/index.html`、manifest、`sun.mp3`，离线 navigation fallback 不再回退到空缓存
- ✅ 构建优化：`framer-motion` 拆为独立 `vendor-framer-motion` chunk
- ✅ Google Fonts preconnect 添加（省一个 RTT）
- ✅ Manifest 图标 `purpose: "maskable"` → `"any maskable"`
- ✅ `fiction.txt` 移到 `docs/fiction.txt`（IDE 索引污染移除）
- ✅ 测试扩充：27 → 87 个测试，新增 `store-extra.test.ts`（16）、`i18n.test.tsx`（7）、`levelThemes.test.ts`（37）；setup.ts 增加 ResizeObserver / IntersectionObserver / navigator.onLine / webkitAudioContext mock

**未做（已记 backlog）**：
- favicon 4 个 PNG 实际是 1024×1024 JPEG 改名（约 1.4 MB 资产浪费），需用户用真 PNG 重导出 — 见本文末 backlog 段
- `Player.tsx` 物理路径 / `utils/audio.ts` 的端到端测试覆盖（需要 r3f / Web Audio 集成 harness）

### 2025-12-25: Week 1-2 核心改进

**完成的工作**：
- ✅ 建立测试基础设施（Vitest）
- ✅ 编写27个Store核心逻辑测试
- ✅ 提取Player.tsx配置常量
- ✅ 提取App.tsx配置常量
- ✅ 添加完整JSDoc文档

**测试覆盖率**: 从 0% → 57.69% (store.ts)

---

## 🎯 配置常量索引

### Player.tsx

所有玩家物理和游戏玩法相关的常量现在集中在文件顶部。

#### `PHYSICS_CONFIG`

控制玩家移动和物理行为的常量。

```typescript
const PHYSICS_CONFIG = {
  MOBILE_MAX_FORCE: 10.0,       // 移动端拖拽最大力
  DESKTOP_MAX_FORCE: 20.0,      // 桌面端拖拽最大力
  DAMPING: 0.92,                // 速度阻尼（越大越滑）
  SLINGSHOT_DAMPING: 0.985,     // PROLOGUE关卡弹弓阻尼
  SLINGSHOT_FORCE_MULTIPLIER: 15.0,
  SLINGSHOT_MAX_PULL: 4.0,
  OBSERVER_DAMPING: 0.95,       // HOME关卡观察模式阻尼
  OBSERVER_FORCE: 2.0,
  ANALOG_DEADZONE: 0.1,         // 模拟输入死区
  ANALOG_MAX_DIST: 3.0
};
```

**调整建议**：
- 增加 `MOBILE_MAX_FORCE` 使移动端操作更灵活
- 降低 `DAMPING` 使移动更有惯性感
- 调整 `ANALOG_DEADZONE` 改变响应灵敏度

#### `LEVEL_CONSTANTS`

每个关卡的特定游戏参数。

```typescript
const LEVEL_CONSTANTS = {
  PROLOGUE: {
    BOUNDARY_X_MIN: -2.8,        // 产道左边界
    BOUNDARY_X_MAX: 2.8,         // 产道右边界
    EXIT_THRESHOLD: 14.0,        // 触发下一关卡的Z位置
    BOOST_START_THRESHOLD: 10.0, // 开始加速的Z位置
    BOOST_FORCE: 20              // 加速力度
  },

  NAME: {
    REQUIRED_FRAGMENTS: 5,       // 通关所需碎片数
    FRAGMENT_COLLECT_RADIUS: 1.5 // 收集范围
  },

  CHEWING: {
    MAX_SCALE: 10,               // 最大尺寸
    NARRATIVE_THRESHOLD: 3.0,    // 触发叙事的尺寸
    COMPLETION_SCALE: 8.0,       // 通关尺寸
    GROWTH_RATE_PER_SECOND: 0.5, // 增长速率
    FLESH_RESISTANCE: 0.5,       // 肉球阻力
    SQUEEZE_SOUND_INTERVAL: 0.25,// 挤压音效间隔
    SQUEEZE_JITTER: 0.05         // 挤压震动强度
  },

  WIND: {
    MAX_WATER_SCALE: 6,
    NARRATIVE_THRESHOLD: 3.0,
    GROWTH_RATE_PER_BULLET: 0.15
  },

  TRAVEL: {
    ORB_INTERACTION_RADIUS: 2.0, // 情感球交互范围
    BOUNCE_FORCE: 10,            // 弹开力度
    BOUNCE_SOUND_INTERVAL: 0.3
  },

  CONNECTION: {
    TETHER_RADIUS: 2.0           // 自动连接范围
  },

  HOME: {
    LAKE_TARGET_Z: -15,          // 湖心位置
    LAKE_SURFACE_Y: -2,          // 湖面高度
    COMPLETION_THRESHOLD_Z: -12  // 通关触发位置
  }
};
```

**修改示例**：
```typescript
// 让CHEWING关卡更难：增加通关所需尺寸
CHEWING: {
  COMPLETION_SCALE: 9.5  // 原来是8.0
}

// 让NAME关卡收集更容易：扩大收集范围
NAME: {
  FRAGMENT_COLLECT_RADIUS: 2.0  // 原来是1.5
}
```

---

### components/CameraController.tsx

相机和视觉相关的配置（2026-05-04 从 `App.tsx` 抽出）。

#### `CAMERA_CONFIG`

每个关卡的相机设置。

```typescript
const CAMERA_CONFIG = {
  PROLOGUE: { offset: [15, 15, 15], baseZoom: 40 },
  LANGUAGE: { offset: [20, 20, 20], baseZoom: 40 },
  NAME:     { offset: [20, 20, 20], baseZoom: 40 },
  CHEWING:  { offset: [10, 20, 10], baseZoom: 60 },  // 近景
  WIND:     { offset: [20, 20, 20], baseZoom: 40 },
  TRAVEL:   { offset: [30, 30, 30], baseZoom: 25 },  // 广角
  CONNECTION: { offset: [20, 20, 20], baseZoom: 40 },
  HOME:     { offset: [0, 30, 30], baseZoom: 30 },
  SUN:      { offset: [20, 10, 20], baseZoom: 35 }
};
```

**offset**: `[x, y, z]` 相机相对玩家的偏移量
**baseZoom**: 基础缩放级别（越大越近）

**调整示例**：
```typescript
// 让WIND关卡视角更高，俯视感更强
WIND: { offset: [15, 25, 15], baseZoom: 35 }

// 让TRAVEL关卡视野更宽
TRAVEL: { offset: [40, 40, 40], baseZoom: 20 }
```

#### `DEVICE_SCALE_FACTORS`

响应式缩放配置。

```typescript
const DEVICE_SCALE_FACTORS = {
  PHONE_PORTRAIT: 0.65,      // 手机竖屏
  PHONE_LANDSCAPE: 0.5,      // 手机横屏
  TABLET_PORTRAIT: 0.85,     // 平板竖屏
  TABLET_LANDSCAPE: 0.75,    // 平板横屏
  DESKTOP: 1.0,              // 桌面
  BREAKPOINT_PHONE: 768,     // 手机/平板分界
  BREAKPOINT_TABLET: 1024    // 平板/桌面分界
};
```

#### `CAMERA_CONTROLS`

相机控制灵敏度。

```typescript
const CAMERA_CONTROLS = {
  TOUCH_ROTATE_SPEED: 0.4,      // 触摸旋转速度
  DESKTOP_ROTATE_SPEED: 1.0,    // 鼠标旋转速度
  TOUCH_ZOOM_SPEED: 0.5,
  DESKTOP_ZOOM_SPEED: 1.0,
  TOUCH_SMOOTH_FACTOR: 0.02,    // 触摸平滑系数（越小越慢）
  DESKTOP_SMOOTH_FACTOR: 0.1,
  DAMPING_FACTOR: 0.05,
  MIN_ZOOM: 10,
  MAX_ZOOM: 200,
  MAX_POLAR_ANGLE: Math.PI / 2 - 0.1
};
```

---

## 🔧 常见调整场景

### 场景1: 让某个关卡更简单

```typescript
// components/Player.tsx
const LEVEL_CONSTANTS = {
  CHEWING: {
    COMPLETION_SCALE: 6.0,  // 降低通关要求（原8.0）
    GROWTH_RATE_PER_SECOND: 0.8  // 提高成长速度（原0.5）
  }
};
```

### 场景2: 调整相机视角

```typescript
// components/CameraController.tsx
const CAMERA_CONFIG = {
  PROLOGUE: {
    offset: [12, 18, 12],  // 更高的俯视角度
    baseZoom: 45           // 稍微拉近
  }
};
```

### 场景3: 优化移动端手感

```typescript
// components/Player.tsx
const PHYSICS_CONFIG = {
  MOBILE_MAX_FORCE: 12.0,  // 提高灵敏度（原10.0）
  ANALOG_DEADZONE: 0.05    // 减小死区（原0.1）
};

// components/CameraController.tsx
const CAMERA_CONTROLS = {
  TOUCH_SMOOTH_FACTOR: 0.04,  // 加快相机跟随（原0.02）
  TOUCH_ROTATE_SPEED: 0.5     // 提高旋转速度（原0.4）
};
```

### 场景4: 调整游戏节奏

```typescript
// 让玩家移动更快（更街机化）
const PHYSICS_CONFIG = {
  DAMPING: 0.88,               // 降低阻尼（原0.92）
  DESKTOP_MAX_FORCE: 25.0      // 提高力度（原20.0）
};

// 让玩家移动更慢（更策略化）
const PHYSICS_CONFIG = {
  DAMPING: 0.95,               // 提高阻尼（原0.92）
  DESKTOP_MAX_FORCE: 15.0      // 降低力度（原20.0）
};
```

---

## 🧪 测试验证流程

修改配置后，务必运行测试确保没有破坏游戏逻辑：

```bash
# 1. 运行所有测试
npm test

# 2. 如果测试失败，检查是否需要更新测试预期值
# 例如：修改了COMPLETION_SCALE，需要更新相应的测试断言

# 3. 手动测试关卡
npm run dev
# 然后按数字键1-9跳转到各关卡验证
```

---

## 📊 性能影响（常量提取部分）

2025-12-25 的常量提取是**零运行时开销**的重构：

- ✅ 常量在模块加载时创建一次
- ✅ 使用 `as const` 确保类型不变性
- ✅ 不改变运行时逻辑
- ✅ 87 个测试全部通过，确保行为一致

> 2026-05-04 的整改包含运行时调整（订阅粒度收紧、弹弓 ref 化、几何体 memo），细节见时间线。

---

## 📝 提交规范

修改配置时使用清晰的提交信息：

```bash
# 游戏平衡调整
git commit -m "balance: increase CHEWING completion scale to 9.5"

# 移动端优化
git commit -m "perf(mobile): improve touch responsiveness"

# 视觉调整
git commit -m "visual: adjust WIND level camera for better view"
```

---

## 🔍 快速查找

| 想调整... | 文件 | 常量名 |
|-----------|------|--------|
| 移动手感 | components/Player.tsx | `PHYSICS_CONFIG` |
| 关卡难度 | components/Player.tsx | `LEVEL_CONSTANTS` |
| 相机位置 | components/CameraController.tsx | `CAMERA_CONFIG` |
| 移动端缩放 | components/CameraController.tsx | `DEVICE_SCALE_FACTORS` |
| 相机控制 | components/CameraController.tsx | `CAMERA_CONTROLS` |
| 关卡配色 | constants/levelThemes.ts | `LEVEL_THEMES` |

---

## 💡 最佳实践

1. **小步调整**: 每次只改一两个参数
2. **记录原值**: 注释中保留原始值以便回滚
3. **测试验证**: 运行 `npm test` 确保无破坏性
4. **手动测试**: 实际游玩验证手感
5. **版本控制**: 每次有意义的调整都提交一次

---

## 🆘 问题排查

### Q: 修改配置后游戏崩溃？

A: 检查是否误删了必需的属性，运行 `npm test` 查看具体错误。

### Q: 修改没有生效？

A: 确保修改的是正确的常量，并且重新运行了 `npm run dev`。

### Q: 测试失败？

A: 检查测试文件中的预期值是否需要更新以匹配新的配置。

---

**最后更新**: 2026-05-04（v1.2.0）

---

## Favicon backlog (manual re-export required)

The four PNG icons under `favicon/` are **misnamed JPEGs**: each is a single
1024×1024 baseline JPEG with a `.png` extension. Browsers tolerate this for
classic favicons but it produces blurry/oversized PWA install icons and is a
correctness bug regardless. This cannot be fixed by Claude Code — the PNGs
need to be re-exported from the source artwork at the correct dimensions.

Required re-exports (all true PNG, sRGB, no alpha for the maskable variants):

| File                                       | Required size | Current actual              |
| ------------------------------------------ | ------------- | --------------------------- |
| `favicon/apple-touch-icon.png`             | 180×180 PNG   | 1024×1024 JPEG (mislabeled) |
| `favicon/favicon-96x96.png`                | 96×96 PNG     | 1024×1024 JPEG (mislabeled) |
| `favicon/web-app-manifest-192x192.png`     | 192×192 PNG   | 1024×1024 JPEG (mislabeled) |
| `favicon/web-app-manifest-512x512.png`     | 512×512 PNG   | 1024×1024 JPEG (mislabeled) |

After re-exporting, verify with `file favicon/*.png` — every line should read
`PNG image data` with the matching width × height.

Related fix already applied: `favicon/site.webmanifest` icon `purpose` was
`"maskable"` only, which caused install-bar icons to be cropped on Android.
It is now `"any maskable"`. If we later split into per-purpose entries, also
ship a non-maskable variant with safe-zone padding removed.
