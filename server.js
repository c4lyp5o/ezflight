import Fastify from 'fastify';
import dotenv from 'dotenv';
import { CronJob } from 'cron';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const airportCode = ['KNO', 'LGK', 'BKK', 'BKI', 'CGK', 'BDO', 'SUB'];

const checker = async () => {
  try {
    // get jwt
    const jwt = await fetch(process.env.URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
      }),
    })
      .then((res) => res.json())
      .then((data) => data.jwt);

    // get day today
    const dateToday = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const date3monthsFromToday = new Date(
      new Date().setMonth(new Date().getMonth() + 3)
    ).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // get airport code and url
    const airportCodeAndUrl = airportCode.map((code) => {
      return {
        code,
        url: `https://flights.airasia.com/fp/lfc/v1/lowfare?departStation=KUL&arrivalStation=${code}&endDate=${date3monthsFromToday}&currency=MYR&beginDate=${dateToday}&isDestinationCity=false&isOriginCity=false`,
      };
    });

    let allDestinations = [];

    // iterate through
    for (const airport of airportCodeAndUrl) {
      const flightData = await fetch(airport.url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Channel_hash: process.env.HASH,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((data) => data);

      const lowestPrices = flightData.data.reduce((acc, curr) => {
        if (acc.length === 0 || curr.price < acc[0].price) {
          return [curr];
        } else if (curr.price === acc[0].price) {
          return [...acc, curr];
        }
        return acc;
      }, []);

      const destinationObject = {
        destination: airport,
        lowestPrices: lowestPrices,
      };

      allDestinations.push(destinationObject);
    }

    return { allDestinations };
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
};

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

fastify.get('/', async function handler(request, reply) {
  // let realTime = [];
  // const job = new CronJob(
  // '*/5 * * * *',
  // async function () {
  try {
    // get jwt
    const jwt = await fetch(process.env.URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
      }),
    })
      .then((res) => res.json())
      .then((data) => data.jwt);

    // get day today
    const dateToday = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const date3monthsFromToday = new Date(
      new Date().setMonth(new Date().getMonth() + 3)
    ).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // get airport code and url
    const airportCodeAndUrl = airportCode.map((code) => {
      return {
        code,
        departUrl: `https://flights.airasia.com/fp/lfc/v1/lowfare?departStation=KUL&arrivalStation=${code}&endDate=${date3monthsFromToday}&currency=MYR&beginDate=${dateToday}&isDestinationCity=false&isOriginCity=false`,
        returnUrl: `https://flights.airasia.com/fp/lfc/v1/lowfare?departStation=${code}&arrivalStation=KUL&endDate=${date3monthsFromToday}&currency=MYR&beginDate=${dateToday}&isDestinationCity=false&isOriginCity=false`,
      };
    });

    let allDestinations = [];

    // iterate through
    for (const airport of airportCodeAndUrl) {
      console.log(`Checking ${airport.code}...`);
      const departFlightData = await fetch(airport.departUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Channel_hash:
            'c5e9028b4295dcf4d7c239af8231823b520c3cc15b99ab04cde71d0ab18d65bc',
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((data) => data);

      const returnFlightData = await fetch(airport.returnUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Channel_hash: process.env.HASH,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((data) => data);

      // process departflightdata and get the lowest prices
      const lowestPricesDepart = departFlightData.data.reduce((acc, curr) => {
        if (acc.length === 0 || curr.price < acc[0].price) {
          return [curr];
        } else if (curr.price === acc[0].price) {
          return [...acc, curr];
        }
        return acc;
      }, []);

      // process returnflightdata and get the lowest prices
      const lowestPricesReturn = returnFlightData.data.reduce((acc, curr) => {
        if (acc.length === 0 || curr.price < acc[0].price) {
          return [curr];
        } else if (curr.price === acc[0].price) {
          return [...acc, curr];
        }
        return acc;
      }, []);

      const destinationObject = {
        destination: airport.code,
        lowestPrices: [
          { ...lowestPricesDepart[0], type: 'depart' },
          { ...lowestPricesReturn[0], type: 'return' },
        ],
      };

      allDestinations.push(destinationObject);
    }

    // fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: `chat_id=${telegramChatId}&text=encodeURIComponent(${lowestPricesArray}`,
    // })
    //   .then((response) => response.json())
    //   .then((data) => {
    //     console.log(data);
    //   })
    //   .catch((error) => {
    //     console.error('Error:', error);
    //   });

    return { allDestinations };
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
  // },
  // null,
  // true,
  // 'Asia/Kuala_Lumpur'
  // );
});

try {
  await fastify.listen({ port: 4000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
