const { readdirSync } = require('node:fs');
const { join } = require('node:path');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cmdls')
        .setDescription('사용 가능한 명령어 종류를 출력합니다.'),
    async execute(interaction) {
        const commandsPath = join(__dirname);
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        let string = "";
        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const command = require(filePath);
            string += `${command.data.name} : ${command.data.description}\n`;
        }

        return interaction.reply(string);
    },
};