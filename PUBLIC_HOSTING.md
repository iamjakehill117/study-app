# GitHub Pagesで公開する方法

このWikiは静的ファイルだけで動くため、GitHub Pagesで無料公開できます。

## 公開するファイル

リポジトリ直下の次のファイルがそのままサイトになります。

- `index.html`
- `styles.css`
- `app.js`
- `data.js`

以前のように `public_site` フォルダを作ったり、zipをアップロードしたりする必要はありません。

## 更新するとき

Codexが `data.js` や画面ファイルを更新したら、GitHub Desktopで次を行います。

1. `Changes` に出ている変更を確認する。
2. 左下の `Summary` に短い説明を書く。
3. `Commit to main` を押す。
4. `Push origin` を押す。

push後、GitHub Pagesの反映には少し時間がかかることがあります。表示が古い場合は、ブラウザのキャッシュを更新してください。

## 注意

GitHub Pagesで公開した内容は、URLを知っている人以外にも見られる可能性があります。公開したくない内容は `data.js` に入れないでください。
