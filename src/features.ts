import * as vscode from 'vscode';
import { LanguageClient } from "vscode-languageclient/node";
import * as highlight from './highlight';
import * as compute from './compute-term';

export const AYA_CMD_LOAD: string = "aya.lsp.command.load";
export const AYA_CMD_COMPUTE_TYPE: string = "aya.lsp.command.compute-type";
export const AYA_CMD_COMPUTE_TYPE_NF: string = "aya.lsp.command.compute-type-nf";

export function recompile() {
  vscode.commands.executeCommand(AYA_CMD_LOAD);
}

export function setupAyaSpecialFeatures(context: vscode.ExtensionContext, client: LanguageClient) {
  type ActionHandler = (_: vscode.TextEditor) => void;

  const newAction = (fn: ActionHandler) => async () => {
    if (!vscode.window.activeTextEditor) return;
    let editor = vscode.window.activeTextEditor;
    editor.document.save();
    fn(editor);
  };

  type ParamBuilder = (_: vscode.TextEditor) => any;
  type ResultHandler<ResultType> = (_: vscode.TextEditor, result: ResultType) => void;

  const jsonRequest = <ResultType>(method: string, paramBuilder: ParamBuilder, resultHandler: ResultHandler<ResultType>) => newAction(
    (editor) => client.sendRequest<ResultType>(method, paramBuilder(editor)).then(result => resultHandler(editor, result)).catch(console.log)
  );

  context.subscriptions.push(vscode.commands.registerCommand(AYA_CMD_LOAD, jsonRequest(
    "aya/load",
    (editor) => editor.document.uri.toString(),
    highlight.applyHighlight,
  )));

  context.subscriptions.push(vscode.commands.registerCommand(AYA_CMD_COMPUTE_TYPE, jsonRequest(
    "aya/computeType",
    (editor) => ({
      uri: editor.document.uri.toString(),
      position: editor.selection.active,
    }),
    compute.applyComputedTerm,
  )));

  context.subscriptions.push(vscode.commands.registerCommand(AYA_CMD_COMPUTE_TYPE_NF, jsonRequest(
    "aya/computeTypeNF",
    (editor) => ({
      uri: editor.document.uri.toString(),
      position: editor.selection.active,
    }),
    compute.applyComputedTerm,
  )));

  vscode.window.onDidChangeActiveTextEditor(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    console.log("Tab change");
    highlight.highlight(editor);
  });

  // FIXME: workaround of https://github.com/aya-prover/aya-vscode/issues/15
  vscode.workspace.onDidChangeTextDocument((e) => {
    console.log(e);
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    // VSC seems to trigger this event when the log is printed. Stop it!
    if (editor.document.uri.toString() !== e.document.uri.toString()) return;
    if (e.contentChanges.length === 0) return;
    console.log("Document content change");
    // Now it's safe to remove the highlight
    highlight.removeHighlight(editor);
  });
}
