/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

export interface ComputeTypeResult {
  uri: string,
  computedType: string,
  range: vscode.Range,
}

const deco = {
  borderStyle: 'solid',
  borderColor: '#66f'
};

const decoCurrent = vscode.window.createTextEditorDecorationType(
  Object.assign({}, deco, { borderWidth: '0px 0px 1px 0px' }));

export function applyComputedType(editor: vscode.TextEditor, r: ComputeTypeResult): any {
  console.log(JSON.stringify(r));
  if (editor.document.uri.toString() !== r.uri) return;

  editor.setDecorations(decoCurrent, [{
    range: r.range,
    hoverMessage: r.computedType
  }]);

  editor.selection = new vscode.Selection(r.range.start, r.range.end);
}
