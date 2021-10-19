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
  if (mode === "server") serverOptions = runServer(outputChannel, lspLoadPath, host, port);
  else if (mode === "client") serverOptions = runClient(host, port);
  else serverOptions = runDebug(outputChannel, lspLoadPath);

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

function runDebug(outputChannel: vscode.OutputChannel, lspLoadPath: string): ServerOptions {
  return () => new Promise(async (resolve, reject) => {
    const proc = spawnLsp(outputChannel, lspLoadPath, ["--mode", "debug"]);
    proc.on("error", reject);
    proc.on("spawn", () => resolve(proc));
  });
}

function runServer(outputChannel: vscode.OutputChannel, lspLoadPath: string, host: string, port: number): ServerOptions {
  return () => new Promise((resolve, reject) => {
    const server = net.createServer(socket => {
      server.close();
      resolve({ reader: socket, writer: socket });
    });
    server.listen(port, host, async () => {
      const tcpPort = (server.address() as net.AddressInfo).port.toString();
      spawnLsp(outputChannel, lspLoadPath, ["--mode", "client", "--port", tcpPort]);
    });
    server.on("error", reject);
  });
}

function spawnLsp(outputChannel: vscode.OutputChannel, lspLoadPath: string, lspArgs: Array<string>): child_process.ChildProcess {
  const exec = buildExec(lspLoadPath).concat(lspArgs);
  outputChannel.appendLine(exec.join(" "));
  const proc = child_process.spawn(exec[0], exec.slice(1));
  const outputCallback = (data: any) => outputChannel.append(`${data}`);
  proc.stdout.on("data", outputCallback);
  proc.stderr.on("data", outputCallback);
  proc.on("exit", (code, sig) => outputChannel.appendLine(`The language server exited with ${code} (${sig})`));
  return proc;
}

function buildExec(lspLoadPath: string): Array<string> {
  const extname = path.extname(lspLoadPath);
  if (extname === ".jar") return [findJavaExecutable("java"), "--enable-preview", "-jar", lspLoadPath];
  else return [lspLoadPath];
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
