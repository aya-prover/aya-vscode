import * as net from "net";
import * as vscode from 'vscode';
import * as path from "path";
import * as child_process from "child_process";
import * as features from './features';


import { LanguageClientOptions, RevealOutputChannelOn } from "vscode-languageclient";
import { LanguageClient, ServerOptions, StreamInfo } from "vscode-languageclient/node";
import { findJavaExecutable } from "./find";

type Progress = vscode.Progress<{ message?: string; increment?: number }>;

export async function startDaemon(context: vscode.ExtensionContext, lspLoadPath: string, progress: Progress) {
  progress.report({ message: "Starting Aya", increment: 500 });
  const config = vscode.workspace.getConfiguration("aya");

  const outputChannel = vscode.window.createOutputChannel("Aya");
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine(`Aya Language Server: ${lspLoadPath}`);

  let mode: string = config.get<string>("lsp.mode") ?? "client";
  let port: number = config.get<number>("lsp.port") ?? 11451;
  let host: string = config.get<string>("lsp.host") ?? "localhost";

  let serverOptions: ServerOptions;
  let extname = path.extname(lspLoadPath);
  if (extname === ".jar") {
    let javaPath = await findJavaExecutable("java");
    if (mode === "server") serverOptions = runServerFatJar(outputChannel, lspLoadPath, host, port, javaPath);
    else if (mode === "client") serverOptions = runClient(host, port);
    else serverOptions = runDebugFatJar(outputChannel, lspLoadPath, javaPath);
  } else {
    if (mode === "server") serverOptions = runServer(outputChannel, lspLoadPath, host, port);
    else if (mode === "client") serverOptions = runClient(host, port);
    else serverOptions = runDebug(outputChannel, lspLoadPath);
  }

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

function runDebugFatJar(outputChannel: vscode.OutputChannel, lspLoadPath: string, javaPath: string): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const proc = spawnJava(outputChannel, lspLoadPath, ["--enable-preview", "-jar", "--mode", "debug"], javaPath);
    proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
    proc.on("error", reject);
    proc.on("spawn", () => resolve(proc));
  });
}

function runDebug(outputChannel: vscode.OutputChannel, lspLoadPath: string): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const proc = spawnJava(outputChannel, lspLoadPath, ["--mode", "debug"]);
    proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
    proc.on("error", reject);
    proc.on("spawn", () => resolve(proc));
  });
}

function runServerFatJar(outputChannel: vscode.OutputChannel, lspLoadPath: string, host: string, port: number, javaPath: string): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const server = net.createServer(socket => {
      server.close();
      resolve({ reader: socket, writer: socket });
    });
    server.listen(port, host, () => {
      const tcpPort = (server.address() as net.AddressInfo).port.toString();
      spawnJava(outputChannel, lspLoadPath, ["--enable-preview", "-jar", "--mode", "client", "--port", tcpPort], javaPath);
    });
    server.on("error", reject);
  });
}

function runServer(outputChannel: vscode.OutputChannel, lspLoadPath: string, host: string, port: number): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const server = net.createServer(socket => {
      server.close();
      resolve({ reader: socket, writer: socket });
    });
    server.listen(port, host, () => {
      const tcpPort = (server.address() as net.AddressInfo).port.toString();
      spawnJava(outputChannel, lspLoadPath, ["--mode", "client", "--port", tcpPort]);
    });
    server.on("error", reject);
  });
}

function spawnJava(outputChannel: vscode.OutputChannel, lspLoadPath: string, args: string[]): child_process.ChildProcess;
function spawnJava(outputChannel: vscode.OutputChannel, lspLoadPath: string, args: string[], javaPath: string): child_process.ChildProcess;
function spawnJava(outputChannel: vscode.OutputChannel, lspLoadPath: string, args: string[], javaPath?: string): child_process.ChildProcess {
  if (javaPath === undefined) {
    const proc = child_process.spawn(lspLoadPath, args);

    const outputCallback = (data: any) => outputChannel.append(`${data}`);
    proc.stdout.on("data", outputCallback);
    proc.stderr.on("data", outputCallback);

    proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
    return proc;
  }
  args.splice(2, 0, lspLoadPath);

  const proc = child_process.spawn(javaPath, args);

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
