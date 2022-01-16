const axios = require('axios')
const { JSDOM } = require('jsdom')
const aws = require("aws-sdk")

const BOOKED = 'Obsazeno'
const UNAVAILABLE = 'Nedostupná'

const EMAIL_ADDRESS = 'sanyo.gorbunov@gmail.com'

const notify = async (availableTowns) => {
    const composeBody = towns =>
        'Schools in these towns are open: \r\n' + towns.join('\r\n')

    const ses = new aws.SES({ region: 'eu-west-1' })

    const params = {
        Destination: {
          ToAddresses: [EMAIL_ADDRESS]
        },
        Message: {
          Body: {
            Text: { Data: composeBody(availableTowns) },
          },
          Subject: { Data: 'Czech Exam A2 Registration is Open!' },
        },
        Source: EMAIL_ADDRESS,
      };
     
    return ses.sendEmail(params).promise()
}

const getTownName = node =>
    node.querySelector('.town').replace('\n', '').replace('\t', '').replace(' ', '')

exports.handler = async () => {
    const html = await axios.get('https://cestina-pro-cizince.cz/trvaly-pobyt/a2/online-prihlaska/')
        .then(response => response.data)

    const dom = new JSDOM(html)

    const townNodes = dom.window.document.querySelectorAll(".prihlaska_a2 .row")

    const availableTowns = []
    for (const townNode of townNodes) {
        const nodeText = townNode.textContent
        
        if (!nodeText.includes(BOOKED) && !nodeText.includes(UNAVAILABLE)) {
            availableTowns.push(getTownName(townNode))
        }
    }

    if (availableTowns.length > 0) {
        await notify(availableTowns)
        console.log('A notification about opened schools has been sent')
    } else {
        console.log(`No available schools were found in ${townNodes.length} towns`)
    }
}