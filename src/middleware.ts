import { Middleware, ResolveCodeLensSignature } from "vscode-languageclient";
import * as vscode from "vscode";

export class AyaMiddleware implements Middleware {
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken,
    next: ResolveCodeLensSignature
  ): vscode.ProviderResult<vscode.CodeLens> {
    // see: https://github.com/microsoft/vscode-languageserver-node/issues/495
    const javaResolved = next(codeLens, token);
    if ((javaResolved as Thenable<vscode.CodeLens>).then)
      return (javaResolved as Thenable<vscode.CodeLens>).then(fixCodeLens);
    else if (javaResolved as vscode.CodeLens)
      return fixCodeLens(javaResolved as vscode.CodeLens);
    else return javaResolved;
  }
}

function fixCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
  if (codeLens.command?.command === "editor.action.showReferences") {
    const [javaUri, javaRange, usages] = codeLens.command.arguments!;
    codeLens.command.arguments = [
      vscode.Uri.parse(javaUri),
      new vscode.Position(javaRange.line, javaRange.character),
      usages.map((loc: { uri: string, range: vscode.Range }) => new vscode.Location(
        vscode.Uri.parse(loc.uri.toString()),
        new vscode.Range(
          loc.range.start.line,
          loc.range.start.character,
          loc.range.end.line,
          loc.range.end.character)
      )),
    ];
  }

  return codeLens;
}
