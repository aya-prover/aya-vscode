import * as vscode from 'vscode';
import {
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionList,
  Position,
  ProviderResult,
  TextDocument
} from 'vscode';

export class UnicodeCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): ProviderResult<CompletionItem[] | CompletionList> {
    // TODO: parse symbol input like agda-mode
    return undefined;
  }
}
