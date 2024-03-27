import * as vscode from "vscode";
import { Disposable } from "./dispose";
import * as fs from "fs";
import { RecordBatch, RecordBatchReader, Table, Vector } from "apache-arrow";
import webViewHTMLText from "./webview/index.xhtml";
import { DatasetColumn, DatasetRow } from "./message";
import {
  isBigInt64Array,
  isBigUint64Array,
  isFloat32Array,
  isFloat64Array,
  isInt16Array,
  isInt32Array,
  isInt8Array,
  isUint16Array,
  isUint32Array,
  isUint8Array,
} from "util/types";

class ArrowDatasetDocument extends Disposable implements vscode.CustomDocument {
  public static async create(uri: vscode.Uri): Promise<ArrowDatasetDocument> {
    const recordLoader = await ArrowDatasetDocument.loadDocument(uri.fsPath);
    const document = new ArrowDatasetDocument(uri, recordLoader);
    return document;
  }

  private readonly _uri: vscode.Uri;

  private _dataLoader: AsyncIterableIterator<RecordBatch<any>>;
  private _loadedData: DatasetRow[] = [];
  private _completedLoading = false;
  private _schema: DatasetColumn[] | null = null;

  private constructor(
    uri: vscode.Uri,
    dataLoader: AsyncIterableIterator<RecordBatch<any>>,
  ) {
    super();
    this._uri = uri;
    this._dataLoader = dataLoader;
  }

  private static async loadDocument(
    path: fs.PathLike,
  ): Promise<AsyncIterableIterator<RecordBatch<any>>> {
    const fileStream = fs.createReadStream(path);
    return await RecordBatchReader.from(fileStream);
  }

  private parseData(data: any): any {
    const isSpecialArray = (data: any) =>
      isUint8Array(data) ||
      isUint16Array(data) ||
      isUint32Array(data) ||
      isFloat32Array(data) ||
      isFloat64Array(data) ||
      isInt8Array(data) ||
      isInt16Array(data) ||
      isInt32Array(data) ||
      isBigInt64Array(data) ||
      isBigUint64Array(data);

    if (Array.isArray(data)) {
      return data.map((value) => this.parseData(value));
    } else if (data instanceof Vector) {
      return this.parseData(data.toArray());
    } else if (isSpecialArray(data)) {
      return this.parseData(Array.from(data));
    }
    return data;
  }

  private async loadNextBatch() {
    if (this._completedLoading) {
      return;
    }
    const nextBatch = await this._dataLoader.next();
    if (nextBatch.done) {
      this._completedLoading = true;
      return;
    }
    const batch = nextBatch.value;
    if (this._schema === null) {
      this._schema = batch.schema.fields.map(
        (field) =>
          ({
            name: field.name,
            type: field.type.toString(),
            description: field.metadata.toString(),
          }) as DatasetColumn,
      );
    }

    const table = new Table(batch);
    const rows: DatasetRow[] = [];
    for (let i = 0; i < table.numRows; i++) {
      const rowObj = table.get(i)!.toJSON();
      for (const key in rowObj) {
        rowObj[key] = this.parseData(rowObj[key]);
      }
      rows.push(rowObj);
    }
    this._loadedData.push(...rows);
  }

  public async getSchema(): Promise<DatasetColumn[]> {
    while (this._schema === null) {
      await this.loadNextBatch();
    }
    return this._schema;
  }

  public async getSlice(start: number, end: number): Promise<DatasetRow[]> {
    while (end > this._loadedData.length) {
      if (this._completedLoading) {
        return this._loadedData.slice(start);
      } else {
        await this.loadNextBatch();
      }
    }
    return this._loadedData.slice(start, end);
  }

  public get uri() {
    return this._uri;
  }

  private readonly _onDidDispose = this._register(
    new vscode.EventEmitter<void>(),
  );
  /**
   * Fired when the document is disposed of.
   */
  public readonly onDidDispose = this._onDidDispose.event;
  /**
   * Called by VS Code when there are no more references to the document.
   *
   * This happens when all editors for it have been closed.
   */
  dispose(): void {
    this._onDidDispose.fire();
    super.dispose();
  }
}

export class ArrorDatasetViewerProvider
  implements vscode.CustomEditorProvider<ArrowDatasetDocument>
{
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      ArrorDatasetViewerProvider.viewType,
      new ArrorDatasetViewerProvider(context),
      {
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  private static readonly viewType = "datasets-viewer.arrow";

  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  //#region CustomEditorProvider

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: { backupId?: string },
    _token: vscode.CancellationToken,
  ): Promise<ArrowDatasetDocument> {
    const document: ArrowDatasetDocument =
      await ArrowDatasetDocument.create(uri);

    return document;
  }

  async resolveCustomEditor(
    document: ArrowDatasetDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    webviewPanel.webview.onDidReceiveMessage((e) =>
      this.onMessage(webviewPanel, document, e),
    );
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<ArrowDatasetDocument>
  >();
  public readonly onDidChangeCustomDocument =
    this._onDidChangeCustomDocument.event;

  public saveCustomDocument(
    _document: ArrowDatasetDocument,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }

  public saveCustomDocumentAs(
    _document: ArrowDatasetDocument,
    _destination: vscode.Uri,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }

  public revertCustomDocument(
    _document: ArrowDatasetDocument,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }

  public backupCustomDocument(
    document: ArrowDatasetDocument,
    _context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken,
  ): Thenable<vscode.CustomDocumentBackup> {
    return Promise.resolve({ id: document.uri.toString(), delete: () => {} });
  }

  //#endregion

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Local path to script and css for the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "dist", "main.wv.js"),
    );

    return webViewHTMLText.replace("{{scriptUri}}", scriptUri.toString());
  }

  private _requestId = 1;
  private readonly _callbacks = new Map<number, (response: any) => void>();

  private postMessageWithResponse<R = unknown>(
    panel: vscode.WebviewPanel,
    type: string,
    body: any,
  ): Promise<R> {
    const requestId = this._requestId++;
    const p = new Promise<R>((resolve) =>
      this._callbacks.set(requestId, resolve),
    );
    panel.webview.postMessage({ type, requestId, body });
    return p;
  }

  private postMessage(
    panel: vscode.WebviewPanel,
    type: string,
    body: any,
  ): void {
    panel.webview.postMessage({ type, body });
  }

  private replyMessage(
    panel: vscode.WebviewPanel,
    requestId: number,
    body: any,
  ): void {
    panel.webview.postMessage({ type: "response", requestId, body });
  }

  private async onMessage(
    panel: vscode.WebviewPanel,
    document: ArrowDatasetDocument,
    message: any,
  ) {
    switch (message.type) {
      case "getSchema": {
        this.replyMessage(panel, message.requestId, await document.getSchema());
        break;
      }
      case "getData": {
        console.log("getData", message.body);
        this.replyMessage(
          panel,
          message.requestId,
          await document.getSlice(message.body.start, message.body.end),
        );
        break;
      }
      case "response": {
        const callback = this._callbacks.get(message.requestId);
        callback?.(message.body);
        return;
      }
    }
  }
}

/**
 * Tracks all webviews.
 */
class WebviewCollection {
  private readonly _webviews = new Set<{
    readonly resource: string;
    readonly webviewPanel: vscode.WebviewPanel;
  }>();

  /**
   * Get all known webviews for a given uri.
   */
  public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
    const key = uri.toString();
    for (const entry of this._webviews) {
      if (entry.resource === key) {
        yield entry.webviewPanel;
      }
    }
  }

  /**
   * Add a new webview to the collection.
   */
  public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
    const entry = { resource: uri.toString(), webviewPanel };
    this._webviews.add(entry);

    webviewPanel.onDidDispose(() => {
      this._webviews.delete(entry);
    });
  }
}
