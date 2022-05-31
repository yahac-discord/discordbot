const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('사용 가능한 명령을 보여줍니다.'),
  execute(interaction) {
    let str = '';
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(`./${file}`);
      str += `${command.data.name} ${command.data.options.length?JSON.stringify(command.data.options.map(a => a.name)):""} - ${command.data.description} \n`;
    }

    return void interaction.reply({
      content: str,
      ephemeral: true,
    });
  },
};