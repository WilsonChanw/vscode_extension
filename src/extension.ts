import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register Fast State Machine Generation Command
    const fastDisposable = vscode.commands.registerCommand('sv-statemachine.generate', async () => {
        try {
            // Get state names from user
            const stateInput = await vscode.window.showInputBox({
                prompt: 'Enter state names (separated by semicolon; e.g., IDLE;CONDITION;FSM_END)',
                placeHolder: 'Example: RESET;IDLE;PROCESS;FINISH',
                validateInput: value => {
                    if (!value || value.trim() === '') {
                        return 'Please enter at least two state names';
                    }
                    
                    const states = value.split(';').map(s => s.trim()).filter(s => s !== '');
                    
                    if (states.length < 2) {
                        return 'Please enter at least two state names';
                    }
                    
                    // Validate state names
                    const invalidNames = states.filter(name => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name));
                    if (invalidNames.length > 0) {
                        return `Invalid state names: ${invalidNames.join(', ')}`;
                    }
                    
                    return null;
                }
            });
            
            // User canceled input
            if (!stateInput) return;
            
            // Parse state names
            const states = stateInput.split(';')
                .map(state => state.trim())
                .filter(state => state !== '');
            
            // Generate state machine code (Fast Mode)
            const fsmCode = generateFastStateMachineCode(states);
            
            // Get active editor
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
                // Insert code at current position
                await editor.edit(editBuilder => {
                    const position = editor.selection.active;
                    editBuilder.insert(position, fsmCode);
                });
                vscode.window.showInformationMessage('State machine code inserted');
            } else {
                // Create new document if no active editor
                const doc = await vscode.workspace.openTextDocument({
                    content: fsmCode,
                    language: 'systemverilog'
                });
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage('State machine code generated');
            }
        } catch (error: any) {
            handleError(error);
        }
    });

    // Register Advanced State Machine Generation Command
    const advancedDisposable = vscode.commands.registerCommand('sv-statemachine.generate-advanced', async () => {
        try {
            // Get state names from user
            const stateInput = await vscode.window.showInputBox({
                prompt: 'Enter state names (separated by semicolon; e.g., IDLE;CON1;FSM_END)',
                validateInput: value => {
                    if (!value || value.trim() === '') {
                        return 'Please enter at least two state names';
                    }
                    
                    const states = value.split(';').map(s => s.trim()).filter(s => s !== '');
                    
                    if (states.length < 2) {
                        return 'Please enter at least two state names';
                    }
                    
                    // Validate state names
                    const invalidNames = states.filter(name => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name));
                    if (invalidNames.length > 0) {
                        return `Invalid state names: ${invalidNames.join(', ')}`;
                    }
                    
                    return null;
                }
            });
            
            // User canceled input
            if (!stateInput) return;
            
            // Parse state names
            const states = stateInput.split(';')
                .map(state => state.trim())
                .filter(state => state !== '');
            
            // Show state mapping
            const stateMap = states.map((s, i) => `${i+1} = ${s}`).join(', ');
            vscode.window.showInformationMessage(`State mapping: ${stateMap}`);
            
            // Get transition definitions
            const transitionInput = await vscode.window.showInputBox({
                prompt: `Define state transitions (format: source-target; state numbers: ${stateMap})`,
                placeHolder: 'Example: 1-2;2-3;2-1;3-1',
                validateInput: value => validateTransitionInput(value, states.length)
            });
            
            if (!transitionInput) return;
            
            const transitions = parseTransitions(transitionInput, states);
            
            // Generate advanced state machine code
            const code = generateAdvancedStateMachineCode(states, transitions);
            
            // Get active editor
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
                // Insert code at current position
                await editor.edit(editBuilder => {
                    const position = editor.selection.active;
                    editBuilder.insert(position, code);
                });
                vscode.window.showInformationMessage('Advanced state machine code inserted');
            } else {
                // Create new document if no active editor
                const doc = await vscode.workspace.openTextDocument({
                    content: code,
                    language: 'systemverilog'
                });
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage('Advanced state machine code generated');
            }
        } catch (error: any) {
            handleError(error);
        }
    });

    context.subscriptions.push(fastDisposable, advancedDisposable);
}

// ========================
// Fast Mode State Machine Generation
// ========================
function generateFastStateMachineCode(states: string[]): string {
    // Generate state enumeration definition
    const enumDefinition = states.join(',\n    ');
    
    // Generate transition flags
    const transitionFlags = states.map((state, index) => {
        const nextIndex = (index + 1) % states.length;
        const currentLower = state.toLowerCase();
        const nextLower = states[nextIndex].toLowerCase();
        return `logic ${currentLower}2${nextLower};`;
    }).join('\n    ');
    
    // Generate transition condition logic
    const transitionLogic = states.map((state, index) => {
        const nextIndex = (index + 1) % states.length;
        const currentLower = state.toLowerCase();
        const nextLower = states[nextIndex].toLowerCase();
        return `${state}: begin
            trans_flags.${currentLower}2${nextLower} = ...; 
        end`;
    }).join('\n        ');
    
    // Generate state transition logic
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
    
    let code = `

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

    return code;
}

// ========================
// Advanced Mode Helper Functions
// ========================

// Validate transition input
function validateTransitionInput(value: string, stateCount: number): string | null {
    if (!value || value.trim() === '') return 'Please enter at least one transition';
    
    const transitions = value.split(';').map(t => t.trim()).filter(t => t !== '');
    
    for (const trans of transitions) {
        // Support multi-digit state numbers
        if (!/^\d+\-\d+$/.test(trans)) {
            return `Invalid transition format: ${trans}. Use format: source-target`;
        }
        
        const [sourceStr, targetStr] = trans.split('-');
        const source = parseInt(sourceStr);
        const target = parseInt(targetStr);
        
        if (isNaN(source) || isNaN(target)) {
            return `Invalid state number: ${trans}. Must be numeric`;
        }
        
        if (source < 1 || source > stateCount || target < 1 || target > stateCount) {
            return `Invalid state number: ${trans}. Valid range: 1-${stateCount}`;
        }
    }
    
    return null;
}

// Parse transitions
function parseTransitions(input: string, states: string[]): {source: number, target: number}[] {
    return input.split(';')
        .map(t => t.trim())
        .filter(t => t !== '')
        .map(t => {
            const [sourceStr, targetStr] = t.split('-');
            const source = parseInt(sourceStr);
            const target = parseInt(targetStr);
            return {source, target};
        });
}

// ========================
// Advanced Mode State Machine Generation
// ========================
function generateAdvancedStateMachineCode(
    states: string[],
    transitions: {source: number, target: number}[]
): string {
    // Generate state enumeration definition
    const enumDefinition = states.join(',\n    ');
    
    // Generate transition flags
    const transitionFlags = transitions.map(({source, target}) => {
        const sourceState = states[source - 1];
        const targetState = states[target - 1];
        const sourceLower = sourceState.toLowerCase();
        const targetLower = targetState.toLowerCase();
        return `logic ${sourceLower}2${targetLower};`;
    }).join('\n    ');
    
    // Generate transition condition logic
    const transitionLogic = states.map((state, index) => {
        const stateIndex = index + 1;
        const stateTransitions = transitions.filter(t => t.source === stateIndex);
        
        if (stateTransitions.length === 0) {
            return `${state}: begin
                // No transitions defined for this state
            end`;
        }
        
        return `${state}: begin
            ${stateTransitions.map(({source, target}) => {
                const sourceState = states[source - 1];
                const targetState = states[target - 1];
                const sourceLower = sourceState.toLowerCase();
                const targetLower = targetState.toLowerCase();
                return `trans_flags.${sourceLower}2${targetLower} = ...; `;
            }).join('\n            ')}
        end`;
    }).join('\n        ');
    
    // Generate state transition logic (using if-else if structure)
    const stateTransition = states.map((state, index) => {
        const stateIndex = index + 1;
        const stateTransitions = transitions.filter(t => t.source === stateIndex);
        
        if (stateTransitions.length === 0) {
            return `${state}: begin
                // No transitions defined for this state
            end`;
        }
        
        // Generate if-else if chain
        let ifChain = '';
        stateTransitions.forEach(({source, target}, i) => {
            const sourceState = states[source - 1];
            const targetState = states[target - 1];
            const sourceLower = sourceState.toLowerCase();
            const targetLower = targetState.toLowerCase();
            
            if (i === 0) {
                ifChain += `if (trans_flags.${sourceLower}2${targetLower})
                next_state = ${targetState};`;
            } else {
                ifChain += `
            else if (trans_flags.${sourceLower}2${targetLower})
                next_state = ${targetState};`;
            }
        });
        
        return `${state}: begin
            ${ifChain}
        end`;
    }).join('\n        ');
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // Generate state mapping table
    const stateMapping = states.map((s, i) => `${i+1}: ${s}`).join('\n// ');
    
    return `

// State encoding definition 
typedef enum {
    ${enumDefinition}
} fsm_state;

// Packed struct definition 
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

// State register 
always_ff @(posedge clk or negedge rst_n) begin : state_register
    if (!rst_n) begin
        cur_state <= ${states[0]}; // Reset initialization
    end else begin
        cur_state <= next_state; // State update
    end
end


`;
}

// Error handling function
function handleError(error: any) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    vscode.window.showErrorMessage(`Operation failed: ${errorMessage}`);
}

export function deactivate() {}