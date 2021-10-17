import * as fs from "fs";
import * as vscode from "vscode";
import * as path from "path";
import * as os_utils from './os-utils';


export async function findAya(context: vscode.ExtensionContext): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("aya");

  if (!config.get<boolean>("lsp.enabled")) {
    await vscode.window.showInformationMessage("Aya language server is disabled");
    return null;
  }

  let lspLoadPath = config.get<string>("lsp.path");
  if (lspLoadPath && await os_utils.fsExists(lspLoadPath)) {
    return lspLoadPath;
  }

  const sysPath = process.env['PATH'];
  if (sysPath) {
    const pathParts = sysPath.split(path.delimiter);
    for (const pathPart of pathParts) {
      const binPath = path.join(pathPart, os_utils.isWindows() ? "aya-lsp.bat" : "aya-lsp");
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
  }

  await vscode.window.showWarningMessage("Cannot find aya language server");
  return null;
}

export async function findJavaExecutable(rawBinName: string): Promise<string> {
  const binName = os_utils.correctBinName(rawBinName);

  // First search java.home setting
  const userJavaHome = vscode.workspace.getConfiguration('java').get('home') as string;

  if (userJavaHome) {
    let candidate = await findJavaExecutableInJavaHome(userJavaHome, binName);
    if (candidate)
      return candidate;
  }

  // Then search each JAVA_HOME
  const envJavaHome = process.env['JAVA_HOME'];

  if (envJavaHome) {
    const candidate = await findJavaExecutableInJavaHome(envJavaHome, binName);
    if (candidate)
      return candidate;
  }

  const sysPath = process.env['PATH'];
  // Then search PATH parts
  if (sysPath) {
    const pathParts = sysPath.split(path.delimiter);
    for (const pathPart of pathParts) {
      const binPath = path.join(pathPart, binName);
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
  }

  return binName;
}

async function findJavaExecutableInJavaHome(javaHome: string, binName: string): Promise<string | null> {
  const workspaces = javaHome.split(path.delimiter);

  for (const workspace of workspaces) {
    const binPath = path.join(workspace, 'bin', binName);

    if (await os_utils.fsExists(binPath))
      return binPath;
  }
  return null;
}
