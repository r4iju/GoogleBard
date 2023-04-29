import { Bard } from "../dist/index.js";
import * as dotenv from "dotenv";
import readline from "readline";
import { SocksProxyAgent } from 'socks-proxy-agent'

dotenv.config();

const proxyHosts = JSON.parse(process.env.PROXY_HOSTS)
const proxyHost = proxyHosts[Math.floor(Math.random()*proxyHosts.length)];
const proxyUrl = `socks5://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${proxyHost}:${process.env.PROXY_PORT}`;
// const agent = IS_PRODUCTION ? new SocksProxyAgent(proxyUrl) : undefined
console.log('use proxy url: ', proxyUrl)
const agent = new SocksProxyAgent(proxyUrl)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let cookies = process.env.BARD_COOKIES;
console.log(cookies)
let bot = new Bard(
  cookies, 
  agent,
);

async function main() {
  while (true) {
    let prompt = await new Promise((resolve) => {
      rl.question("You: ", (answer) => {
        resolve(answer);
      });
    });

    process.stdout.write("Google Bard: ");
    const res = await bot.ask(prompt)
    console.log(res)
  }
}

main();