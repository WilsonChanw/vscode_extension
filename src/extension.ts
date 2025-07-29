import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register state machine generation command
    let disposable = vscode.commands.registerCommand('sv-statemachine.generate', async () => {
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
            
            // Generate state machine code
            const fsmCode = generateStateMachineCode(states);
            
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
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            vscode.window.showErrorMessage(`Failed to generate state machine: ${errorMessage}`);
        }
    });

    context.subscriptions.push(disposable);
}

function generateStateMachineCode(states: string[]): string {
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
            trans_flags.${currentLower}2${nextLower} = ...; // Add transition condition logic
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
    
    unique case (cur_state)  // unique enhances synthesis safety
        ${transitionLogic}
        default: trans_flags = '{default:'0};
    endcase
end

// State transition logic (combinational logic)
always_comb begin : state_transition
    next_state = cur_state; // Default: maintain current state
    
    unique case (cur_state)
        ${stateTransition}
        default: next_state = ${states[0]}; // Handle invalid states
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

export function deactivate() {}