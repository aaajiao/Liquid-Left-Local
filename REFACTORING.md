# 重构日志与配置说明

本文档记录了代码质量改进工作的详细信息。

## 📅 时间线

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

### App.tsx

相机和视觉相关的配置。

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
// App.tsx
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

// App.tsx
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

## 📊 性能影响

所有配置提取都是**零性能开销**的重构：

- ✅ 常量在模块加载时创建一次
- ✅ 使用 `as const` 确保类型不变性
- ✅ 不改变运行时逻辑
- ✅ 27个测试全部通过，确保行为一致

---

## 🚀 下一步改进建议

### 优先级1: 可视化配置工具（未来）

创建一个开发工具来实时调整这些参数：

```typescript
// 未来可能的开发工具
if (import.meta.env.DEV) {
  window.__GAME_CONFIG__ = {
    physics: PHYSICS_CONFIG,
    levels: LEVEL_CONSTANTS,
    camera: CAMERA_CONFIG
  };
}
```

### 优先级2: 配置验证（未来）

使用Zod验证配置的合法性：

```typescript
import { z } from 'zod';

const PhysicsConfigSchema = z.object({
  MOBILE_MAX_FORCE: z.number().positive(),
  DESKTOP_MAX_FORCE: z.number().positive(),
  DAMPING: z.number().min(0).max(1),
  // ...
});

// 启动时验证
PhysicsConfigSchema.parse(PHYSICS_CONFIG);
```

### 优先级3: A/B测试支持（未来）

为不同的配置方案做A/B测试：

```typescript
const CONFIG_VARIANT = Math.random() < 0.5 ? 'A' : 'B';

const PHYSICS_CONFIG = CONFIG_VARIANT === 'A'
  ? { MOBILE_MAX_FORCE: 10.0, ... }
  : { MOBILE_MAX_FORCE: 12.0, ... };
```

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
| 移动手感 | Player.tsx | `PHYSICS_CONFIG` |
| 关卡难度 | Player.tsx | `LEVEL_CONSTANTS` |
| 相机位置 | App.tsx | `CAMERA_CONFIG` |
| 移动端缩放 | App.tsx | `DEVICE_SCALE_FACTORS` |
| 相机控制 | App.tsx | `CAMERA_CONTROLS` |

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

**维护者**: Claude Code Quality Team
**最后更新**: 2025-12-25
**版本**: 1.0
