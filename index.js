#!/usr/bin/env node

/*!
 * Node.js を CGI として動かす
 * 
 * - 1行目は node の実行パスを記載する
 *   - Windows 環境であれば #!"C:/PATH/TO/node.exe" と拡張子まで指定する
 * - 本ファイルは .cgi などの拡張子で保存して実行権を付与しておき、サーバ設定で CGI として動かす拡張子として保存しておく
 * - process.env を見ることでリクエスト情報が取得できる
 *   - HTTP_HOST・SERVER_NAME : サーバの Host Name or Public IP
 *   - SERVER_ADDR            : サーバの Private IP
 *   - SERVER_PORT            : サーバのポート (80 や 443)
 *   - DOCUMENT_ROOT・CONTEXT_DOCUMENT_ROOT : Apache サーバ等のドキュメントルート
 *   - REMOTE_ADDR     : リクエスト元の Public IP
 *   - HTTP_USER_AGENT : リクエスト元の User Agent
 *   - HTTPS           : HTTPS 接続時は 'on' の値が入る
 *   - REQUEST_SCHEME  : プロトコル ('http' や 'https')
 *   - REQUEST_METHOD  : メソッド ('GET' や 'POST')
 *   - SCRIPT_FILENAME : CGI ファイルのフルパス
 *   - SCRIPT_NAME     : CGI ファイルへのルート相対パス ('/' 始まり)
 *   - REQUEST_URI     : リクエストパス ('/' 始まり、クエリ文字列を含む)
 *   - QUERY_STRING    : クエリ文字列 ('?' は含まない)
 * - POST 時のリクエストボディは process.stdin を束ねることで取得できる
 * - レスポンスは process.stdout.write か console.log で実行できる
 */


// 前処理
// ================================================================================

/** 使用可能な HTTP ヘッダの定義 */
const httpHeaders = {
  plain: {
    type      : 'plain',
    httpHeader: 'Content-Type: text/plain; charset=UTF-8\n\n'
  },
  html: {
    type      : 'html',
    httpHeader: 'Content-Type: text/html; charset=UTF-8\n\n'
  }
};

/** HTTP ヘッダを出力したら httpHeaders.type を設定する */
let httpHeader = null;

/**
 * HTTP ヘッダを出力する : グローバル変数 httpHeader を更新する
 * 
 * @param {string} type httpHeaders.type を指定する・存在しない Type の場合は plain が使用される
 */
const writeHttpHeader = (type) => {
  // HTTP ヘッダが出力済だったら何もしない
  if(httpHeader !== null) { return; }
  const specifiedHttpHeader = httpHeaders[type] || httpHeaders.plain;
  console.log(specifiedHttpHeader.httpHeader);
  httpHeader = specifiedHttpHeader.type;
};

/**
 * エラー時の処理
 * 
 * @param {*} error エラー
 */
const onError = (error) => {
  if(!httpHeader) {
    writeHttpHeader(httpHeaders.plain.type);
  }
  switch(httpHeader) {
    case httpHeaders.html.type:
      console.log('<pre style="color: #f00; font-weight: bold;">Error :<br>', error, '</pre>');
      break;
    default:
      console.log('\nError :', error);
  }
};

/**
 * エラー発生時の処理を予め定義する
 */
process.on('uncaughtException', (error) => {
  onError(error);
});

/**
 * 終了時の処理を予め定義する
 */
process.on('exit', () => {
  // Do something
});

/**
 * POST 時にリクエストボディを取得する
 * 
 * @return {Promise<string>} リクエストボディを持った Promise
 */
const readPostBody = async () => {
  let postBody = '';
  for await(const chunk of process.stdin) { postBody += chunk; }
  return postBody;
  
  // Node.js v12 以前は以下の方法で取得可能
  //const readPostBody = () => new Promise((resolve) => {
  //  let postBody = '';
  //  process.stdin.on('data', (chunk) => { postBody += chunk; });
  //  process.stdin.on('end', () => { resolve(postBody); });
  //});
};


// メイン処理群を宣言する
// ================================================================================

/**
 * メイン処理
 * 
 * @param {string} postBody POST 時のみリクエストボディを渡す
 */
const main = async (postBody) => {
  // HTTP ヘッダを出力する
  writeHttpHeader(httpHeaders.html.type);
  
  // HTML の冒頭を出力する
  console.log(`<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=Edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hello Node.js CGI</title>
  </head>
  <body>`);
  
  // 環境変数を表示する
  console.log('<h1>Hello Node.js CGI</h1>');
  console.log('<pre>', process.env, '</pre>');
  
  // POST リクエストボディがあれば表示する
  if(postBody) {
    console.log('<hr>');
    console.log('<h2>Post Body</h2>');
    console.log('<pre>', postBody, '</pre>');
  }
  
  // POST リクエストを試すためのフォーム
  console.log('<hr>');
  console.log('<h2>POST Test</h2>');
  console.log(`<form action="${process.env.SCRIPT_NAME}" method="POST">
  <input type="text" name="text" value="">
  <button name="submit-btn" value="submit-btn-value">Post Submit</button>
</form>`);
  
  // HTTP の末尾を出力する
  console.log(`  </body>
</html>`);
};


// 実行
// ================================================================================

(async () => {
  try {
    if(process.env.REQUEST_METHOD === 'POST') {
      // POST 時のみリクエストボディを取得しメイン処理に渡す
      const postBody = await readPostBody();
      await main(postBody);
    }
    else {
      // それ以外 (GET など) の場合
      await main();
    }
  }
  catch(error) {
    onError(error)
  };
})();
