# SystemVerilog 状态机生成器

## 概述
SystemVerilog 状态机生成器是一款 VSCode 扩展，帮助硬件工程师快速生成可综合的 SystemVerilog 状态机代码。它根据用户定义的状态自动创建完整的状态机实现，包括独热编码、转移条件和输出逻辑。

## 功能特点
- 🚀 **快速生成**：几秒钟内创建复杂状态机。
- 🔄 **自动转移逻辑**：生成状态转移标志和逻辑。
- 🔒 **可综合安全**：使用 `unique case` 和正确的复位处理。
- 📝 **自文档化**：包含自动生成的文档。
- ⚙️ **可配置**：支持自定义状态名称和序列。

## 安装方法
1. 打开 VSCode。
2. 进入扩展视图 (`Ctrl+Shift+X`)。
3. 搜索 "SystemVerilog State Machine Generator"。
4. 点击安装。

## 使用方法
1. 打开 SystemVerilog 文件。
2. 按 `Ctrl+Shift+P` 打开命令面板。
3. 选择 **Generate SystemVerilog State Machine**。
4. 输入以分号分隔的状态名称（例如：`IDLE;RUNNING;DONE`）。
5. 状态机代码将插入到光标位置。

## 示例
```systemverilog
// 状态序列: IDLE → RUNNING → DONE
typedef enum {
    IDLE,
    RUNNING,
    DONE
} fsm_state;

typedef struct packed {
    logic idle2running;
    logic running2done;
    logic done2idle;
} fsm_transition_flags;

// ...完整的状态机实现...
```

## 系统要求
- VSCode v1.85+
- SystemVerilog 语言支持

## 反馈与贡献
报告问题或参与贡献：
- [GitHub 仓库](https://github.com/WilsonChanw/vscode_extension)
- 提交问题或功能请求。

---

感谢使用 SystemVerilog 状态机生成器！🎉
