/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Uri } from "vscode";

/** @see lsp/src/main/java/org/aya/lsp/models/HighlightResult.java */
export enum Kind {
  // definitions
  ModuleDef,
  FnDef,
  DataDef,
  StructDef,
  ConDef,
  FieldDef,
  PrimDef,
  // expressions
  Generalize,
  FnCall,
  DataCall,
  StructCall,
  ConCall,
  FieldCall,
  PrimCall,
}

export interface Symbol {
  range: vscode.Range,
  kind: Kind,
}

export interface HighlightResult {
  uri: string,
  symbols: Symbol[],
}

export type HighlightResponse = HighlightResult[];

const EMACS_COLORS = new Map<number, vscode.ThemeColor>([
  [Kind.FnCall, new vscode.ThemeColor("aya.color.FnCall")],
  [Kind.FnDef, new vscode.ThemeColor("aya.color.FnDef")],
  [Kind.PrimCall, new vscode.ThemeColor("aya.color.PrimCall")],
  [Kind.PrimDef, new vscode.ThemeColor("aya.color.PrimDef")],
  [Kind.DataCall, new vscode.ThemeColor("aya.color.DataCall")],
  [Kind.DataDef, new vscode.ThemeColor("aya.color.DataDef")],
  [Kind.StructCall, new vscode.ThemeColor("aya.color.StructCall")],
  [Kind.StructDef, new vscode.ThemeColor("aya.color.StructDef")],
  [Kind.ConCall, new vscode.ThemeColor("aya.color.ConCall")],
  [Kind.ConDef, new vscode.ThemeColor("aya.color.ConDef")],
  [Kind.FieldCall, new vscode.ThemeColor("aya.color.FieldCall")],
  [Kind.FieldDef, new vscode.ThemeColor("aya.color.FieldDef")],
]);

let highlights: HighlightResponse | null = null;
let decorations: Array<vscode.TextEditorDecorationType> = [];

function highlightSetter(editor: vscode.TextEditor, symbol: Symbol): () => void {
  const color = EMACS_COLORS.get(symbol.kind);
  return () => {
    const decorationType = vscode.window.createTextEditorDecorationType({
      color: color,
    });
    decorations.push(decorationType);
    editor.setDecorations(decorationType, [symbol.range]);
  };
}

export function removeHighlight(editor: vscode.TextEditor) {
  if (decorations.length !== 0) {
    // If rangesOrOptions is empty, the existing decorations with the given decoration type will be removed.
    // No way to remove all decorations? are you kidding me vscode?
    decorations.forEach(element => editor.setDecorations(element, []));
    decorations = [];
  }
}

export function applyHighlight(editor: vscode.TextEditor, res: HighlightResponse) {
  // I finally find the right way to re-apply highlights.
  removeHighlight(editor);
  highlights = res;
  highlight(editor);
}

export function highlight(editor: vscode.TextEditor) {
  const uri = editor.document.uri;
  findHighlight(uri)?.symbols.forEach(symbol => highlightSetter(editor, symbol)());
}

function findHighlight(uri: Uri): HighlightResult | undefined {
  return highlights?.find((a) => Uri.parse(a.uri).toString() === uri.toString());
}
