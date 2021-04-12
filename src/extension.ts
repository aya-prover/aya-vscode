import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('aya.lsp.command.restart', () => {
    
  }));
}

// this method is called when your extension is deactivated
export function deactivate() { }
