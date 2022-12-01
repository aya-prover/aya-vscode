/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Uri } from "vscode";

/** @see lsp/src/main/java/org/aya/lsp/models/HighlightResult.java */
export enum Kind {
  ModuleDef, FnDef, DataDef, StructDef, ConDef, FieldDef, PrimDef, GeneralizeDef,
  // expressions
  FnRef, DataRef, StructRef, ConRef, FieldRef, PrimRef, ModuleRef, GeneralizeRef,
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
  [Kind.FnRef, new vscode.ThemeColor("aya.color.FnRef")],
  [Kind.FnDef, new vscode.ThemeColor("aya.color.FnDef")],
  [Kind.PrimRef, new vscode.ThemeColor("aya.color.PrimRef")],
  [Kind.PrimDef, new vscode.ThemeColor("aya.color.PrimDef")],
  [Kind.DataRef, new vscode.ThemeColor("aya.color.DataRef")],
  [Kind.DataDef, new vscode.ThemeColor("aya.color.DataDef")],
  [Kind.StructRef, new vscode.ThemeColor("aya.color.StructRef")],
  [Kind.StructDef, new vscode.ThemeColor("aya.color.StructDef")],
  [Kind.ConRef, new vscode.ThemeColor("aya.color.ConRef")],
  [Kind.ConDef, new vscode.ThemeColor("aya.color.ConDef")],
  [Kind.FieldRef, new vscode.ThemeColor("aya.color.FieldRef")],
  [Kind.FieldDef, new vscode.ThemeColor("aya.color.FieldDef")],
  [Kind.ModuleRef, new vscode.ThemeColor("aya.color.ModuleRef")],
  [Kind.ModuleDef, new vscode.ThemeColor("aya.color.ModuleDef")],
  [Kind.GeneralizeRef, new vscode.ThemeColor("aya.color.GeneralizeRef")],
  [Kind.GeneralizeDef, new vscode.ThemeColor("aya.color.GeneralizeDef")],
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
