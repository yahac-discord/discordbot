const {  MessageActionRow, Modal, TextInputComponent, MessageButton, MessageEmbed, MessageSelectMenu, Permissions, ThreadManager } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const sqlite3 = require('sqlite3').verbose();
const {errorEmbed} = require('../structures/embedMsg.js');
const path = require('path'); // path 모듈 불러와서 변수에 담기

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('새로운 투표를 생성합니다.')
        .addStringOption(option =>
            option.setName('title')
            .setDescription('제목을 입력합니다.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
            .setDescription('내용을 입력합니다. \\n을 이용하여 줄바꿈을 할 수 있습니다.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('items')
            .setDescription('투표 항목을 입력합니다. 쉼표(,)를 이용하여 항목을 구분합니다.')
            .setRequired(true))
        .addBooleanOption(option =>
            option.setName('public')
            .setDescription('투표 중 투표 현황을 공개할지 설정합니다. true로 설정하면 투표 중 집계 현황을 공개합니다.')
            .setRequired(true))
        .addBooleanOption(option =>
            option.setName('thread')
            .setDescription('스레드를 함께 생성할지 설정합니다.')
            .setRequired(false)),

    async execute(interaction) {
        const embedTitle = interaction.options.getString('title');
        const embedDescription = interaction.options.getString('description');
        const pollList = interaction.options.getString('items');
        const publicPoll = interaction.options.getBoolean('public');
        const createThread = interaction.options.getBoolean('thread');

        const modal = new Modal()
            .setCustomId('poll') // cmd Name과 같게 설정해야 함.
            .setTitle('아래와 같이 생성하시겠습니까?');

        const titleInput = new TextInputComponent()
            .setCustomId('titleInput')
            .setLabel("제목을 입력하세요.")
            .setStyle('SHORT')
            .setValue(embedTitle);

        const descriptionInput = new TextInputComponent()
            .setCustomId('descriptionInput')
            .setLabel("내용을 입력해주세요")
            .setStyle('PARAGRAPH')
            .setValue(embedDescription);

        const itemInput = new TextInputComponent()
            .setCustomId('itemInput')
            .setLabel("투표 항목을 입력하세요. 쉼표(,)를 이용하여 항목을 구분합니다")
            .setStyle('SHORT')
            .setValue(pollList);

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
                        "투표를 생성하지 못했습니다.", 
                        `명령 처리 중 에러가 발생하였습니다.\n\n${err.message}`
                    )
                });
            } else {
                console.log('Connected to the database.');
            }
        });
        
        let roleName = "Poll Manager";

        const embedTitle = interaction.fields.getTextInputValue('titleInput');
        const embedDescription = interaction.fields.getTextInputValue('descriptionInput');
        const pollList = interaction.fields.getTextInputValue('itemInput');
        const publicPoll = interaction.fields.getTextInputValue('isPublicInput').toLowerCase();
        const createThread = interaction.fields.getTextInputValue('isCreateThreadInput').toLowerCase();

        if (interaction.guild.roles.cache.find(role => role.name == roleName) || interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) { 
            const pollListArr = [...new Set(pollList.split(","))];
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
                        "투표를 생성하지 못했습니다.", 
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
                                "투표를 생성하지 못했습니다.", 
                                `명령 처리 중 에러가 발생하였습니다.\n\n${err.message}\n\n${err.stack}`
                            )
                        });
                }

                // ----------------------------------------------------------------
                
                const message = await interaction.fetchReply();
    
                await db.exec(`CREATE TABLE "poll-${message.id}" ("guildName" TEXT, "guildId" INTEGER, "channelName" TEXT, "channelId" INTEGER, "pollTitle" TEXT, "pollDesc" TEXT, "pollItem" TEXT, "voteCount" INTEGER, "publicPoll" TEXT)`);
                await db.exec(`CREATE TABLE "user-${message.id}" ("userName" TEXT, "userId" INTEGER, "pollItem" TEXT)`);
    
                let placeholders = pollListArr.map((movie) => `(${interaction.guild.id}, ${interaction.channel.id}, ?, 0)`).join(',');
                
                let sql = `INSERT INTO "poll-${message.id}"(guildId, channelId, pollItem, voteCount) VALUES ${placeholders}`;
                let sql2 = `UPDATE "poll-${message.id}" SET guildName = ?, channelName = ?, pollTitle = ?, pollDesc = ?, publicPoll = ?`;
                try {
                    await db.run(sql, pollListArr);
                    await db.run(sql2, `${interaction.guild.name}`, `${interaction.channel.name}`, `${embedTitle}`, `${embedDescription}`, `${publicPoll}`);
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
                        console.log("Couldn't create thread.");

                        const threadEmbed = new MessageEmbed()
                            .setColor('#ff6633')
                            .setTitle(`Thread 생성 실패`)
                            .setDescription(`An error occured while creating the thread for the poll.\n\nPlease add the \`MANAGE_THREADS\` permission to access this feature.`)
                            .setImage('https://support.discord.com/hc/article_attachments/4406694690711/image1.png')
                            .setTimestamp();
                        
                        return await interaction.followUp({
                            embeds: [threadEmbed],
                            ephemeral: true,
                        });
                    }
                }
            }
        
        } else {
            if (interaction.channel.permissionsFor(interaction.applicationId).has(['MANAGE_ROLES'])) {
                interaction.guild.roles.create({
                    name: roleName,
                    color: "#ff6633",
                    reason: "Automatically creating \"Poll Manager\" for bot functions."
                }).then(role => {
                    interaction.reply({
                            content: "It appears you don't have the permission \`MANAGE_GUILD\` to create a poll, I've created the role \`\"Poll Manager\"\` for you to utilize instead. Simply add the role to yourself and anyone else that you want to have permissions to create and close polls.",
                            ephemeral: true,
                        });
                });
            } else {
                interaction.reply({
                    content: `Sorry! You don't have the \`MANAGE_GUILD\` permission and I don't have permissions to create the \`\"Poll Manager\"\` role for you.\nPlease ask an administrator to run the \`/poll\` command for you or ask them to create the \`\"Poll Manager\"\` role and apply it to you.`,
                    ephemeral: true,
                });
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
            
            let sql = Object.values(await db.get(`SELECT EXISTS(SELECT userId FROM "user-${interaction.message.id}" WHERE userId=${member.id} LIMIT 1);`));
            let publicPoll = Object.values(await db.get(`SELECT EXISTS(SELECT publicPoll FROM "poll-${interaction.message.id}" WHERE publicPoll="true" LIMIT 1);`));
            
            db.serialize();
            db.all(query,(err,row)=>{
               console.log(row)
            });

            if (sql[0]) {
                let user = Object.values(await db.get(`SELECT * FROM "user-${interaction.message.id}" WHERE userId=${member.id} LIMIT 1;`));
                let originalChoice = user[2];

                await db.run(`UPDATE "user-${interaction.message.id}" SET pollItem = ? WHERE userId=${member.id}`, `${choice}`);
                await db.run(`UPDATE "poll-${interaction.message.id}" SET voteCount = voteCount + 1 WHERE pollItem= ?`, `${choice}`);
                await db.run(`UPDATE "poll-${interaction.message.id}" SET voteCount = voteCount - 1 WHERE pollItem= ?`, `${originalChoice}`);

                if (publicPoll[0] === 1) {
                    const result = await db.all(`SELECT * FROM "poll-${interaction.message.id}" ORDER BY voteCount DESC`);
                    
                    let pollItemLoop = [],
                        graphLoop = [],
                        graphTotalVotes = 0;
                    
                        for (let i = 0; i < result.length; i++) {
                        pollItemLoop.push(`${result[i].pollItem}`);
                        graphTotalVotes += result[i].voteCount;
                    }

                    for (let i = 0; i < result.length; i++) {
                        let dots = "▮".repeat(Math.round(((100 * result[i].voteCount / graphTotalVotes) / 10)-1));
                        let rem = (100 * result[i].voteCount / graphTotalVotes) % 10;
                        let left = 10 - (Math.round((100 * result[i].voteCount / graphTotalVotes) / 10));
                        let empty = "▯".repeat(left);
                        graphLoop.push(`${result[i].pollItem}:[${dots}${rem}${empty}] (${result[i].voteCount}) ${(100 * result[i].voteCount / graphTotalVotes).toFixed(2)}%`);
                    }
                    
                    let pollItem = pollItemLoop.toString().split(',').join("\r\n"),
                        graph = graphLoop.toString().split(',').join("\r\n");

                    const embed = new MessageEmbed()
                        .setColor('#ff6633')
                        .setTitle(`${interaction.message.embeds[0].title}`)
                        .setDescription(`${interaction.message.embeds[0].description}`)
                        .addField(`Item`, pollItem, true)
                        .addField(`Results (Total Votes: ${graphTotalVotes})`, graph, true);
                    
                    try {
                        await interaction.update({
                            embeds: [embed],
                        });
                    } catch (err) {
                        console.log(`${err}`);
                    }
                    
                    await interaction.followUp({
                            content: `"You've changed your vote from "${originalChoice}" to "${choice}".`,
                            fetchReply: true,
                            ephemeral: true
                        })
                        .then(console.log(`+ vote change: saved ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}]s new choice of "${originalChoice}" to "${choice}" in "./data/main.db:user-${interaction.message.id}".`))
                        .catch(console.error);
                } else {
                    await interaction.reply({
                            content: `"You've changed your vote from "${originalChoice}" to "${choice}".`,
                            fetchReply: true,
                            ephemeral: true
                        })
                        .then(console.log(`+ vote change: saved ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}]s new choice of "${originalChoice}" to "${choice}" in "./data/main.db:user-${interaction.message.id}"}.`))
                        .catch(console.error);
                }
            } else {
                await db.run(`INSERT INTO "user-${interaction.message.id}" (userName, userId, pollItem) VALUES (?, ?, ?)`, `${member.displayName}`, `${member.id}`, `${choice}`);
                await db.run(`UPDATE "poll-${interaction.message.id}" SET voteCount = voteCount + 1 WHERE pollItem= ?`, `${choice}`);
                
                if (publicPoll[0] === 1) {
                    const result = await db.all(`SELECT * FROM "poll-${interaction.message.id}" ORDER BY voteCount DESC`);
                    
                    let pollItemLoop = [],
                        graphLoop = [],
                        graphTotalVotes = 0;
                    
                        for (let i = 0; i < result.length; i++) {
                        pollItemLoop.push(`${result[i].pollItem}`);
                        graphTotalVotes += result[i].voteCount;
                    }

                    for (let i = 0; i < result.length; i++) {
                        let dots = "▮".repeat(Math.round(((100 * result[i].voteCount / graphTotalVotes) / 10)-1));
                        let rem = (100 * result[i].voteCount / graphTotalVotes) % 10;
                        let left = 10 - (Math.round((100 * result[i].voteCount / graphTotalVotes) / 10));
                        let empty = "▯".repeat(left);
                        graphLoop.push(`${result[i].pollItem}:[${dots}${rem}${empty}] (${result[i].voteCount}) ${(100 * result[i].voteCount / graphTotalVotes).toFixed(2)}%`);
                    }
                    
                    let pollItem = pollItemLoop.toString().split(',').join("\r\n"),
                        graph = graphLoop.toString().split(',').join("\r\n");

                    const embed = new MessageEmbed()
                        .setColor('#ff6633')
                        .setTitle(`${interaction.message.embeds[0].title}`)
                        .setDescription(`${interaction.message.embeds[0].description}`)
                        .addField(`Item`, pollItem, true)
                        .addField(`Results (Total Votes: ${graphTotalVotes})`, graph, true);

                    try {
                        await interaction.update({
                            embeds: [embed],
                        });
                    } catch (err) {
                        console.log(`! UPDATE POLL ERR \n ${err}`);
                    }
                    await interaction.followUp({
                            content: `"${choice}" chosen.`,
                            fetchReply: true,
                            ephemeral: true
                        })
                        .then(console.log(`+ vote: saved ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}]s choice of "${choice}" to "./data/main.db:user-${interaction.message.id}".`))
                        .catch(console.error);
                } else {
                    await interaction.reply({
                            content: `"${choice}" chosen.`,
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
                        "투표를 생성하지 못했습니다.", 
                        `명령 처리 중 에러가 발생하였습니다.\n\n${err.message}`
                    )
                });
            } else {
                console.log('Connected to the database.');
            }
        });

        try {
            let roleName = "Poll Manager";
            if (interaction.member.roles.cache.some(role => role.name === roleName) || interaction.member.permissions.has(Permissions.FLAGS['MANAGE_GUILD'])) {
                const result = await db.all(`SELECT * FROM "poll-${interaction.message.id}" ORDER BY voteCount DESC`);
                
                let pollItemLoop = [],
                    graphLoop = [],
                    graphTotalVotes = 0;
                
                for (let i = 0; i < result.length; i++) {
                    pollItemLoop.push(`${result[i].pollItem}`);
                    graphTotalVotes += result[i].voteCount;
                }

                for (let i = 0; i < result.length; i++) {
                    let dots = "▮".repeat(Math.round(((100 * result[i].voteCount / graphTotalVotes) / 10)-1));
                    let rem = (100 * result[i].voteCount / graphTotalVotes) % 10;
                    let left = 10 - (Math.round((100 * result[i].voteCount / graphTotalVotes) / 10));
                    let empty = "▯".repeat(left);
                    graphLoop.push(`${result[i].pollItem}:[${dots}${rem}${empty}] (${result[i].voteCount}) ${(100 * result[i].voteCount / graphTotalVotes).toFixed(2)}%`);
                }
                
                let pollItem = pollItemLoop.toString().split(',').join("\r\n"),
                    graph = graphLoop.toString().split(',').join("\r\n");

                const embed = new MessageEmbed()
                    .setColor('#ff6633')
                    .setTitle(`${interaction.message.embeds[0].title}`)
                    .setDescription(`${interaction.message.embeds[0].description}`)
                    .addField(`Item`, pollItem, true)
                    .addField(`Results (Total Votes: ${graphTotalVotes})`, graph, true)
                    .setFooter(`Poll closed at ${interaction.createdAt} by ${interaction.member.displayName}`);

                try {
                    await interaction.update({
                            embeds: [embed],
                            components: [],
                        })
                        .then((message) => console.log(`- close poll: ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}] closed the poll "poll-${interaction.message.id}".`));

                } catch (err) {
                    console.log(`! CLOSE POLL ERR' \n ${err}`);
                    await interaction.reply({
                        content: 'Sorry there was an issue closing the pole, if this persists please contact blink inside of the pollbot discord (use /help)',
                        ephemeral: true,
                    });
                }

                try {
                    await db.exec(`DROP TABLE "poll-${interaction.message.id}";`);
                    await db.exec(`DROP TABLE "user-${interaction.message.id}";`);
                } catch (err) {
                    console.log('close error');
                }

            } else {
                interaction.reply({
                        content: "Sorry you don't have the \`MANAGE_GUILD\` permission or \"Poll Manager\" role.",
                        ephemeral: true
                    })
                    .then((message) => console.log(`! close poll: ${interaction.guild.name}[${interaction.guild.id}](${interaction.guild.memberCount}) ${interaction.member.displayName}[${interaction.member.id}] tried to close the poll "poll-${interaction.message.id}"`))
                    .catch(console.error);
            }
        } catch (err) {
            console.log("close poll err: " + err);
        }
    }
};
