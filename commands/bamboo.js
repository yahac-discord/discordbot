const { MessageActionRow, Modal, TextInputComponent } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { bambooInfoEmbed } = require("../structures/embedMsg.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bamboo')
        .setDescription('익명으로 질문합니다.'),
    async execute(interaction) {
        const modal = new Modal()
            .setCustomId('bamboo') // cmd Name과 같게 설정해야 함.
            .setTitle('코딩야학 대나무 숲');

        const titleInput = new TextInputComponent()
            .setCustomId('tilteInput')
            .setLabel("제목을 입력하세요.")
            .setStyle('SHORT');
        const contensInput = new TextInputComponent()
            .setCustomId('contensInput')
            .setLabel("내용을 입력해주세요")
            .setStyle('PARAGRAPH');
        
        const firstActionRow = new MessageActionRow().addComponents(titleInput);
        const secondActionRow = new MessageActionRow().addComponents(contensInput);

        modal.addComponents(firstActionRow, secondActionRow);
        return await interaction.showModal(modal);
    },
    async process(interaction) {
        const title = interaction.fields.getTextInputValue('tilteInput');
        const contens = interaction.fields.getTextInputValue('contensInput');
        
        interaction.reply({ content: `대나무 숲에 새로운 외침이 들립니다.`, embeds: bambooInfoEmbed(interaction, title, contens) });

        const message = await interaction.fetchReply();
        
        if (interaction.channel.permissionsFor(interaction.applicationId).has(['MANAGE_THREADS'])) {
            return await interaction.channel.threads.create({
                startMessage: message.id,
                name: `${title}`,
                autoArchiveDuration: 1440,
                reason: '대나무 숲 질문 생성',
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
    
};