import * as monaco from 'monaco-editor';

export interface NgxEditorModel {
  value: string;
  uri?: string;
  language?: string;
}

const langMap: Record<string, string> = {
  js: 'javascript',
  json: 'json',
  java: 'java',
  ts: 'typescript',
  css: 'css',
  html: 'html',
  sh: 'bash',
  xml: 'xml',
  yml: 'yml'
};

const langFormat = 'plaintext';

export const createModel = (uri: string, value: string): NgxEditorModel => {
  let lang = langFormat;

  const strUri = (monaco.Uri.isUri(uri) ? uri.fsPath : uri);
  const ext = strUri.split('.').pop();
  const found = langMap[ext];
  if (found) {
    lang = found;
  }

  return {
    value,
    language: lang,
    uri: strUri,
  };
};
