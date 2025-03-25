const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core'); // Required for YouTube audio playback
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const prefix = 'k!';
let loop = false;
let player = null;
let currentFile = null;
let connection = null;
let disconnectTimeout;
let currentVolume = 0.25; // 初期値 25%
let isPlaying = false; // 再生中の状態フラグ

// ファイルのパス
const volumeFilePath = path.join('音源の保存場所をここに貼り付け', 'volume.txt');
const musicFolderPath = path.join(__dirname, 'files'); // 音楽ファイルが保存されているフォルダ

// 音量を volume.txt に保存する関数
function saveVolumeToFile(volume) {
    try {
        fs.writeFileSync(volumeFilePath, volume.toString(), 'utf8');
        console.log(`Volume saved to volume.txt: ${volume * 100}%`);
    } catch (error) {
        console.error('Failed to save volume to volume.txt:', error);
    }
}

client.on('ready', () => {
    console.log(`${client.user.tag} is ready!`);
    client.user.setActivity('k!help', { type: 'PLAYING' }); // ステータスの設定
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (command === 'volume') {
        const option = args[0];
        if (!option) {
            return message.channel.send(`現在の音量は ${Math.round(currentVolume * 100)}% です。`);
        }

        if (option === 'reset') {
            currentVolume = 0.25; // 初期値 25%
            saveVolumeToFile(currentVolume);
            if (player && player.state.resource) {
                player.state.resource.volume.setVolume(currentVolume);
            }
            return message.channel.send('音量を初期値 (25%) にリセットしました。');
        }

        const volume = parseInt(option, 10);
        if (isNaN(volume) || volume < 1 || volume > 100) {
            return message.channel.send('音量は 1 から 100 の間で指定してください。');
        }

        currentVolume = volume / 100; // 0.0 から 1.0 に変換
        saveVolumeToFile(currentVolume);
        if (player && player.state.resource) {
            player.state.resource.volume.setVolume(currentVolume);
        }
        message.channel.send(`音量を ${volume}% に設定しました。`);

    } else if (command === 'help') {
        const helpMessage = `
＝＝＝＝＝＝＝＝＝＝＝＝＝
**コマンド一覧**
- \`k!p [ファイル名 / YouTubeリンク]\`: 音楽を再生
- \`k!s\`: 音楽を停止
- \`k!l (on/off)\`: 音楽をループ再生
- \`k!dc\`: ボイスチャンネルから退出
- \`k!list\`: 曲の一覧を表示
- \`k!volume [1-100/reset]\`: 音量を設定または初期値にリセット
＝＝＝＝＝＝＝＝＝＝＝＝＝
        `;
        message.channel.send(helpMessage);

    } else if (command === 'list') {
        // ファイル一覧を表示
        fs.readdir(musicFolderPath, (err, files) => {
            if (err) {
                console.error(err);
                return message.channel.send('音源ファイルの一覧を取得できませんでした。');
            }
            const audioFiles = files.filter(file => file.endsWith('.mp3') || file.endsWith('.ogg') || file.endsWith('.wav'));
            if (audioFiles.length === 0) {
                return message.channel.send('音源ファイルがありません。');
            }
            message.channel.send('音源ファイルの一覧:\n' + audioFiles.join('\n'));
        });

    } else if (command === 'p' || command === 'play') {
        const input = args.join(' ');

        if (!input) {
            return message.channel.send('再生するファイル名またはYouTubeリンクを指定してください。');
        }

        if (!message.member.voice.channelId) {
            return message.channel.send('ボイスチャンネルに参加してください。');
        }

        // YouTubeリンクの場合
        if (ytdl.validateURL(input)) {
            try {
                const stream = ytdl(input, { filter: 'audioonly', quality: 'highestaudio' });

                // ボイスチャンネルに接続
                if (!connection || connection.state.status !== 'ready') {
                    if (connection) {
                        connection.destroy(); // 古い接続を切断
                    }
                    connection = joinVoiceChannel({
                        channelId: message.member.voice.channelId,
                        guildId: message.guild.id,
                        adapterCreator: message.guild.voiceAdapterCreator,
                    });
                }

                if (!player) {
                    player = createAudioPlayer();
                }
                connection.subscribe(player);

                const resource = createAudioResource(stream, { inlineVolume: true });
                resource.volume.setVolume(currentVolume); // 音量設定
                player.play(resource);

                isPlaying = true;
                currentFile = input; // 現在の音源
                clearTimeout(disconnectTimeout); // 自動切断タイマーをリセット

                message.channel.send(`YouTube音源の再生を開始しました！\nタイトル: ${currentFile}`);
            } catch (error) {
                console.error('再生中にエラーが発生しました:', error);
                return message.channel.send('YouTube音源の取得に失敗しました。リンクを確認してください。');
            }
            return;
        }

        // ローカルファイルの場合
        let filePath = path.resolve(musicFolderPath, input);
        if (!filePath.endsWith('.mp3') && !filePath.endsWith('.ogg') && !filePath.endsWith('.wav')) {
            filePath += '.mp3'; // デフォルトで.mp3
        }

        if (!fs.existsSync(filePath)) {
            return message.channel.send('指定されたファイルが存在しません！');
        }

        // ボイスチャンネルに接続
        if (!connection || connection.state.status !== 'ready') {
            if (connection) {
                connection.destroy(); // 古い接続を切断
            }
            connection = joinVoiceChannel({
                channelId: message.member.voice.channelId,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
        }

        if (!player) {
            player = createAudioPlayer();
        }
        connection.subscribe(player);

        currentFile = filePath; // 現在のファイルを記録
        isPlaying = true; // 再生状態を変更
        playAudio(filePath, message.channel);

        clearTimeout(disconnectTimeout); // 自動切断タイマーをリセット
    } else if (command === 's' || command === 'stop') {
        if (!isPlaying) {
            return message.channel.send('再生中の音楽はありません。');
        }

        player.stop();
        isPlaying = false;
        message.channel.send('音楽を停止しました。');
    } else if (command === 'l' || command === 'loop') {
        const option = args[0]?.toLowerCase();
        if (option === 'on') {
            loop = true;
            message.channel.send('ループ再生を有効にしました。');
        } else if (option === 'off') {
            loop = false;
            message.channel.send('ループ再生を無効にしました。');
        } else {
            message.channel.send('ループ再生の状態を指定してください (on/off)');
        }
    } else if (command === 'dc') {
        if (connection) {
            connection.destroy();
            connection = null;
            message.channel.send('ボイスチャンネルから退出しました。');
        } else {
            message.channel.send('現在ボイスチャンネルに接続していません。');
        }
    }
});

function playAudio(filePath, channel) {
    if (!player) {
        player = createAudioPlayer();
    }

    const resource = createAudioResource(filePath, { inlineVolume: true });
    resource.volume.setVolume(currentVolume); // 現在の音量を適用
    player.play(resource);

    player.removeAllListeners(AudioPlayerStatus.Idle);
    player.on(AudioPlayerStatus.Idle, () => {
        if (loop) {
            playAudio(filePath, channel); // ループ再生
        } else {
            isPlaying = false; // 再生状態をリセット
            startDisconnectTimer(connection, channel);
        }
    });

    player.on('error', (error) => {
        console.error('再生中にエラーが発生しました:', error);
        channel.send('再生中にエラーが発生しました。');
    });
}

function startDisconnectTimer(connection, channel) {
    disconnectTimeout = setTimeout(() => {
        if (connection) {
            connection.destroy();
            channel.send('一定時間操作がなかったため退出しました。\nまたのご利用をお待ちしております。');
            connection = null; // 接続状態をリセット
        }
    }, 60000); // 1分後に切断
}

client.login(process.env.BOT_TOKEN);