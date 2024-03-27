import React, { useEffect, useMemo, useState } from "react";
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
  VSCodeTag,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import { createRoot } from "react-dom/client";
import { DatasetColumn, DatasetRow } from "../message.js";

const vscode = acquireVsCodeApi();

const App = () => {
  const [schema, setSchema] = useState<DatasetColumn[] | null>(null);
  const [pageNum, setPageNum] = useState(0);
  const [data, setData] = useState<DatasetRow[]>([]);

  const jsonifiedData = useMemo(() => {
    return data.map((row) => {
      const newRow: Record<string, string> = {};
      for (const key in row) {
        newRow[key] = JSON.stringify(row[key]);
      }
      return newRow;
    });
  }, [data]);

  const [detailPosition, setDetailPosition] = useState<[number, number] | null>(
    null,
  );

  useEffect(() => {
    postMessageWithResponse("getSchema", null).then((schema) => {
      setSchema(schema as DatasetColumn[]);
    });
  }, []);

  useEffect(() => {
    setDetailPosition(null);
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
    if (pageNum === 0) {
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
        {jsonifiedData.map((row, i) => (
          <VSCodeDataGridRow key={i}>
            {schema?.map((column, j) => (
              <VSCodeDataGridCell key={j} gridColumn={`${j + 1}`}>
                {row[column.name].length > 300 ? (
                  detailPosition !== null &&
                  detailPosition[0] === i &&
                  detailPosition[1] === j ? (
                    <VSCodeTextArea
                      readOnly={true}
                      value={row[column.name]}
                      resize="both"
                      rows={30}
                    ></VSCodeTextArea>
                  ) : (
                    <div>
                      {row[column.name].slice(0, 300)}
                      <VSCodeTag onClick={() => setDetailPosition([i, j])}>
                        {row[column.name].length - 300} more chars
                      </VSCodeTag>
                    </div>
                  )
                ) : (
                  row[column.name]
                )}
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
