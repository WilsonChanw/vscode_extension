import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // 注册快速状态机生成命令
    const fastDisposable = vscode.commands.registerCommand('sv-statemachine.generate-fast', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showErrorMessage('Please select state names (semicolon separated)');
                return;
            }
            
            // 解析状态名称
            const states = selectedText.split(';')
                .map(state => state.trim())
                .filter(state => state !== '');
            
            if (states.length < 2) {
                vscode.window.showErrorMessage('Please select at least two state names');
                return;
            }
            
            // 生成状态机代码
            const generatedCode = generateFastStateMachineCode(states);
            
            // 替换选中的文本
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, generatedCode);
            });
            
            vscode.window.showInformationMessage('Fast state machine generated');
        } catch (error: any) {
            handleError(error);
        }
    });

    // 注册高级状态机生成命令
    const advancedDisposable = vscode.commands.registerCommand('sv-statemachine.generate-advanced', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showErrorMessage('Please select state definitions');
                return;
            }
            
            // 解析状态定义
            const lines = selectedText.split('\n')
                .map(line => line.trim())
                .filter(line => line !== '');
            
            if (lines.length === 0) {
                vscode.window.showErrorMessage('No valid state definitions found');
                return;
            }
            
            // 解析状态和转移关系
            const { states, transitions } = parseAdvancedStateDefinition(lines);
            
            // 生成状态机代码
            const generatedCode = generateAdvancedStateMachineCode(states, transitions);
            
            // 替换选中的文本
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, generatedCode);
            });
            
            vscode.window.showInformationMessage('Advanced state machine generated');
        } catch (error: any) {
            handleError(error);
        }
    });

    context.subscriptions.push(fastDisposable, advancedDisposable);
}

// ========================
// 快速模式状态机生成
// ========================
function generateFastStateMachineCode(states: string[]): string {
    // 生成状态枚举定义
    const enumDefinition = states.join(',\n    ');
    
    // 生成转移标志
    const transitionFlags = states.map((state, index) => {
        const nextIndex = (index + 1) % states.length;
        const currentLower = state.toLowerCase();
        const nextLower = states[nextIndex].toLowerCase();
        return `logic ${currentLower}2${nextLower};`;
    }).join('\n    ');
    
    // 生成转移条件逻辑
    const transitionLogic = states.map((state, index) => {
        const nextIndex = (index + 1) % states.length;
        const currentLower = state.toLowerCase();
        const nextLower = states[nextIndex].toLowerCase();
        return `${state}: begin
            trans_flags.${currentLower}2${nextLower} = ...; 
        end`;
    }).join('\n        ');
    
    // 生成状态转移逻辑
    const stateTransition = states.map((state, index) => {
        const nextIndex = (index + 1) % states.length;
        const currentLower = state.toLowerCase();
        const nextLower = states[nextIndex].toLowerCase();
        return `${state}: begin
            if (trans_flags.${currentLower}2${nextLower})
                next_state = ${states[nextIndex]};
        end`;
    }).join('\n        ');
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    return `

// State encoding definition
typedef enum {      
    ${enumDefinition}
} fsm_state;

// Packed struct definition 
typedef struct packed {          
    ${transitionFlags}
} fsm_transition_flags;

fsm_state cur_state, next_state;
fsm_transition_flags trans_flags; // Transition condition flags

// State transition condition generation 
always_comb begin : transition_condition_gen
    trans_flags = '{default:'0}; 
    
    unique case (cur_state)  
        ${transitionLogic}
        default: trans_flags = '{default:'0};
    endcase
end

// State transition logic (combinational)
always_comb begin : state_transition
    next_state = cur_state; 
    
    unique case (cur_state)
        ${stateTransition}
        default: next_state = ${states[0]}; 
    endcase
end

// State register (sequential logic)
always_ff @(posedge clk or negedge rst_n) begin : state_register
    if (!rst_n) begin
        cur_state <= ${states[0]};      // Reset initialization
    end else begin
        cur_state <= next_state; // State update
    end
end

`;
}

// ========================
// 高级模式解析函数
// ========================
function parseAdvancedStateDefinition(lines: string[]): {
    states: string[],
    transitions: {source: string, target: string}[]
} {
    const states: string[] = [];
    const transitions: {source: string, target: string}[] = [];
    
    // 第一遍：收集所有状态
    for (const line of lines) {
        const parts = line.split(';').map(p => p.trim()).filter(p => p);
        if (parts.length > 0) {
            states.push(parts[0]);
        }
    }
    
    // 第二遍：解析转移关系
    for (const line of lines) {
        const parts = line.split(';').map(p => p.trim()).filter(p => p);
        if (parts.length < 2) continue;
        
        const sourceState = parts[0];
        const sourceIndex = states.indexOf(sourceState) + 1;
        
        if (sourceIndex === 0) {
            throw new Error(`State not found: ${sourceState}`);
        }
        
        for (let i = 1; i < parts.length; i++) {
            const transitionPart = parts[i];
            const [sourceIndexStr, targetIndexStr] = transitionPart.split('-');
            
            if (!sourceIndexStr || !targetIndexStr) {
                throw new Error(`Invalid transition format: ${transitionPart}`);
            }
            
            // 支持多位数状态索引
            const sourceIdx = parseInt(sourceIndexStr);
            const targetIdx = parseInt(targetIndexStr);
            
            if (isNaN(sourceIdx) || isNaN(targetIdx)) {
                throw new Error(`Invalid transition numbers: ${transitionPart}`);
            }
            
            // 验证源索引匹配
            if (sourceIdx !== sourceIndex) {
                throw new Error(`Source index mismatch: ${sourceIdx} should be ${sourceIndex} for ${sourceState}`);
            }
            
            if (targetIdx < 1 || targetIdx > states.length) {
                throw new Error(`Target index out of range: ${targetIdx}. Valid range: 1-${states.length}`);
            }
            
            const targetState = states[targetIdx - 1];
            transitions.push({
                source: sourceState,
                target: targetState
            });
        }
    }
    
    return { states, transitions };
}

// ========================
// 高级模式状态机生成
// ========================
function generateAdvancedStateMachineCode(
    states: string[],
    transitions: {source: string, target: string}[]
): string {
    // 生成状态枚举定义
    const enumDefinition = states.join(',\n    ');
    
    // 生成转移标志
    const transitionFlags = transitions.map(({source, target}) => {
        const sourceLower = source.toLowerCase();
        const targetLower = target.toLowerCase();
        return `logic ${sourceLower}2${targetLower};`;
    }).join('\n    ');
    
    // 生成转移条件逻辑
    const transitionLogic = states.map(state => {
        const stateTransitions = transitions.filter(t => t.source === state);
        
        if (stateTransitions.length === 0) {
            return `${state}: begin
                // No transitions defined for this state
            end`;
        }
        
        return `${state}: begin
            ${stateTransitions.map(({source, target}) => {
                const sourceLower = source.toLowerCase();
                const targetLower = target.toLowerCase();
                return `trans_flags.${sourceLower}2${targetLower} = ...; `;
            }).join('\n            ')}
        end`;
    }).join('\n        ');
    
    // 生成状态转移逻辑（使用if-else if结构）
    const stateTransition = states.map(state => {
        const stateTransitions = transitions.filter(t => t.source === state);
        
        if (stateTransitions.length === 0) {
            return `${state}: begin
                // No transitions defined for this state
            end`;
        }
        
        // 生成if-else if链
        let ifChain = '';
        stateTransitions.forEach(({source, target}, i) => {
            const sourceLower = source.toLowerCase();
            const targetLower = target.toLowerCase();
            
            if (i === 0) {
                ifChain += `if (trans_flags.${sourceLower}2${targetLower})
                next_state = ${target};`;
            } else {
                ifChain += `
            else if (trans_flags.${sourceLower}2${targetLower})
                next_state = ${target};`;
            }
        });
        
        return `${state}: begin
            ${ifChain}
        end`;
    }).join('\n        ');
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // 生成状态映射表
    const stateMapping = states.map((s, i) => `${i+1}: ${s}`).join('\n// ');
    
    // 生成转移关系描述
    const transitionDescription = transitions.map(t => 
        `${t.source} → ${t.target}`
    ).join('\n// ');
    
    return `

// State encoding definition 
typedef enum {
    ${enumDefinition}
} fsm_state;

// Packed struct definition (transition flags)
typedef struct packed {
    ${transitionFlags}
} fsm_transition_flags;

// State registers
fsm_state cur_state, next_state;
fsm_transition_flags trans_flags;

// State transition condition generation
always_comb begin : transition_condition_gen
    trans_flags = '{default:'0}; 
    
    unique case (cur_state)
        ${transitionLogic}
        default: trans_flags = '{default:'0};
    endcase
end

// State transition logic
always_comb begin : state_transition
    next_state = cur_state; 
    
    unique case (cur_state)
        ${stateTransition}
        default: next_state = ${states[0]}; 
    endcase
end

// State register (sequential logic)
always_ff @(posedge clk or negedge rst_n) begin : state_register
    if (!rst_n) begin
        cur_state <= ${states[0]}; // Reset initialization
    end else begin
        cur_state <= next_state; // State update
    end
end

`;
}

// 错误处理函数
function handleError(error: any) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    vscode.window.showErrorMessage(`Failed to generate state machine: ${errorMessage}`);
}

export function deactivate() {}