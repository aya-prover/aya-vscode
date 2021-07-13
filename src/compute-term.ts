/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

export interface ComputeTermResult {
  uri: string;
  computed: string;
  range: vscode.Range;
}

const deco = {
  borderStyle: "solid",
  borderColor: "#66f",
};

const decoCurrent = vscode.window.createTextEditorDecorationType(
  Object.assign({}, deco, { borderWidth: "0px 0px 1px 0px" })
);

export function applyComputedTerm(
  editor: vscode.TextEditor,
  r: ComputeTermResult
): any {
  console.log(JSON.stringify(r));
  if (editor.document.uri.toString() !== r.uri) return;

  editor.setDecorations(decoCurrent, [
    {
      range: r.range,
      hoverMessage: r.computed,
    },
  ]);

  editor.selection = new vscode.Selection(r.range.start, r.range.end);
}
