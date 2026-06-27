# Codex学習Wiki

外部AI APIを使わず、Codexが `data.js` を編集して文書を増やす学習Wikiです。

## 使い方

1. `index.html` をブラウザで開く。
2. 文書中の分からない語句や数式を範囲選択する。
3. 選択範囲の上で右クリックし、生成依頼または導出依頼を選ぶ。
4. 画面に表示された依頼文をコピーする。
5. このCodexチャットに貼り付けて送る。
6. Codexが `data.js` に文書を追加または更新する。
7. ブラウザをリロードすると新しい文書が読める。

## GitHub Pagesで公開する

このサイトは静的ファイルだけで動きます。GitHub Pagesでは、リポジトリ直下の次のファイルをそのまま公開します。

- `index.html`
- `styles.css`
- `app.js`
- `data.js`

文書を追加・更新したら、GitHub Desktopで変更をcommitしてpushすれば、GitHub Pages側も自動で更新されます。

詳しくは `PUBLIC_HOSTING.md` を参照してください。

## スマホで見る

GitHub PagesのURLをスマホで開くと、同じWi-Fiでなくても全文書を読めます。

PCとスマホが同じWi-Fiにある場合だけ、一時的にPC内のサイトを確認する目的で `start-phone-server.ps1` を使えます。停止するときは `stop-phone-server.ps1` を実行します。

## 注意

- APIキーは不要です。
- ブラウザだけではAI生成しません。生成はCodex上で行います。
- GitHub Pagesで公開した `data.js` は誰でも読めます。
- 個人的なメモや公開したくない情報は、このリポジトリの文書に入れないでください。
