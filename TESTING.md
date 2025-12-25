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
├── __tests__/          # 单元测试和集成测试
│   └── store.test.ts   # Store核心逻辑测试
└── test/
    └── setup.ts        # 测试环境配置和Mock
```

### Mock配置

测试环境已配置以下Mock：

- **Web Audio API**: 完整的AudioContext mock，支持所有音频操作
- **matchMedia**: 响应式设计测试支持
- **visualViewport**: 移动端viewport测试支持

## 当前测试覆盖率

```
Overall Coverage: 17.1%

Core Module Coverage:
- store.ts: 57.69%  ✅ (关卡逻辑、状态管理)
- audio.ts: 7.82%   ⚠️  (需要改进)
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

- [ ] 提升audio.ts测试覆盖率到>50%
- [ ] 添加Player组件集成测试
- [ ] 添加World组件测试
- [ ] E2E测试（使用Playwright）
- [ ] 性能测试（FPS监控）

## 参考资源

- [Vitest文档](https://vitest.dev/)
- [Testing Library文档](https://testing-library.com/)
- [React Three Fiber测试](https://docs.pmnd.rs/react-three-fiber/api/test-utils)
