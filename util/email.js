const nodemailer = require('nodemailer')

const sendEmail = async options => {
    // 1. Create a transporter
    const transporter = nodemailer.createTransport({
        // service: 'Gmail',
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
        // In Gmail : activer l'option "less secure app"
        // Gmail permet d'envoyer que 500 mails/jours. Not good.
        // Autres services : Send grid, mail gun ( ici on utilise mailtrap pour generer des fake emails )
    })

    // 2. Define the email options
    const mailOptions = {
        from: 'Wawa <msaul.warion@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: 
    }
    // 3. Send the email
    await transporter.sendMail(mailOptions)
    console.log('hi from sendEmail')
}

module.exports = sendEmail