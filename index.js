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
        filaTitulo: [],
        tocando: false
    }
}

client.on("ready", () => {
    console.log('Estou online');
});

client.on("message", async (msg) => {

    if (msg.content === "-help") {
        msg.channel.send('Lista de comandos:\n\n -play : Use este comando para reproduzir uma música a seu gosto de acordo com o que você escrever, ex: "-play <título da música aqui>" ou "-play <link da música no youtube>"\n\n -pause : Este comando pausa a reprodução da música atual\n\n -resume : Este comando retoma a música atual a partir do momento em que ela foi pausada\n\n -skip : Este comando pula para a próxima música da fila\n\n -queue : Este comando lista todas as músicas da fila\n\n -clear : Este comando deleta todas as músicas da fila');
    }

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
                    const titulo = resultado.data.items[0].snippet.title;
                    const id = resultado.data.items[0].id.videoId;
                    oQueTocar = 'https://www.youtube.com/watch?v=' + id;
                    servidores.server.fila.push(oQueTocar);
                    servidores.server.filaTitulo.push(titulo);

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
            index = 1;
            servidores.server.filaTitulo.forEach(musica => { msg.channel.send(`${index++} - ${musica}`) });
        }
    }
    if (msg.content === "-clear") {
        if (servidores.server.fila.length === 0) {
            msg.channel.send('A fila já está vazia.');
        } else {
            servidores.server.dispatcher.end();
            servidores.server.fila = [];
            servidores.server.filaTitulo = [];
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