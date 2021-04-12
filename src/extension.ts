import * as vscode from 'vscode';
import * as daemon from './server-daemon';

export async function activate(context: vscode.ExtensionContext) {
  let lspJar = await daemon.findAya(context);
  if (lspJar === null) return;

  const initTasks: PromiseLike<void>[] = [];

  initTasks.push(vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    cancellable: false,
    title: "Loading Aya library",
  }, async progress => {
    await daemon.startDaemon(context, lspJar!, progress);
    return new Promise(resolve => setTimeout(resolve, 5000));
  }));

  await Promise.all(initTasks);
}

// this method is called when your extension is deactivated
export function deactivate() { }
