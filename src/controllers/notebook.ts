import * as vscode from 'vscode';

export class NotebookController {

  private notebookUri?: vscode.Uri;
  constructor(notebookUri?: vscode.Uri) {
    this.notebookUri = notebookUri;
  }

  public getNotebookUri(): vscode.Uri | undefined {
    return this.notebookUri;
  }
  
  static createNotebookCell(source = '', language = 'python'): vscode.NotebookCellData {
    return new vscode.NotebookCellData(vscode.NotebookCellKind.Code, source, language);
  }
  
  public createNotebookData(cells: vscode.NotebookCellData[], source = '', language = 'python'): vscode.NotebookData {
    const data = new vscode.NotebookData(cells);
    data.metadata = {
      custom: {
        cells: [],
        metadata: {
          orig_nbformat: 2
        },
        nbformat: 4,
        nbformat_minor: 2
      }
    };
    return data;
  }
  
  public async createNotebook(cells: vscode.NotebookCellData[], source = '', language = 'python'): Promise<void> {
    if (!this.notebookUri || !vscode.window.activeNotebookEditor) {
      throw new Error("No active notebook");
    }
    const data = new vscode.NotebookData(cells);
    data.metadata = {
      custom: {
        cells: [],
        metadata: {
          orig_nbformat: 2
        },
        nbformat: 4,
        nbformat_minor: 2
      }
    };
    await vscode.workspace.fs.writeFile(this.notebookUri, new TextEncoder().encode(JSON.stringify(data)));
  }
  
  async insertNotebookCells(index: number, cellDatas: vscode.NotebookCellData[]) {
    return new Promise((resolve, _reject) => {
      const currentNotebook = vscode.window.activeNotebookEditor?.notebook;
      if (currentNotebook) {
        const edit = new vscode.WorkspaceEdit();
        edit.set(currentNotebook.uri, [vscode.NotebookEdit.insertCells(index, cellDatas)]);
        resolve(vscode.workspace.applyEdit(edit).then(() => {
          vscode.window.showInformationMessage('Cell fixed successfully');
        }))
      } else {
        vscode.window.showInformationMessage('No active notebook');
      }
    });
  }
  
  async replaceNotebookCells(range: any, cellDatas: vscode.NotebookCellData[]) {
    return new Promise((resolve, _reject) => {
      const currentNotebook = vscode.window.activeNotebookEditor?.notebook;
      if (currentNotebook) {
        const edit = new vscode.WorkspaceEdit();
        edit.set(currentNotebook.uri, [vscode.NotebookEdit.replaceCells(range, cellDatas)]);
        resolve(vscode.workspace.applyEdit(edit).then(() => {
          vscode.window.showInformationMessage('Cell fixed successfully');
        }))
      } else {
        vscode.window.showInformationMessage('No active notebook');
      }
    });
  }
  
  static getNotebookSourceWithErrors(): any {
    if (!vscode.window.activeNotebookEditor) {
      throw new Error("No active notebook");
    }
    const cells: any[] = [];
    const notebook = vscode.window.activeNotebookEditor.notebook;
    (notebook.getCells().map((cell: any) => {
      const cellContent = cell.document.getText();
      cells.push(cellContent);
      for (let output of cell.outputs) {
        if (output.metadata?.outputType === 'error') {
          cells.push(output.metadata.originalError.traceback.join('\n'))
        }
      }
    }));
    return cells.join('\n');
  }

  getNotebookCellWithErrors(): any {
    const cell = NotebookController.cell();
    if (!vscode.window.activeNotebookEditor || !cell) {
      throw new Error("No active notebook");
    }
    const cells: any[] = [];
    const cellContent = cell.document.getText();
    cells.push(cellContent);
    for (let output of cell.outputs) {
      if (output.metadata?.outputType === 'error') {
        cells.push(output.metadata.originalError.traceback.join('\n'))
      }
    }
    return cells.join('\n');
  }

  static get(): NotebookController {
    if (!vscode.window.activeNotebookEditor) {
      throw new Error("No active notebook");
    }
    const notebookUri = vscode.window.activeNotebookEditor.notebook.uri;
    return new NotebookController(notebookUri);
  }

  static cellText(): string {
    if (vscode.window.activeNotebookEditor) {
      const selectedCells = vscode.window.activeNotebookEditor.selections;
      if (selectedCells.length > 0) {
        const firstSelectedCell = selectedCells[0];
        return (firstSelectedCell as any).document.getText();
      }
    }
    return '';
  }

  static cell(): vscode.NotebookCell | undefined {
    if (vscode.window.activeNotebookEditor) {
      const selectedCells = vscode.window.activeNotebookEditor.selections;
      if (selectedCells.length > 0) {
        const firstSelectedCell = selectedCells[0];
        return (firstSelectedCell as any);
      }
    }
    return undefined;
  }

  static getCellsErrors(): any[] {
    if (!vscode.window.activeNotebookEditor) {
      throw new Error("No active notebook");
    }
    const notebook = vscode.window.activeNotebookEditor.notebook;
    if (!notebook) {
      return [];
    }
    const errorCells: any = [];
    for (let cell of notebook.getCells()) {
      for (let output of cell.outputs) {
        if (output.metadata?.outputType === 'error') {
          // This output is an error
          errorCells.push({
            cell,
            error: output.metadata.originalError.traceback.join('\n'),
            index: cell.index
          })
        }
      }
    }
    return errorCells;
  }

  
  static toArray(): string[] | undefined {
    if (!vscode.window.activeNotebookEditor) {
      throw new Error("No active notebook");
    }
    const notebook = vscode.window.activeNotebookEditor.notebook;
    const cellContents: string[] = (notebook.getCells().map((cell: any) => cell.document.getText()));
    return cellContents;
  }

  static toString(): string {
    if (!vscode.window.activeNotebookEditor) {
      throw new Error("No active notebook");
    }
    const notebook = vscode.window.activeNotebookEditor.notebook;
    const cellContents: string[] = (notebook.getCells().map((cell: any) => cell.document.getText()));
    return cellContents.join('\n');
  }
}
export default NotebookController;


