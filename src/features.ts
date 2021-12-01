import * as vscode from 'vscode';
import { LanguageClient } from "vscode-languageclient/node";

import * as highlight from './highlight';
import * as compute from './compute-term';

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

  context.subscriptions.push(vscode.commands.registerCommand("aya.lsp.command.load", jsonRequest(
    "aya/load",
    (editor) => editor.document.uri.toString(),
    highlight.applyHighlight,
  )));

  context.subscriptions.push(vscode.commands.registerCommand("aya.lsp.command.compute-type", jsonRequest(
    "aya/computeType",
    (editor) => ({
      uri: editor.document.uri.toString(),
      position: editor.selection.active,
    }),
    compute.applyComputedTerm,
  )));

  context.subscriptions.push(vscode.commands.registerCommand("aya.lsp.command.compute-nf", jsonRequest(
    "aya/computeNF",
    (editor) => ({
      uri: editor.document.uri.toString(),
      position: editor.selection.active,
    }),
    compute.applyComputedTerm,
  )));

  vscode.window.onDidChangeActiveTextEditor(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    highlight.highlight(editor);
  });

  // FIXME: workaround of https://github.com/aya-prover/aya-vscode/issues/15
  vscode.workspace.onDidChangeTextDocument(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    highlight.removeHighlight(editor);
  });
}
