const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('서버 혹은 유저에 대한 정보 출력')
        .addSubcommand(subcommand => subcommand
            .setName('user')
            .setDescription('Info about a user')
            .addUserOption(option => option.setName('target').setDescription('The user')))
        .addSubcommand(subcommand => subcommand
            .setName('server')
            .setDescription('Info about the server')),
    async execute(interaction) {
        const sbcmd = interaction.commandName;
        const value = interaction.options.getUser('target');
        if (value) {
            return interaction.reply(`The options value is: \`${value}\``);
        }
        return interaction.reply('Pong!');
    },
};