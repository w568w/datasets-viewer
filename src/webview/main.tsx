import React, { useEffect, useState } from "react";
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
  VSCodeTag,
} from "@vscode/webview-ui-toolkit/react";
import { createRoot } from "react-dom/client";
import { DatasetColumn, DatasetRow } from "../message.js";

const vscode = acquireVsCodeApi();

const App = () => {
  const [schema, setSchema] = useState<DatasetColumn[] | null>(null);
  const [pageNum, setPageNum] = useState(0);
  const [data, setData] = useState<DatasetRow[]>([]);

  useEffect(() => {
    postMessageWithResponse("getSchema", null).then((schema) => {
      setSchema(schema as DatasetColumn[]);
    });
  }, []);

  useEffect(() => {
    postMessageWithResponse("getData", {
      start: pageNum * 10,
      end: (pageNum + 1) * 10,
    }).then((data) => {
      setData(data as DatasetRow[]);
    });
  }, [pageNum]);

  const nextPage = () => {
    if (data.length === 0) {
      return;
    }
    setPageNum(pageNum + 1);
  };

  const prevPage = () => {
    if (pageNum === 0 || data.length === 0) {
      return;
    }
    setPageNum(pageNum - 1);
  };

  return (
    <div>
      <VSCodeDataGrid>
        <VSCodeDataGridRow rowType="sticky-header">
          <VSCodeButton onClick={prevPage}>Previous Page</VSCodeButton>
          <VSCodeTag
            style={{
              padding: "0 10px",
              alignSelf: "center",
            }}
          >
            Showing {pageNum * 10} - {(pageNum + 1) * 10} items
          </VSCodeTag>
          <VSCodeButton onClick={nextPage}>Next Page</VSCodeButton>
          {schema?.map((column, i) => (
            <VSCodeDataGridCell
              key={i}
              cellType="columnheader"
              gridColumn={`${i + 1}`}
            >
              {`${column.name} (${column.type})`}
            </VSCodeDataGridCell>
          )) ?? null}
        </VSCodeDataGridRow>
        {data.map((row, i) => (
          <VSCodeDataGridRow key={i}>
            {schema?.map((column, j) => (
              <VSCodeDataGridCell key={j} gridColumn={`${j + 1}`}>
                {JSON.stringify(row[column.name])}
              </VSCodeDataGridCell>
            )) ?? null}
          </VSCodeDataGridRow>
        ))}
      </VSCodeDataGrid>
    </div>
  );
};

const _callbacks = new Map<number, (response: any) => void>();
let _requestId = 0;

function postMessageWithResponse(type: string, body: any) {
  const requestId = _requestId++;
  const p = new Promise((resolve) => _callbacks.set(requestId, resolve));
  vscode.postMessage({ type, requestId, body });
  return p;
}

window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "response") {
    const callback = _callbacks.get(message.requestId);
    callback?.(message.body);
  }
});

const container = document.getElementById("root");
const root = createRoot(container as HTMLElement);
root.render(<App />);
