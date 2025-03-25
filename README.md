# MusicBot-Template
Discord用の音楽botのサンプルです<br>
自分は初めて公開するのでよくわかりませんｗ
# インストールと使い方
まずはbotの作成をしてください<br>
たくさん紹介されているので説明は省きます<br>
次にnode.jsをインストールしwin＋Rを押しcmdと入力してenterを押します<br><br>
次に各プラグインを入れていきます（Ctrl＋Cでコピー、Ctrl＋Vで貼り付け）<br><br>
npm install discord.js<br>
npm install @discordjs/voice<br>
npm install ytdl-core<br>
npm install dotenv<br>
npm install discord.js @discordjs/voice ytdl-core dotenv<br>
次にファイルの中の.envを編集して中にあるDISCORD_TOKEN=の欄に使いたいbotのトークンを貼り付けてください<br>
そしたらパスの欄にcmdと入力してenterを押します<br>
次にnode start.jsと入力してenterを押します<br>
<br>
正常に動作していればbotがオンラインになります<br>
<br>
# ローカル音源を追加する方法
start.jsを編集して以下の文章を検索します<br>
// ファイルのパス
const volumeFilePath = path.join('音源の保存場所をここに貼り付け', 'volume.txt');
const musicFolderPath = path.join(__dirname, 'files'); // 音楽ファイルが保存されているフォルダ
出てきたら「音源の保存場所をここに貼り付け」という場所に音源を置きたいファイルのパスを貼り付けします<br>
あとは音源ファイルを入れるだけです（mp3など）<br>
<br>
ちゃんと音源が入っているか確認する場合はbotを一度起動してk!listでローカルファイルを確認できます<br>
<br>
私の場合はstart.jsなどがあるフォルダにfilesというフォルダを新しく作成してその中に音源ファイルを入れます<br>
<br>
音源はmp3.ogg.wavなどが対応しています<br>
# コマンドについて
各コマンドは<br>
k!helpで表示できます<br>
