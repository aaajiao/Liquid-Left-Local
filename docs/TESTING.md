# 测试指南

本项目使用 [Vitest](https://vitest.dev/) 作为测试框架。

## 快速开始

```bash
# 运行所有测试
npm test

# 以监听模式运行测试（开发时推荐）
npm test -- --watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 使用UI界面运行测试
npm run test:ui
```

## 测试架构

### 测试文件组织

```
src/
├── __tests__/                    # 单元测试和集成测试
│   ├── store.test.ts             # Store 核心逻辑（关卡机制、连接、咀嚼、风等）
│   ├── store-extra.test.ts       # 之前未覆盖的 store action（fake timers）
│   ├── i18n.test.tsx             # I18nProvider / useI18n
│   ├── levelThemes.test.ts       # constants/levelThemes.ts 的完整性检查
│   ├── audio.test.ts             # utils/audio.ts 程序化合成 + 音乐生命周期
│   ├── Player.test.tsx           # Player r3f 集成（关卡切换 / 物理边界 / 收集）
│   └── World.test.tsx            # World r3f 集成（每个 LevelType + 雨 / 弹幕）
└── test/
    └── setup.ts                  # 测试环境配置和 Mock
```

### Mock配置

测试环境已配置以下 Mock（`src/test/setup.ts`）：

- **Web Audio API**: 完整的 `AudioContext` + `webkitAudioContext` alias，支持所有音频操作
- **matchMedia**: 响应式设计测试支持
- **visualViewport**: 移动端 viewport 测试支持
- **ResizeObserver / IntersectionObserver**: Framer Motion 等库需要
- **navigator.onLine**: 默认 true，UI 离线指示器测试可覆盖
- **localStorage**: 内存 shim（happy-dom 20 默认 localStorage 不可用，r3f 集成测试需要）

## 当前测试覆盖率

```
Test Files: 7 passed
Tests: 147 passed | 1 skipped (148 total)

Core Module Coverage（覆盖关键路径，非穷尽）:
- store/*.ts: 关卡链 + 9 个 action 直接覆盖（含 fake-timer 驱动的 triggerRain / triggerHomeMelt）
- contexts/I18nContext.tsx: 7 个测试，含 localStorage 持久化与 missing-key fallback
- constants/levelThemes.ts: 9 个 LevelType × 4 个字段穷举
- utils/audio.ts: 94.64% 行覆盖（仅未覆盖 MP3 解码成功路径，需真实 fetch+decodeAudioData harness）
- components/Player.tsx: 7 个集成测试（@react-three/test-renderer，关卡切换 / 边界 clamp / 收集）
- components/World.tsx: 12 个集成测试 + 1 skipped（PROLOGUE 因 test-renderer 9.1.0 对 THREE.Euler prop 的只读限制）
- components/Player.tsx: 0%  ⚠️  (需要 r3f harness — backlog)
```

## 编写新测试

### Store 测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store';

describe('My Feature', () => {
  beforeEach(() => {
    // 每个测试前重置store状态
    useGameStore.setState({
      currentLevel: 'PROLOGUE',
      // ... 其他初始状态
    });
  });

  it('should do something', () => {
    const state = useGameStore.getState();
    state.someAction();

    expect(useGameStore.getState().someValue).toBe(expected);
  });
});
```

### 组件测试示例（未来）

```typescript
import { render, screen } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';

describe('Player Component', () => {
  it('should render without crashing', () => {
    render(
      <Canvas>
        <Player />
      </Canvas>
    );
  });
});
```

## 测试命令详解

### `npm test`
运行所有测试一次，适合CI/CD环境。

### `npm test -- --watch`
监听模式，文件修改时自动重新运行相关测试，适合开发时使用。

### `npm run test:coverage`
生成测试覆盖率报告：
- 终端输出：表格格式的覆盖率统计
- HTML报告：`coverage/index.html`（可在浏览器打开查看详细信息）

### `npm run test:ui`
启动Vitest UI界面（http://localhost:51204/）：
- 可视化测试运行状态
- 查看测试详情和错误
- 实时监听文件变化

## 调试测试

### VS Code调试配置

在 `.vscode/launch.json` 中添加：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### 使用调试器

在测试代码中添加断点，然后：
1. 按 F5 启动调试
2. 或在测试中添加 `debugger` 语句

## 最佳实践

### ✅ 推荐做法

- 每个测试应该独立且可重复运行
- 使用描述性的测试名称（`it('should ...')`）
- 测试边界情况和错误处理
- 保持测试简单和专注
- 在 `beforeEach` 中重置状态

### ❌ 避免的做法

- 测试之间相互依赖
- 测试实现细节而非行为
- 使用固定的延时（使用mock代替）
- 一个测试中断言太多事情

## CI/CD集成

GitHub Actions配置示例：

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --run

      - name: Generate coverage
        run: npm run test:coverage
```

## 故障排查

### 测试失败但本地可以运行？

1. 确保依赖版本一致：`npm ci`
2. 清除缓存：`npm run test -- --clearCache`
3. 检查Node版本是否匹配

### Audio API错误？

检查 `src/test/setup.ts` 中的AudioContext mock是否完整。

### 组件渲染错误？

确保Three.js组件在 `<Canvas>` 内渲染。

## 下一步计划

- [x] I18nContext 单元测试（2026-05-04 完成）
- [x] levelThemes 完整性测试（2026-05-04 完成）
- [x] store 之前未覆盖的 action 测试（fake timers）（2026-05-04 完成）
- [x] 提升 audio.ts 测试覆盖率到 >50%（2026-05-04 完成，最终 94.64%）
- [x] 添加 Player 组件集成测试（2026-05-04 完成，@react-three/test-renderer）
- [x] 添加 World 组件测试（2026-05-04 完成）
- [ ] 解决 World PROLOGUE 用例的 `THREE.Euler` 只读限制（test-renderer 上游问题）
- [ ] MP3 解码成功路径覆盖（audio.ts 仅剩约 5% 未覆盖）
- [ ] E2E 测试（使用 Playwright）
- [ ] 性能测试（FPS 监控）

## 参考资源

- [Vitest文档](https://vitest.dev/)
- [Testing Library文档](https://testing-library.com/)
- [React Three Fiber测试](https://docs.pmnd.rs/react-three-fiber/api/test-utils)
