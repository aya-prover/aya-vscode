import * as fs from 'fs';
import * as net from "net";
import * as vscode from 'vscode';
import * as child_process from "child_process";
import { LanguageClientOptions, RevealOutputChannelOn } from "vscode-languageclient";
import { LanguageClient, ServerOptions, StreamInfo } from "vscode-languageclient/node";
import * as hightlight from './highlight';
import { ChildProcess } from 'node:child_process';

type Progress = vscode.Progress<{ message?: string; increment?: number }>;

export async function startDaemon(context: vscode.ExtensionContext, lspJar: string, progress: Progress) {
  progress.report({ message: "Starting Aya", increment: 500 });
  const config = vscode.workspace.getConfiguration("aya");

  const outputChannel = vscode.window.createOutputChannel("Aya");
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine(`Aya Language Server: ${lspJar}`);

  let mode: string = config.get<string>("lsp.mode") ?? "client";
  let port: number = config.get<number>("lsp.port") ?? 11451;
  let host: string = config.get<string>("lsp.host") ?? "localhost";

  let serverOptions: ServerOptions;
  if (mode === "server") serverOptions = runServer(context, outputChannel, lspJar, host, port);
  else if (mode === "client") serverOptions = runClient(host, port);
  else serverOptions = runDebug(context, outputChannel, lspJar);

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

  progress.report({ message: "Waiting for typechecking...", increment: 1500 });
  await languageClient.onReady();
  setupAyaSpecialFeatures(languageClient);
}

function runDebug(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel, lspJar: string): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const proc = spawnJava(outputChannel, lspJar, ["--mode", "debug", "--port", "0"]);
    proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
    proc.on("error", e => reject(e));
    proc.on("spawn", () => resolve(proc));
  });
}

function runServer(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel, lspJar: string, host: string, port: number): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const server = net.createServer(socket => {
      server.close();
      resolve({ reader: socket, writer: socket });
    });
    server.listen(port, host, () => {
      const tcpPort = (server.address() as net.AddressInfo).port.toString();
      spawnJava(outputChannel, lspJar, ["--mode", "client", "--port", tcpPort]);
    });
    server.on("error", e => reject(e));
  });
}

function spawnJava(outputChannel: vscode.OutputChannel, jar: string, args: string[]): ChildProcess {
  const proc = child_process.spawn("java", ["--enable-preview", "-jar", jar].concat(args));

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

function setupAyaSpecialFeatures(client: LanguageClient) {
  client.onNotification("aya/publishSyntaxHighlight", (param: hightlight.SyntaxHighlightParams) => {
    hightlight.applyHighlight(param);
  });
}

export async function findAya(context: vscode.ExtensionContext): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("aya");

  if (!config.get<boolean>("lsp.enabled")) {
    const message = "Aya language server is disabled";
    await vscode.window.showInformationMessage(message);
    return null;
  }

  let lspJar = config.get<string>("lsp.path");
  if (lspJar && fs.existsSync(lspJar)) {
    return lspJar;
  }

  await vscode.window.showWarningMessage("Cannot find language server jar");
  return null;
}

