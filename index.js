const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const google = require('googleapis');
const configs = require('./config.json');

const youtube = new google.youtube_v3.Youtube({
    version: 'v3',
    auth: configs.GOOGLE_KEY
});

const client = new Discord.Client();

const servidores = {
    'server': {
        connection: null,
        dispatcher: null,
        fila: [],
        tocando: false
    }
}

client.on("ready", () => {
    console.log('Estou online');
});

client.on("message", async (msg) => {

    if (msg.content.startsWith("-play")) {
        try {
            servidores.server.connection = await msg.member.voice.channel.join();
        }
        catch (err) {
            console.log('Erro ao entrar no canal de voz!');
            console.log(err);
        }

        let oQueTocar = msg.content.slice(6);
        if (ytdl.validateURL(oQueTocar)) {
            servidores.server.fila.push(oQueTocar);
            tocaMusicas();

        } else {
            youtube.search.list({
                q: oQueTocar,
                part: 'snippet',
                fields: 'items(id(videoId),snippet(title))',
                type: 'video'
            }, function (err, resultado) {
                if (err) {
                    console.log(err);
                }
                if (resultado) {
                    const id = resultado.data.items[0].id.videoId;
                    oQueTocar = 'https://www.youtube.com/watch?v=' + id;
                    servidores.server.fila.push(oQueTocar);
                    console.log(servidores.server.fila);
                    tocaMusicas();
                }
            });
        }
    };

    if (msg.content === "-pause") {
        servidores.server.dispatcher.pause();
    }
    if (msg.content === "-resume") {
        servidores.server.dispatcher.resume();
    }
    if (msg.content === "-skip") {
        servidores.server.dispatcher.end();
    }
    if (msg.content === "-queue") {
        if (servidores.server.fila.length === 0) {
            msg.channel.send('A fila está vazia.');
        } else {
            servidores.server.fila.forEach(musica => { msg.channel.send(musica) });
        }
    }
    if (msg.content === "-clear") {
        if (servidores.server.fila.length === 0) {
            msg.channel.send('A fila já está vazia.');
        } else {
            servidores.server.dispatcher.end();
            servidores.server.fila = [];
            msg.channel.send(msg.author.username + ' limpou a fila.');
        }
    }

});

const tocaMusicas = () => {
    if (servidores.server.tocando === false) {
        const tocando = servidores.server.fila[0];
        servidores.server.tocando = true;
        servidores.server.dispatcher = servidores.server.connection.play(ytdl(tocando), { filter: 'audioonly' });

        servidores.server.dispatcher.on('finish', () => {
            servidores.server.fila.shift();
            servidores.server.tocando = false;
            if (servidores.server.fila.length > 0) {
                tocaMusicas();
            } else {
                servidores.server.dispatcher = null;
            }
        });
    }
}
client.login(configs.TOKEN_DISCORD);