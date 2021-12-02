/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import {Uri} from "vscode";

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

/**
 * All possible token types from Aya language server
 */
const TOKEN_TYPES = [
  "namespace", // ModuleDef
  "function",  // FnDef, PrimDef
  "enum",      // DataDef
  "struct",    // StructDef
  "property",  // FieldDef, ConDef
];
const TOKEN_MODIFIERS = [
  "definition",      // All defs
  "defaultLibrary",  // PrimDef
];

const EMACS_COLORS = new Map<number, string>([
  [Kind.FnCall, "#005DAC"],
  [Kind.FnDef, "#005DAC"],
  [Kind.PrimCall, "#005DAC"],
  [Kind.PrimDef, "#005DAC"],
  [Kind.DataCall, "#218C21"],
  [Kind.DataDef, "#218C21"],
  [Kind.StructCall, "#218C21"],
  [Kind.StructDef, "#218C21"],
  [Kind.ConCall, "#A021EF"],
  [Kind.ConDef, "#A021EF"],
  [Kind.FieldCall, "#A021EF"],
  [Kind.FieldDef, "#A021EF"],
]);

let highlights : HighlightResponse | null = null;
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

function findHighlight(uri: Uri) : HighlightResult | undefined {
  return highlights?.find((a) => Uri.parse(a.uri).toString() === uri.toString());
}
