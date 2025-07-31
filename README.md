# SystemVerilog 状态机生成器

## 概述
SystemVerilog 状态机生成器是一款 VSCode 扩展，专为硬件工程师设计，帮助快速生成可综合的 SystemVerilog 状态机代码。它支持独热编码、状态转移逻辑和输出逻辑的自动生成，极大地提高了开发效率。

## 功能特点
- 🚀 **快速状态机生成**：支持简单状态机的自动生成。
- 🔄 **高级状态机生成**：支持复杂状态机的自定义配置，包括状态转移逻辑和输出逻辑。
- 🔒 **可综合安全**：使用 `unique case` 和正确的复位处理。
- 📝 **自文档化代码**：生成的代码包含注释，便于理解。
- ⚙️ **支持多种状态定义**：支持独热编码和自定义状态映射。

## 安装方法
1. 打开 VSCode。
2. 进入扩展视图 (`Ctrl+Shift+X`)。
3. 搜索 "SystemVerilog State Machine Generator"。
4. 点击安装。

## 使用方法
### 快速状态机生成
1. 打开 SystemVerilog 文件。
2. 选中要生成状态机的**文本片段**，以分号分隔（例如：`IDLE;RUNNING;DONE`）。
3. 按 `Ctrl+Shift+P` 打开命令面板。
4. 选择 **Generate Fast State Machine**。
5. 状态机代码将替换片段插入到光标位置。

### 高级状态机生成
高级状态机生成功能允许用户定义复杂的状态机，包括状态转移逻辑和输出逻辑。以下是详细步骤：

1. **打开 SystemVerilog 文件**  
   确保当前编辑器中打开的是一个 `.sv` 文件。

2. **输入状态定义**  
   选中状态定义和转移关系**文本片段**，例如：
   ```
   IDLE;1-2
   RUNNING;2-3
   ERROR;3-4
   DONE;4-1
   ```

3. **打开命令面板**  
   按 `Ctrl+Shift+P` 打开 VSCode 的命令面板。

4. **选择命令**  
   在命令面板中输入 `Generate Advanced State Machine`，然后选择该命令。

5. **生成代码**  
   插件会根据用户选择的文本片段生成完整的状态机代码，包括状态定义、转移逻辑和输出逻辑。

6. **插入代码**  
   生成的代码会自动替换文本片段插入到光标位置。

### 示例
#### 快速状态机生成
```systemverilog
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

// 状态机实现...
```

#### 高级状态机生成
```systemverilog
typedef enum {
    IDLE,
    RUNNING,
    ERROR,
    DONE
} fsm_state;

typedef struct packed {
    logic idle2running;
    logic running2error;
    logic error2done;
    logic done2idle;
} fsm_transition_flags;

// 高级状态机实现...
always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        cur_state <= IDLE;
    end else begin
        case (cur_state)
            IDLE: if (idle2running) cur_state <= RUNNING;
            RUNNING: if (running2error) cur_state <= ERROR;
            ERROR: if (error2done) cur_state <= DONE;
            DONE: if (done2idle) cur_state <= IDLE;
            default: cur_state <= IDLE;
        endcase
    end
end
```

## 系统要求
- VSCode v1.85+
- SystemVerilog 语言支持

## 反馈与贡献
报告问题或参与贡献：
- [GitHub 仓库](https://github.com/wilsonch001/sv-statemachine-generator)
- 提交问题或功能请求。

---

感谢使用 SystemVerilog 状态机生成器！🎉

## License
MIT License