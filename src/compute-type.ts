/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

export interface ComputeTypeResult {
  uri: string,
  computedType: string,
  range: vscode.Range,
}

export function applyComputedType(editor: vscode.TextEditor, r: ComputeTypeResult): any {
  console.log(JSON.stringify(r));
  if (editor.document.uri.toString() !== r.uri) return;

  const deco = {
    borderStyle: 'solid',
    borderColor: '#66f'
  };
  const decoCurrent = vscode.window.createTextEditorDecorationType(
    Object.assign({}, deco, { borderWidth: '0px 0px 1px 0px' }));

  editor.setDecorations(decoCurrent, [{
    range: r.range,
    hoverMessage: r.computedType
  }]);
}
