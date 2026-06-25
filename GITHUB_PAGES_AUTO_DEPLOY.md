# GitHub Pages 自動更新の設定

この方法では、元データを持つ private リポジトリは非公開のままにします。
GitHub Pages 用の public リポジトリには、パスワードで暗号化された公開用ファイルだけを自動で反映します。

## 1. public リポジトリを用意する

GitHub で GitHub Pages 用の public リポジトリを作ります。

例:

```text
study-app-pages
```

このリポジトリは public にします。

## 2. GitHub Pages を有効にする

public リポジトリで次のように設定します。

1. `Settings`
2. `Pages`
3. `Source` を `Deploy from a branch`
4. Branch を `main`
5. Folder を `/(root)`
6. `Save`

## 3. public リポジトリへ書き込むトークンを作る

GitHub 右上のアイコンから次へ進みます。

1. `Settings`
2. `Developer settings`
3. `Personal access tokens`
4. `Fine-grained tokens`
5. `Generate new token`

設定例:

```text
Token name: study-app-pages-deploy
Repository access: Only select repositories
Selected repository: study-app-pages
Permissions:
  Contents: Read and write
```

作成後に表示される token は一度しか見られないのでコピーしておきます。

## 4. private リポジトリに Secrets を追加する

元データがある private リポジトリ側で設定します。

1. `Settings`
2. `Secrets and variables`
3. `Actions`
4. `New repository secret`

次の3つを追加します。

```text
Name: STUDY_WIKI_PASSWORD
Secret: サイト閲覧用パスワード
```

```text
Name: PUBLIC_PAGES_REPO
Secret: GitHubユーザー名/study-app-pages
```

例:

```text
hiroki/study-app-pages
```

```text
Name: PUBLIC_PAGES_TOKEN
Secret: 手順3で作った token
```

## 5. 自動更新の使い方

以後は、private リポジトリで文書を更新して GitHub Desktop から `Push origin` するだけです。

push されると GitHub Actions が自動で次を行います。

1. `data.js` などから公開用サイトを生成
2. `STUDY_WIKI_PASSWORD` で `encrypted-data.js` を作成
3. public リポジトリへ自動 push
4. GitHub Pages が更新

## 6. うまくいかないとき

private リポジトリの `Actions` タブを開き、`Deploy encrypted site to public Pages repository` の実行結果を確認します。

赤い失敗表示が出る場合は、次を確認します。

- `STUDY_WIKI_PASSWORD` が private リポジトリの Secret に入っているか
- `PUBLIC_PAGES_REPO` が `ユーザー名/リポジトリ名` になっているか
- `PUBLIC_PAGES_TOKEN` に public リポジトリの `Contents: Read and write` 権限があるか
- public リポジトリの Pages が `main` / `/(root)` になっているか
