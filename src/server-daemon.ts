import * as fs from 'fs';
import * as net from "net";
import * as path from "path";
import * as vscode from 'vscode';
import * as child_process from "child_process";
import * as features from './features';

import { LanguageClientOptions, RevealOutputChannelOn } from "vscode-languageclient";
import { LanguageClient, ServerOptions, StreamInfo } from "vscode-languageclient/node";

type Progress = vscode.Progress<{ message?: string; increment?: number }>;

export async function startDaemon(context: vscode.ExtensionContext, lspExec: string, progress: Progress) {
  progress.report({ message: "Starting Aya", increment: 500 });
  const config = vscode.workspace.getConfiguration("aya");

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
  features.setupAyaSpecialFeatures(context, languageClient);
}

function runDebug(outputChannel: vscode.OutputChannel, lspExec: string): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const proc = spawnJava(outputChannel, lspExec, ["--mode", "debug"]);
    proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
    proc.on("error", reject);
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
    server.on("error", reject);
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
      const binPath = path.join(pathPart, isWindows() ? "aya-lsp.bat" : "aya-lsp");
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
  }

  await vscode.window.showWarningMessage("Cannot find aya language server");
  return null;
}

export function isWindows(): boolean {
  return process.platform === "win32";
}
