/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

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
  Param,
  Operator,
  FnCall,
  DataCall,
  StructCall,
  ConCall,
  FieldCall,
  PrimCall,
};

export interface Symbol {
  range: vscode.Range,
  kind: Kind,
};

export interface HighlightResult {
  uri: string,
  symbols: Symbol[],
};

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
  "defaultLibrary"   // PrimDef
];

interface Token {
  tokenType: string,
  tokenModifiers: string[],
};

function tokenFor(kind: Kind): Token | null {
  let make = (type: string, mods: string[]): Token => ({ tokenType: type, tokenModifiers: mods });
  switch (kind) {
    case Kind.ModuleDef: return make("namespace", ["definition"]);
    case Kind.Operator: return make("function", ["definition"]);
    
    case Kind.FnDef: return make("function", ["definition"]);
    case Kind.DataDef: return make("enum", ["definition"]);
    case Kind.StructDef: return make("struct", ["definition"]);
    case Kind.ConDef: return make("property", ["definition"]);
    case Kind.FieldDef: return make("property", ["definition"]);
    case Kind.PrimDef: return make("function", ["definition", "defaultLibrary"]);
    
    case Kind.FnCall: return make("function", ["definition"]);
    case Kind.DataCall: return make("enum", ["definition"]);
    case Kind.StructCall: return make("struct", ["definition"]);
    case Kind.ConCall: return make("property", ["definition"]);
    case Kind.FieldCall: return make("property", ["definition"]);
    case Kind.PrimCall: return make("function", ["definition", "defaultLibrary"]);
  }
  return null;
}

function buildTokens(builder: vscode.SemanticTokensBuilder, symbols: Symbol[]) {
  symbols.forEach(symbol => {
    let token = tokenFor(symbol.kind);
    if (token !== null) {
      builder.push(symbol.range, token.tokenType, token.tokenModifiers);
    }
  });
}

var lastHighlight: vscode.Disposable | null = null;

export function applyHighlight(param: HighlightResult) {
  const selector = { language: "aya", scheme: "file" };
  const legend = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

  const provider: vscode.DocumentSemanticTokensProvider = {
    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
      const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
      if (document.uri.toString() === param.uri) {
        buildTokens(tokensBuilder, param.symbols);
      }
      return tokensBuilder.build();
    }
  };

  if (lastHighlight !== null) lastHighlight.dispose();
  lastHighlight = vscode.languages.registerDocumentSemanticTokensProvider(selector, provider, legend);
}
