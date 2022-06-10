import * as vscode from 'vscode';
import * as daemon from './server-daemon';
import { AYA_SELECTOR } from "./constant";
import { UnicodeCompletionProvider } from "./unicode";

export async function activate(context: vscode.ExtensionContext) {
  const initTasks: PromiseLike<void>[] = [];

  initTasks.push(vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    cancellable: false,
    title: "Loading Aya library",
  }, async progress => {
    await daemon.startDaemon(context, progress);
    return new Promise(resolve => setTimeout(resolve, 5000));
  }));

  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
    AYA_SELECTOR,
    new UnicodeCompletionProvider(),
    "\\"
  ))

  await Promise.all(initTasks);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
