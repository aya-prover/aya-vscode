import * as fs from 'fs';
import * as net from "net";
import * as path from "path";
import * as vscode from 'vscode';
import * as child_process from "child_process";
import { LanguageClientOptions, RevealOutputChannelOn } from "vscode-languageclient";
import { LanguageClient, ServerOptions, StreamInfo } from "vscode-languageclient/node";
import * as hightlight from './highlight';

type Progress = vscode.Progress<{ message?: string; increment?: number }>;

let ayaStatusBar: vscode.StatusBarItem;

export async function startDaemon(context: vscode.ExtensionContext, lspExec: string, progress: Progress) {
  progress.report({ message: "Starting Aya", increment: 500 });
  const config = vscode.workspace.getConfiguration("aya");

  ayaStatusBar = vscode.window.createStatusBarItem();
  const outputChannel = vscode.window.createOutputChannel("Aya");
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine(`Aya Language Server: ${lspExec}`);

  let mode: string = config.get<string>("lsp.mode") ?? "client";
  let port: number = config.get<number>("lsp.port") ?? 11451;
  let host: string = config.get<string>("lsp.host") ?? "localhost";

  let serverOptions: ServerOptions;
  if (mode === "server") serverOptions = runServer(outputChannel, lspExec, host, port);
  else if (mode === "client") serverOptions = runClient(host, port);
  else serverOptions = runDebug(outputChannel, lspExec);

  let languageClient = createLanguageClient(serverOptions);
  let languageClientDisposable = languageClient.start();
  context.subscriptions.push(languageClientDisposable);

  context.subscriptions.push(vscode.commands.registerCommand("aya.lsp.command.restart", async () => {
    await languageClient.stop();
    languageClientDisposable.dispose();

    outputChannel.appendLine("");
    outputChannel.appendLine(" === Language Server Restart ===");
    outputChannel.appendLine("");

    languageClientDisposable = languageClient.start();
    context.subscriptions.push(languageClientDisposable);
  }));

  progress.report({ message: "Aya started", increment: 1500 });
  await languageClient.onReady();
  setupAyaSpecialFeatures(context, languageClient);
}

function runDebug(outputChannel: vscode.OutputChannel, lspExec: string): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const proc = spawnJava(outputChannel, lspExec, ["--mode", "debug", "--port", "0"]);
    proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
    proc.on("error", e => reject(e));
    proc.on("spawn", () => resolve(proc));
  });
}

function runServer(outputChannel: vscode.OutputChannel, lspExec: string, host: string, port: number): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const server = net.createServer(socket => {
      server.close();
      resolve({ reader: socket, writer: socket });
    });
    server.listen(port, host, () => {
      const tcpPort = (server.address() as net.AddressInfo).port.toString();
      spawnJava(outputChannel, lspExec, ["--mode", "client", "--port", tcpPort]);
    });
    server.on("error", e => reject(e));
  });
}

function spawnJava(outputChannel: vscode.OutputChannel, lspExec: string, args: string[]): child_process.ChildProcess {
  const proc = child_process.spawn(lspExec, args);

  const outputCallback = (data: any) => outputChannel.append(`${data}`);
  proc.stdout.on("data", outputCallback);
  proc.stderr.on("data", outputCallback);

  proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
  return proc;
}

function runClient(host: string, port: number): ServerOptions {
  return () => connectToPort(host, port);
}

function connectToPort(host: string, port: number): Promise<StreamInfo> {
  return new Promise((resolve, reject) => {
    let socket = net.connect(port, host);
    socket.on("error", e => reject(e));
    socket.on("connect", () => resolve({ reader: socket, writer: socket }));
  });
}

function createLanguageClient(serverOptions: ServerOptions): LanguageClient {
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'aya', scheme: 'file' },
    ],
    synchronize: {
      configurationSection: 'aya',
      fileEvents: [
        vscode.workspace.createFileSystemWatcher('**/*.aya'),
      ]
    },
    revealOutputChannelOn: RevealOutputChannelOn.Error
  };

  return new LanguageClient("aya", "Aya language client", serverOptions, clientOptions);
}

function setupAyaSpecialFeatures(context: vscode.ExtensionContext, client: LanguageClient) {
  context.subscriptions.push(vscode.commands.registerCommand("aya.lsp.command.load", async () => {
    if (!vscode.window.activeTextEditor) return;
    let editor = vscode.window.activeTextEditor;
    ayaStatusBar.text = `Loading ${editor.document.uri.path}`;
    ayaStatusBar.show();

    let uri = editor.document.uri.toString();
    editor.document.save();
    // TODO: make this request typed
    let result = client.sendRequest<hightlight.HighlightResult>("aya/load", uri);
    result.then(h => hightlight.applyHighlight(editor, h)).catch(console.log);
    ayaStatusBar.hide();
  }));
}

export async function findAya(context: vscode.ExtensionContext): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("aya");

  if (!config.get<boolean>("lsp.enabled")) {
    await vscode.window.showInformationMessage("Aya language server is disabled");
    return null;
  }

  let lspExec = config.get<string>("lsp.path");
  if (lspExec && fs.existsSync(lspExec)) {
    return lspExec;
  }

  const sysPath = process.env['PATH'];
  if (sysPath) {
    const pathParts = sysPath.split(path.delimiter);
    for (const pathPart of pathParts) {
      const binPath = path.join(pathPart, "aya-lsp");
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
  }

  await vscode.window.showWarningMessage("Cannot find aya language server");
  return null;
}

