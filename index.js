const express = require('express');
const https = require('https');
const path = require('path');
const discordTTS=require("discord-tts");
const PORT = process.env.PORT || 5000;
const getMP3Duration = require('get-mp3-duration')

var exec = require('child_process').exec;
const fs = require('fs')
const Discord = require('discord.js');
const client = new Discord.Client();

let channels = new Map()
client.once('ready', () => {
    console.log('Ready!');
});
let dispatcher
let connection
let musicPath
let songID
let songs = []
let duration
let history = []
let state = true
let time = Date.now();
client.on('message', async msg =>{
    if(!msg.author.bot) {//console.log(msg)
        //console.log(msg.author.username + ': ' + msg.content)
        if(msg.content === '/play')
        {
            if (dispatcher !== undefined)
                dispatcher.resume()
        }
        else if (msg.content.startsWith('/play https://open.spotify.com/track/')) {
            songID = msg.content.substring(msg.content.lastIndexOf('/')+1)
            // Only try to join the sender's voice channel if they are in one themselves

            if (msg.member.voice.channel) {
                connection = await msg.member.voice.channel.join();
                //msg.reply('https://musicalmood.github.io/?id='+msg.member.voice.channel.id)
                //msg.reply('searching ...').then(message => message.delete({timeout: 5000}))
                connection.play(discordTTS.getVoiceStream("searching"))
                const url = msg.content.trim().substr(msg.content.indexOf(' ')+1)
                await exec("node d-fi.js -n -q 128 --url " + url, {cwd: './d-fi'}, async (err, stdout, stderr) => {
                    const og = stdout
                    musicPath = og.substring(og.indexOf('›')+2,og.lastIndexOf('.mp3'))+'.mp3'
                    console.log(musicPath)
                    if(musicPath.length < 20) {
                        //msg.reply('cannot find song').then(message => message.delete({timeout: 5000}))
                        await connection.play(discordTTS.getVoiceStream("cannot find song"))
                        musicPath = undefined
                    }else {
                        duration = getMP3Duration(fs.readFileSync(musicPath))
                       // msg.reply('buffering ...').then(message => message.delete({timeout: 5000}))
                        const streamOptions = { seek: 0, volume: 1 };
                        (connection.play(discordTTS.getVoiceStream("playing"))).on('finish', function () {
                            dispatcher = connection.play(musicPath, streamOptions);
                            time = Date.now()
                        })
                        //dispatcher.setBitrate(128)
                        //msg.reply('playing').then(message => message.delete({timeout: 5000}))
                    }
                });

            } else {
                msg.reply('You need to join a voice channel first!').then(message => message.delete({timeout: 50000}));
            }
            msg.delete()
        }
        else if (msg.content.startsWith('/queue https://open.spotify.com/track/')) {
            let tempPath
            songID = msg.content.substring(msg.content.lastIndexOf('/') + 1)
            // Only try to join the sender's voice channel if they are in one themselves

            if (msg.member.voice.channel) {
                connection = await msg.member.voice.channel.join();
               // msg.reply('https://musicalmood.github.io/?id=' + msg.member.voice.channel.id)
                msg.reply('searching ...').then(message => message.delete({timeout: 5000}))
                const url = msg.content.trim().substr(msg.content.indexOf(' ') + 1)
                await exec("node d-fi.js -n -q 128 --url " + url, {cwd: './d-fi'}, (err, stdout, stderr) => {
                    const og = stdout
                    tempPath = og.substring(og.indexOf('›') + 2, og.lastIndexOf('.mp3')) + '.mp3'
                    console.log(tempPath)
                    if (musicPath.length < 20) {
                        msg.reply('cannot find song').then(message => message.delete({timeout: 5000}))
                        tempPath = undefined
                    } else {
                        fs.readdir('./d-fi/Music/', (err, files) => {
                            files.forEach(file => {
                                console.log(file);
                            });
                        });
                        songs.push(tempPath)
                        //dispatcher.setBitrate(128)
                        msg.reply('added to queue').then(message => message.delete({timeout: 5000}))
                    }
                });

            }
        }
        else if(msg.content === '/pause')
        {
            if (dispatcher !== undefined)
                dispatcher.pause()
        }
        else if(msg.content === '/resume')
        {
            if (dispatcher !== undefined)
                dispatcher.resume()
        }
        else if(msg.content.startsWith('/seek '))
        {
            if (dispatcher !== undefined && musicPath !== undefined && connection!== undefined) {
                dispatcher = connection.play(musicPath, {seek: parseInt(msg.content.substr(msg.content.indexOf(' ') + 1))})
                time = Date.now() - (parseInt(msg.content.substr(msg.content.indexOf(' ') + 1))*1000)
                dispatcher.on('finish', function () {
                    console.log('\n\n\n\n\n\n|||||||||ended|||||||\n\n\n\n\n\n\n\n')
                    musicPath = songs.shift()
                    duration = getMP3Duration(fs.readFileSync(musicPath))
                    dispatcher = connection.play(musicPath, {seek: 0, volume: 1})
                    time = Date.now()

                })
            }
        }

    }
})

client.login('NzYyMTk1NjAzODQ5NDc4MTY0.X3ln-A.g8cX-yYewcO7mR9wvND1VuFoFys');


express()
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", '*');
        res.header("Access-Control-Allow-Credentials", true);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
        next();
    })
    .get('/', (req, res) => {
        res.send(musicPath)
    })
    .get('/song', (req, res) => {
        console.log(req.query.channelID)
        return res.json({
            songId: songID,
            time: time,
            duration: duration,
            state: state
        })
    })
    .get('/next', (req, res) => {
        console.log(req.query.channelID)
        musicPath = songs.shift()
        duration = getMP3Duration(fs.readFileSync(musicPath))
        dispatcher = connection.play(musicPath, {seek: 0, volume: 1})
        time = Date.now()
        return res.send('bet')
    })
    .get('/seek', (req, res) => {
        console.log(req.query.time)
        if (dispatcher !== undefined && musicPath !== undefined && connection!== undefined) {
            dispatcher = connection.play(musicPath, {seek: parseInt(req.query.time)})
            time = Date.now() - (parseInt(req.query.time)*1000)
        }
        res.send('hi')
    })
    .get('/pause', (req, res) => {
        if (dispatcher !== undefined)
            dispatcher.pause()
        res.send('success')
    })
    .get('/play', (req, res) => {
        if (req.query.id === undefined && dispatcher !== undefined)
            dispatcher.resume()
        else
        {
            playMusic(req.query.id)
        }
        res.send('wahts up')
    })
    .get('/queue', (req, res) => {
        if (req.query.id === undefined && dispatcher !== undefined)
            dispatcher.resume()
        else
        {
            playMusic(req.query.id)
        }
        res.send('wahts up')
    })
    .get('/cool', (req, res) => {
        res.send('not cool')
    })
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

async function playMusic(id) {
    if (connection !== undefined) {
        await exec("node d-fi.js -n -q 128 --url https://open.spotify.com/track/" + id, {cwd: './d-fi'},(err, stdout, stderr) => {
            const og = stdout
            musicPath = og.substring(og.indexOf('›')+2,og.lastIndexOf('.mp3'))+'.mp3'
            console.log(musicPath)
            if(musicPath.length < 20) {
                musicPath = undefined
            }else {
                const streamOptions = { seek: 0, volume: 1 };
                dispatcher = connection.play(musicPath, streamOptions);
                time = Date.now()
                //dispatcher.setBitrate(128)
            }
        });

    } else {

    }
}
