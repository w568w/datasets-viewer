export interface DatasetColumn {
  name: string;
  type: string;
  description: string | undefined;
}

export type DatasetRow = Record<string, any>;
