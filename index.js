require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Counter ticket
let ticketCount = 1;

// ---------------- READY ----------------
client.once("ready", async () => {
    console.log(`Bot Online sebagai ${client.user.tag}`);

    // Kirim panel ticket otomatis ke channel tertentu
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return console.log("Guild tidak ditemukan.");

    const channel = guild.channels.cache.get(process.env.TICKET_CHANNEL_ID);
    if (!channel) return console.log("Channel panel ticket tidak ditemukan.");

    const embed = new EmbedBuilder()
        .setTitle("🎫 LuxuStore • Ticket Order")
        .setDescription("Klik tombol di bawah untuk membuka ticket order.")
        .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("open_ticket_form")
            .setLabel("Buka Ticket Order")
            .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
});

// ---------------- SLASH COMMAND ----------------
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "sendticket") {
        const embed = new EmbedBuilder()
            .setTitle("🎫 LuxuStore • Ticket Order")
            .setDescription("Klik tombol di bawah untuk membuka ticket order.")
            .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("open_ticket_form")
                .setLabel("Buka Ticket Order")
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

// ---------------- BUTTON OPEN TICKET & MODAL ----------------
client.on("interactionCreate", async interaction => {
    if (interaction.isButton() && interaction.customId === "open_ticket_form") {
        const modal = new ModalBuilder()
            .setCustomId("ticket_modal")
            .setTitle("Form Ticket Order");

        const nama = new TextInputBuilder()
            .setCustomId("nama")
            .setLabel("Nama Kamu")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const produk = new TextInputBuilder()
            .setCustomId("produk")
            .setLabel("Produk yang dipesan")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const bayar = new TextInputBuilder()
            .setCustomId("bayar")
            .setLabel("Metode Pembayaran")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nama),
            new ActionRowBuilder().addComponents(produk),
            new ActionRowBuilder().addComponents(bayar)
        );

        await interaction.showModal(modal);
    }

    // ---------------- HANDLE MODAL SUBMIT ----------------
    if (interaction.isModalSubmit() && interaction.customId === "ticket_modal") {
        const nama = interaction.fields.getTextInputValue("nama");
        const produk = interaction.fields.getTextInputValue("produk");
        const bayar = interaction.fields.getTextInputValue("bayar");

        // Nama channel = username user + masuk category Order
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            type: 0,
            parent: process.env.ORDER_CATEGORY_ID, // <-- category Order
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]},
                { id: process.env.STAFF_ROLE_ID, allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]}
            ]
        });

        // Ticket embed
        const embed = new EmbedBuilder()
            .setTitle(`📩 Ticket #${String(ticketCount).padStart(3, "0")}`)
            .setColor("Green")
            .addFields(
                { name: "👤 Nama", value: nama },
                { name: "📦 Produk", value: produk },
                { name: "💰 Pembayaran", value: bayar }
            )
            .setFooter({ text: "LuxuStore Ticket System" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Close Ticket")
                .setStyle(ButtonStyle.Danger)
        );

        // Kirim pesan pertama + tag staff + bot auto chat
        await channel.send({
            content: `<@&${process.env.STAFF_ROLE_ID}> • Ticket dibuka oleh <@${interaction.user.id}>!\n_Tunggu sebentar sampai staff membalas..._`,
            embeds: [embed],
            components: [row]
        });

        ticketCount++;

        await interaction.reply({
            content: `🎫 Ticket berhasil dibuat → ${channel}`,
            ephemeral: true
        });
    }

    // ---------------- CLOSE / DELETE ----------------
    if (interaction.isButton()) {
        if (interaction.customId === "close_ticket") {
            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setTitle("🔒 Ticket Ditutup")
                .setDescription("Klik tombol di bawah untuk menghapus ticket.")
                .setColor("Red");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("delete_ticket")
                    .setLabel("Delete Ticket")
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
        }

        if (interaction.customId === "delete_ticket") {
            await interaction.channel.delete().catch(() => {});
        }
    }
});
client.login(process.env.TOKEN);
