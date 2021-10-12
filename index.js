const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const google = require('googleapis');
const express = require("express");
const app = express();

const port = process.env.PORT || 3000
const google_key = process.env.GOOGLE_KEY
const token = process.env.TOKEN

app.get("/", function (req, res) {
    res.send("SERVIDOR ONLINE!")
});

app.listen(port, () => {
    console.info(`SERVIDOR ONLINE EM http://localhost:${port}`);
});

const youtube = new google.youtube_v3.Youtube({
    version: 'v3',
    auth: google_key
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

    const leaveByInactivity = () => {
        setTimeout(function () {
            if (servidores.server.fila.length > 0) {
                leaveByInactivity();
            } else {
                setTimeout(function () {
                    if (servidores.server.fila.length == 0) {
                        servidores.server.dispatcher = null;
                        servidores.server.fila = [];
                        servidores.server.filaTitulo = [];
                        msg.member.voice.channel.leave();
                    } else {
                        leaveByInactivity();
                    }
                }, 600000)
            }
        }, 10000);
    }

    const joinVoicechannel = async () => {
        try {
            servidores.server.connection = await msg.member.voice.channel.join();
        }
        catch (err) {
            console.log('Erro ao entrar no canal de voz!');
            console.log(err);
        }
    }

    if (msg.content === "-help") {
        msg.channel.send('Lista de comandos:\n\n -play ou -p : Use este comando para reproduzir uma música a seu gosto de acordo com o que você escrever, ex: "-play <título da música aqui>" ou "-play <link da música no youtube>"\n\n -pause : Este comando pausa a reprodução da música atual\n\n -resume : Este comando retoma a música atual a partir do momento em que ela foi pausada\n\n -skip : Este comando pula para a próxima música da fila\n\n -queue : Este comando lista todas as músicas da fila\n\n -clear : Este comando deleta todas as músicas da fila\n\n -force : Use este comando para forçar a reprodução de uma música\n\n -playlist : Use este comando para reproduzir uma playlist do youtube, ex "-playlist <link da playlist no youtube>');
    }

    let oQueTocar = msg.content;

    if (oQueTocar.substring(0, oQueTocar.indexOf(' ')) === "-playlist") {
        joinVoicechannel();
        leaveByInactivity();
        oQueTocar = oQueTocar.slice(10);

        const regex = /[&?]list=([^&]+)/i;
        const str = ` ${oQueTocar}`;
        let playlistId;

        if ((playlistId = regex.exec(str)) !== null) {
            playlistId = playlistId[1];
        } else {
            msg.channel.send("O link não é válido ou não foi possível identificar essa playlist :slight_frown:")
            return;
        }

        oQueTocar = playlistId;

        youtube.playlistItems.list({
            part: 'snippet',
            playlistId: oQueTocar,
            maxResults: 15
        }, function (err, resultado) {
            if (err) {
                console.log(err);
                msg.channel.send("O link não é válido ou não foi possível identificar essa playlist :slight_frown:")
                return;
            }
            if (resultado) {
                const id = resultado.data.items[0].snippet.resourceId.videoId;
                const titulo = resultado.data.items[0].snippet.title;
                oQueTocar = 'https://youtu.be/' + id;
                servidores.server.fila.push(oQueTocar);
                servidores.server.filaTitulo.push(titulo);
                tocaMusicas();

                for (let i = 1; i < resultado.data.items.length; i++) {
                    let videoId = `https://youtu.be/${resultado.data.items[i].snippet.resourceId.videoId}`;
                    servidores.server.fila.push(videoId);
                    let titulo = resultado.data.items[i].snippet.title;
                    servidores.server.filaTitulo.push(titulo);
                }
            }
        });
    }

    if (oQueTocar.substring(0, oQueTocar.indexOf(' ')) === "-play" || oQueTocar.substring(0, oQueTocar.indexOf(' ')) === "-p") {
        leaveByInactivity();

        try {
            servidores.server.connection = await msg.member.voice.channel.join();
        }
        catch (err) {
            console.log('Erro ao entrar no canal de voz!');
            console.log(err);
        }

        if (oQueTocar.substring(0, oQueTocar.indexOf(' ')) === "-play") {
            oQueTocar = oQueTocar.slice(6)
        } else {
            oQueTocar = oQueTocar.slice(3)
        }

        if (ytdl.validateURL(oQueTocar)) {
            servidores.server.fila.push(oQueTocar);
            let videoId = ytdl.getURLVideoID(oQueTocar);

            tocaMusicas();

            youtube.search.list({
                q: videoId,
                part: 'snippet',
                fields: 'items(id(videoId),snippet(title))',
                type: 'video'
            }, function (err, resultado) {
                if (err) {
                    console.log(err);
                    msg.channel.send("Não consegui achar essa música, tente outro link!");
                    return;
                }
                if (resultado) {
                    const titulo = resultado.data.items[0].snippet.title;
                    servidores.server.filaTitulo.push(titulo);
                }
            });

        } else {
            youtube.search.list({
                q: oQueTocar,
                part: 'snippet',
                fields: 'items(id(videoId),snippet(title))',
                type: 'video'
            }, function (err, resultado) {
                if (err) {
                    console.log(err);
                    msg.channel.send("Não consegui achar essa música, tente outro link!");
                    return;
                }
                if (resultado) {
                    const id = resultado.data.items[0].id.videoId;
                    const titulo = resultado.data.items[0].snippet.title;
                    oQueTocar = 'https://youtu.be/' + id;
                    servidores.server.fila.push(oQueTocar);
                    servidores.server.filaTitulo.push(titulo);

                    tocaMusicas();
                }
            });
        }
    };

    if (msg.content.startsWith("-force")) {
        leaveByInactivity();
        if (servidores.server.connection == null) {
            try {
                servidores.server.connection = await msg.member.voice.channel.join();
            } catch (err) {
                console.log('Erro ao entrar no canal de voz!');
                console.log(err);
            }
        }

        let oQueTocar = msg.content.slice(7);

        if (ytdl.validateURL(oQueTocar)) {
            let stream = ytdl(oQueTocar, { filter: 'audioonly' });
            servidores.server.dispatcher = servidores.server.connection.play(stream);
            servidores.server.dispatcher.on('finish', () => {
                servidores.server.tocando = false;
                if (servidores.server.fila.length > 0) {
                    tocaMusicas();
                } else {
                    servidores.server.dispatcher = null;
                }
            });
        } else {
            youtube.search.list({
                q: oQueTocar,
                part: 'snippet',
                fields: 'items(id(videoId),snippet(title))',
                type: 'video'
            }, function (err, resultado) {
                if (err) {
                    console.log(err);
                    msg.channel.send("Não consegui achar essa música, tente outro link!");
                    return;
                }
                if (resultado) {

                    const id = resultado.data.items[0].id.videoId;
                    oQueTocar = 'https://youtu.be/' + id;
                    let stream = ytdl(oQueTocar, { filter: 'audioonly' });
                    servidores.server.dispatcher = servidores.server.connection.play(stream);
                    servidores.server.dispatcher.on('finish', () => {
                        servidores.server.tocando = false;
                        if (servidores.server.fila.length > 0) {
                            tocaMusicas();
                        } else {
                            servidores.server.dispatcher = null;
                        }
                    });
                }
            });
        }
    }

    if (msg.content === "-pause") {
        servidores.server.dispatcher.pause();
    }

    if (msg.content === "-resume") {
        servidores.server.dispatcher.resume();
    }

    if (msg.content === "-skip") {
        if (servidores.server.dispatcher == null) {
            servidores.server.tocando = false;
            msg.channel.send('A fila está vazia.');
        } else {
            servidores.server.dispatcher.end();
            if (servidores.server.fila.length === 0) {
                servidores.server.tocando = false;
                return;
            } else {
                tocaMusicas();
            }
        }
    }

    if (msg.content === "-queue") {
        if (servidores.server.fila.length === 0) {
            msg.channel.send('A fila está vazia.');
        } else {
            index = 1;
            servidores.server.filaTitulo.forEach(musica => { msg.channel.send(`${index++} - ${musica}`) });
            console.log(servidores.server.fila);
        }
    }

    if (msg.content === "-clear") {
        if (servidores.server.fila.length === 0) {
            msg.channel.send('A fila já está vazia.');
        } else {
            servidores.server.dispatcher.end();
            servidores.server.fila = [];
            servidores.server.filaTitulo = [];
            servidores.server.tocando = false;
            msg.channel.send(msg.author.username + ' limpou a fila.');
        }
    }

});

const tocaMusicas = () => {

    if (servidores.server.tocando === false) {
        let filaParaTocar = servidores.server.fila[0];
        servidores.server.tocando = true;

        let stream = ytdl(filaParaTocar, { filter: 'audioonly' });

        setTimeout(() => {
            servidores.server.dispatcher = servidores.server.connection.play(stream);
            servidores.server.dispatcher.on('finish', () => {
                servidores.server.fila.shift();
                servidores.server.filaTitulo.shift();
                servidores.server.tocando = false;
                if (servidores.server.fila.length > 0) {
                    tocaMusicas();
                } else {
                    servidores.server.dispatcher = null;
                }
            });
        }, 4000);
    }
}
client.login(token);