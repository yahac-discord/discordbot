const {  MessageActionRow, Modal, TextInputComponent, MessageButton, MessageEmbed, MessageSelectMenu, Permissions, ThreadManager } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const sqlite3 = require('sqlite3').verbose();
const {errorEmbed} = require('../structures/embedMsg.js');
const path = require('path');

function getAllVote(db, pollId) {
    db.serialize();
    let result = new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM "poll-${pollId}" ORDER BY voteCount DESC`, 
            [], 
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
    });
    return result;
}

function reduce(f, acc, iter) {
    for (let i of iter) {
        acc = f(acc, i);
    }

    return acc
}

function getPollGraph(data) {
        let pollItem = data.map(item => item.pollItem).toString().split(',').join("\r\n")
        let graphTotalVotes = reduce((acc, item) => acc+item.voteCount, 0, data);
        let graph = data.map(item => {
            let dotCnt = Math.round(((100 * item.voteCount / graphTotalVotes) / 10));
            let rem = (100 * item.voteCount / graphTotalVotes) % 10;
            let dots = "▮".repeat(dotCnt==10 || !dotCnt ? dotCnt : dotCnt-1);
            let left = 10 - dotCnt;
            let empty = "▯".repeat(left);

            return (`[${dots}${rem?rem:''}${empty}] (${item.voteCount}) ${(100 * item.voteCount / graphTotalVotes).toFixed(2)}%`);
        }).toString().split(',').join("\r\n")

        return {pollItem: pollItem, graph:graph, graphTotalVotes:graphTotalVotes};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('새로운 투표를 생성합니다.')
        .addBooleanOption(option =>
            option.setName('public')
            .setDescription('투표 중 투표 현황을 공개할지 설정합니다. true로 설정하면 투표 중 집계 현황을 공개합니다.')
            .setRequired(true))
        .addBooleanOption(option =>
            option.setName('thread')
            .setDescription('스레드를 함께 생성할지 설정합니다.')
            .setRequired(false)),

    async execute(interaction) {
        const publicPoll = interaction.options.getBoolean('public');
        const createThread = interaction.options.getBoolean('thread');

        const modal = new Modal()
            .setCustomId('poll')
            .setTitle('아래와 같이 생성하시겠습니까?');

        const titleInput = new TextInputComponent()
            .setCustomId('titleInput')
            .setLabel("제목을 입력하세요.")
            .setStyle('SHORT');

        const descriptionInput = new TextInputComponent()
            .setCustomId('descriptionInput')
            .setLabel("내용을 입력해주세요")
            .setStyle('PARAGRAPH');

        const itemInput = new TextInputComponent()
            .setCustomId('itemInput')
            .setLabel("투표 항목을 입력하세요. 쉼표(,)를 이용하여 항목을 구분합니다")
            .setStyle('SHORT');

        const isPublicInput = new TextInputComponent()
            .setCustomId('isPublicInput')
            .setLabel("투표 중 투표 현황을 공개할지 설정합니다.")
            .setStyle('SHORT')
            .setValue(publicPoll.toString());
        
        const isCreateThreadInput = new TextInputComponent()
            .setCustomId('isCreateThreadInput')
            .setLabel("스레드를 함께 생성할지 설정합니다.")
            .setStyle('SHORT')
            .setValue(createThread?createThread.toString():"false");
        
        const firstActionRow = new MessageActionRow().addComponents(titleInput);
        const secondActionRow = new MessageActionRow().addComponents(descriptionInput);
        const thirdActionRow = new MessageActionRow().addComponents(itemInput);
        const fourthActionRow = new MessageActionRow().addComponents(isPublicInput);
        const fifthActionRow = new MessageActionRow().addComponents(isCreateThreadInput);

        modal.addComponents(
            firstActionRow, 
            secondActionRow,
            thirdActionRow,
            fourthActionRow,
            fifthActionRow
        );

        return await interaction.showModal(modal);
    },

    async process(interaction) {
        const db = await new sqlite3.Database(path.resolve(__dirname, '../data/main.db'), sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
                return interaction.reply({ 
                    ephemeral: true, 
                    embeds: errorEmbed(
                        `명령 처리 중 에러가 발생하였습니다.\n\n${err.message}`
                    )
                });
            } else {
                console.log('Connected to the database.');
            }
        });

        const embedTitle = interaction.fields.getTextInputValue('titleInput');
        const embedDescription = interaction.fields.getTextInputValue('descriptionInput');
        const pollList = interaction.fields.getTextInputValue('itemInput');
        const publicPoll = interaction.fields.getTextInputValue('isPublicInput').toLowerCase();
        const createThread = interaction.fields.getTextInputValue('isCreateThreadInput').toLowerCase();

        const pollListArr = [...new Set(pollList.split(","))].filter(item => item != "");
        const labelArr = pollListArr.map(x => ({
            label: x,
            value: x,
            voteCount: 0
        }));

        const selectionMenu = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                    .setCustomId('sel_poll')
                    .setPlaceholder('Please Select An Item!')
                    .addOptions(labelArr)
                );

        const button = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setCustomId("btn_poll")
                .setLabel('Close Poll')
                .setStyle('DANGER')
            );

        if (pollListArr.length > 25) {
            return interaction.reply({ 
                ephemeral: true, 
                embeds: errorEmbed(
                    `discord API가 제공하는 항목 개수(25개) 보다 항목을 많이 입력했습니다.(추가 항목:${pollListArr.length}).`
                )
            });
        } else {
            const embed = new MessageEmbed()
                .setColor('#ff6633')
                .setAuthor({ name: '투표', iconURL: interaction.guild.iconURL() })
                .setTitle(embedTitle)
                .setDescription(embedDescription)
                .setTimestamp();
            try {
                await interaction.reply({
                    embeds: [embed],
                    components: [selectionMenu, button, ]
                });
            } catch (err) {
                db.close();
                return interaction.reply({ 
                        ephemeral: true, 
                        embeds: errorEmbed(
                            `명령 처리 중 에러가 발생하였습니다.\n\n${err.message}\n\n${err.stack}`
                        )
                    });
            }

            // ----------------------------------------------------------------
            
            const message = await interaction.fetchReply();

            await db.exec(`CREATE TABLE "poll-${message.id}" ("guildName" TEXT, "guildId" INTEGER, "channelName" TEXT, "channelId" INTEGER, "pollTitle" TEXT, "pollDesc" TEXT, "pollItem" TEXT, "voteCount" INTEGER, "publicPoll" TEXT, "creater" INTEGER)`);
            await db.exec(`CREATE TABLE "user-${message.id}" ("userName" TEXT, "userId" INTEGER, "pollItem" TEXT)`);

            let placeholders = pollListArr.map((movie) => `(${interaction.guild.id}, ${interaction.channel.id}, ?, 0)`).join(',');
            
            let sql = `INSERT INTO "poll-${message.id}"(guildId, channelId, pollItem, voteCount) VALUES ${placeholders}`;
            let sql2 = `UPDATE "poll-${message.id}" SET guildName = ?, channelName = ?, pollTitle = ?, pollDesc = ?, publicPoll = ?, creater = ?`;
            try {
                await db.run(sql, pollListArr);
                await db.run(sql2, `${interaction.guild.name}`, `${interaction.channel.name}`, `${embedTitle}`, `${embedDescription}`, `${publicPoll}`, `${interaction.member.id}`);
                db.close();
            } catch (error) {
                console.error(error);
            }

            if (createThread == "true") {
                if (interaction.channel.permissionsFor(interaction.applicationId).has(['MANAGE_THREADS'])) {
                    return await interaction.channel.threads.create({
                        startMessage: message.id,
                        name: `${embedTitle}`,
                        autoArchiveDuration: 1440,
                        reason: `'${embedTitle} 투표 생성에 따른 스레드 생성.'`,
                    });
                } else {
                    console.log("스레드 생성 권한이 없습니다.");

                    const threadEmbed = new MessageEmbed()
                        .setColor('#ff6633')
                        .setTitle(`Thread 생성 실패`)
                        .setDescription(`스레드 생성 권한이 없습니다.`)
                        .setImage('https://support.discord.com/hc/article_attachments/4406694690711/image1.png')
                        .setTimestamp();
                    
                    return await interaction.followUp({
                        embeds: [threadEmbed],
                        ephemeral: true,
                    });
                }
            }
        }
    },

    async select(interaction) {
        const db = await new sqlite3.Database(path.resolve(__dirname, '../data/main.db'), sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
                return interaction.reply({ 
                    ephemeral: true, 
                    embeds: errorEmbed(
                        "투표를 생성하지 못했습니다.", 
                        `명령 처리 중 에러가 발생하였습니다.\n\n${err.message}`
                    )
                });
            } else {
                console.log('Connected to the database.');
            }
        });

        try {
            let choice = interaction.values[0];
            let member = interaction.member;
            
            db.serialize();
            
            let isChange = await new Promise((resolve, reject) =>{
                db.get(
                    `SELECT EXISTS(SELECT userId FROM "user-${interaction.message.id}" WHERE userId=${member.id} LIMIT 1);`, 
                    [], 
                    (err, row) => {
                        if (err) {
                            reject(err);
                        }
                        if(row) {
                            resolve(Object.values(row)[0]);
                        }
                    });
            });
              
            let isPublic = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT EXISTS(SELECT publicPoll FROM "poll-${interaction.message.id}" WHERE publicPoll="true" LIMIT 1);`, 
                    [], 
                    (err, row) => {
                        if (err) {
                            reject(err);
                        }
                        if(row) {
                            resolve(Object.values(row)[0]);
                        }
                    });
            });

            if (isChange) {
                let originalChoice = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT * FROM "user-${interaction.message.id}" WHERE userId=${member.id} LIMIT 1;`, 
                        [], 
                        (err, row) => {
                            if (err) {
                                reject(err);
                            }
                            if(row) {
                                resolve(Object.values(row)[2]);
                            }
                        });
                });

                db.run(`UPDATE "user-${interaction.message.id}" SET pollItem = ? WHERE userId=${member.id}`, `${choice}`);
                db.run(`UPDATE "poll-${interaction.message.id}" SET voteCount = voteCount + 1 WHERE pollItem= ?`, `${choice}`);
                db.run(`UPDATE "poll-${interaction.message.id}" SET voteCount = voteCount - 1 WHERE pollItem= ?`, `${originalChoice}`);

                if (isPublic) {
                    const result = getPollGraph(await getAllVote(db, interaction.message.id));
                    
                    const embed = new MessageEmbed()
                        .setColor('#ff6633')
                        .setTitle(`${interaction.message.embeds[0].title}`)
                        .setDescription(`${interaction.message.embeds[0].description}`)
                        .addField(`Item`, result.pollItem, true)
                        .addField(`Results (Total Votes: ${result.graphTotalVotes})`, result.graph, true)
                        .setTimestamp(interaction.message.embeds[0].timestamp);
                    
                    try {
                        await interaction.update({
                            embeds: [embed],
                        });
                    } catch (err) {
                        console.log(`${err}`);
                    }
                    await interaction.followUp({
                        content: `"투표항목을 "${originalChoice}" 에서 "${choice}"로 변경하였습니다.`,
                        fetchReply: true,
                        ephemeral: true
                    })
                    .then(console.log(`+ vote change: saved ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}]s new choice of "${originalChoice}" to "${choice}" in "./data/main.db:user-${interaction.message.id}".`))
                    .catch(console.error);
                }
                else {
                    await interaction.reply({
                        content: `"투표항목을 "${originalChoice}" 에서 "${choice}"로 변경하였습니다.`,
                        fetchReply: true,
                        ephemeral: true
                    })
                    .then(console.log(`+ vote change: saved ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}]s new choice of "${originalChoice}" to "${choice}" in "./data/main.db:user-${interaction.message.id}".`))
                    .catch(console.error);
                }
                
            } else {
                await db.run(`INSERT INTO "user-${interaction.message.id}" (userName, userId, pollItem) VALUES (?, ?, ?)`, `${member.displayName}`, `${member.id}`, `${choice}`);
                await db.run(`UPDATE "poll-${interaction.message.id}" SET voteCount = voteCount + 1 WHERE pollItem= ?`, `${choice}`);
                
                if (isPublic) {
                    const result = getPollGraph(await getAllVote(db, interaction.message.id));
                    
                    const embed = new MessageEmbed()
                        .setColor('#ff6633')
                        .setTitle(`${interaction.message.embeds[0].title}`)
                        .setDescription(`${interaction.message.embeds[0].description}`)
                        .addField(`Item`, result.pollItem, true)
                        .addField(`Results (Total Votes: ${result.graphTotalVotes})`, result.graph, true)
                        .setTimestamp(interaction.message.embeds[0].timestamp);

                    try {
                        await interaction.update({
                            embeds: [embed],
                        });
                    } catch (err) {
                        console.log(`! UPDATE POLL ERR \n ${err}`);
                    }
                    
                    await interaction.followUp({
                        content: `"${choice}" 를 선택하였습니다.`,
                        fetchReply: true,
                        ephemeral: true
                    })
                    .then(console.log(`+ vote: saved ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}]s choice of "${choice}" to "./data/main.db:user-${interaction.message.id}".`))
                    .catch(console.error);
                }
                else {
                    await interaction.reply({
                        content: `"${choice}" 를 선택하였습니다.`,
                        fetchReply: true,
                        ephemeral: true
                    })
                    .then(console.log(`+ vote: saved ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}]s choice of "${choice}" to "./data/main.db:user-${interaction.message.id}".`))
                    .catch(console.error);
                }
            }
        } catch (err) {
            console.log("vote change error: " + err);
        }
    },

    async button(interaction) {
        const db = await new sqlite3.Database(path.resolve(__dirname, '../data/main.db'), sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
                return interaction.reply({ 
                    ephemeral: true, 
                    embeds: errorEmbed(
                        `명령 처리 중 에러가 발생하였습니다.\n\n${err.message}`
                    )
                });
            } else {
                console.log('Connected to the database.');
            }
        });

        try {
            db.serialize();

            let creater = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT EXISTS(SELECT creater FROM "poll-${interaction.message.id}" WHERE creater="${interaction.member.id}" LIMIT 1);`, 
                    [], 
                    (err, row) => {
                        if (err) {
                            reject(err);
                        }
                        if(row) {
                            resolve(Object.values(row)[0]);
                        }
                    });
            });
            
            if (creater || interaction.member.permissions.has(Permissions.FLAGS['MANAGE_GUILD'])) {
                const result = getPollGraph(await getAllVote(db, interaction.message.id));
                    
                const embed = new MessageEmbed()
                    .setColor('#ff6633')
                    .setTitle(`${interaction.message.embeds[0].title}`)
                    .setDescription(`${interaction.message.embeds[0].description}`)
                    .addField(`Item`, result.pollItem, true)
                    .addField(`Results (Total Votes: ${result.graphTotalVotes})`, result.graph, true)
                    .setFooter({ 
                        text: `${interaction.createdAt}:${interaction.member.displayName}에 의해 투표가 종료되었습니다.`, 
                        iconURL: interaction.guild.iconURL()
                    })
                    .setTimestamp(interaction.message.embeds[0].timestamp);

                await interaction.update({
                        embeds: [embed],
                        components: [],
                    })
                    .then((message) => console.log(`- close poll: ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}] closed the poll "poll-${interaction.message.id}".`));

                await db.exec(`DROP TABLE "poll-${interaction.message.id}";`);
                await db.exec(`DROP TABLE "user-${interaction.message.id}";`);
                
            } else {
                interaction.reply({
                        content: "투표 삭제 권한이 없습니다.",
                        ephemeral: true
                    })
                    .then((message) => console.log(`! close poll: ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}] tried to close the poll "poll-${interaction.message.id}"`))
                    .catch(console.error);
            }
        } catch (err) {
            console.log("close poll err: " + err);
            await interaction.reply({
                content: '투표 종료에 문제가 생겼습니다.',
                ephemeral: true,
            });
        }
    }
};
