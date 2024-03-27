// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import { RecordBatchReader, Table } from "apache-arrow";
import { ArrorDatasetViewerProvider } from "./arrowEditor";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "datasets-viewer" is now active!',
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "datasets-viewer.helloWorld",
    () => {
      const currentUri = vscode.window.activeTextEditor?.document.uri;
      if (currentUri === undefined) {
        vscode.window.showErrorMessage(
          "You must have a file open to use this command",
        );
        return;
      }
      const currentPath = currentUri.fsPath;

      const fileStream = fs.createReadStream(currentPath);
      const table = RecordBatchReader.from(fileStream);

      table
        .then(async (table) => {
          let i = 0;
          for await (const batch of table) {
            console.log(new Table(batch).get(0)?.toJSON());
            i++;
            if (i > 10) {
              break;
            }
          }
        })
        .catch((err) => {
          console.log(err);
        });
    },
  );

  context.subscriptions.push(disposable);

  context.subscriptions.push(ArrorDatasetViewerProvider.register(context));
}

// This method is called when your extension is deactivated
export function deactivate() {}
