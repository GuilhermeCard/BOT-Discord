const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');

const TOKEN = 'ODgzODQwNTgwOTg2MjEyMzky.YTPyrw.sYo8ekWe929PJebxFJKwVQXGK28';

const servidores = {
    'server': {
        connection: null,
        dispatcher: null
    }
}

client.on("ready", () => {
    console.log('Estou online');
});

client.on("message", async (msg) => {

    if (msg.content.startsWith("-play")) {
        servidores.server.connection = await msg.member.voice.channel.join();

        let oQueTocar = msg.content.slice(6);
        if (ytdl.validateURL(oQueTocar)) {
            servidores.server.dispatcher = servidores.server.connection.play(ytdl(oQueTocar));

        } else {
            msg.channel.send('Link inválido!');
        }

    };

    if (msg.content === "-pause") {
        servidores.server.dispatcher.pause();
    }
    if (msg.content === "-resume") {
        servidores.server.dispatcher.resume();
    }

});

client.login(TOKEN);